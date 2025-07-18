import React, { useState, useEffect, useCallback } from 'react';
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
  mode?: 'Mock' | 'Seminar' | 'Class';
}

interface PresentationSettings {
  id: string;
  show_classes: boolean;
  show_news: boolean;
  fullscreen: boolean;
  transition_speed: number;
  active_category_id: string | null;
  display_duration?: number;
  class_duration?: number;
}

interface PresentationImage {
  id: string;
  category_id: string;
  image_url: string;
  file_type: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  event_date: string;
}

interface NewsItem {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

const PresentationView: React.FC = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeFilter, setActiveFilter] = useState<'grade' | 'teacher' | 'status'>('grade');
  const [uniqueGrades, setUniqueGrades] = useState<string[]>([]);
  const [uniqueTeachers, setUniqueTeachers] = useState<Teacher[]>([]);
  const [settings, setSettings] = useState<PresentationSettings | null>(null);
  const [images, setImages] = useState<PresentationImage[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [currentClassIndex, setCurrentClassIndex] = useState(0);
  const [activeClasses, setActiveClasses] = useState<Schedule[]>([]);

  // Request fullscreen if enabled in settings
  useEffect(() => {
    if (settings?.fullscreen === true) {
      const element = document.documentElement;
      if (element.requestFullscreen) {
        element.requestFullscreen().catch(err => {
          console.error('Error attempting to enable fullscreen:', err);
        });
      }
    }

    // Cleanup: exit fullscreen on unmount
    return () => {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(err => {
          console.error('Error attempting to exit fullscreen:', err);
        });
      }
    };
  }, [settings?.fullscreen]);

  // Automatic page refresh every minute
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      window.location.reload();
    }, 60000); // Refresh every 60 seconds
    
    return () => clearInterval(refreshInterval);
  }, []);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Fetch presentation settings and active content
  const fetchPresentationData = useCallback(async () => {
    try {
      // Get settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('presentation_settings')
        .select('*')
        .single();

      if (settingsError) throw settingsError;
      setSettings(settingsData);

      // Get active category images if available
      if (settingsData?.active_category_id) {
        const { data: imagesData, error: imagesError } = await supabase
          .from('presentation_images')
          .select('*')
          .eq('category_id', settingsData.active_category_id)
          .not('file_type', 'eq', 'ppt-original') // Exclude original PPT files
          .order('created_at', { ascending: false });

        if (imagesError) throw imagesError;
        console.log('Fetched presentation images:', imagesData);
        setImages(imagesData || []);
      }

      // Get today's events if show_classes is true
      if (settingsData?.show_classes) {
        const today = new Date().toISOString().split('T')[0];
        const { data: eventsData, error: eventsError } = await supabase
          .from('calendar_events')
          .select('*')
          .eq('event_date', today)
          .order('created_at', { ascending: true });

        if (eventsError) throw eventsError;
        setEvents(eventsData || []);
      }

      // Get recent news if show_news is true
      if (settingsData?.show_news) {
        const { data: newsData, error: newsError } = await supabase
          .from('news')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);

        if (newsError) throw newsError;
        setNews(newsData || []);
      }
    } catch (err) {
      console.error('Error fetching presentation data:', err);
      setError('Failed to load presentation data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchPresentationData();

    // Set up real-time subscription for settings changes
    const settingsSubscription = supabase
      .channel('presentation_settings_changes')
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'presentation_settings' }, 
        () => {
          console.log('Presentation settings updated, refreshing data');
          fetchPresentationData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(settingsSubscription);
    };
  }, [fetchPresentationData]);

  // Image rotation effect
  useEffect(() => {
    if (images.length <= 1) return; // No need to rotate if there's only one image or none
    
    // Use display_duration if available, fallback to transition_speed for backward compatibility
    const displayDuration = (settings?.display_duration || settings?.transition_speed || 5) * 1000;
    
    const intervalId = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, displayDuration);
    
    return () => clearInterval(intervalId);
  }, [images.length, settings?.display_duration, settings?.transition_speed]);

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
        
        // Get currently active classes
        const currentlyActive = filteredData?.filter(schedule => isScheduleActive(schedule)) || [];
        setActiveClasses(currentlyActive);
        
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

  // Class carousel rotation effect
  useEffect(() => {
    if (activeClasses.length <= 1) return; // No need to rotate if there's only one class or none
    
    // Use class_duration if available, or default to 10 seconds
    const classDuration = (settings?.class_duration || 10) * 1000;
    
    const intervalId = setInterval(() => {
      setCurrentClassIndex((prevIndex) => (prevIndex + 1) % activeClasses.length);
    }, classDuration);
    
    return () => clearInterval(intervalId);
  }, [activeClasses.length, settings?.class_duration]);

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

    // Mode-based color schemes - matched with TeacherSchedule.tsx
    const getModeColors = () => {
      switch (schedule.mode) {
        case 'Mock':
          return {
            gradientFrom: 'from-emerald-600',
            gradientTo: 'to-green-500',
            borderActive: 'border-emerald-400',
            shadowActive: 'shadow-[0_0_20px_rgba(16,185,129,0.2)]',
            bgPill: 'bg-emerald-500/20',
            textPill: 'text-emerald-100',
            borderPill: 'border-emerald-500/30',
            textGradient: 'from-emerald-300 to-green-200'
          };
        case 'Seminar':
          return {
            gradientFrom: 'from-amber-600',
            gradientTo: 'to-yellow-500',
            borderActive: 'border-amber-400',
            shadowActive: 'shadow-[0_0_20px_rgba(245,158,11,0.2)]',
            bgPill: 'bg-amber-500/20',
            textPill: 'text-amber-100',
            borderPill: 'border-amber-500/30',
            textGradient: 'from-amber-300 to-yellow-200'
          };
        default:
          return {
            gradientFrom: 'from-blue-600',
            gradientTo: 'to-indigo-500',
            borderActive: 'border-blue-400',
            shadowActive: 'shadow-[0_0_15px_rgba(59,130,246,0.15)]',
            bgPill: 'bg-blue-500/20',
            textPill: 'text-blue-100',
            borderPill: 'border-blue-500/30',
            textGradient: 'from-blue-300 to-sky-200'
          };
      }
    };

    const colors = getModeColors();

    return (
      <div 
        className={`relative rounded-xl ${isCompact ? 'p-2' : 'p-3.5'} bg-gray-900/75 border transition-all backdrop-blur-md ${
          isPast ? 'opacity-60 border-gray-800/40' :
          isCanceledToday ? 'border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.15)]' : 
          isActive ? colors.borderActive + ' ' + colors.shadowActive :
          isUpcoming ? colors.borderActive + ' ' + colors.shadowActive :
          'border-gray-800/50'
        } overflow-hidden`}
      >
        {/* Status indicator and time in a single row */}
        <div className="flex justify-between items-center mb-1">
          <div className="flex gap-2 items-center">
            {isCanceledToday ? (
              <span className={`px-1.5 py-0.5 rounded-md ${isCompact ? 'text-xs' : 'text-sm'} font-medium bg-red-900/30 text-red-400 border border-red-500/30`}>
                Canceled
              </span>
            ) : isActive ? (
              <span className={`px-1.5 py-0.5 rounded-md ${isCompact ? 'text-xs' : 'text-sm'} font-medium ${colors.bgPill} ${colors.textPill} border ${colors.borderPill}`}>
                In Progress
              </span>
            ) : isUpcoming ? (
              <span className={`px-1.5 py-0.5 rounded-md ${isCompact ? 'text-xs' : 'text-sm'} font-medium ${colors.bgPill} ${colors.textPill} border ${colors.borderPill}`}>
                Up Next
              </span>
            ) : (
              <span className={`px-1.5 py-0.5 rounded-md ${isCompact ? 'text-xs' : 'text-sm'} font-medium bg-gray-800/50 text-gray-400 border border-gray-700/30`}>
                Completed
              </span>
            )}
            {/* Show mode label for Mock and Seminar */}
            {schedule.mode && schedule.mode !== 'Class' && (
              <span className={`px-2 py-0.5 rounded-md text-lg font-bold ${colors.bgPill} ${colors.textPill} border ${colors.borderPill}`}>
                {schedule.mode}
              </span>
            )}
          </div>
          <div className="text-right font-medium text-base">
            <span className={`bg-gradient-to-r ${colors.textGradient} bg-clip-text text-transparent`}>
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
          <div className={`${isCompact ? 'mb-1' : 'mb-2'}`}>
            <div className="flex flex-col">
              <h3 className={`${isCompact ? 'text-xs' : 'text-sm'} text-gray-300`}>
                {schedule.teachers?.name}
              </h3>
              <h2 className={`${isCompact ? 'text-lg' : 'text-2xl'} font-bold bg-gradient-to-r ${colors.textGradient} bg-clip-text text-transparent`}>
                {schedule.subject}
              </h2>
            </div>
          </div>
          
          {/* Redesigned Grade and Curriculum information - inline for space efficiency */}
          <div className={`flex flex-wrap gap-1 ${isCompact ? 'mb-1' : 'mb-2'}`}>
            <div className={`bg-gradient-to-br from-${colors.gradientFrom.split('-')[1]}-900/40 to-${colors.gradientTo.split('-')[1]}-800/20 px-1.5 py-0.5 rounded-lg border ${colors.borderPill}`}>
              <div className="flex items-center">
                <span className={`${colors.textPill} ${isCompact ? 'text-[10px]' : 'text-xs'} font-medium mr-1`}>Grade:</span>
                <span className={`${isCompact ? 'text-[10px]' : 'text-xs'} font-semibold text-white`}>{schedule.grade}</span>
              </div>
            </div>
            
            <div className={`bg-gradient-to-br from-${colors.gradientFrom.split('-')[1]}-900/40 to-${colors.gradientTo.split('-')[1]}-800/20 px-1.5 py-0.5 rounded-lg border ${colors.borderPill}`}>
              <div className="flex items-center">
                <span className={`${colors.textPill} ${isCompact ? 'text-[10px]' : 'text-xs'} font-medium mr-1`}>Curriculum:</span>
                <span className={`${isCompact ? 'text-[10px]' : 'text-xs'} font-semibold text-white`}>{schedule.curriculum}</span>
              </div>
            </div>
            
            {/* Room information if available - inline with grade and curriculum */}
            {schedule.room && (
              <div className="inline-flex items-center px-1.5 py-0.5 bg-gradient-to-r from-gray-800/60 to-gray-700/60 rounded-lg border border-gray-700/50">
                <svg xmlns="http://www.w3.org/2000/svg" className={`${isCompact ? 'h-2 w-2' : 'h-3 w-3'} text-gray-400 mr-1`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span className={`${isCompact ? 'text-[10px]' : 'text-xs'} font-medium text-gray-200`}>Room {schedule.room}</span>
              </div>
            )}
          </div>
          
          {/* Description - more compact */}
          {displayDescription && (
            <div className="mt-2 mb-1">
              <div className="p-2 bg-gradient-to-br from-gray-900/40 to-gray-800/20 rounded-lg border border-gray-800/50">
                <p className="text-xs text-gray-200 whitespace-pre-wrap leading-relaxed">
                  {displayDescription}
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Progress bar for active classes - color based on mode */}
        {isActive && !isCanceledToday && (
          <div 
            className={`absolute bottom-0 left-0 h-1 bg-gradient-to-r ${colors.textGradient}`}
            style={{ width: `${progress}%` }}
          />
        )}
      </div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center">
        <div className="text-red-500 text-xl font-bold mb-4">Error loading presentation</div>
        <div className="text-white">{error}</div>
      </div>
    );
  }

  // No active content state
  if (!settings?.active_category_id && !settings?.show_classes && !settings?.show_news) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center">
        <div className="text-white text-2xl">No active content to display</div>
        <div className="text-gray-400 mt-2">Configure the presentation in the admin panel</div>
      </div>
    );
  }

  // FULLSCREEN MODE - Image only, maximum impact
  if (settings?.fullscreen === true) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col">
        {/* Fullscreen image display */}
        <div className="flex-1 relative overflow-hidden">
          {images.length > 1 ? (
            // Multiple images with fade transition
            <>
              {images.map((image, index) => (
                <div 
                  key={image.id}
                  className={`absolute inset-0 flex items-center justify-center transition-opacity duration-1000 ease-in-out
                    ${index === currentImageIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                  style={{
                    transitionDuration: '1500ms'
                  }}
                >
                  <img 
                    src={image.image_url}
                    alt={`Presentation image ${index + 1}`}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              ))}
            </>
          ) : images.length === 1 ? (
            // Single image
            <div className="absolute inset-0 flex items-center justify-center">
              <img 
                src={images[0].image_url}
                alt="Presentation image"
                className="max-w-full max-h-full object-contain"
              />
            </div>
          ) : (
            // No images available
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-gray-400 text-2xl">No images available</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // NON-FULLSCREEN MODE - With date/time header and optional news/classes sections
  const showSidebar = settings?.show_classes || settings?.show_news;
  
  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Header with date and time */}
      <header className="bg-black/80 backdrop-blur-sm border-b border-gray-800 px-8 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extralight text-white tracking-tight">
            {format(currentTime, 'EEEE')}
          </h1>
          <p className="text-lg font-light text-gray-400">
            {format(currentTime, 'MMMM d, yyyy')}
          </p>
        </div>
        <div className="text-4xl font-extralight tracking-tighter text-transparent bg-gradient-to-r from-blue-400 to-sky-500 bg-clip-text">
          {format(currentTime, 'hh:mm')}{' '}
          <span className="text-2xl text-gray-500">{format(currentTime, 'a')}</span>
        </div>
      </header>
      
      {/* Main content area - flexible layout based on settings */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main content area - Images */}
        <div className={`flex-1 ${showSidebar ? 'max-w-[65%]' : ''} overflow-hidden relative`}>
          {images.length > 1 ? (
            // Multiple images with fade transition
            <>
              {images.map((image, index) => (
                <div 
                  key={image.id}
                  className={`absolute inset-0 flex items-center justify-center transition-opacity duration-1000 ease-in-out
                    ${index === currentImageIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                  style={{
                    transitionDuration: '1500ms'
                  }}
                >
                  <img 
                    src={image.image_url}
                    alt={`Presentation image ${index + 1}`}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              ))}
            </>
          ) : images.length === 1 ? (
            // Single image
            <div className="absolute inset-0 flex items-center justify-center">
              <img 
                src={images[0].image_url}
                alt="Presentation image"
                className="max-w-full max-h-full object-contain"
              />
            </div>
          ) : (
            // No images available
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-gray-400 text-2xl">No images available</div>
            </div>
          )}
        </div>
        
        {/* Side panel for news and classes if enabled */}
        {showSidebar && (
          <div className="w-[35%] border-l border-gray-800/50 overflow-y-auto">
            {/* Current Classes Section */}
            {settings?.show_classes && activeClasses.length > 0 && (
              <div className="p-6 border-b border-gray-800/50">
                <div className="flex justify-between items-center mb-6">
                  <h2 className={`text-xl font-semibold ${
                    activeClasses[currentClassIndex]?.mode === 'Mock'
                      ? 'text-emerald-400'
                      : activeClasses[currentClassIndex]?.mode === 'Seminar'
                        ? 'text-amber-400'
                        : 'text-blue-400'
                  }`}>
                    Current Classes {activeClasses.length > 1 && 
                      <span className="text-sm text-gray-400 ml-2">({currentClassIndex + 1}/{activeClasses.length})</span>
                    }
                  </h2>
                  {activeClasses.length > 1 && (
                    <div className="flex space-x-2">
                      {activeClasses.map((_, index) => (
                        <div 
                          key={index} 
                          className={`w-3 h-3 rounded-full ${
                            index === currentClassIndex 
                              ? activeClasses[currentClassIndex]?.mode === 'Mock'
                                ? 'bg-emerald-500'
                                : activeClasses[currentClassIndex]?.mode === 'Seminar'
                                  ? 'bg-amber-500'
                                  : 'bg-blue-500'
                              : 'bg-gray-700'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative min-h-[420px]">
                  {activeClasses.map((schedule, index) => (
                    <div 
                      key={schedule.id}
                      className={`transition-opacity duration-500 absolute inset-0
                        ${index === currentClassIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                    >
                      <div 
                        className={`relative rounded-xl p-6 bg-gray-900/90 border ${
                          schedule.mode === 'Mock'
                            ? 'border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                            : schedule.mode === 'Seminar'
                              ? 'border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                              : 'border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                        } backdrop-blur-md overflow-hidden`}
                      >
                        {/* Status indicator and time */}
                        <div className="flex justify-between items-center mb-3">
                          <div className="flex items-center gap-2">
                            {/* Show mode label */}
                            {schedule.mode && (
                              <span className={`px-3 py-1.5 rounded-md text-base font-bold ${
                                schedule.mode === 'Mock'
                                  ? 'bg-emerald-500/20 text-emerald-100 border-emerald-500/30'
                                  : schedule.mode === 'Seminar'
                                    ? 'bg-amber-500/20 text-amber-100 border-amber-500/30'
                                    : 'bg-blue-500/20 text-blue-100 border-blue-500/30'
                                } border`}>
                                {schedule.mode}
                              </span>
                            )}
                          </div>
                          <div className="text-right font-medium">
                            <span className={`text-xl bg-gradient-to-r ${
                              schedule.mode === 'Mock'
                                ? 'from-emerald-300 to-green-200'
                                : schedule.mode === 'Seminar'
                                  ? 'from-amber-300 to-yellow-200'
                                  : 'from-blue-300 to-sky-200'
                              } bg-clip-text text-transparent`}>
                              {(() => {
                                const [startHour, startMinute] = schedule.start_time.split(':').map(Number);
                                const startDate = new Date();
                                startDate.setHours(startHour, startMinute);
                                return format(startDate, 'h:mm');
                              })()}
                              <span className="mx-1">-</span>
                              {(() => {
                                const [endHour, endMinute] = schedule.end_time.split(':').map(Number);
                                const endDate = new Date();
                                endDate.setHours(endHour, endMinute);
                                return format(endDate, 'h:mm');
                              })()}
                            </span>
                            <span className="text-sm text-gray-400 ml-1">
                              {(() => {
                                const [endHour, endMinute] = schedule.end_time.split(':').map(Number);
                                const endDate = new Date();
                                endDate.setHours(endHour, endMinute);
                                return format(endDate, 'a');
                              })()}
                            </span>
                          </div>
                        </div>

                        {/* Teacher name and subject as main titles */}
                        <div className="mb-4">
                          <div className="flex flex-col">
                            <h3 className="text-lg text-gray-300 mb-1">
                              {schedule.teachers?.name}
                            </h3>
                            <h2 className={`text-3xl font-bold bg-gradient-to-r ${
                              schedule.mode === 'Mock'
                                ? 'from-emerald-300 to-green-200'
                                : schedule.mode === 'Seminar'
                                  ? 'from-amber-300 to-yellow-200'
                                  : 'from-blue-300 to-sky-200'
                              } bg-clip-text text-transparent`}>
                              {schedule.subject}
                            </h2>
                          </div>
                        </div>
                        
                        {/* Grade and Curriculum information */}
                        <div className="flex flex-wrap gap-3 mb-3">
                          <div className={`bg-gradient-to-br ${
                            schedule.mode === 'Mock'
                              ? 'from-emerald-900/40 to-green-800/20 border-emerald-700/30'
                              : schedule.mode === 'Seminar'
                                ? 'from-amber-900/40 to-yellow-800/20 border-amber-700/30'
                                : 'from-blue-900/40 to-sky-800/20 border-blue-700/30'
                            } px-3 py-2 rounded-lg border`}>
                            <div className="flex items-center">
                              <span className={`${
                                schedule.mode === 'Mock'
                                  ? 'text-emerald-400'
                                  : schedule.mode === 'Seminar'
                                    ? 'text-amber-400'
                                    : 'text-sky-400'
                                } text-sm font-medium mr-2`}>Grade:</span>
                              <span className="text-base font-semibold text-white">{schedule.grade}</span>
                            </div>
                          </div>
                          
                          <div className={`bg-gradient-to-br ${
                            schedule.mode === 'Mock'
                              ? 'from-emerald-900/40 to-green-800/20 border-emerald-700/30'
                              : schedule.mode === 'Seminar'
                                ? 'from-amber-900/40 to-yellow-800/20 border-amber-700/30'
                                : 'from-blue-900/40 to-sky-800/20 border-blue-700/30'
                            } px-3 py-2 rounded-lg border`}>
                            <div className="flex items-center">
                              <span className={`${
                                schedule.mode === 'Mock'
                                  ? 'text-emerald-400'
                                  : schedule.mode === 'Seminar'
                                    ? 'text-amber-400'
                                    : 'text-cyan-400'
                                } text-sm font-medium mr-2`}>Curriculum:</span>
                              <span className="text-base font-semibold text-white">{schedule.curriculum}</span>
                            </div>
                          </div>
                          
                          {/* Room information if available */}
                          {schedule.room && (
                            <div className={`bg-gradient-to-br ${
                              schedule.mode === 'Mock'
                                ? 'from-emerald-900/40 to-green-800/20 border-emerald-700/30'
                                : schedule.mode === 'Seminar'
                                  ? 'from-amber-900/40 to-yellow-800/20 border-amber-700/30'
                                  : 'from-blue-900/40 to-sky-800/20 border-blue-700/30'
                              } px-3 py-2 rounded-lg border`}>
                              <div className="flex items-center">
                                <span className={`${
                                  schedule.mode === 'Mock'
                                    ? 'text-emerald-400'
                                    : schedule.mode === 'Seminar'
                                      ? 'text-amber-400'
                                      : 'text-blue-400'
                                  } text-sm font-medium mr-2`}>Classroom:</span>
                                <span className="text-base font-semibold text-white">{schedule.room}</span>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Description - more prominent */}
                        {schedule.description?.replace(/\nREPEAT$/, '').replace(/\nDATE:[0-9/]+$/, '') && (
                          <div className="mt-4">
                            <div className="p-3 bg-gradient-to-br from-gray-900/60 to-gray-800/40 rounded-lg border border-gray-800/70">
                              <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
                                {schedule.description?.replace(/\nREPEAT$/, '').replace(/\nDATE:[0-9/]+$/, '')}
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {/* Progress bar */}
                        <div className="mt-5">
                          <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>Progress</span>
                            <span>{getClassProgress(schedule)}%</span>
                          </div>
                          <div className="w-full h-2 bg-gray-800/70 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${
                                schedule.mode === 'Mock'
                                  ? 'bg-emerald-500'
                                  : schedule.mode === 'Seminar'
                                    ? 'bg-amber-500'
                                    : 'bg-blue-500'
                              } rounded-full`}
                              style={{ width: `${getClassProgress(schedule)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Calendar Events Section */}
            {settings?.show_classes && events.length > 0 && (
              <div className="p-4 border-b border-gray-800/50">
                <h2 className="text-lg font-semibold text-blue-400 mb-4">Today's Events</h2>
                <div className="space-y-3">
                  {events.map(event => (
                    <div key={event.id} className="bg-gray-900/80 p-3 rounded-lg border border-gray-800/50">
                      <h3 className="text-white font-semibold mb-1">{event.title}</h3>
                      <p className="text-gray-400 text-sm line-clamp-3">{event.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* News Section */}
            {settings?.show_news && news.length > 0 && (
              <div className="p-4">
                <h2 className="text-lg font-semibold text-purple-400 mb-4">Latest News</h2>
                <div className="space-y-3">
                  {news.map(item => (
                    <div key={item.id} className="bg-gray-900/80 p-3 rounded-lg border border-gray-800/50">
                      <h3 className="text-white font-semibold mb-1">{item.title}</h3>
                      <p className="text-gray-400 text-sm line-clamp-3">{item.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PresentationView; 