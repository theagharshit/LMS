import React, { useState } from 'react';
import { apiFetch } from '@utils/apiFetch';
import { useApp } from '../../context/AppContext';
import {
  X,
  Sparkles,
  Heart,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Award,
  BookOpen,
} from 'lucide-react';

export const AIParentSummaryModal: React.FC = () => {
  const {
    isAiParentSummaryOpen,
    setIsAiParentSummaryOpen,
    activeChild,
    submissions,
    attendanceRecords,
  } = useApp();

  const [isLoading, setIsLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<{
    englishSummary: string;
    nepaliSummary: string;
    highlights: string[];
    actionPointsForParents: string[];
  } | null>({
    englishSummary: `${activeChild.name} has demonstrated excellent dedication this week in Grade ${activeChild.gradeLevel}! Attendance stands strong at ${activeChild.attendancePercentage}%. Aarav scored 19/20 in Grade 8 Mathematics Homework and achieved a 14-day study streak.`,
    nepaliSummary: `${activeChild.name} ले यस हप्ता कक्षा ${activeChild.gradeLevel} मा उत्कृष्ट प्रगति देखाउनुभएको छ। गणित विषयको गृहकार्यमा उत्कृष्ट अंक प्राप्त गर्नुभएको छ र उपस्थिती दर ${activeChild.attendancePercentage}% रहेको छ।`,
    highlights: [
      `14-Day Continuous LMS Login Streak 🔥`,
      `Scored 19/20 in Math Unit 4 Homework`,
      `Perfect attendance in all 6 routine periods today`,
    ],
    actionPointsForParents: [
      `Encourage Aarav to revise Science Light chapter before Tuesday's lab experiment.`,
      `Congratulate him on earning the 'Math Genius' badge!`,
    ],
  });

  if (!isAiParentSummaryOpen) return null;

  const handleGenerateFresh = async () => {
    setIsLoading(true);
    try {
      const response = await apiFetch('/api/ai/parent-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: activeChild.name,
          gradeLevel: activeChild.gradeLevel,
          attendanceRate: activeChild.attendancePercentage,
          recentGrades: 'Mathematics: 19/20 (A+), Science: 88%',
          pendingHomeworkCount: 2,
          teacherNotes: 'Active participant, completes homework punctually.',
          language: 'English & Nepali',
        }),
        feedback: {
          success: `${activeChild.name}'s latest bilingual progress digest is ready.`,
          error: 'Could not refresh the progress digest. The previous summary is still available.',
          successTitle: 'Digest refreshed',
        },
      });
      if (!response.ok) throw new Error('Parent summary request failed.');
      const data = await response.json();
      if (data.englishSummary) {
        setSummaryData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      onClick={() => setIsAiParentSummaryOpen(false)}
      className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-base">Sikshya AI Parent Weekly Summary</h3>
              <p className="text-xs text-purple-100">
                Bilingual Report for {activeChild.name} (Grade {activeChild.gradeLevel})
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsAiParentSummaryOpen(false)}
            className="p-1.5 text-white/80 hover:text-white rounded-full hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {isLoading ? (
            <div className="py-12 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-purple-600 animate-spin mx-auto" />
              <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                Generating Personalized AI Parent Digest...
              </p>
              <p className="text-slate-400 text-xs">
                Synthesizing CDC grades, attendance records & teacher feedback in English & Nepali
              </p>
            </div>
          ) : (
            summaryData && (
              <>
                {/* English Summary Card */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold mb-2">
                    <BookOpen className="w-4 h-4" />
                    <span>English Digest</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-200 leading-relaxed font-sans">
                    {summaryData.englishSummary}
                  </p>
                </div>

                {/* Nepali Devanagari Card */}
                <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold mb-2">
                    <Heart className="w-4 h-4 text-amber-600 fill-amber-500" />
                    <span>नेपालीमा अभिभावक विवरण (Nepali Digest)</span>
                  </div>
                  <p className="text-amber-950 dark:text-amber-100 leading-relaxed font-sans text-sm">
                    {summaryData.nepaliSummary}
                  </p>
                </div>

                {/* Key Highlights */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-500" /> Weekly Key Achievements:
                  </h4>
                  <div className="space-y-1.5">
                    {summaryData.highlights.map((h, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Items for Parents */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-blue-500" /> Action Items for Parents at
                    Home:
                  </h4>
                  <div className="space-y-1.5">
                    {summaryData.actionPointsForParents.map((act, i) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-blue-900 dark:text-blue-200"
                      >
                        • {act}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <button
            onClick={handleGenerateFresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold hover:bg-purple-200 transition-colors text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Regenerate Summary</span>
          </button>
          <button
            onClick={() => setIsAiParentSummaryOpen(false)}
            className="px-5 py-2 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 transition-colors text-xs shadow-md"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
