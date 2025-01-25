import { useState } from 'react';

export default function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'continental') {
      localStorage.setItem('isAuthenticated', 'true');
      window.location.href = '/dashboard';
    } else {
      setError('Incorrect password');
    }
  };

  const handlePresentationView = () => {
    localStorage.setItem('isAuthenticated', 'true');
    window.location.href = '/presentation';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1A1A1A]">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="flex flex-col items-center">
          <h2 className="text-3xl font-bold text-white">Continental</h2>
          <p className="mt-2 text-gray-400">Internal Dashboard</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="password" className="sr-only">
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
              className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-700 bg-[#2A2A2A] text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Password"
            />
          </div>
          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}
          <div className="flex flex-col space-y-3">
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={handlePresentationView}
              className="group relative w-full flex justify-center py-2 px-4 border border-gray-700 rounded-md text-white bg-[#2A2A2A] hover:bg-[#3A3A3A] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Presentation View
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 