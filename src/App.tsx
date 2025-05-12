import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import News from './components/News';
import PresentationView from './components/PresentationView';
import SiteEditor from './components/SiteEditor';
import Store from './components/Store/Store';
import Images from './components/Images';
import TeacherSchedule from './components/TeacherSchedule';
import Teachers from './components/Teachers';

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
        
        <Route 
          path="/teacher-schedule" 
          element={<TeacherSchedule />} 
        />

        {/* Protected routes */}
        <Route 
          path="/presentation" 
          element={isAuthenticated ? <PresentationView /> : <Navigate to="/login" />} 
        />

        <Route
          path="/dashboard"
          element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />}
        >
          <Route index element={<News />} />
          <Route path="news" element={<News />} />
          <Route path="site-editor" element={<SiteEditor />} />
          <Route path="images/*" element={<Images />} />
          <Route path="store/*" element={<Store />} />
          <Route path="teachers" element={<Teachers />} />
        </Route>

        {/* Redirect all other routes */}
        <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
      </Routes>
    </BrowserRouter>
  );
}
