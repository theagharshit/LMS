import { useState, useEffect, useCallback } from 'react';
import { User, DirectMessage, NotificationItem, NotificationPreference } from '@lms/shared';
import { apiFetch } from '../../utils/apiFetch';

export const useCommunicationState = (currentUser: User, authReady = true) => {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [chatContacts, setChatContacts] = useState<
    {
      id: string;
      name: string;
      role: string;
      avatar?: string;
      online?: boolean;
      unreadCount?: number;
    }[]
  >([]);

  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreference>({
    userId: currentUser?.id || 'user-1',
    enableAcademic: true,
    enableCommunication: true,
    enableReminders: true,
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: `n1-${currentUser?.id || 'user-stu-1'}`,
      recipientId: currentUser?.id || 'user-stu-1',
      title: '🚨 Attendance Alert: Absence Reported',
      body: 'Student Aarav Sharma was marked absent for Period 1 Science.',
      category: 'CRITICAL',
      severity: 'urgent',
      type: 'attendance',
      read: false,
      createdAt: new Date(Date.now() - 10 * 60000).toISOString(),
      time: '10m ago',
    },
    {
      id: `n2-${currentUser?.id || 'user-stu-1'}`,
      recipientId: currentUser?.id || 'user-stu-1',
      title: '⚡ Quiz Marks Published',
      body: 'Grade 8 Algebra & Factorization Quiz scores are now live!',
      category: 'CRITICAL',
      severity: 'high',
      type: 'quiz',
      read: false,
      createdAt: new Date(Date.now() - 60 * 60000).toISOString(),
      time: '1h ago',
    },
    {
      id: `n3-${currentUser?.id || 'user-stu-1'}`,
      recipientId: currentUser?.id || 'user-stu-1',
      title: 'New Homework Assigned',
      body: 'Mr. Ramesh Thapa posted Exercise 4.1 in Math Grade 8',
      category: 'ACADEMIC',
      severity: 'normal',
      type: 'assignment',
      read: false,
      createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
      time: '2h ago',
    },
    {
      id: `n4-${currentUser?.id || 'user-stu-1'}`,
      recipientId: currentUser?.id || 'user-stu-1',
      title: 'Badge Earned: Quiz Master 🎉',
      body: 'Awarded for scoring 100% on Mathematics assessment.',
      category: 'COMMUNICATION',
      severity: 'info',
      type: 'badge',
      read: true,
      createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
      time: 'Yesterday',
    },
  ]);

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
        if (
          data.notifications &&
          Array.isArray(data.notifications) &&
          data.notifications.length > 0
        ) {
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

  const updateNotificationPreferences = (
    prefs: Partial<Omit<NotificationPreference, 'userId'>>,
  ) => {
    setNotificationPreferences((prev) => {
      const updated = { ...prev, ...prefs };
      apiFetch(`/api/db/notification-preferences/${currentUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
        feedback: {
          success: 'Notification preferences updated.',
          error: 'Could not update notification preferences.',
        },
      }).catch((err) => console.error('[useCommunicationState] Failed to update preferences', err));
      return updated;
    });
  };

  const sendMessage = (receiverId: string, receiverName: string, content: string) => {
    console.log('[DEBUG Chat] sendMessage called', { receiverId, receiverName, content });
    // Optimistic UI update
    const tempId = `msg-temp-${Date.now()}`;
    const newMsg: DirectMessage = {
      id: tempId,
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
    console.log('[DEBUG Chat] Adding optimistic message', newMsg);
    setMessages((prev) => [...prev, newMsg]); // Append to end

    apiFetch(`/api/chat/${receiverId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
      feedback: false, // Let UI handle success silently
    })
      .then((res) => res.json())
      .then((data: any) => {
        console.log('[DEBUG Chat] sendMessage API response:', data);
        if (data.status === 'success' && data.message) {
          // Replace temp message with real one from DB
          console.log('[DEBUG Chat] Replacing temp message with real DB message', data.message);
          setMessages((prev) => prev.map((m) => (m.id === tempId ? data.message : m)));
        }
      })
      .catch((err) => {
        console.error('[useCommunicationState] Failed to send message', err);
        // Optionally remove temp message on failure
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      });
  };

  const addRealtimeMessage = useCallback((message: DirectMessage) => {
    console.log('[DEBUG Chat] addRealtimeMessage called via WebSocket:', message);
    setMessages((prev) => {
      if (prev.some((m) => m.id === message.id)) {
        console.log('[DEBUG Chat] Message already exists in state, ignoring');
        return prev;
      }
      console.log('[DEBUG Chat] Appending realtime message to state');
      return [...prev, message];
    });
  }, []);

  const markNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    apiFetch(`/api/db/notifications/${id}/read`, { method: 'POST', feedback: false }).catch((err) =>
      console.error('[useCommunicationState] Failed to mark read', err),
    );
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    apiFetch(`/api/db/notifications/read-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id }),
      feedback: {
        success: 'All notifications marked as read.',
        error: 'Could not mark notifications as read.',
      },
    }).catch((err) => console.error('[useCommunicationState] Failed to mark all read', err));
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    apiFetch(`/api/db/notifications/${id}`, {
      method: 'DELETE',
      feedback: { success: 'Notification removed.', error: 'Could not remove the notification.' },
    }).catch((err) => console.error('[useCommunicationState] Failed to delete notification', err));
  };

  const clearReadNotifications = () => {
    setNotifications((prev) => prev.filter((n) => !n.read));
    apiFetch('/api/db/notifications/clear-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id }),
      feedback: {
        success: 'Read notifications cleared.',
        error: 'Could not clear read notifications.',
      },
    }).catch((err) =>
      console.error('[useCommunicationState] Failed to clear read notifications', err),
    );
  };

  const dispatchNotification = (data: {
    recipientId?: string;
    targetAudience?: 'all' | 'students' | 'teachers' | 'parents' | 'classroom';
    classroomId?: string;
    title: string;
    body: string;
    category: 'CRITICAL' | 'ACADEMIC' | 'COMMUNICATION';
    severity?: 'urgent' | 'high' | 'normal' | 'info';
    type?: string;
  }) => {
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      recipientId: data.recipientId || currentUser.id,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      title: data.title,
      body: data.body,
      category: data.category,
      severity: data.severity || 'normal',
      type: (data.type as any) || 'general',
      read: false,
      createdAt: new Date().toISOString(),
      time: 'Just now',
    };

    // Optimistically add to UI if target matches current user
    if (!data.recipientId || data.recipientId === currentUser.id || data.targetAudience) {
      setNotifications((prev) => [newNotif, ...prev]);
    }

    apiFetch('/api/db/notifications/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderRole: currentUser.role,
      }),
      feedback: {
        success: 'Notification dispatched successfully.',
        error: 'Could not dispatch the notification.',
      },
    }).catch((err) =>
      console.error('[useCommunicationState] Failed to dispatch custom notification', err),
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
