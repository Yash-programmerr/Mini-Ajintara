import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client.js';
import { readToken, writeToken } from '../api/token.js';

import { AuthContext } from './useAuth.js';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(readToken()));
  const [restoreError, setRestoreError] = useState(null);
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    function unauthorized() {
      setRestoreError(null);
      setUser(null);
      setLoading(false);
      const { pathname, search, hash } = window.location;
      if (pathname !== '/login') {
        navigate('/login', { replace: true, state: { from: pathname + search + hash } });
      }
    }
    window.addEventListener('auth:unauthorized', unauthorized);
    return () => window.removeEventListener('auth:unauthorized', unauthorized);
  }, [navigate]);

  useEffect(() => {
    const token = readToken();
    if (!token) return;
    const controller = new AbortController();
    apiClient.get('/auth/me', { signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted && readToken() === token) setUser(data.user);
      })
      .catch((error) => {
        if (controller.signal.aborted || readToken() !== token) return;
        if (error.response?.status === 403) writeToken(null);
        else setRestoreError(error);
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [restoreAttempt]);

  function retryRestore() {
    setRestoreError(null);
    setLoading(true);
    setRestoreAttempt((count) => count + 1);
  }

  async function startSession(path, fields) {
    const { data } = await apiClient.post(path, fields);
    writeToken(data.token);
    setRestoreError(null);
    setUser(data.user);
    setLoading(false);
    return data.user;
  }

  function logout() {
    writeToken(null);
    setRestoreError(null);
    setUser(null);
    navigate('/', { replace: true });
  }

  return <AuthContext.Provider value={{
    user, loading, restoreError, retryRestore, login: (fields) => startSession('/auth/login', fields),
    signup: (fields) => startSession('/auth/signup', fields), logout,
  }}>{children}</AuthContext.Provider>;
}
