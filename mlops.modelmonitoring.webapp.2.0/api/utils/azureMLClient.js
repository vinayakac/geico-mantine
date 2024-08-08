import axios from 'axios';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import https from 'https';
import { DefaultAzureCredential, InteractiveBrowserCredential } from '@azure/identity';

dotenv.config()

export const azureMLClient = class {
    constructor(token) {
        this.token = token;
        this.endpoint = `https://management.azure.com/subscriptions/${process.env.AZURE_SUBSCRIPTION_ID}/resourceGroups/${process.env.AZURE_RESOURCE_GROUP}/providers/Microsoft.MachineLearningServices/workspaces/${process.env.AZURE_WORKSPACE_ID}/models?api-version=2022-05-01`;
    }

    async getModels() {

        const response = await fetch(this.endpoint, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.token}`
            }
        });
        const data = await response.json();
        const models = data.value;
        return models;
    }
}