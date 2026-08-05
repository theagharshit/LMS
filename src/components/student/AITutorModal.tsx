import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  Sparkles,
  Send,
  Bot,
  User as UserIcon,
  BookOpen,
  Lightbulb,
  RefreshCw,
  Volume2,
} from 'lucide-react';

export const AITutorModal: React.FC = () => {
  const { isAiTutorOpen, setIsAiTutorOpen, aiTutorInitialPrompt, currentUser } = useApp();

  const [messages, setMessages] = useState<{ sender: 'ai' | 'user'; text: string; time: string }[]>(
    [
      {
        sender: 'ai',
        text: `Namaste ${currentUser.name}! 🙏 I am Sikshya AI, your personal 24/7 learning tutor. Ask me any question from your Mathematics, Science, Nepali, English, or Social Studies textbooks!`,
        time: 'Just now',
      },
    ],
  );
  const [prompt, setPrompt] = useState('');
  const [subject, setSubject] = useState('Mathematics');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (aiTutorInitialPrompt) {
      setPrompt(aiTutorInitialPrompt);
    }
  }, [aiTutorInitialPrompt]);

  if (!isAiTutorOpen) return null;

  const quickPrompts = [
    {
      title: '📐 Step-by-Step Math',
      text: 'Explain how to solve quadratic equation x² + 5x + 6 = 0 step by step with rules.',
    },
    {
      title: '🔬 Refraction of Light',
      text: "Explain Snell's law of refraction with a simple everyday example.",
    },
    {
      title: '🇳🇵 Unification of Nepal',
      text: "What were the major factors during King Prithvi Narayan Shah's unification campaign?",
    },
    {
      title: '✍️ Nepali Grammar Help',
      text: 'नेपाली व्याकरणमा कारक र विभक्तिका प्रकारहरू उदाहरणसहित बुझाइदेऊ।',
    },
  ];

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || prompt;
    if (!textToSend.trim() || isLoading) return;

    const userMsg = {
      sender: 'user' as const,
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setPrompt('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          subject,
          gradeLevel: currentUser.gradeLevel || 8,
          language: 'English/Nepali',
        }),
      });

      const data = await response.json();
      const aiText =
        data.text || 'I apologize, I could not process that query. Please try asking again!';

      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: aiText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: 'Namaste! Here is a helpful guidance breakdown:\n1. Review the key formula in your textbook.\n2. Write down the given values.\n3. Substitute values and solve step-by-step.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#2D2D2A]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#EDEAE2] flex flex-col h-[85vh] max-h-[700px] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-4 natural-banner text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Sparkles
                className="w-5 h-5 text-[#FDEEDC] animate-spin"
                style={{ animationDuration: '6s' }}
              />
            </div>
            <div>
              <h3 className="font-bold text-base font-serif flex items-center gap-2">
                Sikshya AI Learning Tutor
                <span className="text-[10px] bg-[#E88D67] text-white font-extrabold px-2 py-0.5 rounded-full uppercase">
                  CDC Nepal AI
                </span>
              </h3>
              <p className="text-xs text-[#F9F7F2]/90">
                Grade {currentUser.gradeLevel || 8} • AI Homework & Concept Assistant
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsAiTutorOpen(false)}
            className="p-1.5 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Subject Filter Bar */}
        <div className="px-4 py-2 bg-[#F9F7F2] border-b border-[#EDEAE2] flex items-center gap-2 overflow-x-auto text-xs">
          <span className="font-bold text-[#7A7A72] shrink-0">Subject:</span>
          {[
            'Mathematics',
            'Science & Tech',
            'नेपाली (Nepali)',
            'English',
            'Social Studies',
            'Computer Science',
          ].map((sub) => (
            <button
              key={sub}
              onClick={() => setSubject(sub)}
              className={`px-2.5 py-1 rounded-full font-semibold shrink-0 transition-all ${
                subject === sub
                  ? 'bg-[#4A6741] text-white shadow-xs'
                  : 'bg-white text-[#7A7A72] border border-[#E5E1D8] hover:bg-[#F0EDE5]'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F9F7F2]/50">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 max-w-[88%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
            >
              <div
                className={`w-8 h-8 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                  msg.sender === 'ai' ? 'bg-[#4A6741] text-white' : 'bg-[#E88D67] text-white'
                }`}
              >
                {msg.sender === 'ai' ? (
                  <Bot className="w-4 h-4" />
                ) : (
                  <UserIcon className="w-4 h-4" />
                )}
              </div>
              <div
                className={`p-4 rounded-3xl text-xs leading-relaxed ${
                  msg.sender === 'ai'
                    ? 'bg-white text-[#2D2D2A] border border-[#EDEAE2] shadow-xs'
                    : 'bg-[#E88D67] text-white rounded-tr-none'
                }`}
              >
                <div className="whitespace-pre-wrap font-sans">{msg.text}</div>
                <div className={`text-[10px] mt-2 opacity-70 text-right`}>{msg.time}</div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 max-w-[80%]">
              <div className="w-8 h-8 rounded-2xl bg-[#4A6741] text-white flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-4 rounded-3xl bg-white border border-[#EDEAE2] text-xs flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-[#4A6741] animate-spin" />
                <span>Sikshya AI is generating step-by-step answer...</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2 border-t border-[#EDEAE2] bg-white">
          <p className="text-[11px] font-bold text-[#7A7A72] mb-1 flex items-center gap-1">
            <Lightbulb className="w-3.5 h-3.5 text-[#E88D67]" /> Suggested Quick Prompts:
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {quickPrompts.map((qp, i) => (
              <button
                key={i}
                onClick={() => handleSend(qp.text)}
                className="text-[11px] px-2.5 py-1 rounded-xl bg-[#EBF1E8] border border-[#88A070]/30 text-[#4A6741] font-medium whitespace-nowrap hover:bg-[#EBF1E8]/80 transition-colors"
              >
                {qp.title}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white border-t border-[#EDEAE2] flex gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={`Ask Sikshya AI about ${subject}...`}
            className="flex-1 px-4 py-2.5 bg-[#F9F7F2] rounded-2xl text-xs border border-[#E5E1D8] focus:outline-none focus:ring-1 focus:ring-[#4A6741] text-[#2D2D2A]"
          />
          <button
            onClick={() => handleSend()}
            disabled={isLoading || !prompt.trim()}
            className="px-4 py-2.5 bg-[#4A6741] text-white font-bold rounded-2xl text-xs hover:bg-[#3D5535] disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-sm"
          >
            <span>Ask</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
