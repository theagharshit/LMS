import { useState } from 'react';
import { User, StudentProfile, MOCK_USERS, MOCK_STUDENTS } from '@lms/shared';

export const useAuthState = () => {
  const [allUsers, setAllUsers] = useState<User[]>(MOCK_USERS);
  const [currentUser, setCurrentUser] = useState<User>(MOCK_USERS[0]);
  const [studentProfiles, setStudentProfiles] = useState<StudentProfile[]>(MOCK_STUDENTS);
  const [activeChildId, setActiveChildId] = useState<string>('user-stu-1');

  const activeChildList = studentProfiles.filter((s) => currentUser.childrenIds?.includes(s.id));
  const activeChild = studentProfiles.find((s) => s.id === activeChildId) || studentProfiles[0];

  const updateStudentIdCardPhoto = (studentId: string, idCardPhotoUrl: string) => {
    setStudentProfiles((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, idCardPhotoUrl } : s)),
    );
  };

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
  };
};
