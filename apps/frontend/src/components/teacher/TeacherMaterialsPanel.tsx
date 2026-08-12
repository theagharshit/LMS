import React, { useState, useRef } from 'react';
import { useApp } from '@context/AppContext';
import { Classroom, StudyResource, Attachment } from '@lms/shared';
import { apiFetch } from '@utils/apiFetch';
import { toast } from '@utils/toast';
import {
  Upload,
  FileText,
  BookOpen,
  ClipboardList,
  Trash2,
  Plus,
  Link as LinkIcon,
} from 'lucide-react';

interface TeacherMaterialsPanelProps {
  classroom: Classroom;
}

type PanelSection = 'materials' | 'assignments' | 'modules';

export const TeacherMaterialsPanel: React.FC<TeacherMaterialsPanelProps> = ({ classroom }) => {
  const {
    currentUser,
    resources,
    addResource,
    deleteResource,
    addAssignment,
    addModule,
    deleteModule,
    modules,
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeSection, setActiveSection] = useState<PanelSection>('materials');
  const [isUploading, setIsUploading] = useState(false);

  // Assignment form
  const [asgTitle, setAsgTitle] = useState('');
  const [asgInstructions, setAsgInstructions] = useState('');
  const [asgDueDate, setAsgDueDate] = useState('');
  const [asgPoints, setAsgPoints] = useState(20);

  // Module form
  const [modUnit, setModUnit] = useState('');
  const [modTitle, setModTitle] = useState('');
  const [modDescription, setModDescription] = useState('');
  const [modDuration, setModDuration] = useState(30);

  const classResources = resources.filter((r) => r.classroomId === classroom.id);
  const classModules = modules.filter((m) => m.classroomId === classroom.id);

  const uploadFileAsResource = async (file: File) => {
    setIsUploading(true);
    const formattedSize =
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
        : `${(file.size / 1024).toFixed(2)} KB`;

    let fileUrl = '';
    try {
      const res = await apiFetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: file.name,
          sizeBytes: file.size,
          sizeFormatted: formattedSize,
          mimeType: file.type || 'application/octet-stream',
          uploadedBy: currentUser.name,
          classroomId: classroom.id,
        }),
        feedback: {
          success: `${file.name} was uploaded securely.`,
          error: 'The file was rejected and was not added to study materials.',
          successTitle: 'Material uploaded',
        },
      });
      if (!res.ok) return;
      const data = await res.json();
      fileUrl = data.record?.downloadUrl || '';
      if (!fileUrl) {
        toast.error('The upload returned no valid file location.', { title: 'Upload incomplete' });
        return;
      }
    } catch (error) {
      console.error('[TeacherMaterialsPanel] Material upload failed:', error);
      toast.error('The material could not be uploaded and was not added.', {
        title: 'Upload failed',
      });
      return;
    } finally {
      setIsUploading(false);
    }

    let type: StudyResource['type'] = 'doc';
    if (file.type.includes('pdf')) type = 'pdf';
    else if (file.type.startsWith('video/')) type = 'video';
    else if (file.type.startsWith('image/')) type = 'image';

    addResource({
      classroomId: classroom.id,
      teacherId: currentUser.id,
      title: file.name,
      type,
      url: fileUrl,
      mimeType: file.type,
      sizeFormatted: formattedSize,
      tags: [classroom.subject],
    });
  };

  const handleAddLink = () => {
    const url = prompt('Enter resource URL:');
    if (!url) return;
    const title = prompt('Enter resource title:', 'Study Material') || 'Study Material';
    addResource({
      classroomId: classroom.id,
      teacherId: currentUser.id,
      title,
      type: 'link',
      url,
      tags: [classroom.subject],
    });
  };

  const handleCreateAssignment = () => {
    if (!asgTitle.trim()) return;
    addAssignment({
      classroomId: classroom.id,
      classroomName: classroom.name,
      subject: classroom.subject,
      title: asgTitle,
      instructions: asgInstructions,
      dueDate: asgDueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      dueTime: '23:59',
      totalPoints: asgPoints,
      attachments: classResources.slice(0, 2).map((r): Attachment => ({
        id: r.id,
        title: r.title,
        type: r.type === 'pdf' ? 'pdf' : r.type === 'video' ? 'video' : 'doc',
        url: r.url,
        size: r.sizeFormatted,
      })),
      rubric: [],
    });
    setAsgTitle('');
    setAsgInstructions('');
    setAsgDueDate('');
    setAsgPoints(20);
  };

  const handleCreateModule = () => {
    if (!modTitle.trim()) return;
    addModule({
      classroomId: classroom.id,
      unitName: modUnit || 'Unit 1',
      title: modTitle,
      description: modDescription,
      durationMinutes: modDuration,
      attachments: classResources.slice(0, 3).map((r): Attachment => ({
        id: r.id,
        title: r.title,
        type: r.type === 'pdf' ? 'pdf' : r.type === 'video' ? 'video' : 'doc',
        url: r.url,
        size: r.sizeFormatted,
      })),
    });
    setModUnit('');
    setModTitle('');
    setModDescription('');
    setModDuration(30);
  };

  const sections: { id: PanelSection; label: string; icon: React.ReactNode }[] = [
    { id: 'materials', label: 'Study Materials', icon: <FileText className="w-4 h-4" /> },
    { id: 'assignments', label: 'Assignments', icon: <ClipboardList className="w-4 h-4" /> },
    { id: 'modules', label: 'Modules', icon: <BookOpen className="w-4 h-4" /> },
  ];

  return (
    <div className="bg-white rounded-3xl border border-[#EDEAE2] shadow-sm overflow-hidden">
      <div className="p-4 border-b border-[#EDEAE2] bg-[#F9F7F2]">
        <h3 className="font-bold text-sm text-[#2D2D2A] font-serif">Teacher Material Manager</h3>
        <p className="text-xs text-[#7A7A72] mt-0.5">
          Upload study materials once — reuse them in assignments, modules, and quizzes.
        </p>
      </div>

      <div className="flex border-b border-[#EDEAE2]">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold transition-colors cursor-pointer ${
              activeSection === s.id
                ? 'text-[#4A6741] border-b-2 border-[#4A6741] bg-white'
                : 'text-[#7A7A72] hover:bg-[#F9F7F2]'
            }`}
          >
            {s.icon}
            {s.label}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4">
        {activeSection === 'materials' && (
          <>
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadFileAsResource(file);
                  e.target.value = '';
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="px-4 py-2 rounded-xl bg-[#4A6741] text-white text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <Upload className="w-4 h-4" />
                {isUploading ? 'Uploading...' : 'Upload File'}
              </button>
              <button
                onClick={handleAddLink}
                className="px-4 py-2 rounded-xl bg-[#F9F7F2] border border-[#EDEAE2] text-xs font-bold flex items-center gap-2 cursor-pointer"
              >
                <LinkIcon className="w-4 h-4" />
                Add Link
              </button>
            </div>

            {classResources.length === 0 ? (
              <p className="text-xs text-[#7A7A72] text-center py-6">
                No materials uploaded yet. Upload PDFs, docs, videos, or links.
              </p>
            ) : (
              <div className="space-y-2">
                {classResources.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-[#F9F7F2] border border-[#EDEAE2]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-[#4A6741] shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#2D2D2A] truncate">{r.title}</p>
                        <p className="text-[10px] text-[#7A7A72]">
                          {r.type.toUpperCase()}
                          {r.sizeFormatted ? ` • ${r.sizeFormatted}` : ''}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteResource(r.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-[#7A7A72] hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeSection === 'assignments' && (
          <div className="space-y-3">
            <input
              value={asgTitle}
              onChange={(e) => setAsgTitle(e.target.value)}
              placeholder="Assignment title"
              className="w-full px-3 py-2 rounded-xl border border-[#EDEAE2] text-xs"
            />
            <textarea
              value={asgInstructions}
              onChange={(e) => setAsgInstructions(e.target.value)}
              placeholder="Instructions for students..."
              rows={3}
              className="w-full px-3 py-2 rounded-xl border border-[#EDEAE2] text-xs resize-none"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={asgDueDate}
                onChange={(e) => setAsgDueDate(e.target.value)}
                className="px-3 py-2 rounded-xl border border-[#EDEAE2] text-xs"
              />
              <input
                type="number"
                value={asgPoints}
                onChange={(e) => setAsgPoints(Number(e.target.value))}
                placeholder="Points"
                className="px-3 py-2 rounded-xl border border-[#EDEAE2] text-xs"
              />
            </div>
            {classResources.length > 0 && (
              <p className="text-[10px] text-[#7A7A72]">
                Will attach up to 2 resources from your library automatically.
              </p>
            )}
            <button
              onClick={handleCreateAssignment}
              className="w-full py-2.5 rounded-xl bg-[#4A6741] text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create Assignment
            </button>
          </div>
        )}

        {activeSection === 'modules' && (
          <div className="space-y-3">
            <input
              value={modUnit}
              onChange={(e) => setModUnit(e.target.value)}
              placeholder="Unit name (e.g. Unit 4: Algebra)"
              className="w-full px-3 py-2 rounded-xl border border-[#EDEAE2] text-xs"
            />
            <input
              value={modTitle}
              onChange={(e) => setModTitle(e.target.value)}
              placeholder="Module title"
              className="w-full px-3 py-2 rounded-xl border border-[#EDEAE2] text-xs"
            />
            <textarea
              value={modDescription}
              onChange={(e) => setModDescription(e.target.value)}
              placeholder="Module description..."
              rows={2}
              className="w-full px-3 py-2 rounded-xl border border-[#EDEAE2] text-xs resize-none"
            />
            <input
              type="number"
              value={modDuration}
              onChange={(e) => setModDuration(Number(e.target.value))}
              placeholder="Duration (minutes)"
              className="w-full px-3 py-2 rounded-xl border border-[#EDEAE2] text-xs"
            />
            {classModules.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-[#7A7A72] uppercase">Existing modules</p>
                {classModules.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between text-xs p-2 rounded-lg bg-[#F9F7F2]"
                  >
                    <span className="font-semibold">{m.title}</span>
                    <button
                      onClick={() => deleteModule(m.id)}
                      className="text-red-500 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={handleCreateModule}
              className="w-full py-2.5 rounded-xl bg-[#4A6741] text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create Module
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
