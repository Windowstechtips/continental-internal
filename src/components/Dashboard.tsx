import { useEffect } from 'react';

export default function Dashboard() {
  // Add background styling
  useEffect(() => {
    document.body.classList.add('bg-gradient-to-br', 'from-[#0a0a0a]', 'to-[#111827]');
    
    return () => {
      document.body.classList.remove('bg-gradient-to-br', 'from-[#0a0a0a]', 'to-[#111827]');
    };
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Dashboard content */}
      <div className="bg-dark-card/80 backdrop-blur-md rounded-2xl shadow-glass-strong p-6 border border-gray-800/50">
        <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>
        
        <div className="text-gray-300">
          <p className="mb-4">Welcome to the Continental Internal Dashboard.</p>
          <p>Use the navigation menu to access different sections of the admin panel.</p>
        </div>
      </div>
    </div>
  );
} 