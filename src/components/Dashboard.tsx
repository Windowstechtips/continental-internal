import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import { useEffect } from 'react';

export default function Dashboard() {
  // Add padding to account for fixed navbar
  useEffect(() => {
    document.body.classList.add('bg-gradient-to-br', 'from-[#0a0a0a]', 'to-[#111827]');
    
    return () => {
      document.body.classList.remove('bg-gradient-to-br', 'from-[#0a0a0a]', 'to-[#111827]');
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen w-full">
      <Navbar />
      
      <main className="flex-1 flex flex-col pt-24 px-4 sm:px-6 md:px-8 relative">
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
        
        {/* Content */}
        <div className="relative z-10 w-full max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
      
      <footer className="py-4 text-center text-gray-500 text-sm relative z-10">
        <p>© {new Date().getFullYear()} Continental Internal</p>
      </footer>
    </div>
  );
} 