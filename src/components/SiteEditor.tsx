import React, { useState, useEffect } from 'react';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';

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
    className={`px-4 py-2 font-medium rounded-lg transition-colors ${
      isActive
        ? 'bg-blue-500 text-white'
        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
    }`}
  >
    {label}
  </button>
);

const SubjectCard = ({ subject, onEdit, onDelete }: { subject: Subject; onEdit: () => void; onDelete: () => void }) => (
  <div className="bg-[#1e2837] rounded-lg shadow p-4 hover:shadow-lg transition-shadow">
    <div className="flex justify-between items-start mb-3">
      <h3 className="text-lg font-semibold text-gray-200">{subject.subject_name}</h3>
      <div className="flex space-x-2">
        <button
          onClick={onEdit}
          className="p-1 rounded-full hover:bg-gray-700/50 transition-colors"
        >
          <PencilIcon className="h-5 w-5 text-blue-400" />
        </button>
        <button 
          onClick={onDelete}
          className="p-1 rounded-full hover:bg-gray-700/50 transition-colors"
        >
          <TrashIcon className="h-5 w-5 text-red-400" />
        </button>
      </div>
    </div>
    <p className="text-gray-400 text-sm line-clamp-2">{subject.subject_description}</p>
  </div>
);

const TeacherCard = ({ teacher, onEdit, onDelete }: { teacher: Teacher; onEdit: () => void; onDelete: () => void }) => (
  <div className="bg-[#1e2837] rounded-lg shadow p-4 hover:shadow-lg transition-shadow">
    <div className="flex justify-between items-start mb-3">
      <div>
        <h3 className="text-lg font-semibold text-gray-200">{teacher.teacher_name}</h3>
        <p className="text-sm text-blue-400">{teacher.subject_name}</p>
        <p className="text-xs text-gray-500">Picture ID: {teacher.picture_id}</p>
      </div>
      <div className="flex space-x-2">
        <button
          onClick={onEdit}
          className="p-1 rounded-full hover:bg-gray-700/50 transition-colors"
        >
          <PencilIcon className="h-5 w-5 text-blue-400" />
        </button>
        <button 
          onClick={onDelete}
          className="p-1 rounded-full hover:bg-gray-700/50 transition-colors"
        >
          <TrashIcon className="h-5 w-5 text-red-400" />
        </button>
      </div>
    </div>
    <div className="space-y-2">
      <p className="text-gray-400 text-sm line-clamp-2">{teacher.description}</p>
      <div className="text-sm text-gray-500">
        {teacher.qualifications.length} qualification(s)
      </div>
      {teacher.grade && (
        <div className="text-sm text-gray-500">
          Grade: {teacher.grade}
        </div>
      )}
      {teacher.syllabus && (
        <div className="text-sm text-gray-500">
          Syllabus: {teacher.syllabus}
        </div>
      )}
    </div>
  </div>
);

