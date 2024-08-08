import express from "express";
import cors from "cors";
import path from "path";
import routes from "./routes/index.js";
import { BlobClient } from "./utils/storage/blobclient.js";
import { insightsClient } from "./utils/insightsClient.js";
import { CosmosDBClient } from "./utils/storage/cosmosdbclient.js";
import {
  DefaultAzureCredential,
  InteractiveBrowserCredential,
} from "@azure/identity";
import dotenv from "dotenv";
import { StorageTableClient } from "./utils/storage/tableclient.js";
import { SplunkClient } from "./utils/splunkClient.js";
import jwt_decode from 'jwt-decode';
import NodeCache from 'node-cache';

dotenv.config();

const PORT = process.env.NODE_ENV == "development" ? 3001 : 8080;
const app = express();
const cache = new NodeCache({ stdTTL: 43200, checkperiod: 45000 });

const alertDataCosmosClient = new CosmosDBClient(process.env.COSMOS_DB_ENDPOINT,
  process.env.COSMOS_DB_KEY,
  process.env.COSMOS_DB_DATABASE_ID,
  process.env.COSMOS_DB_ALERT_DATA);

const alertUsersCosmosClient = new CosmosDBClient(process.env.COSMOS_DB_ENDPOINT,
  process.env.COSMOS_DB_KEY,
  process.env.COSMOS_DB_DATABASE_ID,
  process.env.COSMOS_DB_ALERT_USERS);

const auditCosmosClient = new CosmosDBClient(process.env.COSMOS_DB_ENDPOINT,
  process.env.COSMOS_DB_KEY,
  process.env.COSMOS_DB_DATABASE_ID,
  process.env.COSMOS_DB_AUDIT);

let credential;
if (process.env.NODE_ENV == "development") {
  credential = new InteractiveBrowserCredential();
} else {
  credential = new DefaultAzureCredential();
}

app.use(cors());

const __dirname = path.resolve();
app.use(express.json());

routes.forEach((route) => {
  app[route.method](route.path, route.handler);
});

const root = path.join(__dirname, "build");
app.use(express.static(root));

async function authenticationMiddleware(req, res, next) {
  try {
    const token = req.headers.authorization;

    if (!token) {
      // No access token provided, deny access
      console.log(req.originalUrl, "UNATHORIZED");
      // Start enforcing in the next PR
      //return res.status(401).json({ message: 'Unathorized' });
      next();
      return;
    }

    const decodedToken = jwt_decode(token.split(" ")[1]);
    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Unathorized' });
  }
}
app.use(authenticationMiddleware);

function auditMiddleware(req, res, next) {
  // Extract relevant information from the request
  const { method, originalUrl, user } = req;

  if (user) {
    // Create an audit log entry with the extracted information
    const logEntry = {
      timestamp: new Date(),
      method,
      url: originalUrl,
      user: user.username
    };

    // Save the log entry to the audit table
    auditCosmosClient.saveAuditRecord(logEntry);
  }

  // Continue processing the request
  next();
}
app.use(auditMiddleware);

app.get("/api/report_config", async (req, res) => {
  try {
    const blobClient = new BlobClient();
    const response = await blobClient.downloadBlob(
      "config/report_configs.json"
    );
    const model_config = JSON.parse(response);
    res.json(model_config);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error });
  }
});


app.get('/api/alerts/active', async (req, res) => {
  try {
    const userId = req.query.userId;
    const alerts = await alertDataCosmosClient.getActiveAlertsData(userId);
    res.json(alerts);
  } catch (error) {
    res.status(500).send(`Error fetching active alerts: ${error}`);
  }
});

app.get('/api/alerts/unseen', async (req, res) => {
  try {
    const userId = req.query.userId;
    const alerts = await alertDataCosmosClient.getUnreadAlerts(userId);
    res.json(alerts);
  } catch (error) {
    res.status(500).send(`Error fetching active alerts: ${error}`);
  }
});

