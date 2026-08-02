import { useMemo, useState } from 'react';
import AuthContext from './auth-context';

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
    return token && user ? { token, user } : null;
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

  const value = useMemo(
    () => ({ session, createSession, closeSession }),
    [session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
