import React from 'react';
import { Construction } from 'lucide-react';

interface InDevelopmentViewProps {
  title: string;
}

export const InDevelopmentView: React.FC<InDevelopmentViewProps> = ({ title }) => {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] space-y-4 animate-in fade-in duration-200">
      <div className="w-20 h-20 bg-[#F9F7F2] rounded-full flex items-center justify-center border border-[#EDEAE2]">
        <Construction className="w-10 h-10 text-[#4A6741]" />
      </div>
      <h2 className="text-2xl font-bold text-[#2D2D2A] font-serif">{title}</h2>
      <p className="text-[#7A7A72] text-sm max-w-md text-center">
        This page is currently in development. We are working hard to bring this feature to you soon!
      </p>
    </div>
  );
};
