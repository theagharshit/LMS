import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { LucideAward, LucideShield } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { allUsers, studentProfiles, badgeDefinitions, assignBadge, currentUser } = useApp();
  
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedBadge, setSelectedBadge] = useState('');
  const [remarks, setRemarks] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  const handleAssignBadge = async () => {
    if (!selectedStudent || !selectedBadge) return;
    setIsAssigning(true);
    await assignBadge(selectedStudent, selectedBadge, remarks);
    setRemarks('');
    setSelectedStudent('');
    setSelectedBadge('');
    setIsAssigning(false);
    alert('Badge manually assigned successfully!');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-heading text-indigo-950 flex items-center gap-2">
            <LucideShield className="w-8 h-8 text-indigo-600" />
            Admin Dashboard
          </h1>
          <p className="text-gray-600">Manage school-wide configurations and manual awards.</p>
        </div>
      </header>

      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-bold font-heading text-gray-800 flex items-center gap-2 mb-4">
          <LucideAward className="w-6 h-6 text-yellow-500" />
          Manual Badge Awarding
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Student</label>
            <select
              className="w-full border-gray-300 rounded-xl shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2"
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
            >
              <option value="">-- Choose Student --</option>
              {studentProfiles.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.gradeLevel}-{p.section})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Badge</label>
            <select
              className="w-full border-gray-300 rounded-xl shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2"
              value={selectedBadge}
              onChange={(e) => setSelectedBadge(e.target.value)}
            >
              <option value="">-- Choose Badge --</option>
              {badgeDefinitions.map(b => (
                <option key={b.id} value={b.id}>{b.icon} {b.title}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Remarks (Optional)</label>
          <input
            type="text"
            className="w-full border-gray-300 rounded-xl shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2"
            placeholder="Reason for awarding this badge..."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
        </div>
        <div className="mt-4">
          <button
            onClick={handleAssignBadge}
            disabled={isAssigning || !selectedStudent || !selectedBadge}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-xl transition-colors disabled:opacity-50"
          >
            {isAssigning ? 'Assigning...' : 'Award Badge'}
          </button>
        </div>
      </section>

      {/* List of Badges as reference */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mt-6">
        <h2 className="text-xl font-bold font-heading text-gray-800 mb-4">Badge Definitions Dictionary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {badgeDefinitions.map(b => (
            <div key={b.id} className="p-4 border rounded-xl flex gap-4 items-start">
              <span className="text-3xl">{b.icon}</span>
              <div>
                <h3 className="font-bold text-gray-800">{b.title}</h3>
                <p className="text-xs text-gray-500 mt-1">{b.description}</p>
                <div className="mt-2 text-[10px] uppercase font-bold tracking-wider text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full inline-block">
                  {b.isAutomatic ? 'Automatic' : 'Manual'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
