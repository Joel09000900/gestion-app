import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
    const s = io(SOCKET_URL, {
      withCredentials: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      auth: { token: localStorage.getItem('token') || undefined },
    });

    s.on('connect', () => {
      s.emit('join:queue');
      setConnected(true);
    });

    s.on('disconnect', () => setConnected(false));

    socketRef.current = s;

    return () => s.disconnect();
  }, []);

  return (
    <SocketContext.Provider value={{ socketRef, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
