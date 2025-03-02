import { useState } from 'react';

export default function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate a slight delay for better UX
    setTimeout(() => {
      if (password === 'continental') {
        localStorage.setItem('isAuthenticated', 'true');
        window.location.href = '/dashboard';
      } else {
        setError('Incorrect password');
        setIsLoading(false);
      }
    }, 800);
  };

  const handlePresentationView = () => {
    setIsLoading(true);
    setTimeout(() => {
      localStorage.setItem('isAuthenticated', 'true');
      window.location.href = '/presentation';
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#0a0a0a]">
      {/* Enhanced background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Primary gradient mesh - larger, more diffused gradients */}
        <div className="absolute -top-[10%] right-[5%] w-[80vw] h-[70vh] bg-gradient-to-bl from-blue-600/8 via-blue-400/5 to-transparent rounded-[100%] filter blur-[80px]"></div>
        <div className="absolute -bottom-[10%] left-[5%] w-[80vw] h-[70vh] bg-gradient-to-tr from-blue-500/8 via-sky-400/5 to-transparent rounded-[100%] filter blur-[80px]"></div>
        
        {/* Secondary gradient accents - smaller, more vibrant */}
        <div className="absolute top-[25%] left-[15%] w-[40vw] h-[40vh] bg-gradient-to-r from-cyan-500/5 to-blue-400/5 rounded-full filter blur-[60px] animate-pulse-slow"></div>
        <div className="absolute bottom-[25%] right-[15%] w-[40vw] h-[40vh] bg-gradient-to-r from-blue-500/5 to-sky-400/5 rounded-full filter blur-[60px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
        
        {/* Tertiary accent points - small, subtle light sources */}
        <div className="absolute top-[40%] right-[30%] w-[15vw] h-[15vh] bg-blue-400/3 rounded-full filter blur-[40px] animate-float" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-[40%] left-[30%] w-[15vw] h-[15vh] bg-sky-400/3 rounded-full filter blur-[40px] animate-float" style={{ animationDelay: '3s' }}></div>
        
        {/* Grain overlay for texture */}
        <div className="absolute inset-0 opacity-[0.15] mix-blend-overlay bg-noise"></div>
      </div>
      
      {/* Login card */}
      <div className="relative z-10 max-w-md w-full p-8 animate-fadeIn">
        <div className="glass-dark rounded-2xl p-8 shadow-glass-strong border border-gray-800/50 backdrop-blur-md">
          <div className="flex flex-col items-center mb-8">
            <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-sky-500 bg-clip-text text-transparent">
              Continental
            </h2>
            <p className="mt-2 text-gray-400 text-lg">Internal Dashboard</p>
          </div>
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-lg text-gray-200 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter password"
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
                onClick={handlePresentationView}
                disabled={isLoading}
                className="w-full px-4 py-3 bg-gray-800/80 hover:bg-gray-700/80 text-gray-300 font-medium border border-gray-700 rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-gray-500/50 disabled:opacity-70"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2"></div>
                    Loading...
                  </div>
                ) : (
                  'Presentation View'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 