import { Routes, Route, Navigate } from 'react-router-dom';
import { Link, useLocation } from 'react-router-dom';
import MainGallery from './MainGallery';

export default function Images() {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname.includes(path);
  
  const navigation = [
    { name: 'Main Gallery', href: 'main-gallery' },
  ];

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Image Management</h1>
      
      {/* Sub-navigation */}
      <div className="mb-6 border-b border-gray-700">
        <nav className="flex space-x-4">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? 'text-white bg-gradient-to-r from-blue-500/20 to-sky-500/20 rounded-lg'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </div>
      
      <Routes>
        <Route index element={<Navigate to="main-gallery" replace />} />
        <Route path="main-gallery" element={<MainGallery />} />
      </Routes>
    </div>
  );
} 