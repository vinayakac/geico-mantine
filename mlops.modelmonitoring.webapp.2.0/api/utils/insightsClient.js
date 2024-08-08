import fetch from 'node-fetch';
import dotenv from 'dotenv';
import https from 'https';

dotenv.config();

export const insightsClient = class {
    constructor(appId) {
        this.endpoint = `https://api.applicationinsights.io/v1/apps/${appId}/query`;
        this.httpsAgent = new https.Agent({
            rejectUnauthorized: false,
        });
    }


    mapColumsToRows(columns, rows) {
        const result = [];
        rows.forEach(row => {
            const obj = {};
            for (let i = 0; i < columns.length; i++) {
                obj[columns[i].name] = row[i];
            }
            result.push(obj);
        });

        return result;
    }
    async requestStats(timespan, model) {
        const query = `requests
        | where  name has "/score" 
        | where customDimensions has "${model}" 
        | where timestamp > ago(${timespan}) 
        | summarize request_count = count(), failed_request = count(success==False), avg_request =iif(isnan(avg(duration)), 0.0, round(avg(duration)))
        | project  request_count, failed_request,avg_request`;
        const url = this.endpoint + `?query=${query}&timespan=${timespan}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.INSIGHT_API_KEY,
            },
            agent: this.httpsAgent
        });
        const data = await response.json();
        const col = data.tables[0].columns;
        const row = data.tables[0].rows;
        const mapData = this.mapColumsToRows(col, row);
        return mapData;
    }

    async totalRequests() {
        const query = `requests| summarize total_count = count()`;
        const url = this.endpoint + `?query=${query}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.INSIGHT_API_KEY,
            },
            agent: this.httpsAgent
        });
        const data = await response.json();
        const col = data.tables[0].columns;
        const row = data.tables[0].rows;
        const mapData = this.mapColumsToRows(col, row);
        return mapData;
    }

    async requests(model, timespan, granularity) {
        const query = `requests 
            | where name has "/score"
            | where customDimensions has "${model}" 
            | summarize count() by bin(timestamp, ${granularity})`;
        const url = this.endpoint + `?query=${query}&timespan=${timespan}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.INSIGHT_API_KEY,
            },
            agent: this.httpsAgent
        });
        const data = await response.json();
        const table = data.tables[0];
        const result = {};
        const rows = table.rows;
        // Sort by timestamp
        rows.sort((a, b) => (a[0] > b[0] ? 1 : -1));
        table.columns.forEach((column, index) => {
            result[column['name']] = rows.map(row => row[index]);
        })

        return result;
    }

    async getBLTMetrics(startTimestamp, endTimestamp) {
        const currentDate = new Date();
        endTimestamp = endTimestamp ? new Date(endTimestamp).toISOString() : currentDate.toISOString();
        startTimestamp = startTimestamp ? new Date(startTimestamp).toISOString() : new Date(currentDate.getTime() - 24 * 60 * 60 * 1000).toISOString();

        const query = `
        let startTimestamp = datetime(${startTimestamp});
        let endTimestamp = datetime(${endTimestamp});
        let faildCount = totable (
            customEvents
            | where timestamp >= startTimestamp and timestamp <= endTimestamp
            | where name == "EH_TripSummary_Ingest_Failed_TripSummary"
            | project TripId = tostring(customDimensions.tripId), OSCategory = case(isnull(tolower(tostring(customDimensions.osVersion))) or tostring(customDimensions.osVersion) == "", "Unknown", tolower(tostring(customDimensions.osVersion)) contains "android", "Android", "iOS")
            | extend metrics = "FailedTripCount"                                                                        
            | summarize value = dcount(TripId) by OSCategory, metrics
        );
        let totalSuccessful = totable(
            customEvents
            | where timestamp >= startTimestamp and timestamp <= endTimestamp
            | where name == "EH_TripSummary_Ingest_Success_TripSummary"
            | project TripId = tostring(customDimensions.tripId), OSCategory = case(isnull(tolower(tostring(customDimensions.osVersion))) or tostring(customDimensions.osVersion) == "", "Unknown", tolower(tostring(customDimensions.osVersion)) contains "android", "Android", "iOS")
            | extend metrics = "SuccessfulTripCount"
            | summarize value = dcount(TripId) by OSCategory, metrics
        );
        let totalDriverCount = totable(
            customEvents
            | where timestamp >= startTimestamp and timestamp <= endTimestamp
            | where name == "EH_TripSummary_Ingest_Success_TripSummary" or name == "EH_TripSummary_Ingest_Failed_TripSummary"
            | project DriverId = tostring(customDimensions.driverId), OSCategory = "All"
            | extend metrics = "TotalDriverCount"
            | summarize value = dcount(DriverId) by OSCategory, metrics
        );
        faildCount
        | union 
        totalSuccessful
        | union 
        totalDriverCount
        | order by OSCategory`;

        const url = this.endpoint + `?query=${query}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.BLT_INSIGHT_API_KEY,
            },
            agent: this.httpsAgent
        });
        const data = await response.json();
        const col = data.tables[0].columns;
        const row = data.tables[0].rows;
        const mapData = this.mapColumsToRows(col, row);
        return mapData;
    }

    async getBLTMetricsByTripId(tripId) {
        // const currentDate = new Date();
        // endTimestamp = endTimestamp ? new Date(endTimestamp).toISOString() : currentDate.toISOString();
        // startTimestamp = startTimestamp ? new Date(startTimestamp).toISOString() : new Date(currentDate.getTime() - 24 * 60 * 60 * 1000).toISOString();

        const query = `
        let tripId = "${tripId}";
        customEvents
        | where toupper(tostring(customDimensions.tripId)) == toupper(tripId)
        | project 
        TripId = toupper(tostring(customDimensions.tripId)), 
        DriverId = tostring(customDimensions.driverId), 
        OSCategory = case(
        isnull(tolower(tostring(customDimensions.osVersion))) or tostring(customDimensions.osVersion) == "", "Unknown", 
        tolower(tostring(customDimensions.osVersion)) contains "android", "Android", 
        "IOS"
        ), Name = name, _ts = timestamp, container="BLT"
        | order by _ts asc`;

        const url = this.endpoint + `?query=${query}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.BLT_INSIGHT_API_KEY,
            },
            agent: this.httpsAgent
        });
        const data = await response.json();
        const col = data.tables[0].columns;
        const row = data.tables[0].rows;
        const mapData = this.mapColumsToRows(col, row);
        return mapData;
    }

    async getBLTMetricsByDriverId(driverId, startTimestamp, endTimestamp) {
        const currentDate = new Date();
        endTimestamp = endTimestamp ? new Date(endTimestamp).toISOString() : currentDate.toISOString();
        startTimestamp = startTimestamp ? new Date(startTimestamp).toISOString() : new Date(currentDate.getTime() - 24 * 60 * 60 * 1000).toISOString();

        const query = `
        let driverId = "${driverId}";
        let startTimestamp = datetime(${startTimestamp});
        let endTimestamp = datetime(${endTimestamp});
        customEvents
        | where toupper(tostring(customDimensions.driverId)) == toupper(driverId)
        | where timestamp >= startTimestamp and timestamp <= endTimestamp
        | where toupper(tostring(customDimensions.driverId)) == toupper(driverId)
        | where toupper(tostring(customDimensions.tripId))  <> ""
        | project TripId = toupper(tostring(customDimensions.tripId))`;
        const url = this.endpoint + `?query=${query}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.BLT_INSIGHT_API_KEY,
            },
            agent: this.httpsAgent
        });
        const data = await response.json();
        const col = data.tables[0].columns;
        const row = data.tables[0].rows;
        const mapData = this.mapColumsToRows(col, row);
        return mapData;
    }
}
