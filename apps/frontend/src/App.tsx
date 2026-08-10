import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { StudentDashboard } from './components/student/StudentDashboard';
import { ClassroomView } from './components/student/ClassroomView';
import { ProgressTrackerView } from './components/student/ProgressTrackerView';
import { StudentProfileView } from './components/student/StudentProfileView';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { AttendanceRegister } from './components/teacher/AttendanceRegister';
import { ParentDashboard } from './components/parent/ParentDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AcademicCalendarView } from './components/common/AcademicCalendarView';
import { MessagesView } from './components/common/MessagesView';
import { NotificationDrawer } from './components/common/NotificationDrawer';
import { AITutorModal } from './components/student/AITutorModal';
import { AIParentSummaryModal } from './components/parent/AIParentSummaryModal';
import { AssignmentDetailModal } from './components/student/AssignmentDetailModal';
import { QuizRunnerModal } from './components/student/QuizRunnerModal';
import { CompletedQuizzesModal } from './components/student/CompletedQuizzesModal';
import { QuizBuilderModal } from './components/teacher/QuizBuilderModal';
import { TeacherQuizHubView } from './components/teacher/TeacherQuizHubView';
import { ParentalControlsModal } from './components/parent/ParentalControlsModal';
import { InDevelopmentView } from './components/common/InDevelopmentView';

const AppContent: React.FC = () => {
  const { currentUser, activeView, isCompletedQuizzesOpen, setIsCompletedQuizzesOpen } = useApp();

  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const [isQuizBuilderOpen, setIsQuizBuilderOpen] = useState(false);
  const [isParentalControlsOpen, setIsParentalControlsOpen] = useState(false);

  const renderMainView = () => {
    switch (activeView) {
      case 'dashboard':
        if (currentUser.role === 'student') {
          return (
            <StudentDashboard
              onOpenAssignmentModal={(id) => setActiveAssignmentId(id)}
              onOpenQuizModal={(id) => setActiveQuizId(id)}
            />
          );
        } else if (currentUser.role === 'teacher') {
          return (
            <TeacherDashboard
              onOpenGradeModal={(id) => setActiveAssignmentId(id)}
              onOpenQuizBuilderModal={() => setIsQuizBuilderOpen(true)}
            />
          );
        } else if (currentUser.role === 'admin') {
          return <AdminDashboard />;
        } else {
          return <ParentDashboard onOpenParentalControls={() => setIsParentalControlsOpen(true)} />;
        }

      case 'classroom':
        return (
          <ClassroomView
            onOpenAssignmentModal={(id) => setActiveAssignmentId(id)}
            onOpenQuizModal={(id) => setActiveQuizId(id)}
          />
        );

      case 'assignments':
        if (currentUser.role === 'teacher') {
          return <InDevelopmentView title="Grading Desk" />;
        }
        return (
          <StudentDashboard
            onOpenAssignmentModal={(id) => setActiveAssignmentId(id)}
            onOpenQuizModal={(id) => setActiveQuizId(id)}
          />
        );

      case 'quizzes':
        if (currentUser.role === 'teacher') {
          return <TeacherQuizHubView />;
        }
        return (
          <StudentDashboard
            onOpenAssignmentModal={(id) => setActiveAssignmentId(id)}
            onOpenQuizModal={(id) => setActiveQuizId(id)}
          />
        );

      case 'parental-controls':
        return <InDevelopmentView title="Parental Controls" />;

      case 'progress':
        return <ProgressTrackerView />;

      case 'profile':
        return <StudentProfileView />;

      case 'attendance':
        return <AttendanceRegister />;

      case 'calendar':
        return <AcademicCalendarView />;

      case 'messages':
        return <MessagesView />;

      case 'parent-portal':
        return <ParentDashboard onOpenParentalControls={() => setIsParentalControlsOpen(true)} />;

      default:
        return (
          <StudentDashboard
            onOpenAssignmentModal={(id) => setActiveAssignmentId(id)}
            onOpenQuizModal={(id) => setActiveQuizId(id)}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F7F2] text-[#2D2D2A] flex flex-col font-sans transition-colors duration-200">
      {/* Top Header */}
      <Header onToggleNotifications={() => setIsNotificationOpen(true)} />

      <div className="flex flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 pt-4 gap-6">
        {/* Left Role Sidebar */}
        <Sidebar />

        {/* Main View Area */}
        <main className="flex-1 min-w-0">{renderMainView()}</main>
      </div>

      {/* Global Modals & Drawers */}
      <NotificationDrawer
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
      />

      <AITutorModal />
      <AIParentSummaryModal />

      <AssignmentDetailModal
        assignmentId={activeAssignmentId}
        onClose={() => setActiveAssignmentId(null)}
      />

      <QuizRunnerModal quizId={activeQuizId} onClose={() => setActiveQuizId(null)} />

      <CompletedQuizzesModal
        isOpen={isCompletedQuizzesOpen}
        onClose={() => setIsCompletedQuizzesOpen(false)}
        onReviewQuiz={(quizId) => {
          setIsCompletedQuizzesOpen(false);
          setActiveQuizId(quizId);
        }}
      />

      <QuizBuilderModal isOpen={isQuizBuilderOpen} onClose={() => setIsQuizBuilderOpen(false)} />

      <ParentalControlsModal
        isOpen={isParentalControlsOpen}
        onClose={() => setIsParentalControlsOpen(false)}
      />
    </div>
  );
};

export function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
