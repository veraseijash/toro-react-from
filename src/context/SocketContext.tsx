import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { io, Socket } from 'socket.io-client';

export interface ChatMessage {
  id: number;
  senderUserId: number;
  recipientUserId: number;
  content: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;

  recipient: {
    id: number;
    name: string;
    user_name: string;
    url_photo: string | null;
  } | null;
}

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  connected: false,
});

interface SocketProviderProps {
  userId: number;
  children: ReactNode;
}

export function SocketProvider({
  userId,
  children,
}: SocketProviderProps) {
  const [connected, setConnected] = useState(false);

  const socket = useMemo(() => {
    if (!userId) {
      return null;
    }

    return io('http://localhost:3000', {
      autoConnect: false,
      transports: ['websocket'],

      // El backend usa este ID para agregar el socket
      // a la sala privada del usuario.
      auth: {
        userId,
      },

      // Reconexión automática
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
  }, [userId]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleConnect = () => {
      console.log('Socket conectado:', socket.id);
      setConnected(true);
    };

    const handleDisconnect = (reason: string) => {
      console.log('Socket desconectado:', reason);
      setConnected(false);
    };

    const handleConnectError = (error: Error) => {
      console.error('Error de conexión:', error.message);
      setConnected(false);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);

    socket.connect();

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.disconnect();
    };
  }, [socket]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}