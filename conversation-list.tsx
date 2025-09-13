import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";

type Conversation = {
  userId: number;
  userName: string;
  userAvatar?: string;
  lastMessage: string;
  lastMessageTime: Date;
  unread: number;
};

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: number | null;
  onSelect: (userId: number) => void;
}

export function ConversationList({ conversations, selectedId, onSelect }: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  
  const filteredConversations = conversations.filter(conversation => 
    conversation.userName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const formatDate = (date: Date) => {
    if (isToday(date)) {
      return format(date, 'h:mm a');
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'MMM d');
    }
  };

  const truncateMessage = (message: string, maxLength = 25) => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 border-b space-y-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      
      <CardContent className="p-0 flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-neutral-500">
            No conversations found
          </div>
        ) : (
          <ul className="divide-y">
            {filteredConversations.map((conversation) => (
              <li key={conversation.userId}>
                <Button
                  variant="ghost"
                  className={`w-full justify-start px-4 py-3 h-auto ${
                    selectedId === conversation.userId ? 'bg-neutral-100' : ''
                  }`}
                  onClick={() => onSelect(conversation.userId)}
                >
                  <div className="flex items-center w-full">
                    <Avatar className="h-10 w-10 mr-3 flex-shrink-0">
                      <AvatarImage src={conversation.userAvatar} alt={conversation.userName} />
                      <AvatarFallback>{getInitials(conversation.userName)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <span className="font-medium truncate">{conversation.userName}</span>
                        <span className="text-xs text-neutral-500 whitespace-nowrap ml-2">
                          {formatDate(conversation.lastMessageTime)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-sm text-neutral-600 truncate">
                          {truncateMessage(conversation.lastMessage)}
                        </span>
                        {conversation.unread > 0 && (
                          <Badge 
                            className="ml-2 bg-primary text-white h-5 min-w-5 flex items-center justify-center rounded-full p-0 px-1.5"
                          >
                            {conversation.unread}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
