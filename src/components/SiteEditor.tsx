import React, { useState, useEffect } from 'react';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { format } from 'date-fns';
import News from './News';
import Images from './Images';
import Store from './Store/Store';

// Define types
interface Subject {
  id: string;
  subject_name: string;
  subject_description: string;
  whatsapp_link: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  event_date: string;
  created_at: string;
}

// Subject Card Component
const SubjectCard = ({ subject, onEdit, onDelete }: { 
  subject: Subject; 
  onEdit: () => void; 
  onDelete: () => void 
}) => (
  <div className="bg-dark-card hover:bg-dark-cardHover border border-dark-border/30 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-5 backdrop-blur-sm">
    <div className="flex justify-between items-start mb-3">
      <h3 className="text-lg font-semibold text-white">{subject.subject_name}</h3>
      <div className="flex space-x-2">
        <button
          onClick={onEdit}
          className="p-1.5 rounded-full hover:bg-blue-500/20 transition-all duration-200"
        >
          <PencilIcon className="h-5 w-5 text-blue-400" />
        </button>
        <button 
          onClick={onDelete}
          className="p-1.5 rounded-full hover:bg-red-500/20 transition-all duration-200"
        >
          <TrashIcon className="h-5 w-5 text-red-400" />
        </button>
      </div>
    </div>
    <p className="text-gray-400 text-sm line-clamp-2">{subject.subject_description}</p>
  </div>
);

