import React, { useState, useEffect, useMemo } from 'react';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { format } from 'date-fns';
import News from './News';
import Images from './Images';
import Store from './Store/Store';
import TeacherImageUploader from './TeacherImageUploader';

// Define types
interface Teacher {
  id: string;
  teacher_name: string;
  subject_name: string;
  qualifications: string | null;
  description: string | null;
  picture_id: string | null;
  grade: string | null;  // "9,10,AS"
  syllabus: string | null;  // "Cambridge,Edexcel"
  // Remove individual grade and curriculum fields
  grade_9?: boolean;
  grade_10?: boolean;
  grade_as?: boolean;
  curriculum_edexcel?: boolean;
  curriculum_cambridge?: boolean;
}

// Define navigation items
const editorNavigation = [
  { name: 'Subjects', href: '/dashboard/site-editor', exact: true },
  { name: 'Calendar', href: '/dashboard/site-editor/calendar' },
  { name: 'News', href: '/dashboard/site-editor/news' },
  { name: 'Images', href: '/dashboard/site-editor/images' },
  { name: 'Store', href: '/dashboard/site-editor/store' },
  { name: 'Teachers', href: '/dashboard/site-editor/teachers' }
];

interface Subject {
  id: string;
  subject_name: string;
  subject_description: string;
  whatsapp_link: string;
  grade?: string | null;  // "9,10,AS"
  syllabus?: string | null;  // "Cambridge,Edexcel"
}

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  event_date: string;
  created_at: string;
}

// Subject Card Component
const SubjectCard = ({ subject, onEdit, onDelete }: { 
  subject: Subject; 
  onEdit: () => void; 
  onDelete: () => void 
}) => (
  <div className="bg-dark-card hover:bg-dark-cardHover border border-dark-border/30 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-5 backdrop-blur-sm">
    <div className="flex justify-between items-start mb-3">
      <h3 className="text-lg font-semibold text-white">{subject.subject_name}</h3>
      <div className="flex space-x-2">
        <button
          onClick={onEdit}
          className="p-1.5 rounded-full hover:bg-blue-500/20 transition-all duration-200"
        >
          <PencilIcon className="h-5 w-5 text-blue-400" />
        </button>
        <button 
          onClick={onDelete}
          className="p-1.5 rounded-full hover:bg-red-500/20 transition-all duration-200"
        >
          <TrashIcon className="h-5 w-5 text-red-400" />
        </button>
      </div>
    </div>
    <p className="text-gray-400 text-sm line-clamp-2 mb-3">{subject.subject_description}</p>
    
    {/* Display grades and syllabus if available */}
    <div className="flex flex-wrap gap-2 mt-2">
      {subject.grade && subject.grade.split(',').map(grade => (
        <span key={grade} className="px-2 py-1 bg-blue-900/30 text-blue-300 text-xs rounded-md border border-blue-800/50">
          {grade === 'AS' ? 'AS' : `Grade ${grade}`}
        </span>
      ))}
      {subject.syllabus && subject.syllabus.split(',').map(syllabus => (
        <span key={syllabus} className="px-2 py-1 bg-purple-900/30 text-purple-300 text-xs rounded-md border border-purple-800/50">
          {syllabus}
        </span>
      ))}
    </div>
  </div>
);

