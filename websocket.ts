import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { storage } from './storage';

interface Client {
  userId: number;
  ws: WebSocket;
}

type MessagePayload = {
  type: string;
  data: any;
};

export function setupWebsocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server: server, path: '/ws' });
  const clients: Map<number, WebSocket> = new Map();

  wss.on('connection', (ws: WebSocket) => {
    let userId: number | null = null;

    ws.on('message', async (data: string) => {
      try {
        const message: MessagePayload = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'auth':
            // Authenticate the client
            if (typeof message.data.userId === 'number') {
              const authenticatedUserId = message.data.userId;
              userId = authenticatedUserId;
              clients.set(authenticatedUserId, ws);
              sendToClient(ws, { 
                type: 'auth_success', 
                data: { userId: authenticatedUserId } 
              });
            } else {
              sendToClient(ws, { 
                type: 'error', 
                data: { message: 'Invalid userId format' } 
              });
            }
            break;
            
          case 'new_message':
            if (!userId) {
              sendToClient(ws, { 
                type: 'error', 
                data: { message: 'Not authenticated' } 
              });
              return;
            }
            
            const { receiverId, content, relatedListingId, relatedOrderId } = message.data;
            
            // Store the message
            const newMessage = await storage.createMessage({
              senderId: userId,
              receiverId,
              content,
              relatedListingId,
              relatedOrderId,
              status: 'unread'
            });
            
            // Notify the receiver if they're online
            const receiverWs = clients.get(receiverId);
            if (receiverWs && receiverWs.readyState === WebSocket.OPEN) {
              sendToClient(receiverWs, {
                type: 'new_message',
                data: newMessage
              });
            }
            
            // Confirm to the sender
            sendToClient(ws, {
              type: 'message_sent',
              data: newMessage
            });
            break;
            
          case 'new_order':
            if (!userId) {
              sendToClient(ws, { 
                type: 'error', 
                data: { message: 'Not authenticated' } 
              });
              return;
            }
            
            const { order } = message.data;
            const newOrder = await storage.createOrder({
              ...order,
              buyerId: userId
            });
            
            // Notify the seller
            const sellerWs = clients.get(order.sellerId);
            if (sellerWs && sellerWs.readyState === WebSocket.OPEN) {
              sendToClient(sellerWs, {
                type: 'new_order',
                data: newOrder
              });
            }
            
            // Confirm to the buyer
            sendToClient(ws, {
              type: 'order_created',
              data: newOrder
            });
            break;
            
          case 'order_status_update':
            if (!userId) {
              sendToClient(ws, { 
                type: 'error', 
                data: { message: 'Not authenticated' } 
              });
              return;
            }
            
            const { orderId, status } = message.data;
            const existingOrder = await storage.getOrderById(orderId);
            
            if (!existingOrder) {
              sendToClient(ws, { 
                type: 'error', 
                data: { message: 'Order not found' } 
              });
              return;
            }
            
            // Check if user is the seller
            if (existingOrder.sellerId !== userId) {
              sendToClient(ws, { 
                type: 'error', 
                data: { message: 'Unauthorized to update this order' } 
              });
              return;
            }
            
            const updatedOrder = await storage.updateOrder(orderId, { status });
            
            // Notify the buyer
            const buyerWs = clients.get(existingOrder.buyerId);
            if (buyerWs && buyerWs.readyState === WebSocket.OPEN) {
              sendToClient(buyerWs, {
                type: 'order_updated',
                data: updatedOrder
              });
            }
            
            // Confirm to the seller
            sendToClient(ws, {
              type: 'order_update_success',
              data: updatedOrder
            });
            break;
            
          case 'listing_update':
            if (!userId) {
              sendToClient(ws, { 
                type: 'error', 
                data: { message: 'Not authenticated' } 
              });
              return;
            }
            
            // Broadcast to all clients that a listing has been updated
            // This is useful for real-time updates on the marketplace
            broadcastToAll({
              type: 'listing_changed',
              data: message.data
            });
            break;
            
          default:
            sendToClient(ws, { 
              type: 'error', 
              data: { message: 'Unknown message type' } 
            });
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        sendToClient(ws, { 
          type: 'error', 
          data: { message: 'Invalid message format' } 
        });
      }
    });

    ws.on('close', () => {
      if (userId) {
        clients.delete(userId);
      }
    });
    
    // Initial connection message
    sendToClient(ws, { 
      type: 'connected', 
      data: { message: 'Connected to Izenzo Trading Platform' } 
    });
  });

  function sendToClient(client: WebSocket, data: any): void {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  }

  function broadcastToAll(data: any): void {
    const message = JSON.stringify(data);
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  return wss;
}