app.get('/api/alerts/all', async (req, res) => {
  try {
    const userId = req.query.userId;
    const alerts = await alertDataCosmosClient.getAllAlertsData(userId);
    res.json(alerts);
  } catch (error) {
    res.status(500).send(`Error fetching active alerts: ${error}`);
  }
});

app.put('/api/alerts/update_removed_status', async (req, res) => {
  try {
    const { id, alertName, modelName, userId } = req.query;
    await alertDataCosmosClient.updateAlertDataRemovedStatus(id, alertName, modelName, userId);
    res.json({ message: 'Alert removed status updated successfully.' });
  } catch (error) {
    res.status(500).send(`Error updating alert removed status: ${error}`);
  }
});

app.put('/api/alerts/update_seen_status', async (req, res) => {
  try {
    const { userId } = req.query;
    await alertDataCosmosClient.updateAlertDataSeenStatus(userId);
    res.json({ message: 'Alert seen status updated successfully.' });
  } catch (error) {
    res.status(500).send(`Error updating alert seen status: ${error}`);
  }
});

app.put("/api/alerts/config/update", async (req, res) => {
  try {
    const { id, partitionKey } = req.query;
    const updatedAlert = req.body;

    if (!id || !partitionKey) {
      return res.status(400).json({ message: "Missing required query parameters" });
    }

    const result = await alertUsersCosmosClient.updateAlert(id, partitionKey, updatedAlert);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error });
  }
});

