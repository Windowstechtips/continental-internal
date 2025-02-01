import React, { useState, useEffect } from 'react';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { supabase } from '../lib/supabase';

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
  <div className="bg-white dark:bg-gray-700 rounded-lg shadow p-4 hover:shadow-lg transition-shadow">
    <div className="flex justify-between items-start mb-3">
      <h3 className="text-lg font-semibold">{subject.subject_name}</h3>
      <div className="flex space-x-2">
        <button
          onClick={onEdit}
          className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
        >
          <PencilIcon className="h-5 w-5 text-blue-500" />
        </button>
        <button 
          onClick={onDelete}
          className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
        >
          <TrashIcon className="h-5 w-5 text-red-500" />
        </button>
      </div>
    </div>
    <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2">{subject.subject_description}</p>
  </div>
);

const TeacherCard = ({ teacher, onEdit, onDelete }: { teacher: Teacher; onEdit: () => void; onDelete: () => void }) => (
  <div className="bg-white dark:bg-gray-700 rounded-lg shadow p-4 hover:shadow-lg transition-shadow">
    <div className="flex justify-between items-start mb-3">
      <div>
        <h3 className="text-lg font-semibold">{teacher.teacher_name}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">{teacher.subject_name}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">Picture ID: {teacher.picture_id}</p>
      </div>
      <div className="flex space-x-2">
        <button
          onClick={onEdit}
          className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
        >
          <PencilIcon className="h-5 w-5 text-blue-500" />
        </button>
        <button 
          onClick={onDelete}
          className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
        >
          <TrashIcon className="h-5 w-5 text-red-500" />
        </button>
      </div>
    </div>
    <div className="space-y-2">
      <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2">{teacher.description}</p>
      <div className="text-sm text-gray-500 dark:text-gray-400">
        {teacher.qualifications.length} qualification(s)
      </div>
    </div>
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl">
        <h2 className="text-xl font-semibold mb-4">
          {editingSubject ? 'Edit Subject Content' : 'Add Subject Content'}
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Subject Name</label>
            <input
              type="text"
              name="subject_name"
              value={formData.subject_name}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              placeholder="Enter subject name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Subject Description</label>
            <textarea
              name="subject_description"
              value={formData.subject_description}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 min-h-[150px]"
              placeholder="Enter subject description"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">WhatsApp Group Link</label>
            <input
              type="text"
              name="whatsapp_link"
              value={formData.whatsapp_link}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              placeholder="Enter WhatsApp group link"
            />
          </div>
        </div>
        <div className="flex space-x-3">
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
            className="bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors disabled:opacity-50"
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
    qualifications: editingTeacher?.qualifications.join('\n') || '',
    description: editingTeacher?.description || '',
    picture_id: editingTeacher?.picture_id || ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSave({
        ...formData,
        qualifications: formData.qualifications.split('\n').filter(q => q.trim())
      });
      onClose();
    } catch (error) {
      console.error('Error saving teacher:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl">
        <h2 className="text-xl font-semibold mb-4">
          {editingTeacher ? 'Edit Teacher Content' : 'Add Teacher Content'}
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Teacher Name</label>
            <input
              type="text"
              name="teacher_name"
              value={formData.teacher_name}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              placeholder="Enter teacher name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Subject Name</label>
            <input
              type="text"
              name="subject_name"
              value={formData.subject_name}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              placeholder="Enter subject name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Picture ID</label>
            <input
              type="text"
              name="picture_id"
              value={formData.picture_id}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              placeholder="Enter picture ID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Qualifications</label>
            <textarea
              name="qualifications"
              value={formData.qualifications}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 min-h-[100px]"
              placeholder="Enter qualifications (one per line)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 min-h-[150px]"
              placeholder="Enter teacher description"
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
            className="bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default function SiteEditor() {
  const [activeTab, setActiveTab] = useState<'subjects' | 'teachers'>('subjects');
  const [showEditor, setShowEditor] = useState(false);
  const [editingItem, setEditingItem] = useState<Subject | Teacher | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
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
      } else {
        const { data, error } = await supabase
          .from('teachers_content')
          .select('*');
        if (error) throw error;
        setTeachers(data || []);
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
    if (editingItem) {
      const { error } = await supabase
        .from('teachers_content')
        .update(data)
        .eq('id', (editingItem as Teacher).id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('teachers_content')
        .insert([data]);
      if (error) throw error;
    }
    fetchData();
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from(activeTab === 'subjects' ? 'subjects_content' : 'teachers_content')
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
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
          <div className="text-center py-8">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeTab === 'subjects'
              ? subjects.map(subject => (
                  <SubjectCard
                    key={subject.id}
                    subject={subject}
                    onEdit={() => {
                      setEditingItem(subject);
                      setShowEditor(true);
                    }}
                    onDelete={() => handleDelete(subject.id)}
                  />
                ))
              : teachers.map(teacher => (
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
          </div>
        )}
      </div>

      {showEditor && (
        activeTab === 'subjects' 
          ? <SubjectsEditor 
              onClose={() => {
                setShowEditor(false);
                setEditingItem(null);
              }}
              editingSubject={editingItem as Subject}
              onSave={handleSaveSubject}
            />
          : <TeachersEditor 
              onClose={() => {
                setShowEditor(false);
                setEditingItem(null);
              }}
              editingTeacher={editingItem as Teacher}
              onSave={handleSaveTeacher}
            />
      )}
    </div>
  );
} 