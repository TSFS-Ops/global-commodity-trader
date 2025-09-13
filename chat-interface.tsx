import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface ChatInterfaceProps {
  partnerId: number;
  partnerName: string;
  onSendMessage: (content: string) => boolean;
}

export function ChatInterface({ partnerId, partnerName, onSendMessage }: ChatInterfaceProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch conversation with the selected partner
  const { data: conversation, isLoading, isError } = useQuery({
    queryKey: [`/api/messages/${partnerId}`],
    enabled: !!partnerId && !!user,
    staleTime: 10 * 1000, // 10 seconds
  });

  // Mark messages as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: number) => {
      const res = await apiRequest("PATCH", `/api/messages/${messageId}/read`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: [`/api/messages/${partnerId}`] });
    }
  });

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation]);

  // Mark unread messages as read when viewed
  useEffect(() => {
    if (!conversation || !user) return;

    // Find messages that are sent to the current user and are unread
    const unreadMessages = conversation.filter(
      (msg: any) => msg.receiverId === user.id && msg.status === 'unread'
    );

    // Mark each unread message as read
    unreadMessages.forEach((msg: any) => {
      markAsReadMutation.mutate(msg.id);
    });
  }, [conversation, user, markAsReadMutation, partnerId]);

  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    try {
      const success = onSendMessage(message);
      
      if (success) {
        setMessage("");
        // Optimistically update the UI
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: [`/api/messages/${partnerId}`] });
        }, 500);
      } else {
        setError("Failed to send message. Please try again.");
      }
    } catch (err) {
      setError("An error occurred while sending your message.");
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return format(date, 'h:mm a');
    } else {
      return format(date, 'MMM d, h:mm a');
    }
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="flex flex-row items-center pb-3 border-b space-y-0">
        <Avatar className="h-10 w-10 mr-3">
          <AvatarFallback>{getInitials(partnerName)}</AvatarFallback>
        </Avatar>
        <div>
          <div className="font-medium">{partnerName}</div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mb-2" />
            <h3 className="font-medium text-lg">Failed to load messages</h3>
            <p className="text-neutral-600">There was an error loading your conversation.</p>
          </div>
        ) : conversation && conversation.length > 0 ? (
          <>
            {conversation.map((msg: any) => {
              const isOwnMessage = msg.senderId === user?.id;
              
              return (
                <div 
                  key={msg.id} 
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[75%] rounded-lg px-4 py-2 ${
                      isOwnMessage 
                        ? 'bg-primary text-white rounded-br-none' 
                        : 'bg-neutral-100 text-neutral-800 rounded-bl-none'
                    }`}
                  >
                    <div className="break-words">{msg.content}</div>
                    <div 
                      className={`text-xs mt-1 ${
                        isOwnMessage ? 'text-white/70' : 'text-neutral-500'
                      }`}
                    >
                      {formatMessageTime(msg.createdAt)}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="p-3 rounded-full bg-neutral-100 mb-2">
              <Send className="h-6 w-6 text-neutral-400" />
            </div>
            <h3 className="font-medium">Start a conversation</h3>
            <p className="text-neutral-600 text-sm mt-1">
              Send a message to {partnerName}
            </p>
          </div>
        )}
      </CardContent>
      
      {error && (
        <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}
      
      <div className="p-4 border-t">
        <div className="flex space-x-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSendMessage();
              }
            }}
          />
          <Button 
            onClick={handleSendMessage}
            disabled={!message.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
