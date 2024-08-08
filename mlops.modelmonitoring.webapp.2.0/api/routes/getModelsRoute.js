import { ConfidentialClientApplication } from '@azure/msal-node';
import getAuthClient from '../utils/authClient.js';
import dotenv from 'dotenv';
import { DefaultAzureCredential, InteractiveBrowserCredential } from '@azure/identity';
import { azureMLClient } from '../utils/azureMLClient.js';

dotenv.config();

export const getModelsRoute = {
    path: '/api/models',
    method: 'get',
    handler: async (req, res) => {

    let credential;
    if (process.env.NODE_ENV == 'development') {
        credential = new InteractiveBrowserCredential();
    } else {
        credential = new DefaultAzureCredential();
    }

    const tokenResponse = await credential.getToken('https://management.azure.com/.default');
    let models = [];

        try {
            const models = await new azureMLClient(tokenResponse.token).getModels();
            res.json(models);
        } catch (error) {
            // Sometimes Azure tries to authenticate twice and second fails.
            console.error(error);
            if (models.length == 0) {
                res.status(500);
            }
        }
    }
}
