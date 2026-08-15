import { useState, useEffect } from 'react';

export const useUIState = () => {
  const [activeView, setActiveView] = useState<string>('login');
  const [selectedClassroomId, setSelectedClassroomId] = useState<string | null>(null);

  const [theme, setTheme] = useState<'light' | 'dark' | 'soft'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sikshya_theme');
      if (saved === 'dark' || saved === 'light' || saved === 'soft') return saved;
    }
    return 'light';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('sikshya_theme', theme);
  }, [theme]);

  const [isAiTutorOpen, setIsAiTutorOpen] = useState<boolean>(false);
  const [aiTutorInitialPrompt, setAiTutorInitialPrompt] = useState<string>('');
  const [isAiParentSummaryOpen, setIsAiParentSummaryOpen] = useState<boolean>(false);
  const [isCompletedQuizzesOpen, setIsCompletedQuizzesOpen] = useState<boolean>(false);

  return {
    activeView,
    setActiveView,
    selectedClassroomId,
    setSelectedClassroomId,
    theme,
    setTheme,
    isAiTutorOpen,
    setIsAiTutorOpen,
    aiTutorInitialPrompt,
    setAiTutorInitialPrompt,
    isAiParentSummaryOpen,
    setIsAiParentSummaryOpen,
    isCompletedQuizzesOpen,
    setIsCompletedQuizzesOpen,
  };
};
