import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function TeacherLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      // Verify the password using our custom function
      const { data: isValid, error: verifyError } = await supabase.rpc('verify_password', {
        username,
        password
      });
      
      if (verifyError) throw verifyError;
      
      if (!isValid) {
        throw new Error('Invalid username or password');
      }
      
      // Get the user from our custom table
      const { data: userData, error: userError } = await supabase
        .from('teacher_users')
        .select('*')
        .eq('username', username)
        .single();
      
      if (userError) throw userError;
      
      // Check if the user is linked to any teacher
      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .select('*')
        .eq('user_id', userData.id);

      if (teacherError || !teacherData || teacherData.length === 0) {
        throw new Error('You do not have teacher access');
      }

      // Store teacher info and authentication status
      localStorage.setItem('isTeacherAuthenticated', 'true');
      localStorage.setItem('teacherId', teacherData[0].id);
      localStorage.setItem('teacherName', teacherData[0].name);
      
      // Redirect to teacher schedule
      window.location.href = '/teacher-schedule';
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.message || 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToMain = () => {
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Fixed background gradient that covers the entire page */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#0a0a0a] to-[#111827] -z-10"></div>
      
      {/* Subtle pattern overlay */}
      <div className="fixed inset-0 bg-noise opacity-[0.03] mix-blend-overlay -z-10"></div>
      
      {/* Login card */}
      <div className="relative z-10 max-w-md w-full p-8 animate-fadeIn">
        <div className="glass-dark rounded-2xl p-8 shadow-glass-strong border border-gray-800/50 backdrop-blur-md">
          <div className="flex flex-col items-center mb-8">
            <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-sky-500 bg-clip-text text-transparent">
              Teacher Portal
            </h2>
            <p className="mt-2 text-gray-400 text-lg">Sign in to access your schedule</p>
          </div>
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-1">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-lg text-gray-200 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter your username"
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-lg text-gray-200 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter your password"
                />
              </div>
            </div>
            
            {error && (
              <div className="p-3 bg-red-900/20 border border-red-800/50 rounded-lg text-red-300 text-sm animate-slideUp">
                {error}
              </div>
            )}
            
            <div className="flex flex-col space-y-3 pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-70"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Signing in...
                  </div>
                ) : (
                  'Sign in'
                )}
              </button>
              
              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-gray-700"></div>
                <span className="flex-shrink mx-3 text-gray-500 text-sm">or</span>
                <div className="flex-grow border-t border-gray-700"></div>
              </div>
              
              <button
                type="button"
                onClick={handleBackToMain}
                className="w-full px-4 py-3 bg-gray-800/80 hover:bg-gray-700/80 text-gray-300 font-medium border border-gray-700 rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-gray-500/50"
              >
                Back to Main Login
              </button>
            </div>
            
            <div className="mt-4 text-center text-sm text-gray-500">
              <p>Contact administration if you need an account</p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 