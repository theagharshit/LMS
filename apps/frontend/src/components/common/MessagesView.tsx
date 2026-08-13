import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  MessageSquare,
  Send,
  Paperclip,
  Search,
  CheckCheck,
  Sparkles,
  Phone,
  Video,
} from 'lucide-react';

export const MessagesView: React.FC = () => {
  const { messages, sendMessage, currentUser, chatContacts, fetchChatHistory } = useApp();

  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');

  // Automatically select the first contact if none is selected
  React.useEffect(() => {
    if (!activeChannelId && chatContacts.length > 0) {
      setActiveChannelId(chatContacts[0].id!);
    }
  }, [activeChannelId, chatContacts]);

  React.useEffect(() => {
    if (activeChannelId) {
      fetchChatHistory(activeChannelId);
    }
  }, [activeChannelId, fetchChatHistory]);

  const currentContact = chatContacts.find((c) => c.id === activeChannelId) || chatContacts[0];
  const channelMessages = messages.filter(
    (m) =>
      (m.senderId === activeChannelId && m.receiverId === currentUser.id) ||
      (m.senderId === currentUser.id && m.receiverId === activeChannelId),
  );

  React.useEffect(() => {
    console.log('[DEBUG Chat] MessagesView rendering.', {
      activeChannelId,
      totalMessagesInContext: messages.length,
      filteredChannelMessages: channelMessages.length,
      channelMessages,
    });
  }, [messages, activeChannelId, channelMessages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChannelId || !currentContact) return;

    sendMessage(activeChannelId, currentContact.name || 'Unknown', inputText);
    setInputText('');
  };

  return (
    <div className="bg-white rounded-3xl border border-[#EDEAE2] shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden h-[80vh] flex animate-in fade-in duration-200 text-xs">
      {/* Channels Sidebar */}
      <div className="w-80 border-r border-[#E5E1D8] flex flex-col bg-[#F0EDE5]">
        <div className="p-4 border-b border-[#E5E1D8]">
          <h2 className="font-bold text-sm text-[#2D2D2A] font-serif mb-2">
            School Messages & Channels
          </h2>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#7A7A72] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search teachers or groups..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#F9F7F2] rounded-xl border border-[#E5E1D8] text-xs text-[#2D2D2A] focus:outline-none focus:ring-1 focus:ring-[#4A6741]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {chatContacts.map((contact) => {
            const isSel = contact.id === activeChannelId;
            return (
              <div
                key={contact.id}
                onClick={() => setActiveChannelId(contact.id!)}
                className={`p-3 rounded-2xl cursor-pointer transition-all flex items-center gap-3 ${
                  isSel
                    ? 'bg-white text-[#4A6741] shadow-[0_4px_12px_rgba(0,0,0,0.03)] border border-[#EDEAE2]'
                    : 'hover:bg-[#E5E1D8]/50 text-[#2D2D2A]'
                }`}
              >
                <div className="relative">
                  <img
                    src={contact.avatar || 'https://via.placeholder.com/150'}
                    alt={contact.name}
                    className="w-10 h-10 rounded-full object-cover shrink-0"
                  />
                  <div
                    className={`w-2.5 h-2.5 rounded-full border-2 border-white absolute right-0 bottom-0 ${contact.online ? 'bg-[#88A070]' : 'bg-gray-400'}`}
                  />
                </div>
                <div className="flex-1 truncate">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold truncate text-xs">{contact.name}</h4>
                    {(contact.unreadCount ?? 0) > 0 && (
                      <span className="bg-[#4A6741] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1">
                        {contact.unreadCount}
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-[11px] truncate capitalize ${isSel ? 'text-[#4A6741]' : 'text-[#7A7A72]'}`}
                  >
                    {contact.role}
                  </p>
                </div>
              </div>
            );
          })}
          {chatContacts.length === 0 && (
            <p className="p-4 text-xs text-center text-[#7A7A72]">No contacts available.</p>
          )}
        </div>
      </div>

      {/* Main Chat Conversation Area */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Chat Header */}
        <div className="p-4 border-b border-[#E5E1D8] flex items-center justify-between bg-[#F0EDE5]/40">
          {currentContact ? (
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src={currentContact.avatar || 'https://via.placeholder.com/150'}
                  alt={currentContact.name}
                  className="w-9 h-9 rounded-full object-cover"
                />
                <div
                  className={`w-2.5 h-2.5 rounded-full border-2 border-white absolute right-0 bottom-0 ${currentContact.online ? 'bg-[#88A070]' : 'bg-gray-400'}`}
                />
              </div>
              <div>
                <h3 className="font-bold text-xs text-[#2D2D2A] font-serif">
                  {currentContact.name}
                </h3>
                <p className="text-[10px] text-[#7A7A72] capitalize">{currentContact.role}</p>
              </div>
            </div>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button className="p-2 text-[#7A7A72] hover:bg-[#E5E1D8]/50 rounded-xl">
              <Phone className="w-4 h-4" />
            </button>
            <button className="p-2 text-[#7A7A72] hover:bg-[#E5E1D8]/50 rounded-xl">
              <Video className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#F9F7F2]">
          {channelMessages.map((msg) => {
            const isMe = msg.senderId === currentUser.id;
            return (
              <div
                key={msg.id}
                className={`flex gap-2 max-w-[80%] ${isMe ? 'ml-auto flex-row-reverse' : ''}`}
              >
                <img
                  src={msg.senderAvatar}
                  alt={msg.senderName}
                  className="w-7 h-7 rounded-full object-cover shrink-0 mt-1"
                />
                <div>
                  <div
                    className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                      isMe
                        ? 'bg-[#4A6741] text-white rounded-tr-none'
                        : 'bg-white text-[#2D2D2A] rounded-tl-none border border-[#EDEAE2]'
                    }`}
                  >
                    {!isMe && (
                      <p className="font-bold text-[10px] text-[#4A6741] mb-1">{msg.senderName}</p>
                    )}
                    <p>{msg.content}</p>
                  </div>
                  <span
                    className={`text-[9px] text-[#7A7A72] block mt-1 ${isMe ? 'text-right' : ''}`}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Message Input */}
        <form
          onSubmit={handleSend}
          className="p-3 border-t border-[#E5E1D8] flex gap-2 items-center bg-white"
        >
          <button type="button" className="p-2 text-[#7A7A72] hover:text-[#2D2D2A] rounded-xl">
            <Paperclip className="w-4 h-4" />
          </button>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message to teacher or group..."
            className="flex-1 px-4 py-2 bg-[#F9F7F2] rounded-2xl border border-[#E5E1D8] text-[#2D2D2A] focus:outline-none focus:ring-1 focus:ring-[#4A6741]"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="px-4 py-2 bg-[#4A6741] text-white font-bold rounded-2xl hover:bg-[#3D5535] disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-sm"
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
