import { ConfidentialClientApplication } from '@azure/msal-node';
import getAuthClient from '../utils/authClient.js';
import dotenv from 'dotenv';

dotenv.config()

// This route is used to get environment context and pass it to the front end. Any front-end page or component that needs environment context can use it. 
// It will return a json object with two keys: "urls" and "current". "urls" is another json with the environment host url's for sandbox, preproduction, and production. "current" contains a string of "sb", "pp", or "pd" reflective of the current environment.

export const getEnvironmentUrlRoute = {
    path: '/api/environments/urls/get',
    method: 'post',
    handler: async (req, res) => {

        const sandbox = process.env.NP_URL;
        const preproduction = process.env.PP_URL;
        const production = process.env.PD_URL;

        try {
            
            res.status(200).json({urls: {sandbox, preproduction, production}, current: process.env.HOST_ENVIRONMENT})

        }
        catch {
            res.status(500).json({message: "Failed to obtain environment url's."})
        }

        
    }
}