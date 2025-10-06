import React from 'react';
import { MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface MessageButtonProps {
  recipientId: string; 
  recipientRole: 'employer' | 'pharmacist' | 'säljare' | 'egenvårdsrådgivare';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  buttonClassName?: string;
}

export function MessageButton({ 
  recipientId, 
  recipientRole, 
  size = 'md',
  buttonClassName = ''
}: MessageButtonProps) {
  const navigate = useNavigate();
  
  const startConversation = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to send messages');
        return;
      }
      // Create or get existing conversation
      const { data: conversationId, error: rpcError } = await supabase
        .rpc('create_conversation', {
          user1_id: user.id,
          user2_id: recipientId
        });
      if (rpcError) throw rpcError;
      
      // Navigate to messages with the conversation ID
      navigate('/messages', { state: { selectedConversationId: conversationId } });
    } catch (err) {
      console.error('Error starting conversation:', err);
      toast.error('Failed to start conversation');
    }
  };

  // Size classes mapping
  const sizeClasses = {
    xs: "px-2 py-1 text-xs",
    sm: "px-2.5 py-1.5 text-sm",
    md: "px-3 py-2 text-sm",
    lg: "px-4 py-2 text-base"
  };

  return (
    <button
      onClick={startConversation}
      className={`inline-flex items-center justify-center border border-transparent font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors ${sizeClasses[size]} ${buttonClassName}`}
    >
      <MessageCircle className={`${size === 'xs' ? 'h-3 w-3' : 'h-4 w-4'} mr-1.5`} />
      Meddelande
    </button>
  );
}