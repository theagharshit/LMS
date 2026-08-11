import React, { useState, useEffect } from 'react';
import { X, Clock, AlertTriangle, Maximize2, Minimize2 } from 'lucide-react';

interface QuizHeaderProps {
  title: string;
  subject: string;
  classroomName: string;
  currentQuestionIndex: number;
  totalQuestions: number;
  timeRemainingSeconds: number;
  showTimer?: boolean;
  onClose: () => void;
}

export const QuizHeader: React.FC<QuizHeaderProps> = ({
  title,
  subject,
  classroomName,
  currentQuestionIndex,
  totalQuestions,
  timeRemainingSeconds,
  showTimer = true,
  onClose,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  const minutes = Math.floor(timeRemainingSeconds / 60);
  const seconds = timeRemainingSeconds % 60;
  const isWarning = timeRemainingSeconds <= 120 && timeRemainingSeconds > 0; // Warning under 2 mins

  return (
    <header className="p-4 md:p-5 natural-banner text-white flex items-center justify-between shadow-md">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md border border-white/20">
            {subject}
          </span>
          <span className="text-xs text-white/80">{classroomName}</span>
        </div>
        <h2 className="font-bold text-base md:text-lg tracking-tight leading-tight">{title}</h2>
      </div>

      <div className="flex items-center gap-3 md:gap-4">
        {showTimer && (
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl border font-mono text-xs font-bold backdrop-blur-md transition-colors ${
              isWarning
                ? 'bg-amber-500/30 border-amber-300 text-amber-100 animate-pulse'
                : 'bg-white/10 border-white/20 text-white'
            }`}
          >
            {isWarning ? (
              <AlertTriangle className="w-4 h-4 text-amber-300" />
            ) : (
              <Clock className="w-4 h-4 text-white/80" />
            )}
            <span>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
          </div>
        )}

        <div className="text-right hidden sm:block">
          <span className="text-[11px] font-bold text-white/80 block">Question</span>
          <span className="text-sm font-black">
            {currentQuestionIndex + 1} / {totalQuestions}
          </span>
        </div>

        {/* Fullscreen Toggle Button */}
        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit Full Screen' : 'Enter Full Screen'}
          aria-label={isFullscreen ? 'Exit Full Screen' : 'Enter Full Screen'}
          className="p-2 text-white/80 hover:text-white rounded-2xl hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40"
        >
          {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
        </button>

        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close Quiz"
          className="p-2 text-white/80 hover:text-white rounded-2xl hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
