import { useEffect, useMemo, useState } from 'react';
import AuthContext from './auth-context';

const getTokenExpiration = (token) => {
  try {
    const encodedPayload = token.replace(/^Bearer\s+/i, '').split('.')[1];
    if (!encodedPayload) return null;

    const base64 = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
};

const isTokenExpired = (token) => {
  const expiration = getTokenExpiration(token);
  return expiration !== null && expiration <= Date.now();
};

const getStoredUser = () => {
  const storedUser = localStorage.getItem('user');
  if (!storedUser) return null;

  try {
    return JSON.parse(storedUser);
  } catch {
    localStorage.removeItem('user');
    return null;
  }
};

export default function AuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    const token = localStorage.getItem('token');
    const user = getStoredUser();

    if (!token || !user || isTokenExpired(token)) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return null;
    }

    return { token, user };
  });

  const createSession = ({ user, token }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setSession({ user, token });
  };

  const closeSession = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setSession(null);
  };

  useEffect(() => {
    window.addEventListener('auth:unauthorized', closeSession);
    return () => window.removeEventListener('auth:unauthorized', closeSession);
  }, []);

  useEffect(() => {
    if (!session?.token) return undefined;

    const expiration = getTokenExpiration(session.token);
    if (expiration === null) return undefined;

    const remainingTime = expiration - Date.now();
    if (remainingTime <= 0) {
      closeSession();
      return undefined;
    }

    const expirationTimer = window.setTimeout(closeSession, remainingTime);
    return () => window.clearTimeout(expirationTimer);
  }, [session]);

  const value = useMemo(
    () => ({ session, createSession, closeSession }),
    [session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
