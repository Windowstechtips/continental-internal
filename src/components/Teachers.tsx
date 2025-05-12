import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  PlusIcon, 
  PencilIcon, 
  XMarkIcon, 
  TrashIcon,
  BookOpenIcon,
  UserCircleIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline';

interface Teacher {
  id: number;
  name: string;
  subject: string;
}

interface TeacherWithSubjects {
  id: number;
  name: string;
  subjects: string[];
}

export default function Teachers() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    subject: ''
  });

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .order('name');

      if (error) throw error;
      
      setTeachers(data || []);
      setError(null);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      setError('Failed to load teachers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTeacher = async () => {
    try {
      if (!formData.name || !formData.subject) {
        setError('Please fill in all fields');
        return;
      }

      const { error } = await supabase
        .from('teachers')
        .insert([{ 
          name: formData.name, 
          subject: formData.subject 
        }]);

      if (error) throw error;

      setIsAddModalOpen(false);
      setFormData({ name: '', subject: '' });
      fetchTeachers();
    } catch (error) {
      console.error('Error adding teacher:', error);
      setError('Failed to add teacher. Please try again.');
    }
  };

  const handleEditTeacher = async () => {
    try {
      if (!selectedTeacher) return;
      if (!formData.name || !formData.subject) {
        setError('Please fill in all fields');
        return;
      }

      const { error } = await supabase
        .from('teachers')
        .update({ 
          name: formData.name, 
          subject: formData.subject 
        })
        .eq('id', selectedTeacher.id);

      if (error) throw error;

      setIsEditModalOpen(false);
      setSelectedTeacher(null);
      setFormData({ name: '', subject: '' });
      fetchTeachers();
    } catch (error) {
      console.error('Error updating teacher:', error);
      setError('Failed to update teacher. Please try again.');
    }
  };

  const handleDeleteTeacher = async () => {
    try {
      if (!selectedTeacher) return;

      const { error } = await supabase
        .from('teachers')
        .delete()
        .eq('id', selectedTeacher.id);

      if (error) throw error;

      setIsDeleteModalOpen(false);
      setSelectedTeacher(null);
      fetchTeachers();
    } catch (error) {
      console.error('Error deleting teacher:', error);
      setError('Failed to delete teacher. Please try again.');
    }
  };

  const openEditModal = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setFormData({
      name: teacher.name,
      subject: teacher.subject
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setIsDeleteModalOpen(true);
  };

  // Group teachers by name
  const groupTeachersByName = (): TeacherWithSubjects[] => {
    const groupedTeachers: { [key: string]: TeacherWithSubjects } = {};
    
    teachers.forEach(teacher => {
      if (groupedTeachers[teacher.name]) {
        if (!groupedTeachers[teacher.name].subjects.includes(teacher.subject)) {
          groupedTeachers[teacher.name].subjects.push(teacher.subject);
        }
      } else {
        groupedTeachers[teacher.name] = {
          id: teacher.id,
          name: teacher.name,
          subjects: [teacher.subject]
        };
      }
    });
    
    return Object.values(groupedTeachers);
  };

  // Filter teachers based on search query
  const filteredTeachers = groupTeachersByName().filter(teacher => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      teacher.name.toLowerCase().includes(query) ||
      teacher.subjects.some(subject => subject.toLowerCase().includes(query))
    );
  });

  return (
    <div className="min-h-full bg-gradient-to-br from-[#0a0a0a] to-[#111827] text-gray-200">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div className="mb-4 md:mb-0">
            <h1 className="text-2xl font-bold text-white flex items-center">
              <UserCircleIcon className="h-6 w-6 mr-2 text-blue-500" />
              Teachers Management
            </h1>
            <p className="text-gray-400 mt-1">
              Add, edit, and manage teachers and their subjects
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder="Search teachers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800/80 border border-gray-700/50 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 pl-10"
              />
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            <button
              onClick={() => {
                setFormData({ name: '', subject: '' });
                setIsAddModalOpen(true);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg flex items-center justify-center whitespace-nowrap"
            >
              <PlusIcon className="h-5 w-5 mr-1" />
              Add Teacher
            </button>
          </div>
        </div>
        
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-800/30 rounded-lg text-red-200">
            {error}
          </div>
        )}
        
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredTeachers.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center bg-gray-800/30 rounded-xl p-8 border border-gray-700/50">
                <AcademicCapIcon className="h-12 w-12 text-gray-600 mb-3" />
                <h3 className="text-xl font-medium text-gray-400 mb-2">No teachers found</h3>
                <p className="text-gray-500 text-center mb-4">
                  {searchQuery ? 'Try a different search term' : 'Add a new teacher to get started'}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            ) : (
              filteredTeachers.map(teacher => (
                <div 
                  key={teacher.id} 
                  className="bg-gray-800/40 hover:bg-gray-800/60 border border-gray-700/50 rounded-xl overflow-hidden transition-all duration-200 shadow-md"
                >
                  <div className="bg-gradient-to-r from-blue-600/20 to-indigo-600/20 px-4 py-3 border-b border-gray-700/50 flex justify-between items-center">
                    <h3 className="font-medium text-white truncate">{teacher.name}</h3>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => {
                          // Find the first entry for this teacher to edit
                          const teacherToEdit = teachers.find(t => t.name === teacher.name);
                          if (teacherToEdit) openEditModal(teacherToEdit);
                        }}
                        className="p-1 text-gray-300 hover:text-blue-400 hover:bg-blue-400/10 rounded transition-colors"
                        title="Edit Teacher"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          // Find the first entry for this teacher to delete
                          const teacherToDelete = teachers.find(t => t.name === teacher.name);
                          if (teacherToDelete) openDeleteModal(teacherToDelete);
                        }}
                        className="p-1 text-gray-300 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                        title="Delete Teacher"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="p-4">
                    <h4 className="text-sm font-medium text-gray-400 mb-2 flex items-center">
                      <BookOpenIcon className="h-4 w-4 mr-1 text-blue-500" />
                      Subjects
                    </h4>
                    <div className="space-y-2">
                      {teacher.subjects.map((subject, idx) => (
                        <div key={idx} className="bg-gray-700/40 border border-gray-600/30 rounded-lg px-3 py-2 text-sm text-gray-300">
                          {subject}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      
      {/* Add Teacher Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setIsAddModalOpen(false)}>
          <div 
            className="bg-gray-900 rounded-xl border border-gray-700/50 shadow-2xl w-full max-w-md overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-sky-400 opacity-90"></div>
              <div className="relative p-5 flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Add New Teacher</h3>
                <button 
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Teacher Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-800/80 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter teacher name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Subject</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={e => setFormData({...formData, subject: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-800/80 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter subject"
                />
              </div>
            </div>
            
            <div className="border-t border-gray-800 p-4 flex justify-end space-x-3">
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddTeacher}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-300"
              >
                Add Teacher
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Teacher Modal */}
      {isEditModalOpen && selectedTeacher && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setIsEditModalOpen(false)}>
          <div 
            className="bg-gray-900 rounded-xl border border-gray-700/50 shadow-2xl w-full max-w-md overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-sky-400 opacity-90"></div>
              <div className="relative p-5 flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Edit Teacher</h3>
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Teacher Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-800/80 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter teacher name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Subject</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={e => setFormData({...formData, subject: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-800/80 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter subject"
                />
              </div>
            </div>
            
            <div className="border-t border-gray-800 p-4 flex justify-end space-x-3">
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleEditTeacher}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-300"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedTeacher && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setIsDeleteModalOpen(false)}>
          <div 
            className="bg-gray-900 rounded-xl border border-gray-700/50 shadow-2xl w-full max-w-md overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-400 opacity-90"></div>
              <div className="relative p-5 flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Delete Teacher</h3>
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="p-5 space-y-4">
              <p className="text-gray-300">
                Are you sure you want to delete <span className="text-white font-medium">{selectedTeacher.name}</span> 
                {teachers.filter(t => t.name === selectedTeacher.name).length > 1 
                  ? ` and all their subjects? This will remove ${teachers.filter(t => t.name === selectedTeacher.name).length} entries.`
                  : ` (subject: ${selectedTeacher.subject})?`
                }
              </p>
              
              <div className="p-3 bg-red-900/20 border border-red-800/30 rounded-lg text-sm text-red-200">
                <p>
                  This action cannot be undone. Any classes assigned to this teacher will need to be reassigned.
                </p>
              </div>
            </div>
            
            <div className="border-t border-gray-800 p-4 flex justify-end space-x-3">
              <button 
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteTeacher}
                className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-300"
              >
                Delete Teacher
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 