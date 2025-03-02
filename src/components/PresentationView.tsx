import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
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
  const [activeFilter, setActiveFilter] = useState<'status' | 'grade' | 'teacher'>('status');
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<number | null>(null);
  const [uniqueGrades, setUniqueGrades] = useState<string[]>([]);
  const [uniqueTeachers, setUniqueTeachers] = useState<Teacher[]>([]);

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
        
        // Extract unique grades and teachers for filters
        if (filteredData) {
          // Get unique grades
          const grades = [...new Set(filteredData.map(schedule => schedule.grade))].sort();
          setUniqueGrades(grades);
          
          // Get unique teachers
          const teachersMap = new Map<number, Teacher>();
          filteredData.forEach(schedule => {
            if (schedule.teachers && !teachersMap.has(schedule.teachers.id)) {
              teachersMap.set(schedule.teachers.id, schedule.teachers);
            }
          });
          setUniqueTeachers(Array.from(teachersMap.values()));
        }
        
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
    
    // Determine if this is a compact card (no description)
    const isCompact = !displayDescription;

    return (
      <div 
        className={`relative rounded-xl ${isCompact ? 'p-2.5' : 'p-3.5'} glass-dark border transition-all ${
          isPast ? 'opacity-60 border-gray-800/30' :
          isCanceledToday ? 'border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.15)]' : 
          isActive ? 'border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]' :
          isUpcoming ? 'border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]' :
          'border-gray-800/50'
        }`}
      >
        {/* Status indicator and time in a single row */}
        <div className="flex justify-between items-center mb-2">
          <div>
            {isCanceledToday ? (
              <span className="px-2 py-1 rounded-md text-xs font-medium bg-red-900/30 text-red-400 border border-red-500/30">
                Canceled
              </span>
            ) : isActive ? (
              <span className="px-2 py-1 rounded-md text-xs font-medium bg-emerald-900/30 text-emerald-400 border border-emerald-500/30">
                In Progress
              </span>
            ) : isUpcoming ? (
              <span className="px-2 py-1 rounded-md text-xs font-medium bg-blue-900/30 text-blue-400 border border-blue-500/30">
                Up Next
              </span>
            ) : (
              <span className="px-2 py-1 rounded-md text-xs font-medium bg-gray-800/50 text-gray-400 border border-gray-700/30">
                Completed
              </span>
            )}
          </div>
          <div className="text-right font-medium text-base">
            <span className="bg-gradient-to-r from-blue-400 to-sky-500 bg-clip-text text-transparent">
            {(() => {
              const [startHour, startMinute] = schedule.start_time.split(':').map(Number);
              const startDate = new Date();
              startDate.setHours(startHour, startMinute);
                return format(startDate, 'h:mm');
              })()}
              <span className="mx-0.5">-</span>
              {(() => {
                const [endHour, endMinute] = schedule.end_time.split(':').map(Number);
                const endDate = new Date();
                endDate.setHours(endHour, endMinute);
                return format(endDate, 'h:mm');
              })()}
            </span>
            <span className="text-xs text-gray-400 ml-1">
            {(() => {
              const [endHour, endMinute] = schedule.end_time.split(':').map(Number);
              const endDate = new Date();
              endDate.setHours(endHour, endMinute);
                return format(endDate, 'a');
            })()}
            </span>
          </div>
        </div>

        {/* Schedule info - more compact layout */}
        <div>
          {/* Teacher name and subject as main titles */}
          <div className="mb-2">
            <div className="flex flex-col">
              <h3 className="text-sm text-gray-300">
                {schedule.teachers?.name}
              </h3>
              <h2 className={`${isCompact ? 'text-2xl' : 'text-3xl'} font-bold bg-gradient-to-r from-blue-400 to-sky-500 bg-clip-text text-transparent`}>
                {schedule.subject}
              </h2>
            </div>
          </div>
          
          {/* Redesigned Grade and Curriculum information - inline for space efficiency */}
          <div className="flex flex-wrap gap-2 mb-2">
            <div className="bg-gradient-to-br from-sky-900/40 to-blue-800/20 px-2 py-1 rounded-lg border border-sky-700/30">
              <div className="flex items-center">
                <span className="text-sky-400 text-xs font-medium mr-1">Grade:</span>
                <span className="text-xs font-semibold text-white">{schedule.grade}</span>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-blue-900/40 to-cyan-800/20 px-2 py-1 rounded-lg border border-blue-700/30">
              <div className="flex items-center">
                <span className="text-cyan-400 text-xs font-medium mr-1">Curriculum:</span>
                <span className="text-xs font-semibold text-white">{schedule.curriculum}</span>
              </div>
            </div>
            
            {/* Room information if available - inline with grade and curriculum */}
            {schedule.room && (
              <div className="inline-flex items-center px-2 py-1 bg-gradient-to-r from-gray-800/60 to-gray-700/60 rounded-lg border border-gray-700/50">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-gray-400 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span className="text-xs font-medium text-gray-200">Room {schedule.room}</span>
              </div>
            )}
          </div>
          
          {/* Description - more compact */}
          {displayDescription && (
            <div className="mt-2 mb-2">
              <div className="p-2 bg-gradient-to-br from-gray-900/40 to-gray-800/20 rounded-lg border border-gray-800/50">
                <p className="text-xs text-gray-200 whitespace-pre-wrap leading-relaxed">
                  {displayDescription}
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Progress bar for active classes - integrated into bottom of card */}
        {isActive && !isCanceledToday && (
          <div className="mt-1">
            <div className="h-1.5 bg-gray-800/80 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-1000 ease-in-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-center mt-0.5">
              <p className="text-xs text-emerald-400 font-medium">{Math.round(progress)}%</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="relative">
          <div className="w-24 h-24 border-t-4 border-b-4 border-blue-500 rounded-full animate-spin"></div>
          <div className="w-24 h-24 border-t-4 border-b-4 border-sky-400 rounded-full animate-spin absolute top-0 left-0" style={{ animationDirection: 'reverse', opacity: 0.7 }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#0a0a0a] overflow-y-auto relative">
      {/* Enhanced background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Primary gradient mesh - larger, more diffused gradients */}
        <div className="absolute -top-[10%] right-[5%] w-[80vw] h-[70vh] bg-gradient-to-bl from-blue-600/8 via-blue-400/5 to-transparent rounded-[100%] filter blur-[80px]"></div>
        <div className="absolute -bottom-[10%] left-[5%] w-[80vw] h-[70vh] bg-gradient-to-tr from-blue-500/8 via-blue-300/5 to-transparent rounded-[100%] filter blur-[80px]"></div>
        
        {/* Secondary gradient accents - smaller, more vibrant */}
        <div className="absolute top-[25%] left-[15%] w-[40vw] h-[40vh] bg-gradient-to-r from-cyan-500/5 to-blue-400/5 rounded-full filter blur-[60px] animate-pulse-slow"></div>
        <div className="absolute bottom-[25%] right-[15%] w-[40vw] h-[40vh] bg-gradient-to-r from-blue-500/5 to-sky-400/5 rounded-full filter blur-[60px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
        
        {/* Tertiary accent points - small, subtle light sources */}
        <div className="absolute top-[40%] right-[30%] w-[15vw] h-[15vh] bg-blue-400/3 rounded-full filter blur-[40px] animate-float" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-[40%] left-[30%] w-[15vw] h-[15vh] bg-sky-400/3 rounded-full filter blur-[40px] animate-float" style={{ animationDelay: '3s' }}></div>
        
        {/* Grain overlay for texture */}
        <div className="absolute inset-0 opacity-[0.15] mix-blend-overlay bg-noise"></div>
      </div>

      {/* Content container */}
      <div className="relative z-10 container mx-auto p-4 lg:p-6 pb-20">
        {/* Header with time and date */}
        <header className="mb-6 lg:mb-8">
          <div className="glass-dark rounded-xl p-4 border border-gray-800/30 shadow-glass-strong backdrop-blur-md">
            <div className="flex flex-row justify-between items-center">
              <div className="flex items-center gap-4">
                {/* Continental Logo */}
                <div className="hidden sm:block">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-sky-400 flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-xl">C</span>
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl lg:text-4xl font-extralight text-white tracking-tight">
            {format(currentTime, 'EEEE')}
          </h1>
                  <p className="text-lg lg:text-xl font-light text-gray-400">
            {format(currentTime, 'MMMM d, yyyy')}
          </p>
        </div>
              </div>
              <div>
                <div className="text-4xl lg:text-5xl font-extralight tracking-tighter text-transparent bg-gradient-to-r from-blue-400 to-sky-500 bg-clip-text">
                  {format(currentTime, 'hh:mm')}{' '}
                  <span className="text-2xl lg:text-3xl text-gray-500">{format(currentTime, 'a')}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Filter tabs */}
        <div className="mb-6">
          <div className="glass-dark rounded-xl p-2 border border-gray-800/30 shadow-glass-strong backdrop-blur-md">
            <div className="flex flex-wrap gap-2">
              {/* Filter type tabs */}
              <div className="flex rounded-lg bg-gray-900/50 p-1">
                <button
                  onClick={() => {
                    setActiveFilter('status');
                    setSelectedGrade(null);
                    setSelectedTeacher(null);
                  }}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                    activeFilter === 'status'
                      ? 'bg-gradient-to-r from-blue-500/80 to-sky-500/80 text-white shadow-md'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
                  }`}
                >
                  By Status
                </button>
                <button
                  onClick={() => {
                    setActiveFilter('grade');
                    setSelectedTeacher(null);
                  }}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                    activeFilter === 'grade'
                      ? 'bg-gradient-to-r from-blue-500/80 to-sky-500/80 text-white shadow-md'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
                  }`}
                >
                  By Grade
                </button>
                <button
                  onClick={() => {
                    setActiveFilter('teacher');
                    setSelectedGrade(null);
                  }}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                    activeFilter === 'teacher'
                      ? 'bg-gradient-to-r from-blue-500/80 to-sky-500/80 text-white shadow-md'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
                  }`}
                >
                  By Teacher
                </button>
              </div>
              
              {/* Grade filter options - show when grade filter is active */}
              {activeFilter === 'grade' && (
                <div className="flex flex-wrap gap-1 ml-1">
                  {uniqueGrades.map(grade => (
                    <button
                      key={grade}
                      onClick={() => setSelectedGrade(selectedGrade === grade ? null : grade)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                        selectedGrade === grade
                          ? 'bg-gradient-to-r from-sky-500/80 to-cyan-500/80 text-white shadow-md'
                          : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
                      }`}
                    >
                      {grade}
                    </button>
                  ))}
                  {selectedGrade && (
                    <button
                      onClick={() => setSelectedGrade(null)}
                      className="px-3 py-1.5 text-sm font-medium rounded-md bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 transition-all"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}
              
              {/* Teacher filter options - show when teacher filter is active */}
              {activeFilter === 'teacher' && (
                <div className="flex flex-wrap gap-1 ml-1">
                  {uniqueTeachers.map(teacher => (
                    <button
                      key={teacher.id}
                      onClick={() => setSelectedTeacher(selectedTeacher === teacher.id ? null : teacher.id)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                        selectedTeacher === teacher.id
                          ? 'bg-gradient-to-r from-blue-500/80 to-indigo-500/80 text-white shadow-md'
                          : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
                      }`}
                    >
                      {teacher.name}
                    </button>
                  ))}
                  {selectedTeacher && (
                    <button
                      onClick={() => setSelectedTeacher(null)}
                      className="px-3 py-1.5 text-sm font-medium rounded-md bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 transition-all"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main content */}
        <main>
          {error ? (
            <div className="glass-dark rounded-xl p-4 border border-red-800/30 shadow-glass-strong backdrop-blur-md">
                <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-900/30 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-medium text-red-400">Error Loading Schedule</h2>
                  <p className="text-base text-gray-400 mt-1">{error}</p>
                </div>
              </div>
            </div>
          ) : schedules.length === 0 ? (
            <div className="glass-dark rounded-xl p-6 border border-gray-800/30 shadow-glass-strong backdrop-blur-md text-center">
              <div className="flex flex-col items-center justify-center py-6">
                <div className="w-16 h-16 rounded-full bg-gray-800/50 flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-light text-white mb-2">No Classes Today</h2>
                <p className="text-base text-gray-400 max-w-2xl">
                  There are no classes scheduled for today. Check back tomorrow or contact the administration for more information.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {activeFilter === 'status' && (
                <>
                  {/* Active Classes */}
                  {schedules.some(s => isScheduleActive(s)) && (
                    <section className="space-y-4">
                      <div className="flex items-center gap-3 px-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                        <h2 className="text-xl lg:text-2xl font-medium bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">In Progress</h2>
                      </div>
                      <div className="grid gap-2 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                  {schedules
                    .filter(isScheduleActive)
                    .map(schedule => (
                      <ScheduleCard key={schedule.id} schedule={schedule} />
                    ))}
                </div>
                    </section>
            )}

            {/* Upcoming Classes */}
            {schedules.some(s => isScheduleUpcoming(s)) && (
                    <section className="space-y-4">
                      <div className="flex items-center gap-3 px-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <h2 className="text-xl lg:text-2xl font-medium bg-gradient-to-r from-blue-400 to-sky-500 bg-clip-text text-transparent">Up Next</h2>
                </div>
                      <div className="grid gap-2 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
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
                    </section>
            )}

            {/* Past Classes */}
            {schedules.some(isSchedulePast) && (
                    <section className="space-y-4">
                      <div className="flex items-center gap-3 px-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                        <h2 className="text-xl lg:text-2xl font-medium bg-gradient-to-r from-gray-400 to-gray-500 bg-clip-text text-transparent">Completed</h2>
                      </div>
                      <div className="grid gap-2 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
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
                    </section>
                  )}
                </>
              )}

              {/* Grade Filter View */}
              {activeFilter === 'grade' && (
                <>
                  {selectedGrade ? (
                    <section className="space-y-4">
                      <div className="flex items-center gap-3 px-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-sky-500"></div>
                        <h2 className="text-xl lg:text-2xl font-medium bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent">
                          Grade {selectedGrade}
                        </h2>
                      </div>
                      <div className="grid gap-2 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                        {schedules
                          .filter(schedule => schedule.grade === selectedGrade)
                          .sort((a, b) => {
                            // Sort by status first (active, upcoming, past), then by time
                            if (isScheduleActive(a) && !isScheduleActive(b)) return -1;
                            if (!isScheduleActive(a) && isScheduleActive(b)) return 1;
                            if (isScheduleUpcoming(a) && !isScheduleUpcoming(b)) return -1;
                            if (!isScheduleUpcoming(a) && isScheduleUpcoming(b)) return 1;
                            
                            // If same status, sort by time
                            const [aHour, aMinute] = a.start_time.split(':').map(Number);
                            const [bHour, bMinute] = b.start_time.split(':').map(Number);
                            return (aHour * 60 + aMinute) - (bHour * 60 + bMinute);
                          })
                          .map(schedule => (
                            <ScheduleCard key={schedule.id} schedule={schedule} />
                          ))}
                      </div>
                    </section>
                  ) : (
                    // Show all grades when no grade is selected
                    <>
                      {uniqueGrades.map(grade => {
                        const gradeSchedules = schedules.filter(s => s.grade === grade);
                        if (gradeSchedules.length === 0) return null;
                        
                        return (
                          <section key={grade} className="space-y-4">
                            <div className="flex items-center gap-3 px-2 mb-2">
                              <div className="w-3 h-3 rounded-full bg-sky-500"></div>
                              <h2 className="text-xl lg:text-2xl font-medium bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent">
                                Grade {grade}
                              </h2>
                            </div>
                            <div className="grid gap-2 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                              {gradeSchedules
                                .sort((a, b) => {
                                  // Sort by status first (active, upcoming, past), then by time
                                  if (isScheduleActive(a) && !isScheduleActive(b)) return -1;
                                  if (!isScheduleActive(a) && isScheduleActive(b)) return 1;
                                  if (isScheduleUpcoming(a) && !isScheduleUpcoming(b)) return -1;
                                  if (!isScheduleUpcoming(a) && isScheduleUpcoming(b)) return 1;
                                  
                                  // If same status, sort by time
                                  const [aHour, aMinute] = a.start_time.split(':').map(Number);
                                  const [bHour, bMinute] = b.start_time.split(':').map(Number);
                                  return (aHour * 60 + aMinute) - (bHour * 60 + bMinute);
                                })
                                .map(schedule => (
                                  <ScheduleCard key={schedule.id} schedule={schedule} />
                                ))}
                            </div>
                          </section>
                        );
                      })}
                    </>
                  )}
                </>
              )}

              {/* Teacher Filter View */}
              {activeFilter === 'teacher' && (
                <>
                  {selectedTeacher ? (
                    <section className="space-y-4">
                      <div className="flex items-center gap-3 px-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <h2 className="text-xl lg:text-2xl font-medium bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
                          {uniqueTeachers.find(t => t.id === selectedTeacher)?.name}
                        </h2>
                      </div>
                      <div className="grid gap-2 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                        {schedules
                          .filter(schedule => schedule.teacher_id === selectedTeacher)
                          .sort((a, b) => {
                            // Sort by status first (active, upcoming, past), then by time
                            if (isScheduleActive(a) && !isScheduleActive(b)) return -1;
                            if (!isScheduleActive(a) && isScheduleActive(b)) return 1;
                            if (isScheduleUpcoming(a) && !isScheduleUpcoming(b)) return -1;
                            if (!isScheduleUpcoming(a) && isScheduleUpcoming(b)) return 1;
                            
                            // If same status, sort by time
                            const [aHour, aMinute] = a.start_time.split(':').map(Number);
                            const [bHour, bMinute] = b.start_time.split(':').map(Number);
                            return (aHour * 60 + aMinute) - (bHour * 60 + bMinute);
                          })
                          .map(schedule => (
                            <ScheduleCard key={schedule.id} schedule={schedule} />
                          ))}
                      </div>
                    </section>
                  ) : (
                    // Show all teachers when no teacher is selected
                    <>
                      {uniqueTeachers.map(teacher => {
                        const teacherSchedules = schedules.filter(s => s.teacher_id === teacher.id);
                        if (teacherSchedules.length === 0) return null;
                        
                        return (
                          <section key={teacher.id} className="space-y-4">
                            <div className="flex items-center gap-3 px-2 mb-2">
                              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                              <h2 className="text-xl lg:text-2xl font-medium bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
                                {teacher.name}
                              </h2>
                            </div>
                            <div className="grid gap-2 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                              {teacherSchedules
                                .sort((a, b) => {
                                  // Sort by status first (active, upcoming, past), then by time
                                  if (isScheduleActive(a) && !isScheduleActive(b)) return -1;
                                  if (!isScheduleActive(a) && isScheduleActive(b)) return 1;
                                  if (isScheduleUpcoming(a) && !isScheduleUpcoming(b)) return -1;
                                  if (!isScheduleUpcoming(a) && isScheduleUpcoming(b)) return 1;
                                  
                                  // If same status, sort by time
                                  const [aHour, aMinute] = a.start_time.split(':').map(Number);
                                  const [bHour, bMinute] = b.start_time.split(':').map(Number);
                                  return (aHour * 60 + aMinute) - (bHour * 60 + bMinute);
                                })
                                .map(schedule => (
                                  <ScheduleCard key={schedule.id} schedule={schedule} />
                                ))}
              </div>
                          </section>
                        );
                      })}
                    </>
                  )}
                </>
            )}
          </div>
        )}
        </main>
        
        {/* Footer */}
        <footer className="mt-16 text-center text-gray-500 text-lg">
          <p>Continental Internal • {new Date().getFullYear()}</p>
        </footer>
      </div>
    </div>
  );
} 