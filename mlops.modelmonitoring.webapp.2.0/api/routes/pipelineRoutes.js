import dotenv from "dotenv";
import { CosmosClient } from '@azure/cosmos';
import {
    DefaultAzureCredential,
    InteractiveBrowserCredential,
} from "@azure/identity";
import NodeCache from "node-cache";

dotenv.config();

let credential;
if (process.env.NODE_ENV == "development") {
    credential = new InteractiveBrowserCredential();
} else {
    credential = new DefaultAzureCredential();
}
const cache = new NodeCache({ stdTTL: 3600 }); // Cache results for 1 hour

export const getTripLogsRoute = {
    path: "/api/get_trip_logs",
    method: "get",
    handler: async (req, res) => {
        try {
            const { trip_id, table } = req.query;
            const client = new CosmosClient({
                endpoint: process.env.TELEMATICS_INGESTION_COSMOSDB_ENDPOINT,
                key: process.env.TELEMATICS_INGESTION_COSMOSDB_KEY,
                logging: { level: "debug" }
            });
            //const client = new CosmosClient({ endpoint: "https://gze-amlcos-pd1-cdb-001.documents.azure.com:443/", aadCredentials: credential });
            let result = [];
            let container;
            let queryKey;
            let resources;

            if (table == "All" || table == "Trip Segment") {
                container = client.database("v2.pp.dv.Telematics").container("TripSegmentAudit");
                queryKey = `${container.id}_${trip_id}`;
                // Check if the result is already in the cache
                resources = cache.get(queryKey);
                if (resources === undefined) {
                    ({ resources } = await container.items
                        .query(`SELECT * from c where upper(c.TripID)='${trip_id}' order by c.SegmentIndex Desc`)
                        .fetchAll());
                    // cache.put(queryKey, resources);
                }
                for (const resource of resources) {
                    resource.container = "TripSegmentAudit";
                }
                result = result.concat(resources);
            }
            
            if (table == "All" || table == "Trip Aggregator") {
                container = client.database("v2.pp.dv.Telematics").container("TripAggregatorAudit");
                queryKey = `${container.id}_${trip_id}`;
                resources = cache.get(queryKey);
                if (resources === undefined) {
                    ({ resources } = await container.items
                        .query(`SELECT * from c where upper(c.TripID)='${trip_id}' order by c.SegmentIndex ASC`)
                        .fetchAll());
                    // cache.put(queryKey, resources);
                }
                for (const resource of resources) {
                    resource.container = "TripAggregatorAudit";
                }
                result = result.concat(resources);
            }

            if (table == "All" || table == "Sensor Writer") {
                container = client.database("v2.pp.dv.Telematics").container("SensorWriterAudit");
                queryKey = `${container.id}_${trip_id}`;
                resources = cache.get(queryKey);
                if (resources === undefined) {
                    ({ resources } = await container.items
                        .query(`SELECT * from c where upper(c.TripID)='${trip_id}' order by c.SegmentIndex ASC`)
                        .fetchAll());
                    // cache.put(queryKey, resources);
                }
                for (const resource of resources) {
                    resource.container = "SensorWriterAudit";
                }
                result = result.concat(resources);
            }
            
            if (table == "All" || table == "Trip Summary") {
                container = client.database("v2.pp.dv.Telematics").container("TripSummaryAudit");
                queryKey = `${container.id}_${trip_id}`;
                resources = cache.get(queryKey);
                if (resources == undefined) {
                    ({ resources } = await container.items
                        .query(`SELECT * from c where upper(c.TripID)='${trip_id}' order by c.SegmentIndex ASC`)
                        .fetchAll());
                    // cache.put(queryKey, resources);
                }
                for (const resource of resources) {
                    resource.container = "TripSummaryAudit";
                }
                result = result.concat(resources);
            }

            if (table == "All" || table == "Trip Summary Writer") {
                container = client.database("v2.pp.dv.Telematics").container("TripSummaryWriterAudit");
                queryKey = `${container.id}_${trip_id}`;
                resources = cache.get(queryKey);
                if (resources == undefined) {
                    ({ resources } = await container.items
                        .query(`SELECT * from c where upper(c.TripID)='${trip_id}' order by c.SegmentIndex ASC`)
                        .fetchAll());
                    // cache.put(queryKey, resources);
                }
                for (const resource of resources) {
                    resource.container = "TripSummaryWriterAudit";
                }
                result = result.concat(resources);
            }

            res.json(result);
        } catch (error) {
            console.error(error);
            res.status(500);
        }
    }
};

