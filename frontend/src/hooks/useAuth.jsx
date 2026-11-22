import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client.js';
import { readToken, writeToken } from '../api/token.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(readToken()));
  const navigate = useNavigate();

  useEffect(() => {
    function unauthorized() {
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
        if (!controller.signal.aborted && readToken() === token && error.response?.status === 403) {
          writeToken(null);
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  async function startSession(path, fields) {
    const { data } = await apiClient.post(path, fields);
    writeToken(data.token);
    setUser(data.user);
    setLoading(false);
    return data.user;
  }

  function logout() {
    writeToken(null);
    setUser(null);
    navigate('/', { replace: true });
  }

  return <AuthContext.Provider value={{
    user, loading, login: (fields) => startSession('/auth/login', fields),
    signup: (fields) => startSession('/auth/signup', fields), logout,
  }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
