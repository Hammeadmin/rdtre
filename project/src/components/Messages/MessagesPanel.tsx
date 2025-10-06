import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Send, Search, User, Loader2, ArrowLeft } from 'lucide-react'; // Added ArrowLeft for back button
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { useLocation } from 'react-router-dom';

// --- Interfaces ---
interface Message {
  id: string;
  sender_id: string;
  conversation_id: string; // Added for clarity in type
  content: string;
  created_at: string;
  read: boolean;
}

interface Participant {
  user_id: string;
  full_name: string;
  role: string;
}

interface Conversation {
  id: string;
  participants: Participant[];
  last_message?: Message | null; // Allow null
  unread_count: number;
}

// --- Helper Function (Example RPC response structure, adjust if needed) ---
interface ConversationRpcResponse extends Conversation {
    // Assuming your RPC returns these fields directly
}

export function MessagesPanel() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true); // Specific loading state
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const location = useLocation();

  // New state for mobile view: 'conversations' or 'chat'
  const [mobileView, setMobileView] = useState<'conversations' | 'chat'>('conversations');

  // --- Effect 1: Initialize User and Fetch Initial Conversations ---
  useEffect(() => {
    const initializeUserAndConversations = async () => {
      console.log("Effect 1: Initializing user and conversations...");
      setLoadingConversations(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          console.log("Effect 1: User found:", user.id);
          setCurrentUser(user.id);
          await fetchConversations(user.id); // Fetch initial conversations

          // Check for incoming conversation ID from navigation state
          const incomingConversationId = location.state?.selectedConversationId;
          if (incomingConversationId && typeof incomingConversationId === 'string') {
            console.log('Effect 1: Setting selected conversation from location state:', incomingConversationId);
              // Check if the incoming conversation exists in the fetched list
              setConversations(prevConvos => {
                  if (prevConvos.some(c => c.id === incomingConversationId)) {
                      setSelectedConversation(incomingConversationId);
                      setMobileView('chat'); // Switch to chat view on mobile if navigating directly to a chat
                  } else {
                      console.warn("Incoming conversation ID not found in fetched list.");
                  }
                  return prevConvos; // Return the fetched list regardless
              });

          }
        } else {
          console.log("Effect 1: No user session found.");
          setCurrentUser(null);
          setConversations([]);
        }
      } catch (error) {
        console.error("Effect 1: Error initializing user/conversations:", error);
        toast.error("Failed to initialize messaging.");
      } finally {
        setLoadingConversations(false);
      }
    };

    initializeUserAndConversations();
  }, [location.state?.selectedConversationId]); // Depend only on location state for this effect

  // --- Effect 2: Subscribe to NEW messages ---
  useEffect(() => {
    if (!currentUser) {
      console.log("Effect 2: No current user, skipping subscription.");
      return;
    }

    console.log(`Effect 2: Setting up subscription on 'public:messages' for user: ${currentUser}`);

    // Use a consistent channel name. 'public:messages' is fine if used elsewhere.
    const channel = supabase
      .channel('public:messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          console.log('Realtime: New message payload received:', payload);
          const newMessage = payload.new as Message;

          // Check if the message belongs to the currently selected conversation
          if (newMessage.conversation_id === selectedConversation) {
            // Avoid adding duplicates if the message is from the current user
            if (newMessage.sender_id !== currentUser) {
              console.log("Realtime: Adding message from other user:", newMessage.id);
              setMessages((prev) => {
                if (!prev.some(msg => msg.id === newMessage.id)) { // Extra safety check for duplicates
                  return [...prev, newMessage];
                }
                return prev;
              });
              markMessagesAsRead(selectedConversation, currentUser);
            } else {
              console.log("Realtime: Ignoring own message broadcast:", newMessage.id);
              // Optionally: Update the status of the optimistically added message here
              //           if you store temporary IDs differently.
            }
          } else {
            // Message is for a different conversation, refresh list for unread count update
            console.log("Realtime: New message in different conversation, refreshing conversations list.");
            fetchConversations(currentUser);
          }
        }
      )
      .subscribe((status, err) => {
        console.log(`Subscription status: ${status}`);
        if (err) {
          console.error(`Message subscription error: ${status}`, err);
          toast.error(`Messaging connection error: ${err.message || 'Please refresh'}`);
        }
          if (status === 'CLOSED') {
              console.warn('Message subscription channel closed.');
              // Consider implementing a reconnect strategy or informing the user
          }
      });

    // Cleanup
    return () => {
      console.log('Effect 2: Removing message subscription channel.');
      supabase.removeChannel(channel).catch(console.error);
    };
  }, [currentUser, selectedConversation]); // Dependencies

  // --- Effect 3: Fetch messages when a conversation is selected ---
  useEffect(() => {
    if (selectedConversation && currentUser) {
      console.log(`Effect 3: Selected conversation changed to ${selectedConversation}, fetching messages.`);
      fetchMessages(selectedConversation);
      markMessagesAsRead(selectedConversation, currentUser);
      // On mobile, switch to chat view when a conversation is selected
      if (window.innerWidth < 768) { // Assuming md breakpoint is 768px
        setMobileView('chat');
      }
    } else {
      console.log("Effect 3: No conversation selected, clearing messages.");
      setMessages([]); // Clear messages if no conversation is selected
    }
  }, [selectedConversation, currentUser]); // Depend on both

  // --- Effect 4: Scroll to bottom when messages change ---
  useEffect(() => {
    // Add a small delay to allow the DOM to update before scrolling
    const timer = setTimeout(() => {
      scrollToBottom();
    }, 100); // 100ms delay, adjust if needed
    return () => clearTimeout(timer); // Cleanup the timer
  }, [messages]); // Depend only on messages

  // --- Helper Functions ---
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async (userId: string | null) => {
    if (!userId) {
      setConversations([]);
      return;
    }
    console.log("Fetching conversations for user:", userId);
    // Don't set loadingConversations here, let the initial effect handle the initial load
    try {
      const { data, error } = await supabase.rpc('get_user_conversations', {
        p_user_id: userId
      });

      if (error) throw error;

      console.log("Fetched conversations data:", data);
      // Type guard to be safe
      const validConversations = Array.isArray(data)
          ? data.filter((c): c is ConversationRpcResponse => c && typeof c.id === 'string')
          : [];
      setConversations(validConversations);

    } catch (err) {
      console.error('Error fetching conversations:', err);
      toast.error('Failed to load conversations');
      setConversations([]);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    console.log("Fetching messages for conversation:", conversationId);
    setLoadingMessages(true);
    setMessages([]); // Clear previous messages immediately
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      console.log("Fetched messages:", data);
      setMessages(data || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
      toast.error('Failed to load messages');
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const markMessagesAsRead = async (conversationId: string | null, userId: string | null) => {
    if (!conversationId || !userId) return;
    console.log("Marking messages as read for conversation:", conversationId);
    try {
      const { error } = await supabase
        .from('messages')
        .update({ read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId)
        .eq('read', false);

      if (error) throw error;
      console.log("Messages marked as read, refreshing conversations list.");
      fetchConversations(userId); // Refresh list to update counts

    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConversation || !newMessage.trim() || !currentUser) return;

    const tempId = crypto.randomUUID(); // Generate temporary ID for optimistic update
    const optimisticMessage: Message = {
      id: tempId,
      sender_id: currentUser,
      conversation_id: selectedConversation,
      content: newMessage.trim(),
      created_at: new Date().toISOString(),
      read: false,
    };

    // 1. Optimistic Update
    console.log("Optimistically adding message:", tempId);
    setMessages((prev) => [...prev, optimisticMessage]);
    const messageToSend = newMessage.trim(); // Store content before clearing
    setNewMessage(''); // Clear input field

    // 2. Send to Database
    try {
        console.log("Sending message to DB for conversation:", selectedConversation);
      const { data: insertedMessages, error } = await supabase
        .from('messages')
        .insert([
          {
            // DO NOT SEND sender_id - let DB handle it via RLS/default
            conversation_id: selectedConversation,
            content: messageToSend, // Use the stored content
          },
        ])
        .select(); // Select the inserted row to get the real ID and created_at

      if (error) {
        console.error('Error sending message to DB:', error);
        // Rollback optimistic update on error
        setMessages((prev) => prev.filter(msg => msg.id !== tempId));
        toast.error(`Failed to send message: ${error.message}`);
      } else {
        console.log("Message sent successfully. DB returned:", insertedMessages);
        // Optional: Update the optimistic message with the real ID/timestamp
        // This helps if you need to interact with the message later (e.g., delete)
        if (insertedMessages && insertedMessages.length > 0) {
            const confirmedMessage = insertedMessages[0] as Message;
            setMessages((prev) =>
                prev.map(msg => msg.id === tempId ? { ...msg, id: confirmedMessage.id, created_at: confirmedMessage.created_at } : msg)
            );
        }
        // Refresh conversations to update last message
        fetchConversations(currentUser);
      }
    } catch (err) {
      console.error('Exception sending message:', err);
      setMessages((prev) => prev.filter(msg => msg.id !== tempId)); // Rollback on exception
      toast.error('Failed to send message.');
    }
  };


  const getOtherParticipant = (conversation: Conversation | undefined): Participant | null => {
    if (!conversation || !currentUser) return null;
    return conversation.participants.find(p => p.user_id !== currentUser) || null;
  };

  const filteredConversations = conversations.filter(conversation => {
    const otherParticipant = getOtherParticipant(conversation);
    // Handle cases where otherParticipant might be null (e.g., conversation with self?)
    return otherParticipant?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false;
  });

  const selectedChatPartner = getOtherParticipant(conversations.find(c => c.id === selectedConversation));

  // Function to handle switching back to conversations on mobile
  const handleBackToConversations = () => {
    setSelectedConversation(null);
    setMobileView('conversations');
  };

  // --- JSX Render ---
  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)]">
      {/* Conversations List - Hidden on mobile when chat is selected */}
      <div className={`w-full md:w-1/3 border-r border-gray-200 bg-white flex flex-col h-full md:h-auto ${selectedConversation && mobileView === 'chat' ? 'hidden md:flex' : 'flex'}`}>
        {/* Header + Search */}
        <div className="p-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Meddelanden</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Search Conversations"
            />
          </div>
        </div>
        {/* Conversation List */}
        <div className="overflow-y-auto flex-grow max-h-[30vh] md:max-h-none">
          {loadingConversations ? (
            <div className="p-4 text-center text-gray-500 italic">Laddar konversationer...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500 italic">Inga konversationer hittade.</div>
          ) : (
            filteredConversations.map((conversation) => {
              const otherParticipant = getOtherParticipant(conversation);
              const lastMsgTime = conversation.last_message?.created_at
                ? format(new Date(conversation.last_message.created_at), 'HH:mm', { locale: sv })
                : '';
              return (
                <button
                  key={conversation.id}
                  onClick={() => setSelectedConversation(conversation.id)}
                  className={`w-full p-3 text-left hover:bg-gray-100 flex items-center justify-between transition-colors duration-150 ${
                    selectedConversation === conversation.id ? 'bg-blue-50 border-r-4 border-blue-500' : 'border-r-4 border-transparent'
                  }`}
                  aria-current={selectedConversation === conversation.id ? "page" : undefined}
                >
                  <div className="flex items-center overflow-hidden">
                    <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0 mr-3">
                      <User className="h-6 w-6 text-gray-600" />
                      {/* Replace with profile picture if available */}
                    </div>
                    <div className="flex-grow overflow-hidden mr-2">
                      <div className="font-medium text-gray-900 truncate">
                        {otherParticipant?.full_name || 'Unknown User'}
                      </div>
                      {conversation.last_message && (
                        <div className="text-sm text-gray-500 truncate">
                          {conversation.last_message.sender_id === currentUser ? 'You: ' : ''}
                          {conversation.last_message.content}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0 ml-2">
                    {lastMsgTime && <span className="text-xs text-gray-400 mb-1">{lastMsgTime}</span>}
                    {conversation.unread_count > 0 && (
                      <span className="bg-blue-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                        {conversation.unread_count}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Messages Area - Hidden on mobile when conversations are selected */}
      <div className={`flex-1 flex flex-col bg-gray-100 h-[calc(100vh-4rem)] md:h-auto ${selectedConversation || mobileView === 'chat' ? 'flex' : 'hidden md:flex'}`}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-white border-b border-gray-200 flex-shrink-0 shadow-sm flex items-center">
                <button
                    onClick={handleBackToConversations}
                    className="md:hidden mr-2 p-1 rounded-full hover:bg-gray-100"
                    aria-label="Back to Conversations"
                >
                    <ArrowLeft className="h-5 w-5 text-gray-600" />
                </button>
              <h3 className="text-lg font-semibold text-gray-900 truncate flex-grow">
                {selectedChatPartner?.full_name || 'Conversation'}
              </h3>
            </div>

            {/* Message List */}
            <div className="flex-1 overflow-y-auto p-4">
              {loadingMessages ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : messages.length === 0 ? (
                  <div className="flex justify-center items-center h-full">
                     <p className="text-gray-500 italic">Inga meddelanden ännu. Starta konversationen!</p>
                  </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id} // Use message ID as key
                      className={`flex ${
                        message.sender_id === currentUser ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-xs md:max-w-md lg:max-w-lg rounded-xl px-4 py-2 shadow-sm ${ // Use rounded-xl for bubble feel
                          message.sender_id === currentUser
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-800 border border-gray-200' // Lighter border for received
                        }`}
                      >
                        <p className="break-words text-sm">{message.content}</p>
                        <p className="text-xs mt-1 opacity-75 text-right">
                          {format(new Date(message.created_at), 'HH:mm', { locale: sv })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} /> {/* For scrolling */}
                </div>
              )}
            </div>

            {/* Message Input Form */}
            <form onSubmit={sendMessage} className="p-3 bg-white border-t border-gray-200 flex-shrink-0">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 rounded-full border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" // Rounded-full input
                  aria-label="Message Input"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center"
                  aria-label="Send Message"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </form>
          </>
        ) : (
          // Placeholder when no conversation is selected
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            <p className="text-lg">Välj en konversation</p>
            <p className="text-sm text-center px-4">Välj en från listan för att börja chatta.</p>
          </div>
        )}
      </div>

      {/* Mobile View Switcher - Only visible on small screens */}
      {/* Removed the fixed bottom navigation as the new approach handles switching */}
    </div>
  );
}