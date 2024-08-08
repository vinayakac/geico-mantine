import { useState } from 'react';
import { jwtDecode } from 'jwt-decode';

/**
 * Component Name: UseToken
 * Description:
 * Provides functionalities to retrieve, decode, validate, and update the JWT as needed.
 *
 * Return:
 * - token: string | null - The current token from localStorage if it's valid, otherwise null.
 * - setToken: (newToken: string | null) => void - A function to update the token in localStorage and in the hook's state.
 *
 * Usage Example:
 * const [token, setToken] = UseToken();
 * useEffect(() => {
 *   if (token) {
 *     // perform actions with the token here
 *   }
 * }, [token]);
 */

interface DecodedToken {
  exp: number;
}

export const UseToken = () => {
  const [token, setTokenInternal] = useState<string | null>(() => {
    const currentToken = localStorage.getItem('brille-token');
    if (!currentToken) {
      return null;
    }
    const decodedToken: DecodedToken = jwtDecode(currentToken);
    const dateNow = new Date();
    if (decodedToken.exp < Math.floor(dateNow.getTime() / 1000)) {
      localStorage.removeItem('brille-token');
      window.location.reload();
      return null;
    } else {
      console.log(`useToken found a token and is returning it.`);
      return currentToken;
    }
  });

  const setToken = (newToken: string | null) => {
    if (newToken === null) {
      localStorage.removeItem('brille-token');
    } else {
      localStorage.setItem('brille-token', newToken);
    }
    setTokenInternal(newToken);
  };

  return [token, setToken] as const;
};