app.delete("/api/alerts/config/delete", async (req, res) => {
  try {
    const { id, partitionKey } = req.query;

    if (!id || !partitionKey) {
      return res.status(400).json({ message: "Missing required query parameters" });
    }

    const result = await alertUsersCosmosClient.deleteAlert(id, partitionKey);
    res.json({ message: "Alert deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500);
  }
});

app.get('/api/alerts/config/user', async (req, res) => {
  try {
    const { user, partitionKey } = req.query;
    const alerts = await alertUsersCosmosClient.getAlertsUser(user, partitionKey);
    res.json(alerts);
  } catch (error) {
    console.error(error);
    res.status(500).send(`An error occurred while fetching alerts by user.  ${error}`);
  }
});

app.get('/api/alerts/config/id', async (req, res) => {
  try {
    const { alertId, partitionKey } = req.query;
    const alert = await alertUsersCosmosClient.getAlertById(alertId, partitionKey);

    if (!alert) {
      return res.status(404).send('Alert not found.');
    }

    res.json(alert);
  } catch (error) {
    console.error(error);
    res.status(500).send(`An error occurred while fetching the alert by name.  ${error}`);
  }
});

app.post('/api/alert/config/add', async (req, res) => {
  try {
    const alert = req.body;

    if (!alert.modelName) {
      return res.status(400).json({ message: "Missing required partition key: modelName" });
    }

    const newAlert = await alertUsersCosmosClient.addAlert(alert);
    res.json(newAlert);
  } catch (error) {
    console.error(error);
    res.status(500).send(`An error occurred while adding the alert.  ${error}`);
  }
});


app.get('/api/alerts/config/all', async (req, res) => {
  try {
    const alerts = await alertUsersCosmosClient.getAlerts();
    res.json(alerts);
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while fetching all alerts.');
  }
});

app.get("/api/models", async (req, res) => {
  try {
    const blobClient = new BlobClient();
    const response = await blobClient.downloadBlob(
      "config/model_configs.json"
    );
    const model_config = JSON.parse(response);
    res.json(model_config);
  } catch (error) {
    console.error(error);
    res.status(500);
  }
});

app.get("/api/metrics/requests_stats", async (req, res) => {
  try {
    const { timespan, model } = req.query;
    if (!timespan || !model) {
      return res
        .status(400)
        .json({ error: "Both timespan and model parameters are required." });
    }
    const response = await new insightsClient(process.env.INSIGHTS_APP_ID).requestStats(timespan, model);
    res.json({ requests: response });
  } catch (error) {
    console.error(error);
    res.status(500);
  }
});

app.get("/api/metrics/totalrequests", async (req, res) => {
  try {
    const response = await new insightsClient(process.env.INSIGHTS_APP_ID).totalRequests();
    res.json({ requests: response });
  } catch (error) {
    console.error(error);
    res.status(500);
  }
});

app.get("/api/metrics/requests", async (req, res) => {
  try {
    const { model, timespan, granularity } = req.query;

    if (!timespan || !model) {
      return res.status(400).json({ error: "Both timespan and model parameters are required." });
    }
    // Generate a cache key based on the request parameters
    const cacheKey = `${model}-${timespan}-${granularity}`;
    // Check if the response is in the cache
    if (cache.has(cacheKey)) {
      return res.json({ requests: cache.get(cacheKey) });
    }
    const response = await new insightsClient(process.env.INSIGHTS_APP_ID).requests(
      model,
      timespan,
      granularity
    );
    // store the response in the cache
    cache.set(cacheKey, response);

    res.json({ requests: response });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post('/api/telematics/sdk/sdk_trip_search', async (req, res) => {
  try {
    const { Id, logTable } = req.body;
    const splunkQuery = `search earliest=-1y index IN (mobile_pd, mobile_np) ${logTable} Message.serviceResults.OperationEvents=* ${Id} | table  Message.timestamp, Message.serviceResults.OperationEvents`;
    const splunkClient = new SplunkClient(
      process.env.SPLUNK_USER,
      process.env.SPLUNK_PASSWORD,
      process.env.PROXY_URL,
      process.env.SPLUNK_HOST,
    );
    const jsonData = await splunkClient.search(splunkQuery);
    res.json(jsonData);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/api/telematics/sdk/sdk_driver_search', async (req, res) => {
  try {
    const { Id, logTable, startDate, endDate } = req.body;

    // Format dates to "MM/DD/YYYY:HH:MM:SS"
    const formatDate = (date) => {
      const padZero = (num) => num.toString().padStart(2, '0');
      return `${padZero(date.getMonth() + 1)}/${padZero(date.getDate())}/${date.getFullYear()}:${padZero(date.getHours())}:${padZero(date.getMinutes())}:${padZero(date.getSeconds())}`;
    };

    const sDate = new Date(startDate);
    const eDate = new Date(endDate);
    const formattedStartDate = formatDate(sDate);
    const formattedEndDate = formatDate(eDate);

    const splunkQuery = `search earliest=${formattedStartDate} latest=${formattedEndDate} index IN (mobile_pd, mobile_np) ${logTable} Message.serviceResults.OperationEvents=* ${Id} | iplocation Message.clientIp | table Region, Message.serviceResults.OperationEvents`;
    const splunkClient = new SplunkClient(
      process.env.SPLUNK_USER,
      process.env.SPLUNK_PASSWORD,
      process.env.PROXY_URL,
      process.env.SPLUNK_HOST,
    );

    const jsonData = await splunkClient.search(splunkQuery);
    res.json(jsonData);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});


app.get("/api/telematics/metrics/blt_metrics", async (req, res) => {
  try {
    const { startTimestamp, endTimestamp, deviceOS } = req.query;

    // Generate a unique cache key based on the query parameters
    const filterParams = { startTimestamp, endTimestamp, deviceOS };
    const sortedFilterKeys = Object.keys(filterParams).sort();
    const cacheKeyParts = sortedFilterKeys.map(key => {
      const value = filterParams[key] || 'all';
      return `${key}:${value}`;
    });
    const cacheKey = `metrics-${cacheKeyParts.join('-')}`;

    // Try to get data from cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const file = "telematics/aggregation/telematics_blt/telematics_monitoring_metrics_blt.csv";
    const blobClient = new BlobClient();
    const dataStream = await blobClient.streamCSV(file);

    let driverIds = new Set();
    let tripIds = new Set();
    let trips = {};
    let minDate = new Date();
    let maxDate = new Date(0);

    dataStream.on('data', item => {
      const itemDate = new Date(item.date);
      if ((!startTimestamp || itemDate >= new Date(startTimestamp)) &&
        (!endTimestamp || itemDate <= new Date(endTimestamp)) &&
        (!deviceOS || item.os_category === deviceOS)) {

        driverIds.add(item.driver_id);
        tripIds.add(item.trip_id);

        if (!trips[item.trip_id]) {
          trips[item.trip_id] = { failed_process_count: 0, successful_process_count: 0 };
        }

        trips[item.trip_id].failed_process_count += Number(item.failed_process_count);
        trips[item.trip_id].successful_process_count += Number(item.successful_process_count);

        if (itemDate < minDate) minDate = itemDate;
        if (itemDate > maxDate) maxDate = itemDate;
      }
    });

    dataStream.on('end', () => {
      let totalFailed = 0;
      let totalSuccessful = 0;
      Object.values(trips).forEach(trip => {
        totalFailed += trip.failed_process_count;
        totalSuccessful += trip.successful_process_count;
      });

      const totals = {
        driver_count: driverIds.size,
        trip_count: tripIds.size,
        failed_process_count: totalFailed,
        successful_process_count: totalSuccessful,
        min_date: minDate ? minDate.toISOString() : null,
        max_date: maxDate ? maxDate.toISOString() : null
      };

      // Cache the computed results
      cache.set(cacheKey, totals);

      res.json(totals);
    });

    dataStream.on('error', error => {
      console.error('Stream processing failed:', error);
      res.status(500).send('Internal Server Error');
    });

  } catch (error) {
    console.error('Failed to process request:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get("/api/telematics/metrics/fields", async (req, res) => {
  try {
    const { startTimestamp, endTimestamp, field } = req.query;

    if (!field) {
      return res.status(400).send("The 'field' parameter is mandatory and cannot be empty.");
    }

    const file = "telematics/aggregation/telematics_di/telematics_monitoring_metrics_di.csv";
    const blobClient = new BlobClient();

    const data = await blobClient.downloadCSV(file);

    const filteredData = data.filter(item => {
      const itemDate = new Date(item.date);
      return (!startTimestamp || itemDate >= new Date(startTimestamp)) &&
        (!endTimestamp || itemDate <= new Date(endTimestamp));
    });

    const values = filteredData.map(item => item[field]);
    const distinctValues = [...new Set(values)];

    res.json({ [field]: distinctValues });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

app.get("/api/telematics/metrics/di_metrics", async (req, res) => {
  try {
    const { startTimestamp, endTimestamp, phoneModel, sdkVersion, pipelineComponent, ratingRegion, deviceOS } = req.query;

    // Generate a unique cache key based on the query parameters
    const filterParams = { startTimestamp, endTimestamp, phoneModel, sdkVersion, pipelineComponent, ratingRegion, deviceOS };
    const sortedFilterKeys = Object.keys(filterParams).sort();
    const cacheKeyParts = sortedFilterKeys.map(key => `${key}:${filterParams[key] || 'all'}`);
    const cacheKey = `di-metrics-${cacheKeyParts.join('-')}`;

    // Try to get data from cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const file = "telematics/aggregation/telematics_di/telematics_monitoring_metrics_di.csv";
    const blobClient = new BlobClient();
    const dataStream = await blobClient.streamCSV(file);

    let minDate = new Date();
    let maxDate = new Date(0);
    let totalDriverCount = new Set();
    let tripIdCount = new Set();
    let aggregationFields = [];
    let accumulators = {};
    let firstLine = true;

    dataStream.on('data', item => {
      if (firstLine) {
        aggregationFields = Object.keys(item).filter(key => !['date', 'phone_model', 'sdk_version', 'device_os', 'pipeline_component', 'rating_region', 'driver_id', 'trip_id'].includes(key));
        aggregationFields.forEach(field => {
          accumulators[field] = 0;
        });
        firstLine = false;
      }

      const itemDate = new Date(item.date);
      if ((!startTimestamp || itemDate >= new Date(startTimestamp)) &&
        (!endTimestamp || itemDate <= new Date(endTimestamp)) &&
        (!phoneModel || item.phone_model === phoneModel) &&
        (!sdkVersion || item.sdk_version === sdkVersion) &&
        (!pipelineComponent || item.pipeline_component === pipelineComponent) &&
        (!ratingRegion || item.rating_region === ratingRegion) &&
        (!deviceOS || item.device_os === deviceOS)) {

        totalDriverCount.add(item.driver_id);
        tripIdCount.add(item.trip_id);

        aggregationFields.forEach(field => {
          accumulators[field] += Number(item[field] || 0);
        });

        if (itemDate < minDate) minDate = itemDate;
        if (itemDate > maxDate) maxDate = itemDate;
      }
    });

    dataStream.on('end', () => {
      const result = {
        driver_count: totalDriverCount.size,
        trip_count: tripIdCount.size,
        min_date: minDate ? minDate.toISOString() : null,
        max_date: maxDate ? maxDate.toISOString() : null
      };

      // Aggregate other fields
      Object.keys(accumulators).forEach(field => {
        result[field] = accumulators[field];
      });

      // Cache the computed results
      cache.set(cacheKey, result);

      res.json(result);
    });

    dataStream.on('error', error => {
      console.error('Stream processing failed:', error);
      res.status(500).send('Internal Server Error');
    });

  } catch (error) {
    console.error('Failed to process request:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get("/api/telematics/metrics/sdk_metrics", async (req, res) => {
  try {
    const { startTimestamp, endTimestamp, phoneModel, ratingRegion, deviceOS } = req.query;

    // Generate a unique cache key based on the query parameters
    const filterParams = { startTimestamp, endTimestamp, phoneModel, ratingRegion, deviceOS };
    const sortedFilterKeys = Object.keys(filterParams).sort();
    const cacheKeyParts = sortedFilterKeys.map(key => `${key}:${filterParams[key] || 'all'}`);
    const cacheKey = `sdk-metrics-${cacheKeyParts.join('-')}`;

    // Try to get data from cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const file = "telematics/aggregation/telematics_sdk/telematics_monitoring_metrics_sdk.csv";
    const blobClient = new BlobClient();
    const dataStream = await blobClient.streamCSV(file);

    let minDate = new Date();
    let maxDate = new Date(0);
    let totalDriverCount = new Set();
    let tripIdCount = new Set();
    let accumulators = {};
    let firstLine = true;

    dataStream.on('data', item => {
      if (firstLine) {
        Object.keys(item).forEach(key => {
          if (!['date', 'phone_model', 'device_os', 'rating_region', 'driver_id', 'trip_id', 'code_long_description'].includes(key)) {
            accumulators[key] = 0;
          }
        });
        firstLine = false;
      }

      const itemDate = new Date(item.date);
      if ((!startTimestamp || itemDate >= new Date(startTimestamp)) &&
        (!endTimestamp || itemDate <= new Date(endTimestamp)) &&
        (!phoneModel || item.phone_model.replace(/(\D)(\d)/, '$1 $2').includes(phoneModel.replace(/.*(iPhone\s\d{1,2}).*/, '$1'))) &&
        (!ratingRegion || item.rating_region === ratingRegion) &&
        (!deviceOS || item.device_os === deviceOS)) {

        totalDriverCount.add(item.driver_id);
        tripIdCount.add(item.trip_id);

        Object.keys(accumulators).forEach(field => {
          accumulators[field] += Number(item[field] || 0);
        });

        if (itemDate < minDate) minDate = itemDate;
        if (itemDate > maxDate) maxDate = itemDate;
      }
    });

    dataStream.on('end', () => {
      const result = {
        driver_count: totalDriverCount.size,
        trip_count: tripIdCount.size,
        min_date: minDate ? minDate.toISOString() : null,
        max_date: maxDate ? maxDate.toISOString() : null
      };

      Object.assign(result, accumulators);

      // Cache the computed results
      cache.set(cacheKey, result);

      res.json(result);
    });

    dataStream.on('error', error => {
      console.error('Stream processing failed:', error);
      res.status(500).send('Internal Server Error');
    });

  } catch (error) {
    console.error('Failed to process request:', error);
    res.status(500).send('Internal Server Error');
  }
});


app.get("/api/telematics/metrics/di_region", async (req, res) => {
  try {
    const { startTimestamp, endTimestamp, phoneModel, sdkVersion, pipelineComponent, ratingRegion, deviceOS } = req.query;

    // Generate a unique cache key based on the query parameters
    const filterParams = { startTimestamp, endTimestamp, phoneModel, sdkVersion, pipelineComponent, ratingRegion, deviceOS };
    const sortedFilterKeys = Object.keys(filterParams).sort();
    const cacheKeyParts = sortedFilterKeys.map(key => `${key}:${filterParams[key] || 'all'}`);
    const cacheKey = `di-region-metrics-${cacheKeyParts.join('-')}`;

    // Try to get data from cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const file = "telematics/aggregation/telematics_di/telematics_monitoring_metrics_di.csv";
    const blobClient = new BlobClient();
    const dataStream = await blobClient.streamCSV(file);

    let regionCounts = {};
    let firstLine = true;

    dataStream.on('data', item => {
      const itemDate = new Date(item.date);
      if (firstLine) {
        firstLine = false;
      } else if ((!startTimestamp || itemDate >= new Date(startTimestamp)) &&
        (!endTimestamp || itemDate <= new Date(endTimestamp)) &&
        (!phoneModel || item.phone_model === phoneModel) &&
        (!sdkVersion || item.sdk_version === sdkVersion) &&
        (!pipelineComponent || item.pipeline_component === pipelineComponent) &&
        (!ratingRegion || item.rating_region === ratingRegion) &&
        (!deviceOS || item.device_os == deviceOS)) {
        const region = item.rating_region;
        if (region) {
          regionCounts[region] = (regionCounts[region] || 0) + 1;
        }
      }
    });

    dataStream.on('end', () => {
      // Convert the counts object to an array of objects and sort by count
      const sortedCountArray = Object.keys(regionCounts).map(region => ({
        region,
        count: regionCounts[region]
      })).sort((a, b) => b.count - a.count).slice(0, 10);

      // Convert the sorted array back to the object format
      const topCounts = sortedCountArray.reduce((acc, item) => {
        acc[item.region] = item.count;
        return acc;
      }, {});

      // Cache the computed results
      cache.set(cacheKey, { topCounts });

      // Return the topCounts as a JSON response
      res.json({ topCounts });
    });

    dataStream.on('error', error => {
      console.error('Stream processing failed:', error);
      res.status(500).send('Internal Server Error');
    });

  } catch (error) {
    console.error('Failed to process request:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get("/api/telematics/metrics/pipeline_report", async (req, res) => {
  try {
    const { startTimestamp, endTimestamp, phoneModel, sdkVersion, pipelineComponent, ratingRegion, deviceOS } = req.query;

    // Generate a unique cache key based on the query parameters
    const filterParams = { startTimestamp, endTimestamp, phoneModel, sdkVersion, pipelineComponent, ratingRegion, deviceOS };
    const sortedFilterKeys = Object.keys(filterParams).sort();
    const cacheKeyParts = sortedFilterKeys.map(key => `${key}:${filterParams[key] || 'all'}`);
    const cacheKey = `pipeline-report-${cacheKeyParts.join('-')}`;

    // Try to get data from cache
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const file = "telematics/aggregation/telematics_sdk/telematics_monitoring_metrics_sdk.csv";
    const blobClient = new BlobClient();

    const dataStream = await blobClient.streamCSV(file);
    let aggregatedResults = {};

    dataStream.on('data', item => {
      const itemDate = new Date(item.date).toISOString().split('T')[0];

      if ((!startTimestamp || new Date(item.date) >= new Date(startTimestamp)) &&
        (!endTimestamp || new Date(item.date) <= new Date(endTimestamp)) &&
        (!phoneModel || item.phone_model.replace(/(\D)(\d)/, '$1 $2').includes(phoneModel.replace(/.*(iPhone\s\d{1,2}).*/, '$1'))) &&
        (!sdkVersion || item.sdk_version === sdkVersion) &&
        (!pipelineComponent || item.pipeline_component === pipelineComponent) &&
        (!ratingRegion || item.rating_region === ratingRegion) &&
        (!deviceOS || item.device_os === deviceOS)) {

        if (!aggregatedResults[itemDate]) {
          aggregatedResults[itemDate] = {
            tripIds: new Set(),
            total_error_counts: 0,
            total_success_count: 0,
            total_segment_size: 0,
            total_process_time: 0
          };
        }

        aggregatedResults[itemDate].tripIds.add(item.trip_id);
        aggregatedResults[itemDate].total_error_counts += Number(item.Segment_upload_failed);
        aggregatedResults[itemDate].total_success_count += Number(item.Segment_upload_succeeded);
        aggregatedResults[itemDate].total_segment_size += Number(item.segment_size);
        aggregatedResults[itemDate].total_process_time += Number(item.operation_time);
      }
    });

    dataStream.on('end', () => {
      const output = Object.keys(aggregatedResults).map(date => ({
        date: date,
        trip_count: aggregatedResults[date].tripIds.size,
        ...aggregatedResults[date],
        tripIds: undefined
      }));

      // Cache the computed results
      cache.set(cacheKey, output);
      res.json(output);
    });

    dataStream.on('error', error => {
      console.error('Stream processing failed:', error);
      res.status(500).send('Internal Server Error');
    });

  } catch (error) {
    console.error('Failed to process request:', error);
    res.status(500).send('Internal Server Error');
  }
});


app.post("/api/telematics/di/di_search_by_tripId", async (req, res) => {
  try {
    const { tripId } = req.body;
    const auditTables = {
      "Trip Segment": "TripSegmentAudit",
      "Trip Aggregator": "TripAggregatorAudit",
      "Sensor Writer": "SensorWriterAudit",
      "Trip Summary": "TripSummaryAudit",
      "Trip Summary Writer": "TripSummaryWriterAudit",
    };
    const tables = Object.values(auditTables);

    let result = [];
    for (const table of tables) {
      const client = new CosmosDBClient(
        process.env.TELEMATICS_INGESTION_COSMOSDB_ENDPOINT,
        process.env.TELEMATICS_INGESTION_COSMOSDB_KEY,
        process.env.TELEMATICS_INGESTION_COSMOSDB_DATABASE_ID,
        table
      );
      const resources = await client.getTripSegmentsByTripId(tripId);
      resources.sort((a, b) => (b.SegmentIndex - a.SegmentIndex));
      for (const resource of resources) {
        resource.container = table;
      };
      result = result.concat(resources);
    }
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});



app.post("/api/telematics/di/di_search_by_driverId", async (req, res) => {
  try {
    const { driverId, startDate, endDate } = req.body;
    const sDate = new Date(startDate);
    const unixStartDate = Math.floor(sDate.getTime() / 1000);
    const eDate = new Date(endDate);
    const unixEndDate = Math.floor(eDate.getTime() / 1000);
    const auditTables = {
      "Trip Segment": "TripSegmentAudit",
      "Trip Aggregator": "TripAggregatorAudit",
      "Sensor Writer": "SensorWriterAudit",
      "Trip Summary": "TripSummaryAudit",
      "Trip Summary Writer": "TripSummaryWriterAudit",
    };
    const tables = Object.values(auditTables);

    let result = [];
    for (const table of tables) {
      const client = new CosmosDBClient(
        process.env.TELEMATICS_INGESTION_COSMOSDB_ENDPOINT,
        process.env.TELEMATICS_INGESTION_COSMOSDB_KEY,
        process.env.TELEMATICS_INGESTION_COSMOSDB_DATABASE_ID,
        table
      );
      const resources = await client.getTripSegmentsByDriverId(driverId, unixStartDate, unixEndDate);
      resources.sort((a, b) => (b.SegmentIndex - a.SegmentIndex));
      for (const resource of resources) {
        resource.container = table;
      };
      result = result.concat(resources);
    }
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

app.post("/api/telematics/blt/blt_search_by_tripId", async (req, res) => {
  try {
    const { tripId } = req.body;
    const response = await new insightsClient(process.env.BLT_INSIGHT_APP_ID).getBLTMetricsByTripId(tripId);
    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500);
  }
});

app.post("/api/telematics/blt/blt_search_by_driverId", async (req, res) => {
  try {
    const { driverId, startDate, endDate } = req.body;
    const response = await new insightsClient(process.env.BLT_INSIGHT_APP_ID).getBLTMetricsByDriverId(driverId, startDate, endDate);
    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500);
  }
});


app.get("/api/download_report", async (req, res) => {
  try {
    const { file } = req.query;
    const blobClient = new BlobClient();
    const response = await blobClient.downloadBlob(file);
    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500);
  }
});

app.get("/api/download_parq", async (req, res) => {
  try {
    const { folder } = req.query;
    const blobClient = new BlobClient();
    const response = await blobClient.downloadParq(folder);
    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500);
  }
});

app.get("/api/download_table", async (req, res) => {
  try {
    const { folder } = req.query;
    const blobClient = new BlobClient();
    const response = await blobClient.downloadTable(folder);
    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500);
  }
});

app.get("/api/download_csv", async (req, res) => {
  try {
    const { file } = req.query;
    const blobClient = new BlobClient();
    const response = await blobClient.downloadCSV(file);
    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500);
  }
});

app.get("/api/download_summaries", async (req, res) => {
  try {
    const { model } = req.query;
    // TODO: this needs to be configured, not hardcoded
    const summaries = [
      "drift_summary",
      "target_drift_summary",
      "data_quality_summary",
      "model_performance_summary",
    ];
    const combined_response = {};
    for (const summary of summaries) {
      try {
        const file = `${model}/${summary}/results.csv`;
        const blobClient = new BlobClient();
        const response = await blobClient.downloadCSV(file);
        combined_response[summary] = response;
      } catch (error) {
        // Skip it
      }
    }
    res.json(combined_response);
  } catch (error) {
    console.error(error);
    res.status(500);
  }
});

app.get("/api/get_job_run", async (req, res) => {
  try {
    const { model, type, jobId, end_date } = req.query;
    // Get summary table for the job type
    // TODO: this should not be hardcoded
    let summary = type + "_summary";
    if (type == "data_drift") {
      summary = "drift_summary";
    }
    const file = `${model}/${summary}/results.csv`;
    const blobClient = new BlobClient();
    const summaryJson = await blobClient.downloadCSV(file);

    if (end_date) {
      // Find entry in the summary table by end_date
      const entry = summaryJson.find((item) => item.end_date == end_date);
      const response = { run_id: null };
      if (entry) {
        response.run_id = entry.job_run_id;
      }

      res.json(response);
    } else {
      // If the date is not supplied, find the last date 
      summaryJson.sort((a, b) => new Date(a.end_date) - new Date(b.end_date));
      const entry = summaryJson.slice(-1)[0];
      console.log(entry);
      const response = { run_id: null };
      if (entry) {
        response.run_id = entry.job_run_id;
      }

      res.json(response);
    }

  } catch (error) {
    console.error(error);
    res.status(500);
  }
});

app.get("/api/download_blob", async (req, res) => {
  try {
    const { file } = req.query;
    const blobClient = new BlobClient();
    const response = await blobClient.downloadBlob(file);
    res.json(response);
  } catch (error) {
    console.log("Failed to fetch blob for query: ", req.query);
    console.error(error);
    res.status(500);
  }
});

app.get("/api/list_blobs", async (req, res) => {
  try {
    const { prefix } = req.query;
    const blobClient = new BlobClient();
    const response = await blobClient.listBlobs(prefix);
    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500);
  }
});

app.post("/api/update_blob", async (req, res) => {
  try {
    const { file } = req.query;
    let content = req.body;
    if (typeof content !== "string") {
      content = JSON.stringify(content, null, 2);
    }
    const blobClient = new BlobClient();
    const response = await blobClient.updateBlob(file, content);
    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500);
  }
});

app.get("/api/list_table_rows", async (req, res) => {
  try {
    const { table } = req.query;
    const tableClient = new StorageTableClient();
    const response = await tableClient.listEntities(table);
    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500);
  }
});

app.get("*", (req, res) => {
  res.sendFile("index.html", { root });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});