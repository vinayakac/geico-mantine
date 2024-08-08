import { ConfidentialClientApplication } from '@azure/msal-node';
import getAuthClient from '../utils/authClient.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import getHighestRole from '../utils/roleEvaluation.js';

dotenv.config()

export const oauthCallbackRoute = {
    path: '/user/auth/callback',
    method: 'get',
    handler: async (req, res) => {

        console.log('called the oauth callback route');

        const {code } = req.query;

        const cca = getAuthClient();

        const parsename = (name) => {
            if (name) {
                var newname = name.split(',').reverse().join(' ');
                return newname.trim();
            }
        }

        try {
            const token = await cca.acquireTokenByCode({
                scopes: ["user.read"],
                code: code,
                redirectUri: process.env.AUTH_CALLBACK_URL
            });

            //fail to log in if the user does not have at least one role
            if (!token.account.idTokenClaims.roles || token.account.idTokenClaims.roles.length === 0 ) {
                return res.redirect(`${process.env.HOST_ROOT}/login?result=failed`);
            }

            //The "roles" member of this object contains the application roles the user has access to. It is a list of the roles (for example: ['user', 'admin'])
            let highestRole = getHighestRole(token.account.idTokenClaims.roles);

            const { username, name, localAccountId } = token.account;

            jwt.sign({username: username, name: parsename(name), id: localAccountId, roles: token.account.idTokenClaims.roles, highestRole: highestRole}, "12455990", (err, token) => {
                if (err) {
                    return res.sendStatus(500);
                }
                res.redirect(`${process.env.HOST_ROOT}/login?token=${token}`);
            })
        }
        catch {
            res.redirect(`${process.env.HOST_ROOT}/login?result=failed`);
        }
    }
}

