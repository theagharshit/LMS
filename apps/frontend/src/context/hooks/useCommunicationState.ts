import { useState, useEffect, useCallback } from 'react';
import { User, DirectMessage, NotificationItem, NotificationPreference } from '@lms/shared';
import { apiFetch } from '../../utils/apiFetch';
import type { DatabaseBootstrapState } from '../databaseBootstrap';

export const useCommunicationState = (
  currentUser: User,
  authReady = true,
  bootstrap?: DatabaseBootstrapState,
) => {
  const [messages, setMessages] = useState<DirectMessage[]>(() => bootstrap?.messages || []);
  const [chatContacts, setChatContacts] = useState<
    {
      id: string;
      name: string;
      role: string;
      avatar?: string;
      online?: boolean;
      unreadCount?: number;
      lastMessage?: string;
      lastMessageAt?: string;
    }[]
  >([]);

  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreference>({
    userId: currentUser?.id || '',
    enableAcademic: true,
    enableCommunication: true,
    enableReminders: true,
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Load preferences from API
  useEffect(() => {
    if (!currentUser?.id || !authReady) return;
    apiFetch(`/api/db/notification-preferences/${currentUser.id}`)
      .then((res) => res.json())
      .then((data: any) => {
        if (data.preferences) setNotificationPreferences(data.preferences);
      })
      .catch((err) =>
        console.error('[useCommunicationState] Failed to fetch notification preferences', err),
      );

    apiFetch(`/api/db/notifications/${currentUser.id}`)
      .then((res) => res.json())
      .then((data: any) => {
        if (data.notifications && Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
        }
      })
      .catch((err) =>
        console.error('[useCommunicationState] Failed to fetch user notifications', err),
      );

    apiFetch('/api/chat/contacts')
      .then((res) => res.json())
      .then((data: any) => {
        if (data.status === 'success' && Array.isArray(data.contacts)) {
          setChatContacts(data.contacts);
        }
      })
      .catch((err) => console.error('[useCommunicationState] Failed to fetch chat contacts', err));
  }, [authReady, currentUser?.id]);

  const fetchChatHistory = useCallback(async (contactId: string) => {
    console.log('[DEBUG Chat] fetchChatHistory called for contact:', contactId);
    try {
      const res = await apiFetch(`/api/chat/${contactId}`);
      const data = await res.json();
      console.log('[DEBUG Chat] fetchChatHistory response:', data);
      if (data.status === 'success' && Array.isArray(data.messages)) {
        setMessages(data.messages);

        // Mark as read in DB
        apiFetch(`/api/chat/${contactId}/read`, { method: 'POST', feedback: false }).catch(
          console.error,
        );

        // Clear unread count locally
        setChatContacts((prev) =>
          prev.map((c) => (c.id === contactId ? { ...c, unreadCount: 0 } : c)),
        );
      }
    } catch (err) {
      console.error('[useCommunicationState] Failed to fetch chat history', err);
    }
  }, []);

  const updateNotificationPreferences = async (
    prefs: Partial<Omit<NotificationPreference, 'userId'>>,
  ) => {
    const response = await apiFetch(`/api/db/notification-preferences/${currentUser.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prefs),
      feedback: {
        success: 'Notification preferences updated.',
        error: 'Could not update notification preferences.',
      },
    });
    const data = await response.json();
    if (data.preferences) setNotificationPreferences(data.preferences);
  };

  const sendMessage = async (receiverId: string, _receiverName: string, content: string) => {
    const response = await apiFetch(`/api/chat/${receiverId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
      feedback: false,
    });
    const data = await response.json();
    if (data.status !== 'success' || !data.message?.id) return;
    setMessages((prev) =>
      prev.some((message) => message.id === data.message.id) ? prev : [...prev, data.message],
    );
    setChatContacts((prev) =>
      prev.map((contact) =>
        contact.id === receiverId
          ? {
              ...contact,
              lastMessage: data.message.content,
              lastMessageAt: data.message.createdAt,
            }
          : contact,
      ),
    );
  };

  const addRealtimeMessage = useCallback(
    (message: DirectMessage) => {
      console.log('[DEBUG Chat] addRealtimeMessage called via WebSocket:', message);
      const otherId = message.senderId === currentUser?.id ? message.receiverId : message.senderId;
      setChatContacts((prev) =>
        prev.map((c) =>
          c.id === otherId
            ? {
                ...c,
                lastMessage: message.content,
                lastMessageAt: message.createdAt,
                unreadCount:
                  message.senderId !== currentUser?.id ? (c.unreadCount || 0) + 1 : c.unreadCount,
              }
            : c,
        ),
      );
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) {
          console.log('[DEBUG Chat] Message already exists in state, ignoring');
          return prev;
        }
        console.log('[DEBUG Chat] Appending realtime message to state');
        return [...prev, message];
      });
    },
    [currentUser?.id],
  );

  const markNotificationRead = async (id: string) => {
    const response = await apiFetch(`/api/db/notifications/${id}/read`, {
      method: 'POST',
      feedback: false,
    });
    if (response.ok)
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllNotificationsRead = async () => {
    const response = await apiFetch(`/api/db/notifications/read-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id }),
      feedback: {
        success: 'All notifications marked as read.',
        error: 'Could not mark notifications as read.',
      },
    });
    if (response.ok) setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = async (id: string) => {
    const response = await apiFetch(`/api/db/notifications/${id}`, {
      method: 'DELETE',
      feedback: { success: 'Notification removed.', error: 'Could not remove the notification.' },
    });
    if (response.ok) setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearReadNotifications = async () => {
    const response = await apiFetch('/api/db/notifications/clear-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id }),
      feedback: {
        success: 'Read notifications cleared.',
        error: 'Could not clear read notifications.',
      },
    });
    if (response.ok) setNotifications((prev) => prev.filter((n) => !n.read));
  };

  const dispatchNotification = async (data: {
    recipientId?: string;
    targetAudience?: 'all' | 'students' | 'teachers' | 'parents' | 'classroom';
    classroomId?: string;
    title: string;
    body: string;
    category: 'CRITICAL' | 'ACADEMIC' | 'COMMUNICATION';
    severity?: 'urgent' | 'high' | 'normal' | 'info';
    type?: string;
  }) => {
    const response = await apiFetch('/api/db/notifications/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      feedback: {
        success: 'Notification dispatched successfully.',
        error: 'Could not dispatch the notification.',
      },
    });
    const result = await response.json();
    if (result.notification?.recipientId === currentUser.id)
      setNotifications((prev) =>
        prev.some((notification) => notification.id === result.notification.id)
          ? prev
          : [result.notification, ...prev],
      );
  };

  const addRealtimeNotification = useCallback((notification: NotificationItem) => {
    setNotifications((prev) => {
      if (prev.some((n) => n.id === notification.id)) return prev;
      return [notification, ...prev];
    });
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    messages,
    setMessages,
    sendMessage,
    notifications,
    setNotifications,
    addRealtimeNotification,
    notificationPreferences,
    updateNotificationPreferences,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    clearReadNotifications,
    dispatchNotification,
    unreadCount,
    chatContacts,
    fetchChatHistory,
    addRealtimeMessage,
  };
};
