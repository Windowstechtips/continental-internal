import React, { useState, useEffect, Fragment } from 'react';
import { supabase } from '../lib/supabase';
import { format, startOfWeek, addDays, isSameDay, addWeeks, subWeeks } from 'date-fns';
import { PlusIcon, ChevronLeftIcon, ChevronRightIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

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

interface NewSchedule {
  teacher_id: number;
  day: string;
  start_time: string;
  end_time: string;
  grade: string;
  curriculum: string;
  repeats: boolean;
  date_tag: string;
  subject: string;
  description: string;
  room: string | null;
}

const HOURS = Array.from({ length: 18 }, (_, i) => i + 7); // 7 AM to 12 AM (midnight)
const GRADES = ['Grade 9', 'Grade 10'];
const CURRICULUMS = ['Edexcel', 'Cambridge'];

export default function TeacherSchedule() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [newSchedule, setNewSchedule] = useState<NewSchedule>({
    teacher_id: 0,
    day: format(new Date(), 'EEEE'), // e.g., "Monday"
    start_time: '08:00',
    end_time: '09:00',
    grade: 'Grade 9',
    curriculum: '',
    repeats: false,
    date_tag: format(new Date(), 'yyyy-MM-dd'),
    subject: '',
    description: '',
    room: null
  });

  // Get the current week's start date (Monday)
  const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Fetch teachers and schedules
  useEffect(() => {
    fetchData();
  }, [currentDate, selectedTeacher]);

  async function fetchData() {
    try {
      setLoading(true);

      // Fetch teachers
      const { data: teachersData, error: teachersError } = await supabase
        .from('teachers')
        .select('*');

      if (teachersError) throw teachersError;
      setTeachers(teachersData || []);

      // If no teacher is selected and we have teachers, select the first one
      if (!selectedTeacher && teachersData && teachersData.length > 0) {
        setSelectedTeacher(teachersData[0]);
      }

      // Fetch schedules for the selected teacher
      if (selectedTeacher) {
        // Get all teachers with the same name
        const teachersWithSameName = teachersData.filter(t => t.name === selectedTeacher.name);
        
        if (teachersWithSameName.length > 1) {
          // If there are multiple teachers with the same name, fetch schedules for all of them
          await fetchSchedulesForTeachers(teachersWithSameName);
        } else {
          // Otherwise, just fetch schedules for the selected teacher
          const startOfWeekDate = startOfWeek(currentDate, { weekStartsOn: 1 });
          const formattedDate = format(startOfWeekDate, 'yyyy-MM-dd');

          // Simplified query to avoid OR filter issues
          const { data: schedulesData, error: schedulesError } = await supabase
            .from('class_schedules')
            .select('*, teachers(*)')
            .eq('teacher_id', selectedTeacher.id)
            .order('start_time');

          if (schedulesError) throw schedulesError;
          setSchedules(schedulesData || []);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data. Please try again.');
      setLoading(false);
    }
  }

  // Format time from 24h to 12h format
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes} ${ampm}`;
  };

  // Convert hour number to time string (e.g., 9 -> "09:00")
  const hourToTimeString = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  // Handle week navigation
  const goToPreviousWeek = () => {
    setCurrentDate(subWeeks(currentDate, 1));
  };

  const goToNextWeek = () => {
    setCurrentDate(addWeeks(currentDate, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Handle cell click to open add schedule modal
  const handleCellClick = (day: Date, hour: number) => {
    setSelectedDay(day);
    setSelectedHour(hour);
    
    if (!selectedTeacher) {
      setError('Please select a teacher first');
      return;
    }
    
    // Pre-fill the new schedule form
    setNewSchedule({
      ...newSchedule,
      teacher_id: selectedTeacher.id,
      day: format(day, 'EEEE'), // e.g., "Monday"
      date_tag: format(day, 'yyyy-MM-dd'),
      start_time: hourToTimeString(hour),
      end_time: hourToTimeString(hour + 1),
      subject: selectedTeacher.subject // Use the teacher's assigned subject
    });
    
    setIsAddModalOpen(true);
  };

  // Handle adding a new schedule
  const handleAddSchedule = async () => {
    try {
      if (!selectedTeacher) {
        setError('Please select a teacher');
        return;
      }

      // Validate required fields
      if (!newSchedule.grade || !newSchedule.start_time || !newSchedule.end_time) {
        setError('Please fill in all required fields (Grade, Start Time, End Time)');
        return;
      }

      // Format the data for insertion
      const scheduleData = {
        teacher_id: selectedTeacher.id,
        day: newSchedule.day,
        start_time: newSchedule.start_time,
        end_time: newSchedule.end_time,
        grade: newSchedule.grade,
        curriculum: newSchedule.curriculum || '',
        repeats: newSchedule.repeats,
        date_tag: newSchedule.date_tag,
        subject: selectedTeacher.subject, // Always use the teacher's subject
        description: newSchedule.description || '',
        room: newSchedule.room || null
      };

      console.log('Inserting schedule data:', scheduleData);

      // Try inserting without .select() to simplify the query
      const { error: insertError } = await supabase
        .from('class_schedules')
        .insert(scheduleData);

      if (insertError) {
        console.error('Insert error details:', insertError);
        setError(`Failed to add schedule: ${insertError.message}`);
        return;
      }

      console.log('Schedule added successfully');
      
      // Close modal and refresh data
      setIsAddModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Error adding schedule:', error);
      setError(`Failed to add schedule: ${error?.message || 'Unknown error'}`);
    }
  };

  // Check if a schedule falls on a specific day and hour
  const getSchedulesForDayAndHour = (day: Date, hour: number) => {
    const dayString = format(day, 'EEEE');
    const dateString = format(day, 'yyyy-MM-dd');
    
    return schedules.filter(schedule => {
      // Check if schedule is for this day (either by day of week for repeating or by date)
      const isDayMatch = 
        (schedule.repeats && schedule.day === dayString) || 
        (!schedule.repeats && schedule.date_tag === dateString);
      
      // Check if schedule is canceled for this date
      const isCanceled = schedule.canceled_dates?.includes(dateString);
      
      if (!isDayMatch || isCanceled) return false;
      
      // Check if this hour is the starting hour of the schedule
      const scheduleStartHour = parseInt(schedule.start_time.split(':')[0], 10);
      
      // Only show the schedule at its starting hour
      return hour === scheduleStartHour;
    });
  };

  // Calculate the height of a schedule card based on its duration
  const calculateScheduleHeight = (startTime: string, endTime: string) => {
    const startHour = parseInt(startTime.split(':')[0], 10);
    const startMinute = parseInt(startTime.split(':')[1], 10);
    const endHour = parseInt(endTime.split(':')[0], 10);
    const endMinute = parseInt(endTime.split(':')[1], 10);
    
    // Calculate duration in hours, including partial hours
    let duration = 0;
    
    if (endHour > startHour || (endHour === startHour && endMinute > startMinute)) {
      // Same day
      duration = (endHour - startHour) + (endMinute - startMinute) / 60;
    } else {
      // Next day (e.g., 23:00 to 01:00)
      duration = (endHour + 24 - startHour) + (endMinute - startMinute) / 60;
    }
    
    // Each hour cell is 80px tall
    return `${Math.max(duration * 80 - 2, 78)}px`; // Ensure minimum height and account for borders
  };

  // Handle schedule card click to show details
  const handleScheduleClick = (schedule: Schedule, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the cell click
    setSelectedSchedule(schedule);
    setIsDetailModalOpen(true);
  };

  // Render schedule cell content
  const renderScheduleCell = (day: Date, hour: number) => {
    const matchingSchedules = getSchedulesForDayAndHour(day, hour);
    
    if (matchingSchedules.length === 0) {
      return (
        <div 
          className="h-full w-full flex items-center justify-center cursor-pointer opacity-0 hover:opacity-100 transition-opacity"
        >
          <PlusIcon className="h-5 w-5 text-gray-400" />
        </div>
      );
    }
    
    return (
      <div className="h-full w-full overflow-visible">
        {matchingSchedules.map(schedule => {
          const height = calculateScheduleHeight(schedule.start_time, schedule.end_time);
          return (
            <div 
              key={schedule.id}
              className="absolute inset-x-1 p-3 rounded bg-blue-500/20 border border-blue-500/30 text-xs cursor-pointer hover:bg-blue-500/30 transition-colors group"
              style={{ 
                height: height, 
                zIndex: 10,
                overflow: 'hidden', // Remove scrollbar
                top: '1px',
                left: '1px',
                right: '1px',
                width: 'calc(100% - 2px)'
              }}
              onClick={(e) => handleScheduleClick(schedule, e)}
            >
              <div className="flex justify-between items-start">
                <div className="font-medium text-sm mb-1">{schedule.subject}</div>
                <div className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="text-xs text-gray-300 mb-1">{schedule.teachers?.name || 'Unknown Teacher'}</div>
              <div className="text-xs mb-1">
                <span className="text-gray-200">{schedule.grade}</span>
                {schedule.room && <span className="text-gray-400"> - Room {schedule.room}</span>}
              </div>
              <div className="text-gray-300 text-xs">
                {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
              </div>
              {schedule.description && (
                <div className="mt-2 text-gray-400 text-xs line-clamp-2">
                  {schedule.description}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Go back to dashboard
  const handleBackToDashboard = () => {
    window.location.href = '/dashboard';
  };
  
  // Handle teacher logout
  const handleLogout = () => {
    localStorage.removeItem('isTeacherAuthenticated');
    localStorage.removeItem('teacherId');
    localStorage.removeItem('teacherName');
    window.location.href = '/teacher-login';
  };
  
  // Get teacher info from localStorage
  const teacherName = localStorage.getItem('teacherName') || 'Teacher';
  const teacherId = localStorage.getItem('teacherId');
  
  // Group teachers by name for display
  const [teacherGroups, setTeacherGroups] = useState<{ 
    name: string; 
    subjects: string[]; 
    ids: number[]; 
    teachers: Teacher[] 
  }[]>([]);
  
  // Group teachers by name
  useEffect(() => {
    const groups: { 
      name: string; 
      subjects: string[]; 
      ids: number[]; 
      teachers: Teacher[] 
    }[] = [];
    
    const nameMap: { [key: string]: { 
      name: string; 
      subjects: string[]; 
      ids: number[]; 
      teachers: Teacher[] 
    } } = {};
    
    teachers.forEach(teacher => {
      if (!nameMap[teacher.name]) {
        nameMap[teacher.name] = {
          name: teacher.name,
          subjects: [],
          ids: [],
          teachers: []
        };
        groups.push(nameMap[teacher.name]);
      }
      
      nameMap[teacher.name].subjects.push(teacher.subject);
      nameMap[teacher.name].ids.push(teacher.id);
      nameMap[teacher.name].teachers.push(teacher);
    });
    
    setTeacherGroups(groups);
  }, [teachers]);
  
  // If teacherId is available, use it to filter schedules for this specific teacher
  useEffect(() => {
    if (teacherId) {
      const teacher = teachers.find(t => t.id.toString() === teacherId);
      if (teacher) {
        setSelectedTeacher(teacher);
        
        // Also select all teachers with the same name
        const teachersWithSameName = teachers.filter(t => t.name === teacher.name);
        if (teachersWithSameName.length > 1) {
          // If there are multiple teachers with the same name, we need to fetch schedules for all of them
          fetchSchedulesForTeachers(teachersWithSameName);
        }
      }
    }
  }, [teachers, teacherId]);
  
  // Fetch schedules for multiple teachers with the same name
  const fetchSchedulesForTeachers = async (teachersList: Teacher[]) => {
    try {
      setLoading(true);
      
      const teacherIds = teachersList.map(t => t.id);
      
      // Fetch schedules for all teachers with the same name
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('class_schedules')
        .select('*, teachers(*)')
        .in('teacher_id', teacherIds)
        .order('start_time');
      
      if (schedulesError) throw schedulesError;
      setSchedules(schedulesData || []);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching schedules for multiple teachers:', error);
      setError('Failed to load schedules. Please try again.');
      setLoading(false);
    }
  };

  // Calculate the position of the current time line
  const calculateTimeLinePosition = () => {
    const now = currentTime;
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    // Calculate position as percentage of the day (24 hours)
    // But we only show from 7 AM to 12 AM (midnight) (18 hours)
    // So we need to adjust the calculation
    
    // First, check if current time is within our displayed hours
    if (hours < 7 || hours >= 24) {
      return null; // Don't show the line if outside displayed hours
    }
    
    // Calculate how many hours and minutes have passed since 7 AM
    const hoursSince7AM = hours - 7;
    const minutePercentage = minutes / 60;
    
    // Each hour cell is 80px tall
    return (hoursSince7AM + minutePercentage) * 80;
  };
  
  // Reference to the calendar container for scrolling
  const calendarRef = React.useRef<HTMLDivElement>(null);
  
  // Scroll to current time when component mounts or time changes
  useEffect(() => {
    const scrollToCurrentTime = () => {
      const timeLinePosition = calculateTimeLinePosition();
      
      if (timeLinePosition !== null && calendarRef.current) {
        // Scroll to the time line position with some offset to center it
        const offset = window.innerHeight / 3; // Show 1/3 of the screen above the current time
        calendarRef.current.scrollTop = Math.max(0, timeLinePosition - offset);
      }
    };
    
    // Scroll on mount and when time changes
    scrollToCurrentTime();
    
    // Also scroll when the component is fully loaded
    if (!loading) {
      setTimeout(scrollToCurrentTime, 500);
    }
  }, [currentTime, loading]);
  
  // Check if the current day is visible in the current week view
  const isCurrentDayVisible = () => {
    const today = new Date();
    const endDate = addDays(startDate, 6);
    return today >= startDate && today <= endDate;
  };

  return (
    <div className="min-h-screen text-gray-200 flex flex-col">
      {/* Fixed background gradient that covers the entire page */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#0a0a0a] to-[#111827] -z-10"></div>
      
      {/* Subtle pattern overlay */}
      <div className="fixed inset-0 bg-noise opacity-[0.03] mix-blend-overlay -z-10"></div>
      
      <div className="max-w-7xl mx-auto px-4 py-8 w-full flex-1 flex flex-col relative z-0" style={{ minHeight: '100vh' }}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBackToDashboard}
              className="flex items-center text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-1" />
              Back to Dashboard
            </button>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-sky-500 bg-clip-text text-transparent">
              Teacher Schedule
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex flex-col">
              <label htmlFor="teacher-select" className="block text-sm font-medium text-gray-400 mb-1">
                Select Teacher
              </label>
              <select
                id="teacher-select"
                value={selectedTeacher?.id || ''}
                onChange={(e) => {
                  const teacherId = parseInt(e.target.value);
                  const teacher = teachers.find(t => t.id === teacherId) || null;
                  setSelectedTeacher(teacher);
                }}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="" disabled>Select a teacher</option>
                {teacherGroups.map((group) => (
                  <option key={group.name} value={group.teachers[0].id}>
                    {group.name} - {group.subjects.join(', ')}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={goToPreviousWeek}
              className="p-2 rounded-full hover:bg-gray-800 transition-colors"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            
            <button
              onClick={goToToday}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              Today
            </button>
            
            <button
              onClick={goToNextWeek}
              className="p-2 rounded-full hover:bg-gray-800 transition-colors"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
            
            <h2 className="text-xl font-semibold">
              {format(startDate, 'MMMM d')} - {format(addDays(startDate, 6), 'MMMM d, yyyy')}
            </h2>
          </div>
          
          {isCurrentDayVisible() && (
            <button
              onClick={() => {
                const timeLinePosition = calculateTimeLinePosition();
                if (timeLinePosition !== null && calendarRef.current) {
                  const offset = window.innerHeight / 3;
                  calendarRef.current.scrollTop = Math.max(0, timeLinePosition - offset);
                }
              }}
              className="px-3 py-1.5 bg-red-500/20 text-red-300 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors text-sm flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Current Time
            </button>
          )}
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-300">
            {error}
          </div>
        ) : (
          <div className="bg-gray-900/20 border border-gray-800 rounded-xl overflow-hidden flex-1 flex flex-col backdrop-blur-sm">
            {/* Calendar header - days of the week */}
            <div className="grid grid-cols-8 border-b border-gray-800 sticky top-0 bg-gray-900/90 backdrop-blur-sm z-20">
              <div className="p-3 text-center text-gray-500 border-r border-gray-800">
                Hour
              </div>
              {Array.from({ length: 7 }, (_, i) => {
                const day = addDays(startDate, i);
                return (
                  <div 
                    key={i} 
                    className={`p-3 text-center font-medium ${
                      isSameDay(day, new Date()) ? 'bg-blue-900/20 text-blue-300' : ''
                    }`}
                  >
                    <div>{format(day, 'EEE')}</div>
                    <div className="text-xl">{format(day, 'd')}</div>
                  </div>
                );
              })}
            </div>
            
            {/* Calendar body - hours and schedule cells */}
            <div 
              className="grid grid-cols-8 flex-1 overflow-y-auto relative custom-scrollbar" 
              ref={calendarRef}
              style={{
                minHeight: '500px'
              }}
            >
              {/* Current time line */}
              {isSameDay(currentTime, new Date()) && calculateTimeLinePosition() !== null && (
                <div 
                  className="absolute left-0 right-0 border-t-2 border-red-500 z-30 flex items-center pointer-events-none"
                  style={{ 
                    top: `${calculateTimeLinePosition()}px`,
                    boxShadow: '0 0 8px rgba(239, 68, 68, 0.6), 0 0 4px rgba(239, 68, 68, 0.8)'
                  }}
                >
                  <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-r-sm shadow-lg flex items-center">
                    <div className="w-2 h-2 rounded-full bg-white mr-1 animate-pulse"></div>
                    {format(currentTime, 'h:mm a')}
                  </div>
                  <div className="absolute right-0 w-2 h-2 rounded-full bg-red-500 shadow-lg"></div>
                </div>
              )}
              
              {HOURS.map(hour => (
                <Fragment key={hour}>
                  {/* Hour label */}
                  <div className="p-2 text-center text-sm text-gray-500 border-r border-gray-800 border-b border-gray-800 h-20 flex items-center justify-center sticky left-0 bg-gray-900/90 backdrop-blur-sm">
                    {hour === 0 ? '12 AM' : 
                     hour === 12 ? '12 PM' : 
                     hour === 24 ? '12 AM' : 
                     hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                  </div>
                  
                  {/* Schedule cells for each day */}
                  {Array.from({ length: 7 }, (_, i) => {
                    const day = addDays(startDate, i);
                    return (
                      <div 
                        key={i} 
                        className={`h-20 p-0 border-b border-gray-800 ${
                          i < 6 ? 'border-r border-gray-800' : ''
                        } ${
                          isSameDay(day, new Date()) ? 'bg-blue-900/10' : 'bg-transparent'
                        } relative`}
                        onClick={() => handleCellClick(day, hour)}
                      >
                        {renderScheduleCell(day, hour)}
                      </div>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Simple Modal Implementation */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center">
            <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" onClick={() => setIsAddModalOpen(false)}></div>
            
            <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-gray-900 shadow-xl rounded-2xl border border-gray-800 relative z-20">
              <h3 className="text-lg font-medium leading-6 text-white mb-4">
                Schedule a Class
                {selectedDay && (
                  <span className="block text-sm text-gray-400 mt-1">
                    {format(selectedDay, 'EEEE, MMMM d, yyyy')} at {selectedHour}:00
                  </span>
                )}
              </h3>
              
              {/* Teacher Information */}
              {selectedTeacher && (
                <div className="mb-4 p-3 bg-blue-900/20 border border-blue-800/30 rounded-lg">
                  <div className="font-medium text-blue-300">{selectedTeacher.name}</div>
                  <div className="text-sm text-gray-300">Subject: {selectedTeacher.subject}</div>
                </div>
              )}
              
              <div className="mt-4 space-y-4">
                {/* Grade */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Grade
                  </label>
                  <select
                    value={newSchedule.grade}
                    onChange={(e) => setNewSchedule({ ...newSchedule, grade: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {GRADES.map(grade => (
                      <option key={grade} value={grade}>
                        {grade}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Curriculum */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Curriculum
                  </label>
                  <select
                    value={newSchedule.curriculum}
                    onChange={(e) => setNewSchedule({ ...newSchedule, curriculum: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a curriculum</option>
                    {CURRICULUMS.map(curriculum => (
                      <option key={curriculum} value={curriculum}>
                        {curriculum}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Room */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Room
                  </label>
                  <input
                    type="text"
                    value={newSchedule.room || ''}
                    onChange={(e) => setNewSchedule({ ...newSchedule, room: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Room number"
                  />
                </div>
                
                {/* Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={newSchedule.start_time}
                      onChange={(e) => setNewSchedule({ ...newSchedule, start_time: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={newSchedule.end_time}
                      onChange={(e) => setNewSchedule({ ...newSchedule, end_time: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newSchedule.description}
                    onChange={(e) => setNewSchedule({ ...newSchedule, description: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Class description"
                  />
                </div>
                
                {/* Repeats */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="repeats"
                    checked={newSchedule.repeats}
                    onChange={(e) => setNewSchedule({ ...newSchedule, repeats: e.target.checked })}
                    className="h-4 w-4 text-blue-500 focus:ring-blue-500 border-gray-700 rounded"
                  />
                  <label htmlFor="repeats" className="ml-2 block text-sm text-gray-400">
                    Repeats weekly
                  </label>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
                  onClick={handleAddSchedule}
                >
                  Schedule Class
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Detail Modal */}
      {isDetailModalOpen && selectedSchedule && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center">
            <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" onClick={() => setIsDetailModalOpen(false)}></div>
            
            <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-gray-900 shadow-xl rounded-2xl border border-gray-800 relative z-20">
              <h3 className="text-xl font-bold text-white mb-2 bg-gradient-to-r from-blue-400 to-sky-500 bg-clip-text text-transparent">
                {selectedSchedule.subject}
              </h3>
              
              <div className="mt-4 space-y-4">
                {/* Teacher Information */}
                <div className="p-3 bg-blue-900/20 border border-blue-800/30 rounded-lg">
                  <div className="font-medium text-blue-300">{selectedSchedule.teachers?.name || 'Unknown Teacher'}</div>
                  <div className="text-sm text-gray-300">Subject: {selectedSchedule.subject}</div>
                </div>
                
                {/* Schedule Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-400">Day</div>
                    <div className="text-white">{selectedSchedule.day}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-400">Date</div>
                    <div className="text-white">{selectedSchedule.date_tag}</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-400">Time</div>
                    <div className="text-white">
                      {formatTime(selectedSchedule.start_time)} - {formatTime(selectedSchedule.end_time)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-400">Repeats</div>
                    <div className="text-white">{selectedSchedule.repeats ? 'Yes' : 'No'}</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-400">Grade</div>
                    <div className="text-white">{selectedSchedule.grade}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-400">Room</div>
                    <div className="text-white">{selectedSchedule.room || 'No Room Assigned'}</div>
                  </div>
                </div>
                
                <div>
                  <div className="text-sm font-medium text-gray-400">Curriculum</div>
                  <div className="text-white">{selectedSchedule.curriculum || 'Not specified'}</div>
                </div>
                
                {selectedSchedule.description && (
                  <div>
                    <div className="text-sm font-medium text-gray-400">Description</div>
                    <div className="text-white mt-1 p-3 bg-gray-800/50 rounded-lg">
                      {selectedSchedule.description}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                  onClick={() => setIsDetailModalOpen(false)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
                  onClick={() => {
                    // Here you could implement edit functionality
                    setIsDetailModalOpen(false);
                    // Open edit modal or implement inline editing
                  }}
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 