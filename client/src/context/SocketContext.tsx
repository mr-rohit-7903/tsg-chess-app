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

        const wsBase = import.meta.env.VITE_WS_BASE_URL ?? window.location.origin;
        // Assuming backend is on same origin or configured via env
        // If running separately locally, might need specific URL (e.g., http://localhost:3001)

        // Check if we are in dev mode and backend is on different port
        const socketUrl = import.meta.env.DEV ? 'http://localhost:3001' : wsBase;

        console.log('[SocketProvider] Connecting to', socketUrl);

        const newSocket = io(socketUrl, {
            auth: { token },
            reconnectionAttempts: 5,
            transports: ['websocket', 'polling'], // Matches backend
        });

        newSocket.on('connect', () => {
            console.log('[SocketProvider] Connected');
            setIsConnected(true);
        });

        newSocket.on('connect_error', (err) => {
            console.error('[SocketProvider] Connection error:', err);
            // Optional: Toast specific errors
            if (err.message === 'Authentication failed') {
                toast({ title: 'Socket Auth Failed', variant: 'destructive' });
            }
        });

        newSocket.on('disconnect', (reason) => {
            console.log('[SocketProvider] Disconnected:', reason);
            setIsConnected(false);
        });

        socketRef.current = newSocket;
        setSocket(newSocket);

        return () => {
            // We don't necessarily want to disconnect on every re-render/unmount of provider 
            // if the provider is at App root. 
            // But if user changes, we definitely want to cleanup.
            // The dependency array is [isAuthenticated, user].
            if (socketRef.current) {
                // socketRef.current.disconnect(); 
                // Actually, do we want to disconnect? Yes, if user changes.
                // But if just hot-reload? 
            }
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