export const getTripAllLogsRoute = {
    path: "/api/get_trip_all_logs",
    method: "get",
    handler: async (req, res) => {
        try {
            const { trip_id } = req.query;
            const client = new CosmosClient({
                endpoint: process.env.TELEMATICS_INGESTION_COSMOSDB_ENDPOINT,
                key: process.env.TELEMATICS_INGESTION_COSMOSDB_KEY,
                logging: { level: "debug" }
            });
            //const client = new CosmosClient({ endpoint: "https://gze-amlcos-pd1-cdb-001.documents.azure.com:443/", aadCredentials: credential });
            let result = [];
            let container;
            let queryKey;
            let resources;
            const auditTables = {
                "Trip Segment": "TripSegmentAudit",
                "Trip Aggregator": "TripAggregatorAudit",
                "Sensor Writer": "SensorWriterAudit",
                "Trip Summary": "TripSummaryAudit",
                "Trip Summary Writer": "TripSummaryWriterAudit",
            };
            const tables = Object.values(auditTables);

            for (const table of tables) {
                container = client.database("v2.pp.dv.Telematics").container(table);
                queryKey = `${container.id}_${trip_id}`;
                // Check if the result is already in the cache
                resources = cache.get(queryKey);
                if (resources === undefined) {
                    ({ resources } = await container.items
                        .query(`SELECT * from c where upper(c.TripID)='${trip_id}' order by c.SegmentIndex Desc`)
                        .fetchAll());
                    // cache.put(queryKey, resources);
                }
                for (const resource of resources) {
                    resource.container = table;
                }
                result = result.concat(resources);
            };
            
            res.json(result);
        } catch (error) {
            console.error(error);
            res.status(500);
        }
    }
};

export const getDriverAllTripsRoute = {
    path: "/api/get_driver_all_trips",
    method: "get",
    handler: async (req, res) => {
        try {
            const { driver_id , start_dt , end_dt } = req.query;
            // convert date to unix_timestamp
            const strt_date = new Date(start_dt);
            const unix_strt_dt = Math.floor(strt_date.getTime() / 1000);
            
            const end_date = new Date(end_dt);
            const unix_end_dt = Math.floor(end_date.getTime() / 1000);


            const client = new CosmosClient({
                endpoint: process.env.TELEMATICS_INGESTION_COSMOSDB_ENDPOINT,
                key: process.env.TELEMATICS_INGESTION_COSMOSDB_KEY,
                logging: { level: "debug" }
            });
            //const client = new CosmosClient({ endpoint: "https://gze-amlcos-pd1-cdb-001.documents.azure.com:443/", aadCredentials: credential });
            let result = [];
            let container;
            let queryKey;
            let resources;
            const auditTables = {
                "Trip Segment": "TripSegmentAudit",
                "Trip Aggregator": "TripAggregatorAudit",
                "Sensor Writer": "SensorWriterAudit",
                "Trip Summary": "TripSummaryAudit",
                "Trip Summary Writer": "TripSummaryWriterAudit",
            };
            const tables = Object.values(auditTables);

            for (const table of tables) {
                container = client.database("v2.pp.dv.Telematics").container(table);
                queryKey = `${container.id}_${driver_id}`;
                // Check if the result is already in the cache
                resources = cache.get(queryKey);
                if (resources === undefined) {
                    ({ resources } = await container.items
                      
                        .query(`SELECT * from c where c.DriverID='${driver_id}' and c._ts <= ${unix_end_dt} and c._ts >= ${unix_strt_dt}`)
                        .fetchAll());
                    // cache.put(queryKey, resources);
                }
                for (const resource of resources) {
                    resource.container = table;
                }
                result = result.concat(resources);
            };
            
            res.json(result);
        } catch (error) {
            console.error(error);
            res.status(500);
        }
    }
};