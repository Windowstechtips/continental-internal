import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import TeacherFilter from './TeacherFilter';
import { format, parse } from 'date-fns';

interface Teacher {
  id: number;
  name: string;
  subject: string;
}

interface Schedule {
  id: number;
  teacher_id: number;
  day: string;
  start_time: string;
  end_time: string;
  room: string | null;
  grade: string;
  curriculum: string;
  date_tag: string;
  repeats: boolean;
  subject: string;
  teachers: Teacher;
  canceled_dates?: string[];
}

export default function Schedules() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Format date strings
  const currentDay = format(currentTime, 'EEEE');
  const currentTimeString = format(currentTime, 'h:mm a');
  const currentDateString = format(currentTime, 'MMMM d, yyyy');

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Update every second instead of every minute

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: teachersData, error: teachersError } = await supabase
          .from('teachers')
          .select('id, name, subject')
          .order('name');

        if (teachersError) throw teachersError;
        setTeachers(teachersData);

        const { data: schedulesData, error: schedulesError } = await supabase
          .from('class_schedules')
          .select(`
            *,
            teachers (
              id,
              name,
              subject
            )
          `)
          .eq('day', format(currentTime, 'EEEE'))  // Filter by current day
          .order('start_time');

        if (schedulesError) throw schedulesError;
        setSchedules(schedulesData || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    // Refresh data every minute
    const refreshInterval = setInterval(fetchData, 60000);
    return () => clearInterval(refreshInterval);
  }, [currentTime]);

  const formatTime = (time: string) => {
    try {
      if (!time) return '';
      
      const [hours, minutes] = time.split(':').map(Number);
      
      // Validate hours and minutes
      if (isNaN(hours) || isNaN(minutes) || 
          hours < 0 || hours > 23 || 
          minutes < 0 || minutes > 59) {
        return time; // Return original string if invalid
      }
      
      const date = new Date();
      date.setHours(hours);
      date.setMinutes(minutes);
      date.setSeconds(0);
      date.setMilliseconds(0);
      
      return format(date, 'h:mm a');
    } catch (error) {
      console.error('Error formatting time:', error);
      return time; // Return original string if any error occurs
    }
  };

  const isSchedulePast = (schedule: Schedule): boolean => {
    const now = new Date();
    const [endHour, endMinute] = schedule.end_time.split(':').map(Number);
    const endTimeInMinutes = endHour * 60 + endMinute;
    const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
    return currentTimeInMinutes > endTimeInMinutes;
  };

  const isScheduleActive = (schedule: Schedule): boolean => {
    const now = new Date();
    const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMinute] = schedule.start_time.split(':').map(Number);
    const [endHour, endMinute] = schedule.end_time.split(':').map(Number);
    
    const startTimeInMinutes = startHour * 60 + startMinute;
    const endTimeInMinutes = endHour * 60 + endMinute;
    
    return currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes <= endTimeInMinutes;
  };

  const isScheduleUpcoming = (schedule: Schedule): boolean => {
    const now = new Date();
    const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMinute] = schedule.start_time.split(':').map(Number);
    const startTimeInMinutes = startHour * 60 + startMinute;
    
    return currentTimeInMinutes < startTimeInMinutes;
  };

  const getClassProgress = (schedule: Schedule): number => {
    const now = new Date();
    const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMinute] = schedule.start_time.split(':').map(Number);
    const [endHour, endMinute] = schedule.end_time.split(':').map(Number);
    
    const startTimeInMinutes = startHour * 60 + startMinute;
    const endTimeInMinutes = endHour * 60 + endMinute;
    const totalDuration = endTimeInMinutes - startTimeInMinutes;
    
    if (currentTimeInMinutes <= startTimeInMinutes) return 0;
    if (currentTimeInMinutes >= endTimeInMinutes) return 100;
    
    const elapsed = currentTimeInMinutes - startTimeInMinutes;
    return Math.round((elapsed / totalDuration) * 100);
  };

  const filteredSchedules = schedules.filter((schedule) => {
    // First check if the day matches
    const dayMatches = schedule.day === currentDay;
    
    // Then check teacher filter if one is selected
    const teacherMatches = !selectedTeacher || schedule.teacher_id === selectedTeacher.id;
    
    // Only show schedules that match both conditions
    return dayMatches && teacherMatches;
  });

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  const ScheduleCard = ({ schedule }: { schedule: Schedule }) => {
    const isActive = isScheduleActive(schedule);
    const isUpcoming = isScheduleUpcoming(schedule);
    const isCanceledToday = schedule.canceled_dates?.includes(format(new Date(), 'M/d'));
    const progress = isActive ? getClassProgress(schedule) : 0;

    return (
      <div 
        className={`relative rounded-xl p-4 ${
          isCanceledToday 
            ? 'bg-red-900/20 ring-1 ring-red-500/50' 
            : isActive
              ? 'bg-green-900/20 ring-1 ring-green-500/50'
              : isUpcoming
                ? 'bg-blue-900/20 ring-1 ring-blue-500/50'
                : 'bg-[#2A2A2A]'
        }`}
      >
        {/* Status indicator */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            {isCanceledToday ? (
              <span className="px-2 py-1 rounded-md text-xs font-medium bg-red-500/20 text-red-400">
                Canceled
              </span>
            ) : isActive ? (
              <span className="px-2 py-1 rounded-md text-xs font-medium bg-green-500/20 text-green-400">
                In Progress
              </span>
            ) : isUpcoming ? (
              <span className="px-2 py-1 rounded-md text-xs font-medium bg-blue-500/20 text-blue-400">
                Up Next
              </span>
            ) : null}
          </div>
          <div className="text-right text-sm text-gray-400">
            {format(parse(schedule.start_time, 'HH:mm', new Date()), 'h:mm a')} -{' '}
            {format(parse(schedule.end_time, 'HH:mm', new Date()), 'h:mm a')}
          </div>
        </div>

        {/* Progress bar for active classes */}
        {isActive && !isCanceledToday && (
          <div className="mb-3">
            <div className="h-1.5 bg-[#1A1A1A] rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500/50 rounded-full transition-all duration-300 ease-in-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">{Math.round(progress)}% Complete</p>
          </div>
        )}

        {/* Schedule info */}
        <div>
          <h3 className="text-lg font-medium text-white">
            {schedule.teachers?.name}
            <span className="text-sm font-normal text-gray-400 ml-2">
              {schedule.subject}
            </span>
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            {schedule.grade} • {schedule.curriculum}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 px-4 sm:px-6 md:px-8 py-4">
      <div className="container mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div>
            <h1 className="text-4xl sm:text-6xl font-extralight text-white/90 mb-1">
              {format(currentTime, 'EEEE')}
            </h1>
            <h2 className="text-6xl sm:text-8xl font-extralight tracking-tight text-white/90">
              {format(currentTime, 'hh:mm')}{' '}
              <span className="text-white/50">{format(currentTime, 'a')}</span>
            </h2>
            <p className="text-xl sm:text-2xl font-extralight text-white/60 mt-1">
              {format(currentTime, 'MMMM d, yyyy')}
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex flex-col items-end gap-3">
            <button
              onClick={() => {
                localStorage.removeItem('isAuthenticated');
                window.location.href = '/login';
              }}
              className="px-3 py-1.5 text-sm bg-[#2A2A2A] text-gray-300 rounded-md hover:bg-[#3A3A3A] transition-colors"
            >
              Logout
            </button>
            <TeacherFilter
              teachers={teachers}
              selectedTeacher={selectedTeacher}
              onSelect={setSelectedTeacher}
              showAllOption={true}
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-900/20 rounded-lg p-4 mb-4">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Active and Upcoming Schedules */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredSchedules
            .filter(schedule => !isSchedulePast(schedule))
            .sort((a, b) => {
              const [aHour, aMinute] = a.start_time.split(':').map(Number);
              const [bHour, bMinute] = b.start_time.split(':').map(Number);
              const aTime = aHour * 60 + aMinute;
              const bTime = bHour * 60 + bMinute;
              
              // If one is active and the other isn't, active comes first
              const aActive = isScheduleActive(a);
              const bActive = isScheduleActive(b);
              if (aActive && !bActive) return -1;
              if (!aActive && bActive) return 1;
              
              // Otherwise sort by start time
              return aTime - bTime;
            })
            .map((schedule) => (
              <ScheduleCard 
                key={schedule.id} 
                schedule={schedule} 
              />
            ))}
        </div>

        {/* Past Schedules */}
        {filteredSchedules.some(isSchedulePast) && (
          <div className="mt-8">
            <h3 className="text-lg text-gray-400 mb-4">Past Classes</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filteredSchedules
                .filter(isSchedulePast)
                .sort((a, b) => {
                  const [aHour, aMinute] = a.start_time.split(':').map(Number);
                  const [bHour, bMinute] = b.start_time.split(':').map(Number);
                  const aTime = aHour * 60 + aMinute;
                  const bTime = bHour * 60 + bMinute;
                  return bTime - aTime; // Reverse sort for past schedules
                })
                .map((schedule) => (
                  <ScheduleCard 
                    key={schedule.id} 
                    schedule={schedule} 
                  />
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 