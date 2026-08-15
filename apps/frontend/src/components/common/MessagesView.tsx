import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { apiFetch } from '../../utils/apiFetch';
import { Send, Paperclip, Search, FileText, Download, Loader2 } from 'lucide-react';

export const MessagesView: React.FC = () => {
  const { messages, sendMessage, currentUser, chatContacts, fetchChatHistory } = useApp();

  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Sort contacts by latest message timestamp / activity & unread status
  const sortedContacts = React.useMemo(() => {
    let filtered = chatContacts;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = chatContacts.filter(
        (c) => (c.name || '').toLowerCase().includes(q) || (c.role || '').toLowerCase().includes(q),
      );
    }
    return [...filtered].sort((a, b) => {
      const lastMsgA = messages
        .filter(
          (m) =>
            (m.senderId === a.id && m.receiverId === currentUser.id) ||
            (m.senderId === currentUser.id && m.receiverId === a.id),
        )
        .slice(-1)[0];
      const lastMsgB = messages
        .filter(
          (m) =>
            (m.senderId === b.id && m.receiverId === currentUser.id) ||
            (m.senderId === currentUser.id && m.receiverId === b.id),
        )
        .slice(-1)[0];

      const timeA = lastMsgA
        ? new Date(lastMsgA.createdAt).getTime()
        : a.lastMessageAt
          ? new Date(a.lastMessageAt).getTime()
          : 0;
      const timeB = lastMsgB
        ? new Date(lastMsgB.createdAt).getTime()
        : b.lastMessageAt
          ? new Date(b.lastMessageAt).getTime()
          : 0;

      if (timeA !== timeB) return timeB - timeA;
      if ((a.unreadCount || 0) !== (b.unreadCount || 0))
        return (b.unreadCount || 0) - (a.unreadCount || 0);
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [chatContacts, messages, currentUser.id, searchQuery]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChannelId || !currentContact) return;

    sendMessage(activeChannelId, currentContact.name || 'Unknown', inputText);
    setInputText('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChannelId || !currentContact) return;

    setIsUploading(true);
    const formattedSize =
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
        : `${(file.size / 1024).toFixed(2)} KB`;

    try {
      const res = await apiFetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: file.name,
          sizeBytes: file.size,
          sizeFormatted: formattedSize,
          mimeType: file.type || 'application/octet-stream',
          uploadedBy: currentUser.name,
        }),
        feedback: {
          success: `${file.name} attached securely.`,
          error: 'Failed to upload attachment.',
        },
      });

      if (res.ok) {
        const data = await res.json();
        const fileUrl = data.record?.downloadUrl || `/uploads/${encodeURIComponent(file.name)}`;
        const messageText = `📎 Attachment: ${file.name} (${formattedSize})\n${fileUrl}`;
        sendMessage(activeChannelId, currentContact.name || 'Unknown', messageText);
      }
    } catch (err) {
      console.error('[MessagesView] Attachment upload error', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-[#EDEAE2] shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden h-[80vh] flex animate-in fade-in duration-200 text-xs">
      {/* Hidden File Input */}
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />

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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contacts..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#F9F7F2] rounded-xl border border-[#E5E1D8] text-xs text-[#2D2D2A] focus:outline-none focus:ring-1 focus:ring-[#4A6741]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sortedContacts.map((contact) => {
            const isSel = contact.id === activeChannelId;
            const lastMsg = messages
              .filter(
                (m) =>
                  (m.senderId === contact.id && m.receiverId === currentUser.id) ||
                  (m.senderId === currentUser.id && m.receiverId === contact.id),
              )
              .slice(-1)[0];
            const previewText = lastMsg?.content || contact.lastMessage || contact.role;

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
                <div className="relative shrink-0">
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
                      <span className="bg-[#4A6741] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1 shrink-0">
                        {contact.unreadCount}
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-[11px] truncate capitalize ${isSel ? 'text-[#4A6741]' : 'text-[#7A7A72]'}`}
                  >
                    {previewText}
                  </p>
                </div>
              </div>
            );
          })}
          {sortedContacts.length === 0 && (
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
        </div>

        {/* Message Thread */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#F9F7F2]">
          {channelMessages.map((msg) => {
            const isMe = msg.senderId === currentUser.id;
            const isAttachment =
              msg.content.includes('📎 Attachment:') || msg.content.includes('/uploads/');

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
                    {isAttachment ? (
                      <div className="space-y-2">
                        <p className="whitespace-pre-wrap">{msg.content.split('\n')[0]}</p>
                        {msg.content.split('\n')[1] && (
                          <a
                            href={msg.content.split('\n')[1]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                              isMe
                                ? 'bg-white/20 text-white border-white/40 hover:bg-white/30'
                                : 'bg-[#F9F7F2] text-[#4A6741] border-[#E5E1D8] hover:bg-[#E5E1D8]/50'
                            }`}
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Download File</span>
                            <Download className="w-3.5 h-3.5 ml-1" />
                          </a>
                        )}
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
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
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="p-2 text-[#7A7A72] hover:text-[#4A6741] rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            title="Attach File"
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#4A6741]" />
            ) : (
              <Paperclip className="w-4 h-4" />
            )}
          </button>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 bg-[#F9F7F2] rounded-2xl border border-[#E5E1D8] text-[#2D2D2A] focus:outline-none focus:ring-1 focus:ring-[#4A6741]"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="px-4 py-2 bg-[#4A6741] text-white font-bold rounded-2xl hover:bg-[#3D5535] disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
