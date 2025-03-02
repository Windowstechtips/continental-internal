import React, { useState, useEffect } from 'react';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { supabase } from '../lib/supabaseClient';
import { format } from 'date-fns';
import TeacherImageUploader from './TeacherImageUploader';

interface TabProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

interface Subject {
  id: string;
  subject_name: string;
  subject_description: string;
  whatsapp_link: string;
}

interface Teacher {
  id: string;
  teacher_name: string;
  subject_name: string;
  qualifications: string[];
  description: string;
  picture_id: string;
  grade: string;  // Changed from grades to grade
  syllabus: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  event_date: string;
  created_at: string;
}

const Tab: React.FC<TabProps> = ({ label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 font-medium rounded-lg transition-all duration-300 ${
      isActive
        ? 'bg-gradient-to-r from-primary-600 to-secondary-600 text-white shadow-md'
        : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
    }`}
  >
    {label}
  </button>
);

const SubjectCard = ({ subject, onEdit, onDelete }: { subject: Subject; onEdit: () => void; onDelete: () => void }) => (
  <div className="bg-dark-card hover:bg-dark-cardHover border border-dark-border/30 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-5 backdrop-blur-sm animate-slideUp">
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
    <p className="text-gray-400 text-sm line-clamp-2">{subject.subject_description}</p>
  </div>
);

const TeacherCard = ({ teacher, onEdit, onDelete }: { teacher: Teacher; onEdit: () => void; onDelete: () => void }) => {
  // Check if picture_id is a URL (from Cloudinary)
  const isImageUrl = teacher.picture_id && (
    teacher.picture_id.startsWith('http://') || 
    teacher.picture_id.startsWith('https://')
  );

  return (
    <div className="bg-dark-card hover:bg-dark-cardHover border border-dark-border/30 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-5 backdrop-blur-sm animate-slideUp">
    <div className="flex justify-between items-start mb-3">
        <div className="flex items-start space-x-3">
          {isImageUrl ? (
            <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 bg-gray-800 border border-gray-700 shadow-md">
              <img 
                src={teacher.picture_id} 
                alt={teacher.teacher_name}
                className="w-full h-full object-cover transition-transform hover:scale-110 duration-300"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://via.placeholder.com/64?text=Error';
                }}
              />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center border border-gray-700 shadow-md">
              <span className="text-gray-300 text-xl font-semibold">
                {teacher.teacher_name.charAt(0)}
              </span>
            </div>
          )}
      <div>
            <h3 className="text-lg font-semibold text-white">{teacher.teacher_name}</h3>
            <p className="text-sm bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent font-medium">{teacher.subject_name}</p>
            {!isImageUrl && teacher.picture_id && (
        <p className="text-xs text-gray-500">Picture ID: {teacher.picture_id}</p>
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
    <div className="space-y-2">
      <p className="text-gray-400 text-sm line-clamp-2">{teacher.description}</p>
        <div className="flex flex-wrap gap-1 mt-2">
          {teacher.qualifications.map((qual, index) => (
            <span key={index} className="px-2 py-1 bg-gray-800/50 text-gray-300 text-xs rounded-md">
              {qual}
            </span>
          )).slice(0, 3)}
          {teacher.qualifications.length > 3 && (
            <span className="px-2 py-1 bg-gray-800/50 text-gray-300 text-xs rounded-md">
              +{teacher.qualifications.length - 3} more
            </span>
          )}
      </div>
      {teacher.grade && (
          <div className="text-sm text-gray-500 flex items-center">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
          Grade: {teacher.grade}
        </div>
      )}
      {teacher.syllabus && (
          <div className="text-sm text-gray-500 flex items-center">
            <span className="inline-block w-2 h-2 rounded-full bg-purple-500 mr-2"></span>
          Syllabus: {teacher.syllabus}
        </div>
      )}
    </div>
  </div>
);
};

const CalendarEventCard = ({ event, onEdit, onDelete }: { event: CalendarEvent; onEdit: () => void; onDelete: () => void }) => (
  <div className="bg-dark-card hover:bg-dark-cardHover border border-dark-border/30 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-5 backdrop-blur-sm animate-slideUp">
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

const SubjectsEditor = ({ onClose, editingSubject, onSave }: { 
  onClose: () => void; 
  editingSubject?: Subject;
  onSave: (data: Omit<Subject, 'id'>) => Promise<void>;
}) => {
  const [formData, setFormData] = useState({
    subject_name: editingSubject?.subject_name || '',
    subject_description: editingSubject?.subject_description || '',
    whatsapp_link: editingSubject?.whatsapp_link || ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving subject:', error);
      // You might want to show an error message to the user here
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto z-50 animate-fadeIn">
      <form onSubmit={handleSubmit} className="bg-dark-card border border-gray-800/50 rounded-xl shadow-glass-strong p-6 w-full max-w-2xl my-8 animate-slideUp">
        <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 -mx-6 -mt-6 mb-6 px-6 py-4 border-b border-gray-800/50">
          <h2 className="text-2xl font-bold text-white bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          {editingSubject ? 'Edit Subject Content' : 'Add Subject Content'}
        </h2>
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
              placeholder="Enter WhatsApp group link"
            />
          </div>
        </div>
        <div className="flex space-x-3 mt-8">
          <button 
            type="submit"
            disabled={isLoading}
            className="bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-500 hover:to-secondary-500 text-white px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 font-medium"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                <span>Saving...</span>
              </div>
            ) : (
              editingSubject ? 'Update Subject' : 'Save Subject'
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="bg-gray-800 text-gray-300 px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 font-medium"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

const TeachersEditor = ({ onClose, editingTeacher, onSave }: {
  onClose: () => void;
  editingTeacher?: Teacher;
  onSave: (data: Omit<Teacher, 'id'>) => Promise<void>;
}) => {
  const [formData, setFormData] = useState({
    teacher_name: editingTeacher?.teacher_name || '',
    subject_name: editingTeacher?.subject_name || '',
    qualifications: editingTeacher?.qualifications?.join('\n') || '',
    description: editingTeacher?.description || '',
    picture_id: editingTeacher?.picture_id || '',
    grade: editingTeacher?.grade || '',  // Changed from grades to grade
    syllabus: editingTeacher?.syllabus || ''
  });

  const [selectedGrades, setSelectedGrades] = useState<string[]>(
    editingTeacher?.grade ? editingTeacher.grade.split(',') : []  // Changed from grades to grade
  );
  const [selectedSyllabus, setSelectedSyllabus] = useState<string[]>(
    editingTeacher?.syllabus ? editingTeacher.syllabus.split(',') : []
  );

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);

  // If we have an existing picture_id that looks like a URL, set it as the imageUrl
  useEffect(() => {
    if (editingTeacher?.picture_id && (
      editingTeacher.picture_id.startsWith('http://') || 
      editingTeacher.picture_id.startsWith('https://')
    )) {
      setImageUrl(editingTeacher.picture_id);
    }
  }, [editingTeacher]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      // Validate required fields
      if (!formData.teacher_name.trim()) {
        throw new Error('Teacher name is required');
      }
      if (!formData.subject_name.trim()) {
        throw new Error('Subject name is required');
      }

      await onSave({
        ...formData,
        qualifications: formData.qualifications.split('\n').filter(q => q.trim()),
        grade: selectedGrades.join(','),  // Changed from grades to grade
        syllabus: selectedSyllabus.join(',')
      });
      onClose();
    } catch (err) {
      console.error('Error saving teacher:', err);
      setError(err instanceof Error ? err.message : 'Failed to save teacher');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleGrade = (grade: string) => {
    setSelectedGrades(prev => 
      prev.includes(grade)
        ? prev.filter(g => g !== grade)
        : [...prev, grade]
    );
  };

  const toggleSyllabus = (syl: string) => {
    setSelectedSyllabus(prev => 
      prev.includes(syl)
        ? prev.filter(s => s !== syl)
        : [...prev, syl]
    );
  };

  const handleImageUploaded = (imageUrl: string, publicId: string) => {
    // Store the image URL in the picture_id field
    setFormData(prev => ({ ...prev, picture_id: imageUrl }));
    setImageUrl(imageUrl);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto z-50 animate-fadeIn">
      <form onSubmit={handleSubmit} className="bg-dark-card border border-gray-800/50 rounded-xl shadow-glass-strong p-6 w-full max-w-2xl my-8 animate-slideUp max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 -mx-6 -mt-6 mb-6 px-6 py-4 border-b border-gray-800/50">
          <h2 className="text-2xl font-bold text-white bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            {editingTeacher ? 'Edit Teacher Profile' : 'Add New Teacher'}
        </h2>
        </div>
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-xl text-red-300 text-sm animate-slideUp">
            <p className="font-medium mb-1">Error:</p>
            <p>{error}</p>
          </div>
        )}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Teacher Name</label>
            <input
              type="text"
              name="teacher_name"
              value={formData.teacher_name}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-inner"
              placeholder="Enter teacher name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Subject</label>
            <input
              type="text"
              name="subject_name"
              value={formData.subject_name}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-inner"
              placeholder="Enter subject"
            />
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
            <label className="block text-sm font-medium mb-2 text-gray-300">Grade</label>
            <div className="flex flex-wrap gap-3">
              {['9', '10'].map((grade) => (
                <button
                  key={grade}
                  type="button"
                  onClick={() => toggleGrade(grade)}
                  className={`px-5 py-3 rounded-lg font-medium transition-all duration-300 ${
                    selectedGrades.includes(grade)
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                      : 'bg-gray-800/80 text-gray-400 border border-gray-700 hover:bg-gray-700/50 hover:text-white'
                  }`}
                >
                  Grade {grade}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Curriculum</label>
            <div className="flex flex-wrap gap-3">
              {['Cambridge', 'Edexcel'].map((syl) => (
                <button
                  key={syl}
                  type="button"
                  onClick={() => toggleSyllabus(syl)}
                  className={`px-5 py-3 rounded-lg font-medium transition-all duration-300 ${
                    selectedSyllabus.includes(syl)
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                      : 'bg-gray-800/80 text-gray-400 border border-gray-700 hover:bg-gray-700/50 hover:text-white'
                  }`}
                >
                  {syl}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Qualifications (one per line)</label>
            <textarea
              name="qualifications"
              value={formData.qualifications}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 min-h-[100px] shadow-inner"
              placeholder="Enter qualifications (one per line)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Teacher Image</label>
            <TeacherImageUploader 
              onImageUploaded={handleImageUploaded} 
              initialImageUrl={imageUrl}
            />
            {formData.picture_id && (
              <p className="mt-2 text-xs text-gray-400">
                Image URL: {formData.picture_id}
              </p>
            )}
          </div>
        </div>
        <div className="flex space-x-3 mt-8">
          <button 
            type="submit"
            disabled={isLoading}
            className="bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-500 hover:to-secondary-500 text-white px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 font-medium"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                <span>Saving...</span>
              </div>
            ) : (
              editingTeacher ? 'Update Teacher' : 'Save Teacher'
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="bg-gray-800 text-gray-300 px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 font-medium"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

const CalendarEventEditor = ({ onClose, editingEvent, onSave }: {
  onClose: () => void;
  editingEvent?: CalendarEvent;
  onSave: (data: Omit<CalendarEvent, 'id' | 'created_at'>) => Promise<void>;
}) => {
  const [formData, setFormData] = useState({
    title: editingEvent?.title || '',
    description: editingEvent?.description || '',
    event_date: editingEvent?.event_date ? format(new Date(editingEvent.event_date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      if (!formData.title.trim()) {
        throw new Error('Title is required');
      }
      await onSave(formData);
      onClose();
    } catch (err) {
      console.error('Error saving event:', err);
      setError(err instanceof Error ? err.message : 'Failed to save event');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto z-50 animate-fadeIn">
      <form onSubmit={handleSubmit} className="bg-dark-card border border-gray-800/50 rounded-xl shadow-glass-strong p-6 w-full max-w-2xl my-8 animate-slideUp max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 -mx-6 -mt-6 mb-6 px-6 py-4 border-b border-gray-800/50">
          <h2 className="text-2xl font-bold text-white bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            {editingEvent ? 'Edit Calendar Event' : 'Add New Event'}
        </h2>
        </div>
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-xl text-red-300 text-sm animate-slideUp">
            <p className="font-medium mb-1">Error:</p>
            <p>{error}</p>
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
              className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-inner"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 min-h-[150px] shadow-inner"
              placeholder="Enter event description"
            />
          </div>
        </div>
        <div className="flex space-x-3 mt-8">
          <button 
            type="submit"
            disabled={isLoading}
            className="bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-500 hover:to-secondary-500 text-white px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 font-medium"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                <span>Saving...</span>
              </div>
            ) : (
              editingEvent ? 'Update Event' : 'Save Event'
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="bg-gray-800 text-gray-300 px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 font-medium"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default function SiteEditor() {
  const [activeTab, setActiveTab] = useState<'subjects' | 'teachers' | 'calendar'>('subjects');
  const [showEditor, setShowEditor] = useState(false);
  const [editingItem, setEditingItem] = useState<Subject | Teacher | CalendarEvent | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'subjects') {
        const { data, error } = await supabase
          .from('subjects_content')
          .select('*');
        if (error) throw error;
        setSubjects(data || []);
      } else if (activeTab === 'teachers') {
        const { data, error } = await supabase
          .from('teachers_content')
          .select('*');
        if (error) throw error;
        setTeachers(data || []);
      } else if (activeTab === 'calendar') {
        const { data, error } = await supabase
          .from('calendar_events')
          .select('*')
          .order('event_date', { ascending: true });
        if (error) throw error;
        setCalendarEvents(data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSubject = async (data: Omit<Subject, 'id'>) => {
    if (editingItem) {
      const { error } = await supabase
        .from('subjects_content')
        .update(data)
        .eq('id', (editingItem as Subject).id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('subjects_content')
        .insert([data]);
      if (error) throw error;
    }
    fetchData();
  };

  const handleSaveTeacher = async (data: Omit<Teacher, 'id'>) => {
    const formattedData = {
      teacher_name: data.teacher_name,
      subject_name: data.subject_name,
      qualifications: data.qualifications,
      description: data.description,
      picture_id: data.picture_id || '',
      grade: data.grade || '',  // Changed from grades to grade
      syllabus: data.syllabus || ''
    };

    try {
      if (editingItem) {
        const { error } = await supabase
          .from('teachers_content')
          .update(formattedData)
          .eq('id', (editingItem as Teacher).id);
        if (error) {
          console.error('Update error details:', error);
          throw error;
        }
      } else {
        const { error } = await supabase
          .from('teachers_content')
          .insert([formattedData]);
        if (error) {
          console.error('Insert error details:', error);
          throw error;
        }
      }
      fetchData();
    } catch (error) {
      console.error('Error saving teacher:', error);
      throw error;
    }
  };

  const handleSaveCalendarEvent = async (data: Omit<CalendarEvent, 'id' | 'created_at'>) => {
    try {
      if (editingItem) {
        const { error } = await supabase
          .from('calendar_events')
          .update(data)
          .eq('id', (editingItem as CalendarEvent).id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('calendar_events')
          .insert([data]);
        if (error) throw error;
      }
      fetchData();
    } catch (error) {
      console.error('Error saving calendar event:', error);
      throw error;
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from(activeTab === 'subjects' ? 'subjects_content' : activeTab === 'teachers' ? 'teachers_content' : 'calendar_events')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 animate-fadeIn">
      <div className="bg-dark-card/80 backdrop-blur-md rounded-2xl shadow-glass-strong p-6 border border-gray-800/50">
        <div className="flex justify-between items-center mb-8">
          <div className="flex space-x-2">
            <Tab
              label="Subjects"
              isActive={activeTab === 'subjects'}
              onClick={() => setActiveTab('subjects')}
            />
            <Tab
              label="Teachers"
              isActive={activeTab === 'teachers'}
              onClick={() => setActiveTab('teachers')}
            />
            <Tab
              label="Calendar"
              isActive={activeTab === 'calendar'}
              onClick={() => setActiveTab('calendar')}
            />
          </div>
          <button
            onClick={() => {
              setEditingItem(null);
              setShowEditor(true);
            }}
            className="bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-500 hover:to-secondary-500 text-white p-2 rounded-full shadow-md hover:shadow-lg transition-all duration-300"
          >
            <PlusIcon className="h-6 w-6" />
          </button>
        </div>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 rounded-full border-4 border-gray-600 border-t-blue-500 animate-spin mb-4"></div>
            <p className="text-gray-400">Loading content...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeTab === 'subjects' && subjects.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-400">
                <p>No subjects found. Click the + button to add one.</p>
              </div>
            )}
            {activeTab === 'subjects' && subjects.map(subject => (
              <SubjectCard
                key={subject.id}
                subject={subject}
                onEdit={() => {
                  setEditingItem(subject);
                  setShowEditor(true);
                }}
                onDelete={() => handleDelete(subject.id)}
              />
            ))}
            
            {activeTab === 'teachers' && teachers.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-400">
                <p>No teachers found. Click the + button to add one.</p>
              </div>
            )}
            {activeTab === 'teachers' && teachers.map(teacher => (
              <TeacherCard
                key={teacher.id}
                teacher={teacher}
                onEdit={() => {
                  setEditingItem(teacher);
                  setShowEditor(true);
                }}
                onDelete={() => handleDelete(teacher.id)}
              />
            ))}
            
            {activeTab === 'calendar' && calendarEvents.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-400">
                <p>No events found. Click the + button to add one.</p>
              </div>
            )}
            {activeTab === 'calendar' && calendarEvents.map(event => (
              <CalendarEventCard
                key={event.id}
                event={event}
                onEdit={() => {
                  setEditingItem(event);
                  setShowEditor(true);
                }}
                onDelete={() => handleDelete(event.id)}
              />
            ))}
          </div>
        )}
      </div>

      {showEditor && (
        activeTab === 'subjects' ? (
          <SubjectsEditor 
            onClose={() => {
              setShowEditor(false);
              setEditingItem(null);
            }}
            editingSubject={editingItem as Subject}
            onSave={handleSaveSubject}
          />
        ) : activeTab === 'teachers' ? (
          <TeachersEditor 
            onClose={() => {
              setShowEditor(false);
              setEditingItem(null);
            }}
            editingTeacher={editingItem as Teacher}
            onSave={handleSaveTeacher}
          />
        ) : (
          <CalendarEventEditor
            onClose={() => {
              setShowEditor(false);
              setEditingItem(null);
            }}
            editingEvent={editingItem as CalendarEvent}
            onSave={handleSaveCalendarEvent}
          />
        )
      )}
    </div>
  );
} 