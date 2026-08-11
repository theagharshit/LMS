import { useState, useEffect, useCallback } from 'react';
import { User, StudentProfile, MOCK_USERS, MOCK_STUDENTS } from '@lms/shared';
import { apiFetch, SESSION_INVALIDATED_EVENT } from '@utils/apiFetch';

const loginRequests = new Map<string, Promise<string | null>>();

const requestTokenForUser = (user: User) => {
  const existing = loginRequests.get(user.id);
  if (existing) return existing;

  const request = (async () => {
    await apiFetch('/api/auth/csrf', { feedback: false });
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id }),
      feedback: {
        success: false,
        error: 'Could not establish a secure session. The app will keep your local data safe.',
        errorTitle: 'Secure connection unavailable',
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return String(data.token || data.accessToken || '') || null;
  })().finally(() => {
    loginRequests.delete(user.id);
  });

  loginRequests.set(user.id, request);
  return request;
};

export const useAuthState = () => {
  const [allUsers, setAllUsers] = useState<User[]>(MOCK_USERS);
  const [currentUser, setCurrentUser] = useState<User>(MOCK_USERS[0]);
  const [studentProfiles, setStudentProfiles] = useState<StudentProfile[]>(MOCK_STUDENTS);
  const [activeChildId, setActiveChildId] = useState<string>('user-stu-1');
  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const [authenticatedUserId, setAuthenticatedUserId] = useState<string | null>(null);

  const fetchJwtTokenForUser = useCallback(async (user: User) => {
    try {
      const token = await requestTokenForUser(user);
      if (token) {
        setJwtToken(token);
        setAuthenticatedUserId(user.id);
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('lms_jwt_token', token);
        }
      } else {
        setJwtToken(null);
        setAuthenticatedUserId(null);
        if (typeof localStorage !== 'undefined') localStorage.removeItem('lms_jwt_token');
      }
    } catch (err) {
      console.warn('[useAuthState] Failed to fetch JWT token for user:', err);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      setJwtToken(null);
      setAuthenticatedUserId(null);
      if (typeof localStorage !== 'undefined') localStorage.removeItem('lms_jwt_token');
      fetchJwtTokenForUser(currentUser);
    }
  }, [currentUser.id, fetchJwtTokenForUser]);

  useEffect(() => {
    const renew = () => {
      setJwtToken(null);
      setAuthenticatedUserId(null);
      void fetchJwtTokenForUser(currentUser);
    };
    window.addEventListener(SESSION_INVALIDATED_EVENT, renew);
    return () => window.removeEventListener(SESSION_INVALIDATED_EVENT, renew);
  }, [currentUser, fetchJwtTokenForUser]);

  const activeChildList = studentProfiles.filter((s) => currentUser.childrenIds?.includes(s.id));
  const activeChild = studentProfiles.find((s) => s.id === activeChildId) || studentProfiles[0];

  useEffect(() => {
    if (typeof sessionStorage === 'undefined' || currentUser.role !== 'parent') return;
    sessionStorage.setItem(
      `sikshya_children_${currentUser.id}`,
      JSON.stringify(
        activeChildList.map(({ id, name, avatar, gradeLevel, section }) => ({
          id,
          name,
          avatar,
          gradeLevel,
          section,
        })),
      ),
    );
  }, [currentUser.id, currentUser.role, activeChildList]);

  return {
    allUsers,
    setAllUsers,
    currentUser,
    setCurrentUser,
    studentProfiles,
    setStudentProfiles,
    activeChildId,
    setActiveChildId,
    activeChildList,
    activeChild,
    jwtToken,
    authReady: Boolean(jwtToken && authenticatedUserId === currentUser.id),
  };
};
