import { ConfidentialClientApplication } from "@azure/msal-node";

import dotenv from 'dotenv';

dotenv.config()

export default function getAuthClient() {
    const appID = process.env.APPLICATION_CLIENT_ID;
    const pswd = process.env.APPLICATION_CLIENT_SECRET;
    const authority = process.env.MICROSOFT_CLOUD_INSTANCE + process.env.MICROSOFT_TENANT_ID;

    const cca = new ConfidentialClientApplication({
        auth: {
            clientId: appID,
            clientSecret: pswd,
            authority: authority
        }
    })

    return cca;
}