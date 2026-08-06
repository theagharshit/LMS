import { useState } from 'react';
import { User, DirectMessage } from '@lms/shared';
import { apiFetch } from '../../utils/apiFetch';

export const useCommunicationState = (currentUser: User) => {
  const [messages, setMessages] = useState<DirectMessage[]>([]);

  const [notifications, setNotifications] = useState([
    {
      id: 'n1',
      title: 'New Homework Assigned',
      body: 'Mr. Ramesh Thapa posted Exercise 4.1 in Math Grade 8',
      time: '10m ago',
      read: false,
      type: 'assignment',
    },
    {
      id: 'n2',
      title: 'Quiz Result Published',
      body: 'You scored 20/20 in Algebra Mid-Term Quiz! 🎉',
      time: '1h ago',
      read: false,
      type: 'quiz',
    },
    {
      id: 'n3',
      title: 'Attendance Marked',
      body: 'Marked Present today at 09:42 AM',
      time: '2h ago',
      read: true,
      type: 'attendance',
    },
    {
      id: 'n4',
      title: 'Janai Purnima Holiday Notice',
      body: 'School will remain closed on 12th August for Raksha Bandhan',
      time: 'Yesterday',
      read: true,
      type: 'announcement',
    },
  ]);

  const sendMessage = (receiverId: string, receiverName: string, content: string) => {
    const newMsg: DirectMessage = {
      id: `msg-${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      senderAvatar: currentUser.avatar,
      receiverId,
      receiverName,
      content,
      createdAt: new Date().toISOString(),
      read: false,
    };
    setMessages((prev) => [newMsg, ...prev]);

    apiFetch('/api/db/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMsg),
    }).catch((err) => console.error('[AppContext] Failed to persist message', err));
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    messages,
    setMessages,
    sendMessage,
    notifications,
    setNotifications,
    markNotificationRead,
    unreadCount,
  };
};
