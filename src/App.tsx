import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Login from './components/Login';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import News from './components/News';
import PresentationView from './components/PresentationView';
import SiteEditor from './components/SiteEditor';
import Store from './components/Store/Store';
import Images from './components/Images';
import TeacherSchedule from './components/TeacherSchedule';
import Teachers from './components/Teachers';
import PresentationEditor from './components/PresentationEditor';

// ProtectedRoute wrapper component
const ProtectedLayout = () => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return (
    <>
      <Navbar />
      <div className="pt-16 min-h-screen bg-[#0a0a0a]">
        <Outlet />
      </div>
    </>
  );
};

export default function App() {
  // Check if user is authenticated
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route 
          path="/login" 
          element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} 
        />
        
        <Route path="/presentation" element={<PresentationView />} />
        <Route path="/teacher-schedule" element={<TeacherSchedule />} />

        {/* Protected routes with shared layout */}
        <Route path="/dashboard" element={<ProtectedLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="site-editor/*" element={<SiteEditor />} />
          <Route path="teachers" element={<Teachers />} />
          <Route path="presentation-editor" element={<PresentationEditor />} />
          <Route path="teacher-schedule" element={<TeacherSchedule />} />
        </Route>

        {/* Redirect all other routes */}
        <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
        <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
      </Routes>
    </BrowserRouter>
  );
}
