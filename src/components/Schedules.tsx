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

  // Group schedules by status
  const groupedSchedules = filteredSchedules.reduce((acc, schedule) => {
    const isPast = isSchedulePast(schedule);
    const isActive = isScheduleActive(schedule);
    const isUpcoming = isScheduleUpcoming(schedule);

    if (isActive) {
      acc.active.push(schedule);
    } else if (isUpcoming) {
      acc.upcoming.push(schedule);
    } else if (isPast) {
      acc.past.push(schedule);
    }

    return acc;
  }, { active: [] as Schedule[], upcoming: [] as Schedule[], past: [] as Schedule[] });

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  const ScheduleCard = ({ schedule }: { schedule: Schedule }) => {
    const isPast = isSchedulePast(schedule);
    const isActive = isScheduleActive(schedule);
    const isUpcoming = isScheduleUpcoming(schedule);
    const isCanceledToday = schedule.canceled_dates?.includes(format(new Date(), 'M/d'));
    const progress = isActive ? getClassProgress(schedule) : 0;

    return (
      <div 
        className={`relative rounded-xl p-4 ${
          isPast ? 'opacity-50 grayscale bg-[#2A2A2A]' :
          isCanceledToday ? 'bg-red-900/20 ring-1 ring-red-500/50' : 
          isActive ? 'bg-green-900/20 ring-1 ring-green-500/50' :
          isUpcoming ? 'bg-blue-900/20 ring-1 ring-blue-500/50' :
          'bg-[#2A2A2A]'
        }`}
      >
        {/* Status indicator */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <span className="bg-[#1A1A1A] text-gray-300 px-2 py-1 rounded-full text-xs">
              {schedule.day}
            </span>
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
            {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
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
              {schedule.subject || schedule.teachers?.subject}
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
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
              Today's Schedule
            </h2>
            <p className="text-gray-400 text-sm sm:text-base">
              {currentDateString} - {currentTimeString}
            </p>
          </div>
          <TeacherFilter
            teachers={teachers}
            selectedTeacher={selectedTeacher}
            onSelect={setSelectedTeacher}
          />
        </div>

        {error && (
          <div className="bg-red-900/20 rounded-lg p-4 mb-4">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          {/* Ongoing Classes */}
          <div>
            <h3 className="text-lg font-medium text-white mb-3">Ongoing Classes</h3>
            <div className="grid gap-4">
              {groupedSchedules.active.length > 0 ? (
                groupedSchedules.active.map(schedule => (
                  <ScheduleCard key={schedule.id} schedule={schedule} />
                ))
              ) : (
                <div className="bg-[#2A2A2A] rounded-xl p-4 text-gray-400 text-center">
                  No ongoing classes
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Classes */}
          <div>
            <h3 className="text-lg font-medium text-white mb-3">Upcoming Classes</h3>
            <div className="grid gap-4">
              {groupedSchedules.upcoming.length > 0 ? (
                groupedSchedules.upcoming.map(schedule => (
                  <ScheduleCard key={schedule.id} schedule={schedule} />
                ))
              ) : (
                <div className="bg-[#2A2A2A] rounded-xl p-4 text-gray-400 text-center">
                  No upcoming classes
                </div>
              )}
            </div>
          </div>

          {/* Past Classes */}
          <div>
            <h3 className="text-lg font-medium text-white mb-3">Past Classes</h3>
            <div className="grid gap-4">
              {groupedSchedules.past.length > 0 ? (
                groupedSchedules.past.map(schedule => (
                  <ScheduleCard key={schedule.id} schedule={schedule} />
                ))
              ) : (
                <div className="bg-[#2A2A2A] rounded-xl p-4 text-gray-400 text-center">
                  No past classes
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 