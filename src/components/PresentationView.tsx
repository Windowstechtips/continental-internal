import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';

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
  description: string;
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
        
        // Filter schedules based on repeats and date
        const today = format(currentTime, 'M/d');
        const filteredData = schedulesData?.filter(schedule => {
          const hasRepeatTag = schedule.description?.includes('REPEAT');
          const hasDateTag = schedule.description?.match(/DATE:([0-9/]+)/);
          
          // Show if:
          // 1. Has REPEAT tag (show always for matching day), or
          // 2. Has DATE tag matching today's date, or
          // 3. Has no special tags
          return hasRepeatTag || 
            (hasDateTag ? hasDateTag[1] === today : true);
        });
        
        setSchedules(filteredData || []);
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
    const isPast = isSchedulePast(schedule);
    const isCanceledToday = schedule.canceled_dates?.includes(format(new Date(), 'M/d'));
    const progress = isActive ? getClassProgress(schedule) : 0;

    // Clean up description by removing special tags
    const displayDescription = schedule.description?.replace(/\nREPEAT$/, '').replace(/\nDATE:[0-9/]+$/, '');

    return (
      <div 
        className={`relative rounded-xl p-6 ${
          isPast ? 'opacity-50 grayscale bg-[#1A1A1A]' :
          isCanceledToday ? 'bg-red-900/30 ring-1 ring-red-500/50' : 
          isActive ? 'bg-emerald-900/30 ring-1 ring-emerald-500/50' :
          isUpcoming ? 'bg-blue-900/30 ring-1 ring-blue-500/50' :
          'bg-[#2A2A2A]'
        }`}
      >
        {/* Status indicator */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2">
            {isCanceledToday ? (
              <span className="px-3 py-1.5 rounded-md text-sm font-medium bg-red-900/30 text-red-400">
                Canceled
              </span>
            ) : isActive ? (
              <span className="px-3 py-1.5 rounded-md text-sm font-medium bg-emerald-900/30 text-emerald-400">
                In Progress
              </span>
            ) : isUpcoming ? (
              <span className="px-3 py-1.5 rounded-md text-sm font-medium bg-blue-900/30 text-blue-400">
                Up Next
              </span>
            ) : (
              <span className="px-3 py-1.5 rounded-md text-sm font-medium bg-[#1A1A1A] text-gray-400">
                Completed
              </span>
            )}
          </div>
          <div className="text-right text-lg text-gray-400">
            {(() => {
              const [startHour, startMinute] = schedule.start_time.split(':').map(Number);
              const startDate = new Date();
              startDate.setHours(startHour, startMinute);
              return format(startDate, 'h:mm a');
            })()} -{' '}
            {(() => {
              const [endHour, endMinute] = schedule.end_time.split(':').map(Number);
              const endDate = new Date();
              endDate.setHours(endHour, endMinute);
              return format(endDate, 'h:mm a');
            })()}
          </div>
        </div>

        {/* Progress bar for active classes */}
        {isActive && !isCanceledToday && (
          <div className="mb-4">
            <div className="h-2 bg-[#1A1A1A] rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500/50 rounded-full transition-all duration-300 ease-in-out"
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
          {displayDescription && (
            <p className="text-lg text-gray-300 mt-4 whitespace-pre-wrap">
              {displayDescription}
            </p>
          )}
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
    <div className="relative min-h-screen bg-[#121212] overflow-hidden">
      {/* Windows-like gradient background */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/10 to-transparent"
        style={{
          backgroundSize: '400% 400%',
          filter: 'blur(100px)',
          transform: 'scale(1.5)',
          opacity: 0.4
        }}
      />
      <div 
        className="absolute inset-0 bg-gradient-to-tr from-purple-600/20 via-blue-600/10 to-transparent"
        style={{
          backgroundSize: '400% 400%',
          filter: 'blur(120px)',
          transform: 'scale(1.2)',
          opacity: 0.3
        }}
      />
      <div 
        className="absolute inset-0 bg-gradient-radial from-blue-500/5 via-transparent to-transparent"
        style={{
          backgroundSize: '200% 200%',
          filter: 'blur(80px)',
          transform: 'scale(1.5)',
          opacity: 0.5
        }}
      />

      {/* Content container with frosted glass effect */}
      <div className="relative z-10 container mx-auto p-8">
        <div className="mb-8 relative backdrop-blur-sm">
          {/* Time and date display with local gradient */}
          <div 
            className="absolute inset-0 bg-gradient-radial from-blue-500/10 to-transparent"
            style={{
              filter: 'blur(40px)',
              transform: 'scale(1.2)',
              opacity: 0.2
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

        {/* Rest of the content */}
        {error ? (
          <div className="bg-red-900/20 backdrop-blur-md rounded-xl p-6">
            <p className="text-red-400 text-xl">{error}</p>
          </div>
        ) : schedules.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-md rounded-xl p-6">
            <p className="text-gray-400 text-xl">No classes scheduled for today.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Active Classes */}
            {schedules.some(s => isScheduleActive(s)) && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-light text-white/80">In Progress</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-sm bg-emerald-900/30 text-emerald-400 ring-1 ring-emerald-500/50">
                    {schedules.filter(isScheduleActive).length}
                  </span>
                </div>
                <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                  {schedules
                    .filter(isScheduleActive)
                    .map(schedule => (
                      <ScheduleCard key={schedule.id} schedule={schedule} />
                    ))}
                </div>
              </div>
            )}

            {/* Upcoming Classes */}
            {schedules.some(s => isScheduleUpcoming(s)) && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-light text-white/80">Up Next</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-sm bg-blue-900/30 text-blue-400 ring-1 ring-blue-500/50">
                    {schedules.filter(isScheduleUpcoming).length}
                  </span>
                </div>
                <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                  {schedules
                    .filter(isScheduleUpcoming)
                    .sort((a, b) => {
                      const [aHour, aMinute] = a.start_time.split(':').map(Number);
                      const [bHour, bMinute] = b.start_time.split(':').map(Number);
                      return (aHour * 60 + aMinute) - (bHour * 60 + bMinute);
                    })
                    .map(schedule => (
                      <ScheduleCard key={schedule.id} schedule={schedule} />
                    ))}
                </div>
              </div>
            )}

            {/* Past Classes */}
            {schedules.some(isSchedulePast) && (
              <div className="space-y-4">
                <h3 className="text-2xl font-light text-white/60">Completed</h3>
                <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                  {schedules
                    .filter(isSchedulePast)
                    .sort((a, b) => {
                      const [aHour, aMinute] = a.start_time.split(':').map(Number);
                      const [bHour, bMinute] = b.start_time.split(':').map(Number);
                      return (bHour * 60 + bMinute) - (aHour * 60 + aMinute);
                    })
                    .map(schedule => (
                      <ScheduleCard key={schedule.id} schedule={schedule} />
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