// Subject Editor Component
const SubjectsEditor = ({ onClose, editingSubject, onSave }: { 
  onClose: () => void; 
  editingSubject?: Subject;
  onSave: (data: Omit<Subject, 'id'>) => Promise<void>;
}) => {
  const [formData, setFormData] = useState({
    subject_name: editingSubject?.subject_name || '',
    subject_description: editingSubject?.subject_description || '',
    whatsapp_link: editingSubject?.whatsapp_link || ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving subject:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-start justify-center overflow-y-auto z-50">
      <form onSubmit={handleSubmit} className="bg-dark-card border border-gray-800/50 rounded-xl shadow-glass-strong p-6 w-full min-h-screen">
        <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 -mx-6 -mt-6 mb-6 px-6 py-4 border-b border-gray-800/50 sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              {editingSubject ? 'Edit Subject Content' : 'Add Subject Content'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-white p-2 rounded-md hover:bg-gray-800/50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Subject Name</label>
            <input
              type="text"
              name="subject_name"
              value={formData.subject_name}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-inner"
              placeholder="Enter subject name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Subject Description</label>
            <textarea
              name="subject_description"
              value={formData.subject_description}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 min-h-[150px] shadow-inner"
              placeholder="Enter subject description"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">WhatsApp Group Link</label>
            <input
              type="text"
              name="whatsapp_link"
              value={formData.whatsapp_link}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-inner"
              placeholder="Enter WhatsApp group link (optional)"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 bg-blue-700 hover:bg-blue-600 rounded-lg text-white font-medium transition-colors disabled:opacity-70 flex items-center"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Saving...
                </>
              ) : editingSubject ? 'Update Subject' : 'Save Subject'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

// Calendar Event Card Component
const CalendarEventCard = ({ event, onEdit, onDelete }: { 
  event: CalendarEvent; 
  onEdit: () => void; 
  onDelete: () => void 
}) => (
  <div className="bg-dark-card hover:bg-dark-cardHover border border-dark-border/30 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-5 backdrop-blur-sm">
    <div className="flex justify-between items-start mb-3">
      <div>
        <h3 className="text-lg font-semibold text-white">{event.title}</h3>
        <p className="text-sm bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent font-medium">
          {format(new Date(event.event_date), 'MMMM d, yyyy')}
        </p>
      </div>
      <div className="flex space-x-2">
        <button
          onClick={onEdit}
          className="p-1.5 rounded-full hover:bg-blue-500/20 transition-all duration-200"
        >
          <PencilIcon className="h-5 w-5 text-blue-400" />
        </button>
        <button 
          onClick={onDelete}
          className="p-1.5 rounded-full hover:bg-red-500/20 transition-all duration-200"
        >
          <TrashIcon className="h-5 w-5 text-red-400" />
        </button>
      </div>
    </div>
    <p className="text-gray-400 text-sm line-clamp-2">{event.description}</p>
  </div>
);

// Calendar Event Editor Component
const CalendarEventEditor = ({ onClose, editingEvent, onSave }: { 
  onClose: () => void; 
  editingEvent?: CalendarEvent;
  onSave: (data: Omit<CalendarEvent, 'id' | 'created_at'>) => Promise<void>;
}) => {
  const [formData, setFormData] = useState({
    title: editingEvent?.title || '',
    description: editingEvent?.description || '',
    event_date: editingEvent ? new Date(editingEvent.event_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving event:', error);
      setError('Failed to save event. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-start justify-center overflow-y-auto z-50">
      <form onSubmit={handleSubmit} className="bg-dark-card border border-gray-800/50 rounded-xl shadow-glass-strong p-6 w-full min-h-screen">
        <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 -mx-6 -mt-6 mb-6 px-6 py-4 border-b border-gray-800/50 sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              {editingEvent ? 'Edit Event' : 'Add New Event'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-white p-2 rounded-md hover:bg-gray-800/50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-xl text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Event Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-inner"
              placeholder="Enter event title"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Event Date</label>
            <input
              type="date"
              name="event_date"
              value={formData.event_date}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-inner"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Event Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 min-h-[150px] shadow-inner"
              placeholder="Enter event description"
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 bg-blue-700 hover:bg-blue-600 rounded-lg text-white font-medium transition-colors disabled:opacity-70 flex items-center"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Saving...
                </>
              ) : editingEvent ? 'Update Event' : 'Save Event'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default function SiteEditor() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<Subject | CalendarEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  
  const location = useLocation();
  const currentPath = location.pathname;

  // Navigation items for the site editor
  const editorNavigation = [
    { name: 'Subjects', href: '/dashboard/site-editor', exact: true },
    { name: 'News', href: '/dashboard/site-editor/news' },
    { name: 'Images', href: '/dashboard/site-editor/images' },
    { name: 'Store', href: '/dashboard/site-editor/store' },
    { name: 'Calendar', href: '/dashboard/site-editor/calendar' }
  ];

  // Check if a path is active
  const isActive = (path: string, exact = false) => {
    if (exact) {
      return currentPath === path;
    }
    return currentPath.startsWith(path);
  };

  // Fetch data when component mounts or path changes
  useEffect(() => {
    if (currentPath === '/dashboard/site-editor') {
      fetchSubjects();
    } else if (currentPath === '/dashboard/site-editor/calendar') {
      fetchCalendarEvents();
    }
  }, [currentPath]);

  // Fetch subjects from Supabase
  const fetchSubjects = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('subjects_content')
        .select('*');
      
      if (error) throw error;
      
      setSubjects(data || []);
    } catch (err) {
      console.error('Error fetching subjects:', err);
      setError('Failed to load subjects. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch calendar events from Supabase
  const fetchCalendarEvents = async () => {
    setCalendarLoading(true);
    setCalendarError(null);
    
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .order('event_date', { ascending: true });
      
      if (error) throw error;
      
      setCalendarEvents(data || []);
    } catch (err) {
      console.error('Error fetching calendar events:', err);
      setCalendarError('Failed to load calendar events. Please try again.');
    } finally {
      setCalendarLoading(false);
    }
  };

  // Handle saving/updating a subject
  const handleSaveSubject = async (data: Omit<Subject, 'id'>) => {
    try {
      if (editingItem && 'subject_name' in editingItem) {
        // Update existing subject
        const { error } = await supabase
          .from('subjects_content')
          .update(data)
          .eq('id', editingItem.id);
        
        if (error) throw error;
        
        // Update local state
        setSubjects(subjects.map(subject => 
          subject.id === editingItem.id ? { ...subject, ...data } : subject
        ));
      } else {
        // Create new subject
        const { data: newItem, error } = await supabase
          .from('subjects_content')
          .insert([data])
          .select('*')
          .single();
        
        if (error) throw error;
        
        if (newItem) {
          setSubjects([newItem, ...subjects]);
        }
      }
    } catch (err) {
      console.error('Error saving subject:', err);
      throw err;
    }
  };

  // Handle saving/updating a calendar event
  const handleSaveCalendarEvent = async (data: Omit<CalendarEvent, 'id' | 'created_at'>) => {
    try {
      if (editingItem && 'title' in editingItem) {
        // Update existing event
        const { error } = await supabase
          .from('calendar_events')
          .update(data)
          .eq('id', editingItem.id);
        
        if (error) throw error;
        
        // Update local state
        setCalendarEvents(calendarEvents.map(event => 
          event.id === editingItem.id ? { ...event, ...data } : event
        ));
      } else {
        // Create new event
        const { data: newEvent, error } = await supabase
          .from('calendar_events')
          .insert([{ ...data, created_at: new Date().toISOString() }])
          .select('*')
          .single();
        
        if (error) throw error;
        
        if (newEvent) {
          setCalendarEvents([newEvent, ...calendarEvents]);
        }
      }
    } catch (err) {
      console.error('Error saving calendar event:', err);
      throw err;
    }
  };

  // Handle deleting a subject
  const handleDeleteSubject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subject? This action cannot be undone.')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('subjects_content')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Update local state
      setSubjects(subjects.filter(subject => subject.id !== id));
    } catch (err) {
      console.error('Error deleting subject:', err);
      alert('Failed to delete subject. Please try again.');
    }
  };

  // Handle deleting a calendar event
  const handleDeleteCalendarEvent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Update local state
      setCalendarEvents(calendarEvents.filter(event => event.id !== id));
    } catch (err) {
      console.error('Error deleting calendar event:', err);
      alert('Failed to delete event. Please try again.');
    }
  };

  return (
    <div className="container mx-auto px-4">
      {/* Site Editor Navigation */}
      <div className="mb-6 overflow-x-auto pb-2">
        <div className="flex space-x-2">
          {editorNavigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`px-4 py-2 font-medium rounded-lg transition-all duration-300 ${
                isActive(item.href, item.exact)
                  ? 'bg-gradient-to-r from-primary-600 to-secondary-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              {item.name}
            </Link>
          ))}
        </div>
      </div>

      <Routes>
        <Route index element={
          <div className="bg-dark-card/80 backdrop-blur-md rounded-2xl shadow-glass-strong p-6 border border-gray-800/50">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-white">Subjects Management</h1>
              <button 
                onClick={() => {
                  setIsEditing('subject');
                  setEditingItem(null);
                }}
                className="flex items-center px-4 py-2 bg-blue-700 hover:bg-blue-600 rounded-lg text-white text-sm font-medium transition-colors"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Subject
              </button>
            </div>
            
            {error && (
              <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}
            
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-12 h-12 rounded-full border-4 border-gray-600 border-t-blue-500 animate-spin mb-4"></div>
                <p className="text-gray-400">Loading subjects...</p>
              </div>
            ) : subjects.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p>No subjects found. Click the Add Subject button to add one.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subjects.map((subject) => (
                  <SubjectCard 
                    key={subject.id} 
                    subject={subject} 
                    onEdit={() => {
                      setIsEditing('subject');
                      setEditingItem(subject);
                    }}
                    onDelete={() => handleDeleteSubject(subject.id)}
                  />
                ))}
              </div>
            )}
          </div>
        } />
        <Route path="news" element={<News />} />
        <Route path="images/*" element={<Images />} />
        <Route path="store/*" element={<Store />} />
        <Route path="calendar" element={
          <div className="bg-dark-card/80 backdrop-blur-md rounded-2xl shadow-glass-strong p-6 border border-gray-800/50">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-white">Calendar Events</h1>
              <button 
                onClick={() => {
                  setIsEditing('event');
                  setEditingItem(null);
                }}
                className="flex items-center px-4 py-2 bg-blue-700 hover:bg-blue-600 rounded-lg text-white text-sm font-medium transition-colors"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Event
              </button>
            </div>
            
            {calendarError && (
              <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-300 text-sm">
                {calendarError}
              </div>
            )}
            
            {calendarLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-12 h-12 rounded-full border-4 border-gray-600 border-t-blue-500 animate-spin mb-4"></div>
                <p className="text-gray-400">Loading calendar events...</p>
              </div>
            ) : calendarEvents.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p>No events found. Click the Add Event button to add one.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {calendarEvents.map((event) => (
                  <CalendarEventCard 
                    key={event.id} 
                    event={event} 
                    onEdit={() => {
                      setIsEditing('event');
                      setEditingItem(event);
                    }}
                    onDelete={() => handleDeleteCalendarEvent(event.id)}
                  />
                ))}
              </div>
            )}
          </div>
        } />
      </Routes>

      {/* Subject Editor Modal */}
      {isEditing === 'subject' && (
        <SubjectsEditor 
          editingSubject={editingItem as Subject} 
          onClose={() => {
            setIsEditing(null);
            setEditingItem(null);
          }}
          onSave={handleSaveSubject}
        />
      )}

      {/* Calendar Event Editor Modal */}
      {isEditing === 'event' && (
        <CalendarEventEditor 
          editingEvent={editingItem as CalendarEvent} 
          onClose={() => {
            setIsEditing(null);
            setEditingItem(null);
          }}
          onSave={handleSaveCalendarEvent}
        />
      )}
    </div>
  );
} 