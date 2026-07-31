import React, { createContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { loadSession, saveSession, clearSession } from '../utils/storage';
import API_BASE_URL from '../config';

export const AuthContext = createContext({
  session: null,
  signIn: async () => {},
  signOut: async () => {},
  loading: true,
  socket: null,
});

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  // Re-hydrate session on app start
  useEffect(() => {
    (async () => {
      try {
        const stored = await loadSession();
        if (stored?.token) setSession(stored);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Global socket manager
  useEffect(() => {
    if (!session?.token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const socketUrl = API_BASE_URL.replace('/api', '');
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling']
    });

    const getUserIdFromToken = (token) => {
      try {
        const payload = token.split('.')[1];
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        const str = payload.replace(/-/g, '+').replace(/_/g, '/');
        let binary = '';
        const cleanStr = str.replace(/=+$/, '');
        for (let i = 0; i < cleanStr.length; i += 4) {
          const char1 = chars.indexOf(cleanStr[i]);
          const char2 = chars.indexOf(cleanStr[i+1]);
          const char3 = i + 2 < cleanStr.length ? chars.indexOf(cleanStr[i+2]) : 0;
          const char4 = i + 3 < cleanStr.length ? chars.indexOf(cleanStr[i+3]) : 0;
          
          const b1 = (char1 << 2) | (char2 >> 4);
          const b2 = ((char2 & 15) << 4) | (char3 >> 2);
          const b3 = ((char3 & 3) << 6) | char4;
          
          binary += String.fromCharCode(b1);
          if (i + 2 < cleanStr.length) binary += String.fromCharCode(b2);
          if (i + 3 < cleanStr.length) binary += String.fromCharCode(b3);
        }
        return JSON.parse(binary).id;
      } catch (e) {
        return null;
      }
    };

    const myUserId = session.userId || getUserIdFromToken(session.token);

    newSocket.on('connect', () => {
      if (myUserId) {
        newSocket.emit('join', myUserId);
      }
      if (session?.company) {
        newSocket.emit('join_company', { company: session.company, role: session.role });
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [session?.token]);

  const signIn = async (data) => {
    // data = { token, role, name, company, companyName, userId }
    await saveSession(data);
    setSession(data);
  };

  const signOut = async () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    await clearSession();
    setSession(null);
  };

  const setActiveCompany = async (companyCode) => {
    const updated = { ...session, activeCompany: companyCode };
    await saveSession(updated);
    setSession(updated);
  };

  return (
    <AuthContext.Provider value={{ session, signIn, signOut, setActiveCompany, loading, socket }}>
      {children}
    </AuthContext.Provider>
  );
}
