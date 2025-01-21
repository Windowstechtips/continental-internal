import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
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

export default function PresentationView() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Request fullscreen on component mount
  useEffect(() => {
    const element = document.documentElement;
    if (element.requestFullscreen) {
      element.requestFullscreen().catch(err => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    }

    // Cleanup: exit fullscreen on unmount
    return () => {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen();
      }
    };
  }, []);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Fetch schedules
  useEffect(() => {
    async function fetchData() {
      try {
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
          .eq('day', format(currentTime, 'EEEE'))
          .order('start_time');

        if (schedulesError) throw schedulesError;
        setSchedules(schedulesData);
        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data');
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
      
      if (isNaN(hours) || isNaN(minutes) || 
          hours < 0 || hours > 23 || 
          minutes < 0 || minutes > 59) {
        return time;
      }
      
      const date = new Date();
      date.setHours(hours);
      date.setMinutes(minutes);
      date.setSeconds(0);
      date.setMilliseconds(0);
      
      return format(date, 'h:mm a');
    } catch (error) {
      return time;
    }
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

  const isSchedulePast = (schedule: Schedule): boolean => {
    const now = new Date();
    const [endHour, endMinute] = schedule.end_time.split(':').map(Number);
    const endTimeInMinutes = endHour * 60 + endMinute;
    const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
    return currentTimeInMinutes > endTimeInMinutes;
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

  const ScheduleCard = ({ schedule }: { schedule: Schedule }) => {
    const isActive = isScheduleActive(schedule);
    const isUpcoming = isScheduleUpcoming(schedule);
    const isCanceledToday = schedule.canceled_dates?.includes(format(new Date(), 'M/d'));
    const progress = isActive ? getClassProgress(schedule) : 0;

    return (
      <div 
        className={`relative rounded-xl p-6 ${
          isCanceledToday 
            ? 'bg-[#1A1111] ring-1 ring-red-500/30' 
            : isActive
              ? 'bg-[#111A11] ring-1 ring-green-500/30'
              : isUpcoming
                ? 'bg-[#11111A] ring-1 ring-blue-500/30'
                : 'bg-[#2A2A2A]'
        }`}
      >
        {/* Status indicator */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2">
            {isCanceledToday ? (
              <span className="px-3 py-1.5 rounded-md text-sm font-medium bg-[#1A1111] text-red-400">
                Canceled
              </span>
            ) : isActive ? (
              <span className="px-3 py-1.5 rounded-md text-sm font-medium bg-[#111A11] text-green-400">
                In Progress
              </span>
            ) : isUpcoming ? (
              <span className="px-3 py-1.5 rounded-md text-sm font-medium bg-[#11111A] text-blue-400">
                Up Next
              </span>
            ) : null}
          </div>
          <div className="text-right text-lg text-gray-400">
            {format(parse(schedule.start_time, 'HH:mm', new Date()), 'h:mm a')} -{' '}
            {format(parse(schedule.end_time, 'HH:mm', new Date()), 'h:mm a')}
          </div>
        </div>

        {/* Progress bar for active classes */}
        {isActive && !isCanceledToday && (
          <div className="mb-4">
            <div className="h-2 bg-[#1A1A1A] rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500/30 rounded-full transition-all duration-300 ease-in-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-400 mt-1.5">{Math.round(progress)}% Complete</p>
          </div>
        )}

        {/* Schedule info */}
        <div>
          <h3 className="text-2xl font-medium text-white">
            {schedule.teachers?.name}
            <span className="text-lg font-normal text-gray-400 ml-3">
              {schedule.subject}
            </span>
          </h3>
          <p className="text-lg text-gray-400 mt-2">
            {schedule.grade} • {schedule.curriculum}
          </p>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#121212]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* Primary gradient layer */}
      <div 
        className="absolute inset-0 bg-gradient-radial from-blue-600/10 via-purple-600/5 to-transparent animate-gradient-flow"
        style={{
          backgroundSize: '400% 400%',
          backgroundPosition: 'center',
          filter: 'blur(120px)',
          transform: 'scale(2)',
          opacity: 0.3
        }}
      />
      {/* Secondary gradient layer for additional depth */}
      <div 
        className="absolute inset-0 bg-gradient-radial from-purple-600/10 via-blue-600/5 to-transparent animate-gradient-flow"
        style={{
          backgroundSize: '400% 400%',
          backgroundPosition: 'center',
          filter: 'blur(100px)',
          transform: 'scale(1.5)',
          opacity: 0.2,
          animationDelay: '2s'
        }}
      />

      {/* Content container with local gradient */}
      <div className="relative z-10 container mx-auto p-8">
        <div className="mb-8 relative">
          {/* Local gradient for content area */}
          <div 
            className="absolute inset-0 bg-gradient-radial from-blue-500/10 to-transparent"
            style={{
              filter: 'blur(40px)',
              transform: 'scale(1.2)',
              opacity: 0.15
            }}
          />
          <h1 className="relative z-10 text-6xl font-extralight text-white/90 mb-2">
            {format(currentTime, 'EEEE')}
          </h1>
          <h2 className="relative z-10 text-8xl font-extralight tracking-tight text-white/90">
            {format(currentTime, 'hh:mm')}{' '}
            <span className="text-white/50">{format(currentTime, 'a')}</span>
          </h2>
          <p className="relative z-10 text-2xl font-extralight text-white/60 mt-2">
            {format(currentTime, 'MMMM d, yyyy')}
          </p>
        </div>

        {error ? (
          <div className="bg-red-900/20 rounded-xl p-6">
            <p className="text-red-400 text-xl">{error}</p>
          </div>
        ) : schedules.length === 0 ? (
          <div className="bg-[#1E1E1E] rounded-xl p-6">
            <p className="text-gray-400 text-xl">No classes scheduled for today.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Active and Upcoming Classes */}
            <div>
              {(() => {
                const activeAndUpcoming = schedules.filter(schedule => !isSchedulePast(schedule));
                const totalCards = activeAndUpcoming.length;
                
                return (
                  <div className={`grid gap-4 ${
                    totalCards <= 2 ? 'grid-cols-1 lg:grid-cols-2' :
                    totalCards <= 4 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2' :
                    totalCards <= 6 ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3' :
                    'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
                  }`}>
                    {activeAndUpcoming
                      .sort((a, b) => {
                        const today = format(new Date(), 'M/d');
                        const aIsCanceled = a.canceled_dates?.includes(today);
                        const bIsCanceled = b.canceled_dates?.includes(today);
                        
                        // Push canceled classes to the end
                        if (aIsCanceled && !bIsCanceled) return 1;
                        if (!aIsCanceled && bIsCanceled) return -1;
                        
                        // If both are canceled or not canceled, sort by active status
                        const aActive = isScheduleActive(a);
                        const bActive = isScheduleActive(b);
                        if (aActive && !bActive) return -1;
                        if (!aActive && bActive) return 1;

                        // Finally sort by start time
                        const [aHour, aMinute] = a.start_time.split(':').map(Number);
                        const [bHour, bMinute] = b.start_time.split(':').map(Number);
                        return (aHour * 60 + aMinute) - (bHour * 60 + bMinute);
                      })
                      .map(schedule => (
                        <ScheduleCard 
                          key={schedule.id} 
                          schedule={schedule}
                        />
                      ))}
                  </div>
                );
              })()}
            </div>

            {/* Past Classes */}
            {schedules.some(isSchedulePast) && (
              <div className="space-y-4">
                <h3 className="text-xl font-light text-gray-400">Past Classes</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {schedules
                    .filter(isSchedulePast)
                    .sort((a, b) => {
                      const [aHour, aMinute] = a.start_time.split(':').map(Number);
                      const [bHour, bMinute] = b.start_time.split(':').map(Number);
                      return (bHour * 60 + bMinute) - (aHour * 60 + aMinute);
                    })
                    .map(schedule => (
                      <ScheduleCard 
                        key={schedule.id} 
                        schedule={schedule}
                      />
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 