const CalendarEventCard = ({ event, onEdit, onDelete }: { event: CalendarEvent; onEdit: () => void; onDelete: () => void }) => (
  <div className="bg-[#1e2837] rounded-lg shadow p-4 hover:shadow-lg transition-shadow">
    <div className="flex justify-between items-start mb-3">
      <div>
        <h3 className="text-lg font-semibold text-gray-200">{event.title}</h3>
        <p className="text-sm text-blue-400">{format(new Date(event.event_date), 'MMMM d, yyyy')}</p>
      </div>
      <div className="flex space-x-2">
        <button
          onClick={onEdit}
          className="p-1 rounded-full hover:bg-gray-700/50 transition-colors"
        >
          <PencilIcon className="h-5 w-5 text-blue-400" />
        </button>
        <button 
          onClick={onDelete}
          className="p-1 rounded-full hover:bg-gray-700/50 transition-colors"
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 overflow-y-auto">
      <form onSubmit={handleSubmit} className="bg-[#1A1A1A] rounded-lg shadow-xl p-6 w-full max-w-2xl my-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-200">
          {editingSubject ? 'Edit Subject Content' : 'Add Subject Content'}
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Subject Name</label>
            <input
              type="text"
              name="subject_name"
              value={formData.subject_name}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg bg-[#2A2A2A] border-gray-600 text-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Enter subject name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Subject Description</label>
            <textarea
              name="subject_description"
              value={formData.subject_description}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg bg-[#2A2A2A] border-gray-600 text-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-h-[150px]"
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
              className="w-full px-3 py-2 border rounded-lg bg-[#2A2A2A] border-gray-600 text-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Enter WhatsApp group link"
            />
          </div>
        </div>
        <div className="flex space-x-3 mt-6">
          <button 
            type="submit"
            disabled={isLoading}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : editingSubject ? 'Update Subject' : 'Save Subject'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="bg-[#2A2A2A] text-gray-300 px-4 py-2 rounded-lg hover:bg-[#3A3A3A] transition-colors disabled:opacity-50"
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 overflow-y-auto">
      <form onSubmit={handleSubmit} className="bg-[#1A1A1A] rounded-lg shadow-xl p-6 w-full max-w-2xl my-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-200">
          {editingTeacher ? 'Edit Teacher' : 'Add Teacher'}
        </h2>
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Teacher Name</label>
            <input
              type="text"
              name="teacher_name"
              value={formData.teacher_name}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg bg-[#2A2A2A] border-gray-600 text-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
              className="w-full px-3 py-2 border rounded-lg bg-[#2A2A2A] border-gray-600 text-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Enter subject"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg bg-[#2A2A2A] border-gray-600 text-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-h-[100px]"
              placeholder="Enter description"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Grade</label>
            <div className="flex flex-wrap gap-2">
              {['9', '10'].map((grade) => (
                <label key={grade} className="flex items-center space-x-2 bg-[#2A2A2A] px-3 py-2 rounded-lg border border-gray-600">
                  <input
                    type="checkbox"
                    checked={selectedGrades.includes(grade)}
                    onChange={() => toggleGrade(grade)}
                    className="rounded border-gray-500 text-blue-500 focus:ring-blue-500 bg-[#1A1A1A]"
                  />
                  <span className="text-gray-200">Grade {grade}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Curriculum</label>
            <div className="flex flex-wrap gap-2">
              {['Cambridge', 'Edexcel'].map((syl) => (
                <label key={syl} className="flex items-center space-x-2 bg-[#2A2A2A] px-3 py-2 rounded-lg border border-gray-600">
                  <input
                    type="checkbox"
                    checked={selectedSyllabus.includes(syl)}
                    onChange={() => toggleSyllabus(syl)}
                    className="rounded border-gray-500 text-blue-500 focus:ring-blue-500 bg-[#1A1A1A]"
                  />
                  <span className="text-gray-200">{syl}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Qualifications (one per line)</label>
            <textarea
              name="qualifications"
              value={formData.qualifications}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg bg-[#2A2A2A] border-gray-600 text-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-h-[100px]"
              placeholder="Enter qualifications (one per line)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Picture ID</label>
            <input
              type="text"
              name="picture_id"
              value={formData.picture_id}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg bg-[#2A2A2A] border-gray-600 text-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Enter picture ID"
            />
          </div>
        </div>
        <div className="flex space-x-3 mt-6">
          <button 
            type="submit"
            disabled={isLoading}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : editingTeacher ? 'Update Teacher' : 'Save Teacher'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="bg-[#2A2A2A] text-gray-300 px-4 py-2 rounded-lg hover:bg-[#3A3A3A] transition-colors disabled:opacity-50"
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 overflow-y-auto">
      <form onSubmit={handleSubmit} className="bg-[#1A1A1A] rounded-lg shadow-xl p-6 w-full max-w-2xl my-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-200">
          {editingEvent ? 'Edit Calendar Event' : 'Add Calendar Event'}
        </h2>
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Event Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg bg-[#2A2A2A] border-gray-600 text-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
              className="w-full px-3 py-2 border rounded-lg bg-[#2A2A2A] border-gray-600 text-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg bg-[#2A2A2A] border-gray-600 text-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-h-[100px]"
              placeholder="Enter event description"
            />
          </div>
        </div>
        <div className="flex space-x-3 mt-6">
          <button 
            type="submit"
            disabled={isLoading}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : editingEvent ? 'Update Event' : 'Save Event'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="bg-[#2A2A2A] text-gray-300 px-4 py-2 rounded-lg hover:bg-[#3A3A3A] transition-colors disabled:opacity-50"
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
    <div className="container mx-auto px-4 py-8">
      <div className="bg-[#1A1A1A] rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex space-x-4">
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
            className="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 transition-colors"
          >
            <PlusIcon className="h-6 w-6" />
          </button>
        </div>
        
        {isLoading ? (
          <div className="text-center py-8 text-gray-200">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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