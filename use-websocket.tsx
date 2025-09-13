import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './use-auth';

type MessageHandler = (data: any) => void;

export function useWebSocket() {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const messageHandlersRef = useRef<Map<string, MessageHandler[]>>(new Map());

  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) return;
    
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;
    
    socket.onopen = () => {
      setIsConnected(true);
      console.log('WebSocket connected');
      
      // Authenticate the connection if user is logged in
      if (user) {
        socket.send(JSON.stringify({
          type: 'auth',
          data: { userId: user.id }
        }));
      }
    };
    
    socket.onclose = (event) => {
      setIsConnected(false);
      console.log('WebSocket disconnected', event.code, event.reason);
      
      // Only try to reconnect if the connection wasn't closed intentionally
      if (event.code !== 1000 && event.code !== 1001 && user) {
        setTimeout(() => {
          if (user && socketRef.current?.readyState !== WebSocket.OPEN) {
            connect();
          }
        }, 5000);
      }
    };
    
    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };
    
    socket.onmessage = (event) => {
      try {
        if (!event.data || typeof event.data !== 'string') {
          console.warn('Received invalid WebSocket message data');
          return;
        }
        
        const message = JSON.parse(event.data);
        setLastMessage(message);
        
        // Call all registered handlers for this message type
        if (message?.type) {
          const handlers = messageHandlersRef.current.get(message.type) || [];
          handlers.forEach(handler => handler(message.data));
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    return () => {
      socket.close();
    };
  }, [user]);
  
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
  }, []);
  
  const sendMessage = useCallback((type: string, data: any) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      console.error('WebSocket is not connected');
      return false;
    }
    
    socketRef.current.send(JSON.stringify({ type, data }));
    return true;
  }, []);
  
  const subscribe = useCallback((messageType: string, handler: MessageHandler) => {
    const handlers = messageHandlersRef.current.get(messageType) || [];
    messageHandlersRef.current.set(messageType, [...handlers, handler]);
    
    // Return unsubscribe function
    return () => {
      const handlers = messageHandlersRef.current.get(messageType) || [];
      messageHandlersRef.current.set(
        messageType,
        handlers.filter(h => h !== handler)
      );
    };
  }, []);
  
  // Connect when user logs in, disconnect when user logs out
  useEffect(() => {
    if (user) {
      connect();
    } else {
      disconnect();
    }
    
    return () => {
      disconnect();
    };
  }, [user, connect, disconnect]);
  
  return {
    isConnected,
    lastMessage,
    sendMessage,
    subscribe,
    connect,
    disconnect
  };
}
