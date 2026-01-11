import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/hooks/use-auth';
import { toast } from '@/hooks/use-toast';

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({ socket: null, isConnected: false });

export const useSocket = () => useContext(SocketContext);

// Get socket URL from environment or default
const getSocketUrl = () => {
    if (import.meta.env.VITE_WS_BASE_URL) {
        return import.meta.env.VITE_WS_BASE_URL;
    }
    // Default to relative path / (uses current origin)
    // This works with Vite proxy in dev and Nginx in prod
    return '/';
};

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, isAuthenticated } = useAuth();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        if (!isAuthenticated || !user) {
            if (socketRef.current) {
                console.log('[SocketProvider] Disconnecting socket due to logout');
                socketRef.current.disconnect();
                socketRef.current = null;
                setSocket(null);
                setIsConnected(false);
            }
            return;
        }

        if (socketRef.current && socketRef.current.connected) {
            // Already connected
            return;
        }

        const token = localStorage.getItem('auth_token');
        if (!token) return;

        const socketUrl = getSocketUrl();
        console.log('[SocketProvider] Connecting to', socketUrl);

        const newSocket = io(socketUrl, {
            auth: { token },
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            transports: ['websocket', 'polling'],
        });

        newSocket.on('connect', () => {
            console.log('[SocketProvider] Connected');
            setIsConnected(true);
        });

        newSocket.on('connect_error', (err) => {
            console.error('[SocketProvider] Connection error:', err);
            if (err.message === 'Authentication failed') {
                toast({ title: 'Socket Auth Failed', variant: 'destructive' });
            }
        });

        newSocket.on('disconnect', (reason) => {
            console.log('[SocketProvider] Disconnected:', reason);
            setIsConnected(false);
        });

        newSocket.on('reconnect', (attemptNumber) => {
            console.log('[SocketProvider] Reconnected after', attemptNumber, 'attempts');
            setIsConnected(true);
        });

        socketRef.current = newSocket;
        setSocket(newSocket);

        return () => {
            // Don't disconnect on re-render, only on actual unmount or user change
        };
    }, [isAuthenticated, user]);

    useEffect(() => {
        // Cleanup on unmount of the entire provider (app close)
        return () => {
            if (socketRef.current) {
                console.log('[SocketProvider] Cleanup disconnect');
                socketRef.current.disconnect();
            }
        };
    }, []);

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
};
