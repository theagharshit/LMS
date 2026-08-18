import { useCallback, useEffect, useState } from 'react';
import { StudentProfile, User } from '@lms/shared';
import { apiFetch, SESSION_INVALIDATED_EVENT } from '@utils/apiFetch';
import type { DatabaseBootstrapState } from '../databaseBootstrap';

const loginRequests = new Map<string, Promise<string | null>>();

const requestTokenForUser = (user: User) => {
  const existing = loginRequests.get(user.id);
  if (existing) return existing;
  const request = (async () => {
    try {
      await apiFetch('/api/auth/csrf', { feedback: false }).catch(() => {});
      const loginRes = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
        feedback: false,
      });
      if (loginRes.ok) {
        const data = await loginRes.json();
        const token = String(data.token || data.accessToken || '');
        if (token) return token;
      }

      const devRes = await apiFetch('/api/auth/dev-switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
        feedback: false,
      });
      if (devRes.ok) {
        const data = await devRes.json();
        const token = String(data.token || data.accessToken || '');
        if (token) return token;
      }
    } catch {
      // fallback
    }
    return `dev_jwt_${user.id}`;
  })().finally(() => loginRequests.delete(user.id));
  loginRequests.set(user.id, request);
  return request;
};

const emptyUser = (): User => ({
  id: '',
  name: '',
  email: '',
  role: 'student',
  avatar: '',
  schoolName: '',
});

export const useAuthState = (bootstrap?: DatabaseBootstrapState) => {
  const initialUser = bootstrap?.currentUser || bootstrap?.users?.[0] || emptyUser();
  const [allUsers, setAllUsers] = useState<User[]>(() => bootstrap?.users || []);
  const [currentUser, setCurrentUser] = useState<User>(initialUser);
  const [studentProfiles, setStudentProfiles] = useState<StudentProfile[]>(
    () => bootstrap?.studentProfiles || [],
  );
  const [activeChildId, setActiveChildId] = useState(
    () => initialUser.childrenIds?.[0] || initialUser.id,
  );
  const [jwtToken, setJwtToken] = useState<string | null>(() =>
    typeof localStorage === 'undefined' ? null : localStorage.getItem('lms_jwt_token'),
  );
  const [authenticatedUserId, setAuthenticatedUserId] = useState<string | null>(null);

  const establishSession = useCallback((user: User, token: string) => {
    setCurrentUser(user);
    setAllUsers((users) => (users.some((item) => item.id === user.id) ? users : [user]));
    setJwtToken(token);
    setAuthenticatedUserId(user.id);
    if (typeof localStorage !== 'undefined') localStorage.setItem('lms_jwt_token', token);
    if (user.role === 'parent' && user.childrenIds?.length) setActiveChildId(user.childrenIds[0]);
  }, []);

  const clearSession = useCallback(() => {
    setJwtToken(null);
    setAuthenticatedUserId(null);
    setCurrentUser(emptyUser());
    setAllUsers([]);
    setStudentProfiles([]);
    setActiveChildId('');
    if (typeof localStorage !== 'undefined') localStorage.removeItem('lms_jwt_token');
  }, []);

  useEffect(() => {
    if (!jwtToken || authenticatedUserId) return;
    apiFetch('/api/auth/me', { feedback: false })
      .then(async (response) => {
        if (!response.ok) throw new Error('Saved session expired.');
        const data = await response.json();
        establishSession(data.user, jwtToken);
      })
      .catch(clearSession);
  }, [authenticatedUserId, clearSession, establishSession, jwtToken]);

  useEffect(() => {
    window.addEventListener(SESSION_INVALIDATED_EVENT, clearSession);
    return () => window.removeEventListener(SESSION_INVALIDATED_EVENT, clearSession);
  }, [clearSession]);

  const switchUserSession = useCallback(
    async (user: User) => {
      const token = (await requestTokenForUser(user)) || `dev_jwt_${user.id}`;
      establishSession(user, token);
    },
    [establishSession],
  );

  const devSwitchUser = useCallback(
    async (userIdOrRole: string) => {
      let target = allUsers.find(
        (u) => u.id === userIdOrRole || u.role?.toLowerCase() === userIdOrRole.toLowerCase(),
      );
      if (!target) {
        try {
          const res = await apiFetch('/api/auth/dev-switch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: userIdOrRole, role: userIdOrRole }),
            feedback: false,
          });
          if (res.ok) {
            const data = await res.json();
            if (data.user) {
              target = data.user;
              establishSession(target!, data.token || data.accessToken || `dev_jwt_${target!.id}`);
              return;
            }
          }
        } catch {}
      }
      if (target) {
        await switchUserSession(target);
      }
    },
    [allUsers, establishSession, switchUserSession],
  );

  const activeChildList = studentProfiles.filter((student) =>
    currentUser.childrenIds?.includes(student.id),
  );
  const activeChild =
    studentProfiles.find((student) => student.id === activeChildId) || activeChildList[0];

  const updateStudentIdCardPhoto = (studentId: string, idCardPhotoUrl: string) => {
    setStudentProfiles((profiles) =>
      profiles.map((profile) =>
        profile.id === studentId ? { ...profile, idCardPhotoUrl } : profile,
      ),
    );
  };

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
    updateStudentIdCardPhoto,
    jwtToken,
    authReady: Boolean(currentUser.id && jwtToken && authenticatedUserId === currentUser.id),
    establishSession,
    clearSession,
    switchUserSession,
    devSwitchUser,
  };
};
