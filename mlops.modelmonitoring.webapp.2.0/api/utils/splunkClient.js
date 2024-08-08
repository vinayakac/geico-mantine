import https from 'https';
import { HttpsProxyAgent } from 'https-proxy-agent';
import csv from 'csv-parser';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

/*
Splunk REST API Client to pull logs from Splunk Environment
*/

export class SplunkClient {
    constructor(username, password, proxyUrl, host) {
        this.username = username;
        this.password = password;
        this.proxyAgent = new HttpsProxyAgent(proxyUrl);
        this.host = host;
    }

    async search(query) {
        const data = new URLSearchParams({
            output_mode: 'csv',
            search: query
        }).toString();

        const options = {
            method: 'POST',
            agent: this.proxyAgent,
            verify: true,
            headers: {
                'Authorization': 'Basic ' + Buffer.from(`${this.username}:${this.password}`).toString('base64'),
                'Content-Type': 'application/x-www-form-urlencoded',
            }
        };
        return new Promise((resolve, reject) => {
            const req = https.request(`${this.host}/services/search/jobs/export`, options, (res) => {
                if (res.statusCode === 200) {
                    let csvData = '';
                    res.on('data', (chunk) => csvData += chunk);
                    res.on('end', () => {
                        const json_data = this.parseCsvToJson(csvData);
                        resolve(json_data);
                    });
                } else {
                    reject(new Error(`HTTP status code ${res.statusCode}`));
                }
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.write(data);
            req.end();
        });
    }

    parseCsvToJson(csvData) {
        const results = [];
        const csvReader = csv();
        csvReader.on('data', (data) => results.push(data));
        require('stream').Readable.from(csvData).pipe(csvReader);
        return results;
    }

}