// Subject Editor Component
const SubjectsEditor = ({ onClose, editingSubject, onSave }: { 
  onClose: () => void; 
  editingSubject?: Subject;
  onSave: (data: Omit<Subject, 'id'>) => Promise<void>;
}) => {
  const [formData, setFormData] = useState({
    subject_name: editingSubject?.subject_name || '',
    subject_description: editingSubject?.subject_description || '',
    whatsapp_link: editingSubject?.whatsapp_link || '',
    grade: editingSubject?.grade || '',
    syllabus: editingSubject?.syllabus || ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedGrades, setSelectedGrades] = useState<string[]>(
    editingSubject?.grade ? editingSubject.grade.split(',') : []
  );
  const [selectedSyllabi, setSelectedSyllabi] = useState<string[]>(
    editingSubject?.syllabus ? editingSubject.syllabus.split(',') : []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const updatedFormData = {
        ...formData,
        grade: selectedGrades.join(','),
        syllabus: selectedSyllabi.join(',')
      };
      await onSave(updatedFormData);
      onClose();
    } catch (error) {
      console.error('Error saving subject:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGradeChange = (grade: string) => {
    setSelectedGrades(prev => {
      if (prev.includes(grade)) {
        return prev.filter(g => g !== grade);
      } else {
        return [...prev, grade];
      }
    });
  };

  const handleSyllabusChange = (syllabus: string) => {
    setSelectedSyllabi(prev => {
      if (prev.includes(syllabus)) {
        return prev.filter(s => s !== syllabus);
      } else {
        return [...prev, syllabus];
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-start justify-center overflow-y-auto z-50">
      <form onSubmit={handleSubmit} className="bg-dark-card border border-gray-800/50 rounded-xl shadow-glass-strong p-6 w-full min-h-screen">
        <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 -mx-6 -mt-6 mb-6 px-6 py-4 border-b border-gray-800/50 sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              {editingSubject ? 'Edit Subject Content' : 'Add Subject Content'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-white p-2 rounded-md hover:bg-gray-800/50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Subject Name</label>
            <input
              type="text"
              name="subject_name"
              value={formData.subject_name}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-inner"
              placeholder="Enter subject name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Subject Description</label>
            <textarea
              name="subject_description"
              value={formData.subject_description}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 min-h-[150px] shadow-inner"
              placeholder="Enter subject description"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">WhatsApp Group Link</label>
            <input
              type="text"
              name="whatsapp_link"
              value={formData.whatsapp_link}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-inner"
              placeholder="Enter WhatsApp group link (optional)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Grades</label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="grade_9"
                  checked={selectedGrades.includes('9')}
                  onChange={() => handleGradeChange('9')}
                  className="w-4 h-4 rounded border-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 bg-gray-800/80"
                />
                <span className="text-gray-300">Grade 9</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="grade_10"
                  checked={selectedGrades.includes('10')}
                  onChange={() => handleGradeChange('10')}
                  className="w-4 h-4 rounded border-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 bg-gray-800/80"
                />
                <span className="text-gray-300">Grade 10</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="grade_as"
                  checked={selectedGrades.includes('AS')}
                  onChange={() => handleGradeChange('AS')}
                  className="w-4 h-4 rounded border-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 bg-gray-800/80"
                />
                <span className="text-gray-300">AS</span>
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Syllabus</label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="curriculum_edexcel"
                  checked={selectedSyllabi.includes('Edexcel')}
                  onChange={() => handleSyllabusChange('Edexcel')}
                  className="w-4 h-4 rounded border-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 bg-gray-800/80"
                />
                <span className="text-gray-300">Edexcel</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="curriculum_cambridge"
                  checked={selectedSyllabi.includes('Cambridge')}
                  onChange={() => handleSyllabusChange('Cambridge')}
                  className="w-4 h-4 rounded border-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 bg-gray-800/80"
                />
                <span className="text-gray-300">Cambridge</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 bg-blue-700 hover:bg-blue-600 rounded-lg text-white font-medium transition-colors disabled:opacity-70 flex items-center"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Saving...
                </>
              ) : editingSubject ? 'Update Subject' : 'Save Subject'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

// Calendar Event Card Component
const CalendarEventCard = ({ event, onEdit, onDelete }: { 
  event: CalendarEvent; 
  onEdit: () => void; 
  onDelete: () => void 
}) => (
  <div className="bg-dark-card hover:bg-dark-cardHover border border-dark-border/30 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-5 backdrop-blur-sm">
    <div className="flex justify-between items-start mb-3">
      <div>
        <h3 className="text-lg font-semibold text-white">{event.title}</h3>
        <p className="text-sm bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent font-medium">
          {format(new Date(event.event_date), 'MMMM d, yyyy')}
        </p>
      </div>
      <div className="flex space-x-2">
        <button
          onClick={onEdit}
          className="p-1.5 rounded-full hover:bg-blue-500/20 transition-all duration-200"
        >
          <PencilIcon className="h-5 w-5 text-blue-400" />
        </button>
        <button 
          onClick={onDelete}
          className="p-1.5 rounded-full hover:bg-red-500/20 transition-all duration-200"
        >
          <TrashIcon className="h-5 w-5 text-red-400" />
        </button>
      </div>
    </div>
    <p className="text-gray-400 text-sm line-clamp-2">{event.description}</p>
  </div>
);

// Calendar Event Editor Component
const CalendarEventEditor = ({ onClose, editingEvent, onSave }: { 
  onClose: () => void; 
  editingEvent?: CalendarEvent;
  onSave: (data: Omit<CalendarEvent, 'id' | 'created_at'>) => Promise<void>;
}) => {
  const [formData, setFormData] = useState({
    title: editingEvent?.title || '',
    description: editingEvent?.description || '',
    event_date: editingEvent ? new Date(editingEvent.event_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving event:', error);
      setError('Failed to save event. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-start justify-center overflow-y-auto z-50">
      <form onSubmit={handleSubmit} className="bg-dark-card border border-gray-800/50 rounded-xl shadow-glass-strong p-6 w-full min-h-screen">
        <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 -mx-6 -mt-6 mb-6 px-6 py-4 border-b border-gray-800/50 sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              {editingEvent ? 'Edit Event' : 'Add New Event'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-white p-2 rounded-md hover:bg-gray-800/50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-xl text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Event Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-inner"
              placeholder="Enter event title"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Event Date</label>
            <input
              type="date"
              name="event_date"
              value={formData.event_date}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-inner"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Event Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 min-h-[150px] shadow-inner"
              placeholder="Enter event description"
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 bg-blue-700 hover:bg-blue-600 rounded-lg text-white font-medium transition-colors disabled:opacity-70 flex items-center"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Saving...
                </>
              ) : editingEvent ? 'Update Event' : 'Save Event'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

// Teacher Content Card Component
const TeacherContentCard: React.FC<{
  teacher: Teacher;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ teacher, onEdit, onDelete }) => {
  // Parse qualifications safely
  const qualificationsList = React.useMemo(() => {
    if (!teacher.qualifications) return [];
    try {
      if (Array.isArray(teacher.qualifications)) {
        return teacher.qualifications;
      }
      return teacher.qualifications
        .split('","')
        .map(q => q.replace(/^"|"$/g, '').trim())
        .filter(Boolean);
    } catch (error) {
      console.error('Error parsing qualifications:', error);
      return [];
    }
  }, [teacher.qualifications]);

  // Parse grade and syllabus
  const grades = React.useMemo(() => {
    if (!teacher.grade) return [];
    return teacher.grade.split(',').map(g => g.trim()).filter(Boolean);
  }, [teacher.grade]);

  const syllabus = React.useMemo(() => {
    if (!teacher.syllabus) return [];
    return teacher.syllabus.split(',').map(s => s.trim()).filter(Boolean);
  }, [teacher.syllabus]);

  return (
    <div className="bg-dark-card hover:bg-dark-cardHover border border-dark-border/30 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-5 backdrop-blur-sm">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          {teacher.picture_id ? (
            <img 
              src={teacher.picture_id} 
              alt={teacher.teacher_name}
              className="w-12 h-12 object-cover rounded-full border-2 border-gray-700"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gray-800 border-2 border-gray-700 flex items-center justify-center">
              <span className="text-gray-400 text-lg">{teacher.teacher_name.charAt(0)}</span>
            </div>
          )}
          <div>
            <h3 className="text-lg font-semibold text-white">{teacher.teacher_name}</h3>
            <p className="text-sm text-gray-400">{teacher.subject_name}</p>
            {grades.length > 0 && (
              <p className="text-xs text-gray-500">Grade {grades.join(', ')}</p>
            )}
            {syllabus.length > 0 && (
              <p className="text-xs text-gray-500">{syllabus.join(', ')}</p>
            )}
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-full hover:bg-blue-500/20 transition-all duration-200"
          >
            <PencilIcon className="h-5 w-5 text-blue-400" />
          </button>
          <button 
            onClick={onDelete}
            className="p-1.5 rounded-full hover:bg-red-500/20 transition-all duration-200"
          >
            <TrashIcon className="h-5 w-5 text-red-400" />
          </button>
        </div>
      </div>
      {teacher.description && (
        <p className="text-gray-400 text-sm mb-2">{teacher.description}</p>
      )}
      {qualificationsList.length > 0 && (
        <div className="mb-2">
          <p className="text-sm text-gray-300 font-medium mb-1">Qualifications:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {qualificationsList.map((qualification, index) => (
              <li key={index} className="text-gray-400 text-sm">{qualification}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// Teacher Content Editor Component
const TeacherContentEditor = ({ onClose, editingTeacher, onSave }: { 
  onClose: () => void; 
  editingTeacher?: Teacher;
  onSave: (data: Omit<Teacher, 'id'>) => Promise<void>;
}) => {
  // Initialize qualifications array from string or existing array
  const initialQualifications = React.useMemo(() => {
    if (!editingTeacher?.qualifications) return [];
    try {
      if (Array.isArray(editingTeacher.qualifications)) {
        return editingTeacher.qualifications;
      }
      return editingTeacher.qualifications
        .split('","')
        .map(q => q.replace(/^"|"$/g, '').trim())
        .filter(Boolean);
    } catch (error) {
      console.error('Error parsing initial qualifications:', error);
      return [];
    }
  }, [editingTeacher?.qualifications]);

  // Parse initial grade and syllabus
  const [formData, setFormData] = useState(() => {
    // Helper function to check if a value exists in a comma-separated string
    const hasValue = (str: string | null | undefined, value: string) => {
      if (!str) return false;
      return str.split(',').map(s => s.trim()).includes(value);
    };

    // Get grade from comma-separated string (e.g., "9,10,AS")
    const grade = editingTeacher?.grade || '';
    
    // Get syllabus from comma-separated string (e.g., "Cambridge,Edexcel")
    const syllabus = editingTeacher?.syllabus || '';

    return {
      teacher_name: editingTeacher?.teacher_name || '',
      subject_name: editingTeacher?.subject_name || '',
      description: editingTeacher?.description || '',
      picture_id: editingTeacher?.picture_id || '',
      grade_9: hasValue(grade, '9'),
      grade_10: hasValue(grade, '10'),
      grade_as: hasValue(grade, 'AS'),
      curriculum_edexcel: hasValue(syllabus, 'Edexcel'),
      curriculum_cambridge: hasValue(syllabus, 'Cambridge')
    };
  });

  const [qualifications, setQualifications] = useState<string[]>(initialQualifications);
  const [newQualification, setNewQualification] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Format qualifications as required: "qual1","qual2"
      const formattedQualifications = qualifications.length > 0
        ? qualifications
            .map(q => `"${q.trim()}"`)
            .join(',')
        : null;

      // Format grade and syllabus as comma-separated strings
      const grade = [
        formData.grade_9 ? '9' : '',
        formData.grade_10 ? '10' : '',
        formData.grade_as ? 'AS' : ''
      ].filter(Boolean).join(',');

      const syllabus = [
        formData.curriculum_cambridge ? 'Cambridge' : '',
        formData.curriculum_edexcel ? 'Edexcel' : ''
      ].filter(Boolean).join(',');

      await onSave({
        ...formData,
        qualifications: formattedQualifications,
        grade,
        syllabus
      });
      onClose();
    } catch (error) {
      console.error('Error saving teacher:', error);
      setError('Failed to save teacher. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageUploaded = (imageUrl: string) => {
    setFormData(prev => ({ ...prev, picture_id: imageUrl }));
  };

  const handleAddQualification = () => {
    const trimmedQualification = newQualification.trim();
    if (!trimmedQualification) return;
    
    // Check for duplicates
    if (qualifications.includes(trimmedQualification)) {
      setError('This qualification already exists');
      return;
    }

    setQualifications(prev => [...prev, trimmedQualification]);
    setNewQualification('');
    setError(null);
  };

  const handleRemoveQualification = (indexToRemove: number) => {
    setQualifications(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddQualification();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-start justify-center overflow-y-auto z-50">
      <form onSubmit={handleSubmit} className="bg-dark-card border border-gray-800/50 rounded-xl shadow-glass-strong p-6 w-full max-w-3xl my-8">
        <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 -mx-6 -mt-6 mb-6 px-6 py-4 border-b border-gray-800/50 sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              {editingTeacher ? 'Edit Teacher' : 'Add Teacher'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-white p-2 rounded-md hover:bg-gray-800/50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Profile Image</label>
            <TeacherImageUploader
              onImageUploaded={handleImageUploaded}
              initialImageUrl={formData.picture_id}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Teacher Name</label>
            <input
              type="text"
              name="teacher_name"
              value={formData.teacher_name}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-inner"
              placeholder="Enter teacher name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Subject Name</label>
            <input
              type="text"
              name="subject_name"
              value={formData.subject_name}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-inner"
              placeholder="Enter subject name"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">Grades</label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="grade_9"
                    checked={formData.grade_9}
                    onChange={handleChange}
                    className="w-4 h-4 rounded border-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 bg-gray-800/80"
                  />
                  <span className="text-gray-300">Grade 9</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="grade_10"
                    checked={formData.grade_10}
                    onChange={handleChange}
                    className="w-4 h-4 rounded border-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 bg-gray-800/80"
                  />
                  <span className="text-gray-300">Grade 10</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="grade_as"
                    checked={formData.grade_as}
                    onChange={handleChange}
                    className="w-4 h-4 rounded border-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 bg-gray-800/80"
                  />
                  <span className="text-gray-300">AS</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">Syllabus</label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="curriculum_edexcel"
                    checked={formData.curriculum_edexcel}
                    onChange={handleChange}
                    className="w-4 h-4 rounded border-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 bg-gray-800/80"
                  />
                  <span className="text-gray-300">Edexcel</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="curriculum_cambridge"
                    checked={formData.curriculum_cambridge}
                    onChange={handleChange}
                    className="w-4 h-4 rounded border-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 bg-gray-800/80"
                  />
                  <span className="text-gray-300">Cambridge</span>
                </label>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 min-h-[100px] shadow-inner"
              placeholder="Enter description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Qualifications</label>
            {qualifications.length > 0 && (
              <div className="mb-3 bg-gray-800/50 rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-2">Current qualifications:</div>
                <div className="flex flex-wrap gap-2">
                  {qualifications.map((qualification, index) => (
                    <div 
                      key={index} 
                      className="flex items-center gap-1 bg-gray-700/50 rounded-lg px-3 py-1.5 group"
                    >
                      <span className="text-gray-300 text-sm">{qualification}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveQualification(index)}
                        className="text-gray-500 hover:text-red-400 transition-colors ml-2"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={newQualification}
                onChange={(e) => {
                  setNewQualification(e.target.value);
                  setError(null);
                }}
                onKeyPress={handleKeyPress}
                className="flex-1 px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-inner"
                placeholder="Enter a qualification"
              />
              <button
                type="button"
                onClick={handleAddQualification}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-600 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-70"
                disabled={!newQualification.trim()}
              >
                Add
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-5 py-2.5 bg-blue-700 hover:bg-blue-600 rounded-lg text-white font-medium transition-colors disabled:opacity-70 flex items-center"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Saving...
              </>
            ) : editingTeacher ? 'Update Teacher' : 'Save Teacher'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default function SiteEditor() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [teacherContents, setTeacherContents] = useState<Teacher[]>([]);
  const [isSubjectEditorOpen, setIsSubjectEditorOpen] = useState(false);
  const [isCalendarEventEditorOpen, setIsCalendarEventEditorOpen] = useState(false);
  const [isTeacherContentEditorOpen, setIsTeacherContentEditorOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | undefined>();
  const [editingCalendarEvent, setEditingCalendarEvent] = useState<CalendarEvent | undefined>();
  const [editingTeacherContent, setEditingTeacherContent] = useState<Teacher | undefined>();
  const [isTeacherContentLoading, setIsTeacherContentLoading] = useState(false);
  const [teacherContentError, setTeacherContentError] = useState<string | null>(null);
  const [isSubjectsLoading, setIsSubjectsLoading] = useState(false);
  const [subjectsError, setSubjectsError] = useState<string | null>(null);
  const [activeGradeFilter, setActiveGradeFilter] = useState<string | null>(null);
  const [activeSyllabusFilter, setActiveSyllabusFilter] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    fetchSubjects();
    fetchCalendarEvents();
    fetchTeacherContents();
  }, []);

  // Check if a path is active
  const isActive = (path: string, exact = false) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname === path;
  };

  // Fetch data when component mounts or path changes
  const fetchSubjects = async () => {
    setIsSubjectsLoading(true);
    setSubjectsError(null);
    try {
      const { data, error } = await supabase
        .from('subjects_content')
        .select('*');
      
      if (error) throw error;
      
      setSubjects(data || []);
    } catch (err) {
      console.error('Error fetching subjects:', err);
      setSubjectsError('Failed to load subjects. Please try again.');
    } finally {
      setIsSubjectsLoading(false);
    }
  };

  // Fetch calendar events from Supabase
  const fetchCalendarEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .order('event_date', { ascending: true });
      
      if (error) throw error;
      
      setCalendarEvents(data || []);
    } catch (err) {
      console.error('Error fetching calendar events:', err);
    }
  };

  const fetchTeacherContents = async () => {
    setIsTeacherContentLoading(true);
    setTeacherContentError(null);
    try {
      const { data, error } = await supabase
        .from('teachers_content')
        .select('*');
      
      if (error) throw error;
      setTeacherContents(data || []);
    } catch (error) {
      console.error('Error fetching teacher contents:', error);
      setTeacherContentError('Failed to load teacher content. Please try again.');
    } finally {
      setIsTeacherContentLoading(false);
    }
  };

  // Handle saving/updating a subject
  const handleSaveSubject = async (data: Omit<Subject, 'id'>) => {
    try {
      if (editingSubject) {
        const { error } = await supabase
          .from('subjects_content')
          .update(data)
          .eq('id', editingSubject.id);
        
        if (error) throw error;
        
        // Update local state
        setSubjects(subjects.map(subject => 
          subject.id === editingSubject.id ? { ...subject, ...data } : subject
        ));
      } else {
        const { data: newItem, error } = await supabase
          .from('subjects_content')
          .insert([data])
          .select('*')
          .single();
        
        if (error) throw error;
        
        if (newItem) {
          setSubjects([newItem, ...subjects]);
        }
      }
    } catch (err) {
      console.error('Error saving subject:', err);
      throw err;
    }
  };

  // Handle saving/updating a calendar event
  const handleSaveCalendarEvent = async (data: Omit<CalendarEvent, 'id' | 'created_at'>) => {
    try {
      if (editingCalendarEvent) {
        const { error } = await supabase
          .from('calendar_events')
          .update(data)
          .eq('id', editingCalendarEvent.id);
        
        if (error) throw error;
        
        // Update local state
        setCalendarEvents(calendarEvents.map(event => 
          event.id === editingCalendarEvent.id ? { ...event, ...data } : event
        ));
      } else {
        const { data: newEvent, error } = await supabase
          .from('calendar_events')
          .insert([{ ...data, created_at: new Date().toISOString() }])
          .select('*')
          .single();
        
        if (error) throw error;
        
        if (newEvent) {
          setCalendarEvents([newEvent, ...calendarEvents]);
        }
      }
    } catch (err) {
      console.error('Error saving calendar event:', err);
      throw err;
    }
  };

  const handleSaveTeacherContent = async (data: Omit<Teacher, 'id'>) => {
    try {
      if (editingTeacherContent) {
        const { error } = await supabase
          .from('teachers_content')
          .update(data)
          .eq('id', editingTeacherContent.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('teachers_content')
          .insert([data]);
        
        if (error) throw error;
      }

      fetchTeacherContents();
      setEditingTeacherContent(undefined);
      setIsTeacherContentEditorOpen(false);
    } catch (error) {
      console.error('Error saving teacher content:', error);
    }
  };

  // Handle deleting a subject
  const handleDeleteSubject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subject? This action cannot be undone.')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('subjects_content')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Update local state
      setSubjects(subjects.filter(subject => subject.id !== id));
    } catch (err) {
      console.error('Error deleting subject:', err);
      alert('Failed to delete subject. Please try again.');
    }
  };

  // Handle deleting a calendar event
  const handleDeleteCalendarEvent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Update local state
      setCalendarEvents(calendarEvents.filter(event => event.id !== id));
    } catch (err) {
      console.error('Error deleting calendar event:', err);
      alert('Failed to delete event. Please try again.');
    }
  };

  const handleDeleteTeacherContent = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this teacher content?')) return;

    try {
      const { error } = await supabase
        .from('teachers_content')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      fetchTeacherContents();
    } catch (error) {
      console.error('Error deleting teacher content:', error);
    }
  };

  // Filter subjects based on active filters
  const filteredSubjects = useMemo(() => {
    return subjects.filter(subject => {
      // If no filters are active, show all subjects
      if (!activeGradeFilter && !activeSyllabusFilter) return true;
      
      // Check grade filter
      const passesGradeFilter = !activeGradeFilter || 
        (subject.grade && subject.grade.split(',').includes(activeGradeFilter));
      
      // Check syllabus filter
      const passesSyllabusFilter = !activeSyllabusFilter || 
        (subject.syllabus && subject.syllabus.split(',').includes(activeSyllabusFilter));
      
      // Subject must pass both active filters
      return passesGradeFilter && passesSyllabusFilter;
    });
  }, [subjects, activeGradeFilter, activeSyllabusFilter]);

  return (
    <div className="container mx-auto px-4">
      {/* Site Editor Navigation */}
      <div className="mb-6 overflow-x-auto pb-2">
        <div className="flex space-x-2">
          {editorNavigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`px-4 py-2 font-medium rounded-lg transition-all duration-300 ${
                isActive(item.href, item.exact)
                  ? 'bg-gradient-to-r from-primary-600 to-secondary-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              {item.name}
            </Link>
          ))}
        </div>
      </div>

      <Routes>
        <Route index element={
          <div className="bg-dark-card/80 backdrop-blur-md rounded-2xl shadow-glass-strong p-6 border border-gray-800/50">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-white">Subjects Management</h1>
              <button 
                onClick={() => {
                  setEditingSubject(undefined);
                  setIsSubjectEditorOpen(true);
                }}
                className="flex items-center px-4 py-2 bg-blue-700 hover:bg-blue-600 rounded-lg text-white text-sm font-medium transition-colors"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Subject
              </button>
            </div>
            
            {/* Filter tabs */}
            <div className="mb-6">
              <div className="mb-3">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Filter by Grade:</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setActiveGradeFilter(null)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      activeGradeFilter === null
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setActiveGradeFilter('9')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      activeGradeFilter === '9'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
                    }`}
                  >
                    Grade 9
                  </button>
                  <button
                    onClick={() => setActiveGradeFilter('10')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      activeGradeFilter === '10'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
                    }`}
                  >
                    Grade 10
                  </button>
                  <button
                    onClick={() => setActiveGradeFilter('AS')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      activeGradeFilter === 'AS'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
                    }`}
                  >
                    AS
                  </button>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Filter by Syllabus:</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setActiveSyllabusFilter(null)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      activeSyllabusFilter === null
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setActiveSyllabusFilter('Cambridge')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      activeSyllabusFilter === 'Cambridge'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
                    }`}
                  >
                    Cambridge
                  </button>
                  <button
                    onClick={() => setActiveSyllabusFilter('Edexcel')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      activeSyllabusFilter === 'Edexcel'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
                    }`}
                  >
                    Edexcel
                  </button>
                </div>
              </div>
            </div>
            
            {/* Subject list rendering */}
            {isSubjectsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : subjectsError ? (
              <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400">{subjectsError}</p>
              </div>
            ) : subjects.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400">No subjects found. Click "Add Subject" to create one.</p>
              </div>
            ) : filteredSubjects.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400">No subjects match the selected filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSubjects.map(subject => (
                  <SubjectCard
                    key={subject.id}
                    subject={subject}
                    onEdit={() => {
                      setEditingSubject(subject);
                      setIsSubjectEditorOpen(true);
                    }}
                    onDelete={() => handleDeleteSubject(subject.id)}
                  />
                ))}
              </div>
            )}
            
            {/* Subject Editor Modal is removed as per new_code */}
            
            {/* Calendar Event Editor Modal is removed as per new_code */}
            
            {/* Teacher Content Editor Modal is added as per new_code */}
            {isTeacherContentEditorOpen && (
              <TeacherContentEditor
                onClose={() => {
                  setIsTeacherContentEditorOpen(false);
                  setEditingTeacherContent(undefined);
                }}
                editingTeacher={editingTeacherContent}
                onSave={handleSaveTeacherContent}
              />
            )}
          </div>
        } />
        <Route path="news" element={<News />} />
        <Route path="images/*" element={<Images />} />
        <Route path="store/*" element={<Store />} />
        <Route path="calendar" element={
          <div className="bg-dark-card/80 backdrop-blur-md rounded-2xl shadow-glass-strong p-6 border border-gray-800/50">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-white">Calendar Events</h1>
              <button 
                onClick={() => {
                  setEditingCalendarEvent(undefined);
                  setIsCalendarEventEditorOpen(true);
                }}
                className="flex items-center px-4 py-2 bg-blue-700 hover:bg-blue-600 rounded-lg text-white text-sm font-medium transition-colors"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Event
              </button>
            </div>
            
            {/* Error messages for calendar events are removed as per new_code */}
            
            {/* Loading states for calendar events are removed as per new_code */}
            
            {/* Calendar Event list rendering is removed as per new_code */}
            
            {/* Calendar Event Editor Modal is removed as per new_code */}
            
            {/* Teacher Content Editor Modal is added as per new_code */}
            {isTeacherContentEditorOpen && (
              <TeacherContentEditor
                onClose={() => {
                  setIsTeacherContentEditorOpen(false);
                  setEditingTeacherContent(undefined);
                }}
                editingTeacher={editingTeacherContent}
                onSave={handleSaveTeacherContent}
              />
            )}
          </div>
        } />
        <Route
          path="teachers"
          element={
            <div className="bg-dark-card/80 backdrop-blur-md rounded-2xl shadow-glass-strong p-6 border border-gray-800/50">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-white">Teacher Content</h1>
                <button
                  onClick={() => {
                    setEditingTeacherContent(undefined);
                    setIsTeacherContentEditorOpen(true);
                  }}
                  className="flex items-center px-4 py-2 bg-blue-700 hover:bg-blue-600 rounded-lg text-white text-sm font-medium transition-colors"
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add Teacher
                </button>
              </div>

              {teacherContentError && (
                <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-red-400">{teacherContentError}</p>
                </div>
              )}

              {isTeacherContentLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : teacherContents.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400">No teacher content found. Click "Add Teacher" to create one.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teacherContents.map(teacher => (
                    <TeacherContentCard
                      key={teacher.id}
                      teacher={teacher}
                      onEdit={() => {
                        setEditingTeacherContent(teacher);
                        setIsTeacherContentEditorOpen(true);
                      }}
                      onDelete={() => handleDeleteTeacherContent(teacher.id)}
                    />
                  ))}
                </div>
              )}

              {isTeacherContentEditorOpen && (
                <TeacherContentEditor
                  onClose={() => {
                    setIsTeacherContentEditorOpen(false);
                    setEditingTeacherContent(undefined);
                  }}
                  editingTeacher={editingTeacherContent}
                  onSave={handleSaveTeacherContent}
                />
              )}
            </div>
          }
        />
      </Routes>

      {/* Subject Editor Modal */}
      {isSubjectEditorOpen && (
        <SubjectsEditor 
          editingSubject={editingSubject} 
          onClose={() => {
            setIsSubjectEditorOpen(false);
            setEditingSubject(undefined);
          }}
          onSave={handleSaveSubject}
        />
      )}

      {/* Calendar Event Editor Modal */}
      {isCalendarEventEditorOpen && (
        <CalendarEventEditor 
          editingEvent={editingCalendarEvent} 
          onClose={() => {
            setIsCalendarEventEditorOpen(false);
            setEditingCalendarEvent(undefined);
          }}
          onSave={handleSaveCalendarEvent}
        />
      )}

      {/* Teacher Content Editor Modal */}
      {isTeacherContentEditorOpen && (
        <TeacherContentEditor
          onClose={() => {
            setIsTeacherContentEditorOpen(false);
            setEditingTeacherContent(undefined);
          }}
          editingTeacher={editingTeacherContent}
          onSave={handleSaveTeacherContent}
        />
      )}
    </div>
  );
} 