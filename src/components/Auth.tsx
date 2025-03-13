import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PlusIcon, TrashIcon, LinkIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface Teacher {
  id: number;
  name: string;
  subject: string;
  user_id?: string | null;
}

interface User {
  id: string;
  username: string;
  created_at: string;
  linked_teacher?: Teacher | null;
}

// Group teachers by name
interface TeacherGroup {
  name: string;
  subjects: string[];
  ids: number[];
  hasLinkedUser: boolean;
  user_id?: string | null;
}

export default function Auth() {
  const [users, setUsers] = useState<User[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teacherGroups, setTeacherGroups] = useState<TeacherGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // New user form state
  const [newUsername, setNewUsername] = useState('');
  const [selectedTeacherName, setSelectedTeacherName] = useState<string>('');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  
  // Link user form state
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedLinkTeacherName, setSelectedLinkTeacherName] = useState<string>('');
  
  // Fetch users and teachers on component mount
  useEffect(() => {
    fetchData();
  }, []);
  
  // Group teachers by name
  useEffect(() => {
    const groups: TeacherGroup[] = [];
    const nameMap: { [key: string]: TeacherGroup } = {};
    
    teachers.forEach(teacher => {
      if (!nameMap[teacher.name]) {
        nameMap[teacher.name] = {
          name: teacher.name,
          subjects: [],
          ids: [],
          hasLinkedUser: false,
          user_id: null
        };
        groups.push(nameMap[teacher.name]);
      }
      
      nameMap[teacher.name].subjects.push(teacher.subject);
      nameMap[teacher.name].ids.push(teacher.id);
      
      if (teacher.user_id) {
        nameMap[teacher.name].hasLinkedUser = true;
        nameMap[teacher.name].user_id = teacher.user_id;
      }
    });
    
    setTeacherGroups(groups);
  }, [teachers]);
  
  // Fetch users and teachers
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch teachers
      const { data: teachersData, error: teachersError } = await supabase
        .from('teachers')
        .select('*');
        
      if (teachersError) throw teachersError;
      
      // Fetch users from teacher_users table
      const { data: usersData, error: usersError } = await supabase
        .from('teacher_users')
        .select('*');
        
      if (usersError) throw usersError;
      
      // Process the data to link teachers with users
      const processedUsers = await Promise.all(usersData.map(async (user) => {
        // Find linked teacher
        const linkedTeacher = teachersData.find(teacher => teacher.user_id === user.id) || null;
        return { ...user, linked_teacher: linkedTeacher };
      }));
      
      setTeachers(teachersData || []);
      setUsers(processedUsers || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      setError(error.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };
  
  // Create a new user
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newUsername) {
      setError('Username is required');
      return;
    }
    
    if (!selectedTeacherName) {
      setError('Teacher selection is required');
      return;
    }
    
    try {
      setIsCreatingUser(true);
      setError(null);
      
      // Get the selected teacher group
      const teacherGroup = teacherGroups.find(group => group.name === selectedTeacherName);
      if (!teacherGroup) {
        throw new Error('Selected teacher not found');
      }
      
      // Check if any teacher in this group already has a user
      if (teacherGroup.hasLinkedUser) {
        throw new Error('This teacher already has a linked user account');
      }
      
      // Default password
      const defaultPassword = '12345678';
      
      // 1. Create user in our custom teacher_users table with hashed password
      const { data: userData, error: userError } = await supabase.rpc('hash_password', {
        password: defaultPassword
      });
      
      if (userError) throw userError;
      
      const { data: newUser, error: insertError } = await supabase
        .from('teacher_users')
        .insert({
          username: newUsername,
          password_hash: userData
        })
        .select()
        .single();
        
      if (insertError) throw insertError;
      
      if (!newUser) {
        throw new Error('Failed to create user');
      }
      
      // 2. Link the user to all teachers with the same name
      for (const teacherId of teacherGroup.ids) {
        const { error: updateError } = await supabase
          .from('teachers')
          .update({ user_id: newUser.id })
          .eq('id', teacherId);
          
        if (updateError) throw updateError;
      }
      
      // Reset form
      setNewUsername('');
      setSelectedTeacherName('');
      
      // Show success message
      setSuccess(`User ${newUsername} created successfully with password: ${defaultPassword}. They can sign in with username: ${newUsername}`);
      
      // Refresh data
      fetchData();
    } catch (error: any) {
      console.error('Error creating user:', error);
      setError(error.message || 'Failed to create user');
    } finally {
      setIsCreatingUser(false);
      
      // Clear success message after 8 seconds
      if (success) {
        setTimeout(() => setSuccess(null), 8000);
      }
    }
  };
  
  // Delete a user
  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // 1. Unlink from any teachers
      const { error: unlinkError } = await supabase
        .from('teachers')
        .update({ user_id: null })
        .eq('user_id', userId);
        
      if (unlinkError) throw unlinkError;
      
      // 2. Delete from teacher_users table
      const { error: deleteError } = await supabase
        .from('teacher_users')
        .delete()
        .eq('id', userId);
        
      if (deleteError) throw deleteError;
      
      // Refresh data
      fetchData();
      
      // Show success message
      setSuccess('User deleted successfully');
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (error: any) {
      console.error('Error deleting user:', error);
      setError(error.message || 'Failed to delete user');
      setLoading(false);
    }
  };
  
  // Open link modal for a user
  const openLinkModal = (userId: string) => {
    setSelectedUserId(userId);
    setSelectedLinkTeacherName('');
    setIsLinkModalOpen(true);
  };
  
  // Link a user to a teacher
  const handleLinkTeacher = async () => {
    if (!selectedUserId || !selectedLinkTeacherName) {
      setError('User and teacher are required');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('Attempting to link teacher with user ID:', selectedUserId);
      
      // First, verify that the user exists in teacher_users table
      const { data: userData, error: userError } = await supabase
        .from('teacher_users')
        .select('id')
        .eq('id', selectedUserId)
        .single();
        
      if (userError) {
        console.error('Error fetching user:', userError);
        throw new Error(`Error fetching user: ${userError.message}`);
      }
      
      if (!userData) {
        console.error('User not found:', selectedUserId);
        throw new Error('User not found in teacher_users table');
      }
      
      console.log('Found user:', userData);
      
      // Get the selected teacher group
      const teacherGroup = teacherGroups.find(group => group.name === selectedLinkTeacherName);
      if (!teacherGroup) {
        console.error('Teacher group not found:', selectedLinkTeacherName);
        throw new Error('Selected teacher not found');
      }
      
      console.log('Found teacher group:', teacherGroup);
      
      // First, unlink the user from any existing teachers
      const { error: unlinkError } = await supabase
        .from('teachers')
        .update({ user_id: null })
        .eq('user_id', selectedUserId);
        
      if (unlinkError) {
        console.error('Error unlinking:', unlinkError);
        throw new Error(`Error unlinking: ${unlinkError.message}`);
      }
      
      // Then link to all teachers with the selected name
      const { error: linkError } = await supabase
        .from('teachers')
        .update({ user_id: userData.id }) // Use the verified user ID
        .in('id', teacherGroup.ids);
          
      if (linkError) {
        console.error('Error linking:', linkError);
        throw new Error(`Error linking: ${linkError.message}`);
      }
      
      // Close modal and refresh data
      setIsLinkModalOpen(false);
      fetchData();
      
      // Show success message
      setSuccess('Teacher linked successfully');
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (error: any) {
      console.error('Error linking teacher:', error);
      setError(error.message || 'Failed to link teacher');
      setLoading(false);
    }
  };
  
  // Get available teacher groups (not linked to any user)
  const getAvailableTeacherGroups = () => {
    return teacherGroups.filter(group => !group.hasLinkedUser || group.user_id === selectedUserId);
  };
  
  // Get teacher display for a user
  const getUserTeacherDisplay = (user: User) => {
    if (!user.linked_teacher) return <span className="text-gray-500">Not linked</span>;
    
    // Find all teachers with the same name
    const teachersWithSameName = teachers.filter(t => t.name === user.linked_teacher?.name);
    
    if (teachersWithSameName.length === 1) {
      return (
        <span className="text-green-400">
          {user.linked_teacher.name} ({user.linked_teacher.subject})
        </span>
      );
    } else {
      const subjects = teachersWithSameName.map(t => t.subject).join(', ');
      return (
        <span className="text-green-400">
          {user.linked_teacher.name} ({subjects})
        </span>
      );
    }
  };
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">User Authentication Management</h1>
      
      {/* Success and Error Messages */}
      {success && (
        <div className="mb-4 p-3 bg-green-900/20 border border-green-800/50 rounded-lg text-green-300 flex items-center">
          <CheckCircleIcon className="h-5 w-5 mr-2" />
          {success}
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-800/50 rounded-lg text-red-300">
          {error}
        </div>
      )}
      
      {/* Create User Form */}
      <div className="mb-8 bg-gray-900/30 rounded-xl p-6 border border-gray-800">
        <h2 className="text-xl font-semibold mb-4">Create New User</h2>
        
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-400 mb-1">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter username"
                required
              />
            </div>
            
            <div>
              <label htmlFor="teacher" className="block text-sm font-medium text-gray-400 mb-1">
                Link to Teacher <span className="text-red-400">*</span>
              </label>
              <select
                id="teacher"
                value={selectedTeacherName}
                onChange={(e) => setSelectedTeacherName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select a teacher</option>
                {getAvailableTeacherGroups().map(group => (
                  <option key={group.name} value={group.name}>
                    {group.name} - {group.subjects.join(', ')}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isCreatingUser}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors flex items-center"
            >
              {isCreatingUser ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <PlusIcon className="h-5 w-5 mr-1" />
                  Create User
                </>
              )}
            </button>
          </div>
          
          <div className="text-sm text-gray-400 mt-2">
            <p>Note: Default password will be set to "12345678"</p>
            <p className="mt-1">Users can sign in with their username and password (no email required)</p>
          </div>
        </form>
      </div>
      
      {/* Users List */}
      <div className="bg-gray-900/30 rounded-xl p-6 border border-gray-800">
        <h2 className="text-xl font-semibold mb-4">User Accounts</h2>
        
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No users found. Create your first user above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Username</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Linked Teacher</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Created</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className="border-b border-gray-800 hover:bg-gray-900/50">
                    <td className="px-4 py-3 text-sm">{user.username}</td>
                    <td className="px-4 py-3 text-sm">
                      {getUserTeacherDisplay(user)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <button
                        onClick={() => openLinkModal(user.id)}
                        className="p-1 text-blue-400 hover:text-blue-300 transition-colors mr-2"
                        title="Link to Teacher"
                      >
                        <LinkIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-1 text-red-400 hover:text-red-300 transition-colors"
                        title="Delete User"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Link Teacher Modal */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center">
            <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" onClick={() => setIsLinkModalOpen(false)}></div>
            
            <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-gray-900 shadow-xl rounded-2xl border border-gray-800 relative z-20">
              <h3 className="text-lg font-medium leading-6 text-white mb-4">
                Link User to Teacher
              </h3>
              
              <div className="mt-4 space-y-4">
                <div>
                  <label htmlFor="linkTeacher" className="block text-sm font-medium text-gray-400 mb-1">
                    Select Teacher
                  </label>
                  <select
                    id="linkTeacher"
                    value={selectedLinkTeacherName}
                    onChange={(e) => setSelectedLinkTeacherName(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select a teacher</option>
                    {getAvailableTeacherGroups().map(group => (
                      <option key={group.name} value={group.name}>
                        {group.name} - {group.subjects.join(', ')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                  onClick={() => setIsLinkModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
                  onClick={handleLinkTeacher}
                >
                  Link Teacher
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 