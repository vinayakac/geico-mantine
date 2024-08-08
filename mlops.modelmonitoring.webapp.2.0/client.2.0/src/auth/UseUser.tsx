import { Buffer } from 'buffer';
import { UseToken } from './UseToken';
import { useState, useEffect } from 'react';

/**
 * Component Name:
 * UseUser Component
 *
 * Description:
 * Decodes jwt token and returns the user object.
 *
 * Usage Example:
 * const user = UseUser();
 * useEffect(() => {
 *   if (user) {
 *     // perform actions with the user here
 *   }
 * }, [user]);
 **/

export const UseUser = () => {
  const [token, setToken] = UseToken();
  const decodeToken = (token: any) => {
    try {
      if (!token) return null;
      const encodedPayload = token.split('.')[1];
      var buff = Buffer.from(encodedPayload, 'base64');
      const payload = JSON.parse(buff.toString('ascii'));
      return payload;
    } catch (error) {
      console.error('Token decoding error:', error);
      return null;
    }
  };

  const [user, setUser] = useState(() => decodeToken(token));

  useEffect(() => {
    setUser(decodeToken(token));
  }, [token]);

  return user;
};
