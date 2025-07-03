import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bars3Icon, XMarkIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Teacher Schedule', href: '/dashboard/teacher-schedule' },
    { name: 'Site Editor', href: '/dashboard/site-editor' },
    { name: 'Teachers', href: '/dashboard/teachers' },
    { name: 'Presentation Editor', href: '/dashboard/presentation-editor' },
  ];

  // Add scroll effect
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    window.location.href = '/login';
  };

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-[#0f0f0f]/90 backdrop-blur-md shadow-lg' 
          : 'bg-[#0f0f0f]'
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex justify-between h-16 sm:h-18">
          <div className="flex items-center">
            <Link to="/dashboard" className="flex-shrink-0 flex items-center group">
              <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-400 to-sky-500 bg-clip-text text-transparent group-hover:from-blue-500 group-hover:to-sky-600 transition-all duration-300">
                Continental Internal
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <div className="flex space-x-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    isActive(item.href)
                      ? 'bg-gradient-to-r from-blue-500/20 to-sky-500/20 text-white'
                      : 'text-gray-300 hover:bg-gray-800/50 hover:text-white'
                  }`}
                >
                  <span className={isActive(item.href) ? '' : ''}>
                    {item.name}
                  </span>
                </Link>
              ))}
            </div>
            <div className="flex items-center">
              <button
                onClick={handleLogout}
                className="p-2 rounded-md text-gray-300 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                aria-label="Logout"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Mobile Navigation Button */}
          <div className="flex md:hidden items-center space-x-2">
            <button
              onClick={handleLogout}
              className="p-2 rounded-md text-gray-300 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
              aria-label="Logout"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-md text-gray-300 hover:bg-gray-800/50 transition-all duration-200"
              aria-label="Open menu"
            >
              {isOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden py-2 animate-fadeIn">
            <div className="flex flex-col space-y-1 pb-3">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    isActive(item.href)
                      ? 'bg-gradient-to-r from-blue-500/20 to-sky-500/20 text-white'
                      : 'text-gray-300 hover:bg-gray-800/50 hover:text-white'
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
} 