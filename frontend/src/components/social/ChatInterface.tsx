'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

interface Message {
  id: string;
  content: string;
  sender: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  timestamp: string;
}

interface ChatInterfaceProps {
  roomId?: string;
  recipientId?: string;
  recipientName?: string;
  isGroupChat?: boolean;
}

export function ChatInterface({ 
  roomId, 
  recipientId, 
  recipientName, 
  isGroupChat = false 
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState(roomId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (currentRoomId) {
      loadMessages();
    }
  }, [currentRoomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    if (!currentRoomId) return;
    
    try {
      // In a real implementation, you would load messages from Matrix
      // For now, we'll simulate an empty message list
      setMessages([]);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    setLoading(true);
    try {
      if (!currentRoomId && recipientId) {
        // Create direct message
        const response = await api.post('/social/messages/direct', {
          recipientId,
          message: newMessage,
        });
        setCurrentRoomId(response.data.roomId);
      } else if (currentRoomId) {
        // Send message to existing room
        await api.post(`/social/rooms/${currentRoomId}/message`, {
          message: newMessage,
        });
      }

      // Add message to local state (in real app, this would come from Matrix events)
      const newMsg: Message = {
        id: Date.now().toString(),
        content: newMessage,
        sender: {
          id: 'current-user',
          username: 'You',
        },
        timestamp: new Date().toISOString(),
      };
      
      setMessages(prev => [...prev, newMsg]);
      setNewMessage('');
      
      toast({
        title: 'Message sent',
        description: 'Your message has been delivered.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2">
          {isGroupChat ? <Users className="h-5 w-5" /> : null}
          <span>{recipientName || 'Chat'}</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 px-4">
          <div className="space-y-4 pb-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className="flex items-start space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={message.sender.avatarUrl} />
                    <AvatarFallback>
                      {message.sender.username[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-sm">
                        {message.sender.username}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm mt-1">{message.content}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        
        <div className="p-4 border-t">
          <div className="flex space-x-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              disabled={loading}
            />
            <Button 
              onClick={sendMessage} 
              disabled={loading || !newMessage.trim()}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}