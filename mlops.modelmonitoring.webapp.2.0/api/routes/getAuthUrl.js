import { ConfidentialClientApplication } from '@azure/msal-node';
import getAuthClient from '../utils/authClient.js';
import dotenv from 'dotenv';

dotenv.config()

export const getAuthUrlRoute = {
    path: '/user/auth/geturl',
    method: 'post',
    handler: async (req, res) => {


        const cca = getAuthClient();

        try {
            // const token = await cca.acquireTokenByUsernamePassword({username: username, password: password, scopes: ['user.read']});
            const url = await cca.getAuthCodeUrl({
                scopes: ["user.read"],
                redirectUri: process.env.AUTH_CALLBACK_URL 
            });
            // console.log(url);
        
            res.status(200).json({url: url})

        }
        catch {
            res.status(403).json({message: "Unauthorized"})
        }

        
    }
}