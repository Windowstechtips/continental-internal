import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function Dashboard() {
  return (
    <div className="flex flex-col min-h-screen w-full">
      <Navbar />
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
    </div>
  );
} 