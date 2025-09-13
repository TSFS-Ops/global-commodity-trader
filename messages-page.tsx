import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/hooks/use-websocket";
import { ChatInterface } from "@/components/messages/chat-interface";
import { ConversationList } from "@/components/messages/conversation-list";
import { Card } from "@/components/ui/card";
import { Loader2, MessageSquare } from "lucide-react";

type Conversation = {
  userId: number;
  userName: string;
  userAvatar?: string;
  lastMessage: string;
  lastMessageTime: Date;
  unread: number;
};

export default function MessagesPage() {
  const { user } = useAuth();
  const { sendMessage, subscribe, isConnected } = useWebSocket();
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  // Fetch all user's messages
  const { data: messages, isLoading: isMessagesLoading } = useQuery({
    queryKey: ["/api/messages"],
    enabled: !!user,
    staleTime: 30 * 1000, // 30 seconds
  });

  // When messages load, organize them into conversations
  useEffect(() => {
    if (!messages || !user) return;

    // Group messages by conversation partner
    const conversationMap = new Map<number, Conversation>();

    messages.forEach((message: any) => {
      // Determine the other person in the conversation
      const otherUserId = message.senderId === user.id ? message.receiverId : message.senderId;
      
      // If this is the first message we've seen for this conversation, create an entry
      if (!conversationMap.has(otherUserId)) {
        const userName = message.senderId === user.id 
          ? message.receiverName || `User #${otherUserId}`
          : message.senderName || `User #${otherUserId}`;

        conversationMap.set(otherUserId, {
          userId: otherUserId,
          userName: userName,
          userAvatar: message.senderId === user.id ? message.receiverAvatar : message.senderAvatar,
          lastMessage: message.content,
          lastMessageTime: new Date(message.createdAt),
          unread: message.senderId !== user.id && message.status === 'unread' ? 1 : 0
        });
      } else {
        // Update the conversation with the latest message if necessary
        const currentConversation = conversationMap.get(otherUserId)!;
        const messageDate = new Date(message.createdAt);
        
        if (messageDate > currentConversation.lastMessageTime) {
          currentConversation.lastMessage = message.content;
          currentConversation.lastMessageTime = messageDate;
          
          // Only count unread messages sent to the current user
          if (message.senderId !== user.id && message.status === 'unread') {
            currentConversation.unread += 1;
          }
          
          conversationMap.set(otherUserId, currentConversation);
        } else if (message.senderId !== user.id && message.status === 'unread') {
          // Count unread messages even if they're not the latest
          currentConversation.unread += 1;
          conversationMap.set(otherUserId, currentConversation);
        }
      }
    });

    // Sort conversations by most recent message
    const sortedConversations = Array.from(conversationMap.values())
      .sort((a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime());

    setConversations(sortedConversations);

    // If no conversation is selected and we have conversations, select the first one
    if (selectedConversation === null && sortedConversations.length > 0) {
      setSelectedConversation(sortedConversations[0].userId);
    }
  }, [messages, user]);

  // Subscribe to new messages via WebSocket
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribe('new_message', (data) => {
      // Refresh messages query when a new message arrives
      // This will also update the conversations
      window.location.reload();
    });

    return () => {
      unsubscribe();
    };
  }, [user, subscribe]);

  const handleSendMessage = (content: string) => {
    if (!selectedConversation || !isConnected) return false;

    sendMessage('new_message', {
      receiverId: selectedConversation,
      content
    });

    return true;
  };

  if (!user) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-medium mb-2">Authentication required</h2>
            <p className="text-neutral-600 mb-4">Please log in to view your messages</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-800">Messages</h1>
      </div>

      {isMessagesLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : conversations.length === 0 ? (
        <Card className="p-8 text-center">
          <MessageSquare className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No messages yet</h3>
          <p className="text-neutral-600">
            You haven't started any conversations. Visit product listings to contact sellers.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
          {/* Conversation list */}
          <div className="md:col-span-1 overflow-hidden">
            <ConversationList 
              conversations={conversations}
              selectedId={selectedConversation}
              onSelect={setSelectedConversation}
            />
          </div>

          {/* Chat interface */}
          <div className="md:col-span-2 overflow-hidden">
            {selectedConversation ? (
              <ChatInterface 
                partnerId={selectedConversation}
                partnerName={conversations.find(c => c.userId === selectedConversation)?.userName || ''}
                onSendMessage={handleSendMessage}
              />
            ) : (
              <Card className="p-8 text-center h-full flex items-center justify-center">
                <div>
                  <MessageSquare className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
                  <p className="text-neutral-600">
                    Choose a conversation from the list to start messaging
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}
    </MainLayout>
  );
}
