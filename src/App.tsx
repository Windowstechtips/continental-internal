import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Schedules from './components/Schedules';
import EditSchedules from './components/EditSchedules';
import Tasks from './components/Tasks';
import News from './components/News';
import PresentationView from './components/PresentationView';
import { DarkModeProvider } from './contexts/DarkModeContext';

export default function App() {
  // Check if user is authenticated
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';

  return (
    <DarkModeProvider>
      <BrowserRouter>
        <Routes>
          {/* Public route */}
          <Route 
            path="/login" 
            element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} 
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
            <Route index element={<Schedules />} />
            <Route path="schedules" element={<Schedules />} />
            <Route path="edit-schedules" element={<EditSchedules />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="news" element={<News />} />
          </Route>

          {/* Redirect all other routes */}
          <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
        </Routes>
      </BrowserRouter>
    </DarkModeProvider>
  );
}
