import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon, MapPinIcon, AcademicCapIcon, ClockIcon, BookOpenIcon, HomeIcon, PlusIcon, PencilIcon, UserIcon } from '@heroicons/react/24/outline';

interface Teacher {
  id: number;
  name: string;
  subject: string;
}

interface TeacherWithSubjects {
  id: number;
  name: string;
  subjects: string[];
}

interface Schedule {
  id: number;
  teacher_id: number;
  day: string;
  start_time: string;
  end_time: string;
  room: string;
  mode: string;
  grade: string;
  curriculum: string;
  date_tag: string;
  repeats: boolean;
  subject: string;
  teachers: Teacher;
  canceled_dates?: string[];
  description: string;
}

// New interface for scheduling
interface ScheduleFormData {
  subject: string;
  grade: string;
  curriculum: string;
  room: string;
  mode: string;
  teacher_id: number;
  day: string;
  start_time: string;
  end_time: string;
  repeats: boolean;
  date_tag: string;
  description: string;
}

const HOURS = Array.from({ length: 18 }, (_, i) => i + 7); // 7 AM to 12 AM (midnight)

export default function TeacherSchedule() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);
  const [isMobileView, setIsMobileView] = useState(false);
  const [mobileStartDate, setMobileStartDate] = useState(new Date()); // For mobile view dates
  const [showAllSchedules, setShowAllSchedules] = useState(true); // State for showing all schedules, default to true
  
  // New states for context menu
  const [contextMenu, setContextMenu] = useState<{
    show: boolean;
    x: number;
    y: number;
    day: Date;
    hour: number;
  } | null>(null);
  
  // New states for scheduling
  const [canSchedule, setCanSchedule] = useState(false);
  const [isSchedulingModalOpen, setIsSchedulingModalOpen] = useState(false);
  const [schedulingFormData, setSchedulingFormData] = useState<ScheduleFormData>({
    subject: '',
    grade: 'Grade 9',
    curriculum: 'Edexcel',
    room: '',
    mode: 'Class', // Changed from 'Online' to 'Class'
    teacher_id: 0,
    day: '',
    start_time: '',
    end_time: '',
    repeats: true,
    date_tag: '',
    description: ''
  });
  const [selectedScheduleDay, setSelectedScheduleDay] = useState<Date | null>(null);
  const [selectedScheduleHour, setSelectedScheduleHour] = useState<number | null>(null);
  
  // States for deletion options
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'cancel' | 'delete' | null>(null);

  // State for edit mode
  const [isEditMode, setIsEditMode] = useState(false);

  // Get the current week's start date (Monday)
  const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });

  // Check if user came from homepage/dashboard (can schedule) or login page (cannot schedule)
  useEffect(() => {
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    setCanSchedule(isAuthenticated);
  }, []);

  // Check if the screen is in mobile view
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    handleResize(); // Initialize on component mount
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Initialize mobile start date to current day
  useEffect(() => {
    setMobileStartDate(new Date());
  }, []);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Add background styling effect
  useEffect(() => {
    document.body.classList.add('bg-gradient-to-br', 'from-[#0a0a0a]', 'to-[#111827]');
    
    return () => {
      document.body.classList.remove('bg-gradient-to-br', 'from-[#0a0a0a]', 'to-[#111827]');
    };
  }, []);

  // Add overflow hidden to body when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [isModalOpen]);

  // Scroll to current time on initial load and when time changes
  useEffect(() => {
    if (!loading && tableRef.current) {
      const currentTimePos = getCurrentTimePosition();
      if (currentTimePos) {
        // Find the current hour row and calculate its position
        const hourRows = tableRef.current.querySelectorAll('tbody tr');
        const currentHourRow = hourRows[currentTimePos.rowIndex];
        
        if (currentHourRow) {
          // Calculate position to scroll to (current hour row - some offset to center it)
          const rowTop = (currentHourRow as HTMLElement).offsetTop;
          // Get container height to center the time line
          const containerHeight = tableRef.current.clientHeight;
          const scrollPosition = rowTop - containerHeight / 2 + 30; // 30px offset to position the line in the middle
          
          // Scroll to the calculated position
          tableRef.current.scrollTop = scrollPosition;
        }
      }
    }
  }, [loading, currentTime]);

  // Start timer to update current time and fetch data when filters change
  useEffect(() => {
    fetchData();
    
    // Start timer to update current time line
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    
    return () => clearInterval(timer);
  }, [currentDate, selectedTeacher, selectedSubject, showAllSchedules]);
  
  // Log schedules with canceled dates when they change
  useEffect(() => {
    const schedulesWithCanceledDates = schedules.filter(
      schedule => schedule.canceled_dates && schedule.canceled_dates.length > 0
    );
    
    if (schedulesWithCanceledDates.length > 0) {
      console.log('Schedules with canceled dates:', schedulesWithCanceledDates);
    }
  }, [schedules]);

  async function fetchData() {
    try {
      setLoading(true);

      // Fetch teachers
      const { data: teachersData, error: teachersError } = await supabase
        .from('teachers')
        .select('*');

      if (teachersError) throw teachersError;
      setTeachers(teachersData || []);

      // Fetch schedules for the selected teacher or all schedules
      let query = supabase.from('class_schedules').select('*, teachers(*)');
      
      if (selectedTeacher && !showAllSchedules) {
        query = query.eq('teacher_id', selectedTeacher.id);
      }
      
      const { data: schedulesData, error: schedulesError } = await query.order('start_time');
      
      if (schedulesError) throw schedulesError;
      setSchedules(schedulesData || []);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      setError('Failed to load schedules. Please try again.');
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

  // Handle week navigation
  const goToPreviousWeek = () => {
    setCurrentDate(subWeeks(currentDate, 1));
  };

  const goToNextWeek = () => {
    setCurrentDate(addWeeks(currentDate, 1));
  };

  // Handle mobile day navigation
  const goToPreviousDay = () => {
    setMobileStartDate(prevDate => addDays(prevDate, -1));
  };

  const goToNextDay = () => {
    setMobileStartDate(prevDate => addDays(prevDate, 1));
  };

  // Check if a schedule falls on a specific day and hour
  const getSchedulesForDayAndHour = (day: Date, hour: number) => {
    const dayString = format(day, 'EEEE');
    const dateString = format(day, 'yyyy-MM-dd');
    // Format for canceled_dates array (M/d format)
    const cancelDateString = format(day, 'M/d');
    
    return schedules.filter(schedule => {
      // Check if this date is in the canceled_dates array
      if (schedule.canceled_dates && schedule.canceled_dates.includes(cancelDateString)) {
        return false; // Skip this schedule as it's canceled for this date
      }
      
      const isDayMatch = 
        (schedule.repeats && schedule.day === dayString) || 
        (!schedule.repeats && schedule.date_tag === dateString);
      
      if (!isDayMatch) return false;
      
      const scheduleStartHour = parseInt(schedule.start_time.split(':')[0]);
      return scheduleStartHour === hour;
    });
  };

  // Calculate schedule height based on duration
  const calculateScheduleHeight = (startTime: string, endTime: string) => {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    const durationMinutes = endMinutes - startMinutes;
    
    // Add a small gap between cells (2px)
    return `calc(${(durationMinutes / 60) * 100}% - 2px)`;
  };

  // Calculate the top position of a schedule based on its start time minutes
  const calculateScheduleTop = (startTime: string) => {
    const [, startMinute] = startTime.split(':').map(Number);
    return `${(startMinute / 60) * 100}%`;
  };

  // Calculate schedule duration in minutes
  const calculateScheduleDuration = (startTime: string, endTime: string) => {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    return endMinutes - startMinutes;
  };

  // Calculate the position of the current time line
  const getCurrentTimePosition = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    
    // Calculate position as percentage of the hour
    const position = (currentMinutes / 60) * 100;
    
    // Find the row index for the current hour
    let rowIndex = HOURS.findIndex(hour => hour === currentHour);
    
    // If current hour is before our schedule range (before 7 AM), show at first row (7 AM)
    if (currentHour < HOURS[0]) {
      rowIndex = 0;
      return {
        rowIndex,
        position: 0, // Position at the top of the row
        formattedTime: format(now, 'h:mm a') // Add formatted current time
      };
    }
    
    // If current hour is not in our schedule range (after midnight), return null
    if (rowIndex === -1 && currentHour >= HOURS[HOURS.length - 1] + 1) {
      return null;
    }
    
    return {
      rowIndex,
      position,
      formattedTime: format(now, 'h:mm a') // Add formatted current time
    };
  };

  // Handle card click
  const handleCardClick = (schedule: Schedule, day: Date) => {
    setSelectedSchedule(schedule);
    setSelectedScheduleDay(day);
    setIsModalOpen(true);
  };

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedSchedule(null);
  };

  // Handle delete button click
  const handleDeleteClick = (mode: 'cancel' | 'delete') => {
    setDeleteMode(mode);
    setIsSchedulingModalOpen(false); // Close the scheduling modal
    setIsConfirmDeleteOpen(true); // Open the confirmation modal
  };

  // Close confirm delete modal
  const closeConfirmDelete = () => {
    setIsConfirmDeleteOpen(false);
    setDeleteMode(null);
  };

  // Cancel a specific date for a recurring schedule
  const cancelScheduleForDate = async (schedule: Schedule, date: Date) => {
    if (!schedule || !schedule.id) return;
    
    try {
      // Log various date formats for debugging
      console.log('Date formats for:', date);
      console.log('- M/d:', format(date, 'M/d'));
      console.log('- MM/dd:', format(date, 'MM/dd'));
      console.log('- yyyy-MM-dd:', format(date, 'yyyy-MM-dd'));
      
      // Format the date to match the format in canceled_dates
      // Use MM/dd format (e.g., "5/12" for May 12)
      const dateString = format(date, 'M/d');
      
      console.log('Canceling date:', dateString);
      console.log('Current canceled dates:', schedule.canceled_dates);
      
      // Get current canceled dates or initialize an empty array
      const canceledDates = schedule.canceled_dates || [];
      
      // Add the new date if it's not already included
      if (!canceledDates.includes(dateString)) {
        canceledDates.push(dateString);
      }
      
      console.log('New canceled dates:', canceledDates);
      
      // Update the schedule with the new canceled date
      const { error } = await supabase
        .from('class_schedules')
        .update({ canceled_dates: canceledDates })
        .eq('id', schedule.id);
      
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      // Close modal and refresh data
      closeModal();
      closeConfirmDelete();
      fetchData();
    } catch (error) {
      console.error('Error canceling schedule:', error);
      setError('Failed to cancel class. Please try again.');
    }
  };

  // Delete a schedule completely
  const deleteSchedule = async (schedule: Schedule) => {
    if (!schedule || !schedule.id) return;
    
    try {
      const { error } = await supabase
        .from('class_schedules')
        .delete()
        .eq('id', schedule.id);
      
      if (error) throw error;
      
      // Close modal and refresh data
      closeModal();
      closeConfirmDelete();
      fetchData();
    } catch (error) {
      console.error('Error deleting schedule:', error);
      setError('Failed to delete class. Please try again.');
    }
  };

  // Confirm deletion or cancellation
  const confirmDelete = () => {
    console.log('Confirm delete called. Delete mode:', deleteMode);
    console.log('Selected schedule:', selectedSchedule);
    console.log('Selected day:', selectedScheduleDay);
    
    if (!selectedSchedule) {
      console.error('No schedule selected for deletion/cancellation');
      return;
    }
    
    if (deleteMode === 'cancel') {
      // Cancel for specific date
      if (selectedScheduleDay) {
        console.log('Canceling schedule for date:', format(selectedScheduleDay, 'yyyy-MM-dd'));
        cancelScheduleForDate(selectedSchedule, selectedScheduleDay);
      } else {
        console.error('No day selected for cancellation');
      }
    } else if (deleteMode === 'delete') {
      // Delete entire schedule
      console.log('Deleting entire schedule with ID:', selectedSchedule.id);
      deleteSchedule(selectedSchedule);
    } else {
      console.error('Invalid delete mode:', deleteMode);
    }
  };

  // Get day of schedule
  const getScheduleDay = (schedule: Schedule) => {
    if (schedule.repeats) {
      return schedule.day;
    } else {
      // Format date_tag as Month day, year
      const date = new Date(schedule.date_tag);
      return format(date, 'MMMM d, yyyy');
    }
  };

  // Get available subjects for a teacher
  const getTeacherSubjects = (teacherId: number): string[] => {
    const teacher = teachers.find(t => t.id === teacherId);
    if (!teacher) return [];
    
    // Find all teachers with the same name and collect their subjects
    const teachersWithSameName = teachers.filter(t => t.name === teacher.name);
    const subjects = teachersWithSameName.map(t => t.subject);
    
    return [...new Set(subjects)]; // Return unique subjects
  };
  
  // Handle teacher change in form
  const handleFormTeacherChange = (teacherId: number) => {
    // Get the teacher's subjects
    const subjects = getTeacherSubjects(teacherId);
    
    // In edit mode, try to keep the current subject if the teacher offers it
    if (isEditMode && subjects.includes(schedulingFormData.subject)) {
      setSchedulingFormData({
        ...schedulingFormData,
        teacher_id: teacherId
      });
    } else {
      // Otherwise, select the first subject
      setSchedulingFormData({
        ...schedulingFormData,
        teacher_id: teacherId,
        subject: subjects.length > 0 ? subjects[0] : ''
      });
    }
  };

  // Handle edit button click
  const handleEditClick = (e: React.MouseEvent, schedule: Schedule, day: Date) => {
    e.stopPropagation(); // Prevent opening the detail modal
    
    // Set the schedule data in the form
    setSchedulingFormData({
      subject: schedule.subject,
      grade: schedule.grade,
      curriculum: schedule.curriculum,
      room: schedule.room || '',
      mode: schedule.mode, // Added mode field
      teacher_id: schedule.teacher_id,
      day: schedule.day,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      repeats: schedule.repeats,
      date_tag: schedule.date_tag,
      description: schedule.description || ''
    });
    
    // Set the selected day and hour for the scheduling modal
    const hour = parseInt(schedule.start_time.split(':')[0], 10);
    setSelectedScheduleDay(day);
    setSelectedScheduleHour(hour);
    
    // Set edit mode
    setIsEditMode(true);
    
    // Open the scheduling modal
    setIsSchedulingModalOpen(true);
    
    // Set selected schedule for possible deletion later
    setSelectedSchedule(schedule);
  };

  // Update handleScheduleClick to reset edit mode
  const handleScheduleClick = (day: Date, hour: number) => {
    if (!canSchedule) return;
    
    // Set the selected day and hour
    setSelectedScheduleDay(day);
    setSelectedScheduleHour(hour);
    
    // Format start and end times
    const startTime = `${hour.toString().padStart(2, '0')}:00`;
    const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;
    
    // Format day string (for repeating schedules)
    const dayString = format(day, 'EEEE');
    
    // Format date tag (for non-time schedules)
    const dateTag = format(day, 'yyyy-MM-dd');
    
    // Initialize form data with no teacher selected
    setSchedulingFormData({
      subject: '',
      grade: 'Grade 9',
      curriculum: 'Edexcel',
      room: '',
      mode: 'Class', // Changed from 'Online' to 'Class'
      teacher_id: 0, // No teacher selected
      day: dayString,
      start_time: startTime,
      end_time: endTime,
      repeats: true,
      date_tag: dateTag,
      description: ''
    });
    
    // Reset edit mode
    setIsEditMode(false);
    setSelectedSchedule(null);
    
    // Open the scheduling modal
    setIsSchedulingModalOpen(true);
  };
  
  // Update handleScheduleSubmit to handle both create and edit
  const handleScheduleSubmit = async () => {
    try {
      // Validate teacher selection
      if (!isEditMode && schedulingFormData.teacher_id === 0) {
        setError('Please select a teacher');
        return;
      }

      if (isEditMode && selectedSchedule) {
        // Update existing schedule
        const { error } = await supabase
          .from('class_schedules')
          .update({
            subject: schedulingFormData.subject,
            grade: schedulingFormData.grade,
            curriculum: schedulingFormData.curriculum,
            room: schedulingFormData.room, // Changed to non-nullable
            mode: schedulingFormData.mode, // Added mode field
            teacher_id: schedulingFormData.teacher_id,
            day: schedulingFormData.day,
            start_time: schedulingFormData.start_time,
            end_time: schedulingFormData.end_time,
            repeats: schedulingFormData.repeats,
            date_tag: schedulingFormData.date_tag,
            description: schedulingFormData.description
          })
          .eq('id', selectedSchedule.id);
          
        if (error) throw error;
      } else {
        // Create new schedule
        const { error } = await supabase
          .from('class_schedules')
          .insert([{
            subject: schedulingFormData.subject,
            grade: schedulingFormData.grade,
            curriculum: schedulingFormData.curriculum,
            room: schedulingFormData.room, // Changed to non-nullable
            mode: schedulingFormData.mode, // Added mode field
            teacher_id: schedulingFormData.teacher_id,
            day: schedulingFormData.day,
            start_time: schedulingFormData.start_time,
            end_time: schedulingFormData.end_time,
            repeats: schedulingFormData.repeats,
            date_tag: schedulingFormData.date_tag,
            description: schedulingFormData.description
          }]);
        
        if (error) throw error;
      }
      
      // Close modal and refresh data
      setIsSchedulingModalOpen(false);
      setIsEditMode(false);
      setSelectedSchedule(null);
      setError(null); // Clear any previous errors
      fetchData();
    } catch (error) {
      console.error('Error scheduling class:', error);
      setError('Failed to schedule class. Please try again.');
    }
  };
  
  // Update closeSchedulingModal to reset edit mode
  const closeSchedulingModal = () => {
    setIsSchedulingModalOpen(false);
    setIsEditMode(false);
    setSelectedSchedule(null);
  };

  // Handle context menu
  const handleContextMenu = (e: React.MouseEvent, day: Date, hour: number) => {
    if (!canSchedule) return; // Only show context menu if user can schedule
    
    e.preventDefault(); // Prevent default context menu
    
    // Calculate position, keeping the menu within viewport bounds
    const x = Math.min(e.clientX, window.innerWidth - 200); // 200 is approximate menu width
    const y = Math.min(e.clientY, window.innerHeight - 100); // 100 is approximate menu height
    
    setContextMenu({
      show: true,
      x,
      y,
      day,
      hour
    });
  };

  // Handle clicking outside context menu
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu) {
        setContextMenu(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [contextMenu]);

  // Render schedule cell
  const renderScheduleCell = (day: Date, hour: number) => {
    const schedules = getSchedulesForDayAndHour(day, hour);
    const now = new Date();
    
    return (
      <div 
        className="relative min-h-[60px] bg-gray-800/30 group/cell"
        onContextMenu={(e) => handleContextMenu(e, day, hour)}
      >
        {schedules.map(schedule => {
          // Check if the schedule has finished (either a past day or finished today)
          const isPastDay = day < now && !isSameDay(day, now);
          const isFinishedToday = isSameDay(day, now) && 
            (now.getHours() > parseInt(schedule.end_time.split(':')[0]) || 
             (now.getHours() === parseInt(schedule.end_time.split(':')[0]) && 
              now.getMinutes() >= parseInt(schedule.end_time.split(':')[1])));
          
          const isFinished = isPastDay || isFinishedToday;
          const duration = calculateScheduleDuration(schedule.start_time, schedule.end_time);
          const isSmallCard = duration <= 30; // 30 minutes or less
          
          return (
            <div
              key={schedule.id}
              onClick={() => handleCardClick(schedule, day)}
              className={`absolute inset-x-1 ${
                isFinished 
                  ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' 
                  : schedule.mode === 'Mock'
                    ? 'bg-gradient-to-br from-emerald-600 to-green-500 hover:from-emerald-700 hover:to-green-600 border-emerald-400'
                    : schedule.mode === 'Seminar'
                      ? 'bg-gradient-to-br from-amber-600 to-yellow-500 hover:from-amber-700 hover:to-yellow-600 border-amber-400'
                      : 'bg-gradient-to-br from-blue-600 to-indigo-500 hover:from-blue-700 hover:to-indigo-600 border-blue-400'
              } border rounded-md p-2 text-xs ${
                isFinished ? 'text-gray-400' : 'text-gray-200'
              } shadow-md transition-all duration-200 cursor-pointer transform hover:scale-[1.02] hover:z-20 group group/schedule overflow-hidden`}
              style={{
                height: calculateScheduleHeight(schedule.start_time, schedule.end_time),
                top: calculateScheduleTop(schedule.start_time),
                margin: '1px'
              }}
            >
              {/* Create a colorful accent line at the top of each card */}
              <div className={`absolute top-0 left-0 right-0 h-1 ${
                isFinished ? 'bg-gray-600/60' 
                : schedule.mode === 'Mock'
                  ? 'bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400'
                  : schedule.mode === 'Seminar'
                    ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400'
                    : 'bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400'
              } rounded-t`}></div>

              {/* Edit button - only shown on hover and when user has scheduling rights */}
              {canSchedule && !isSmallCard && (
                <div 
                  className="absolute top-1 right-1 p-1 rounded-full bg-gray-900/70 opacity-0 group-hover/schedule:opacity-100 cursor-pointer transition-all duration-200 hover:bg-blue-600/70 z-10"
                  onClick={(e) => handleEditClick(e, schedule, day)}
                  title="Edit schedule"
                >
                  <PencilIcon className="h-3.5 w-3.5 text-white" />
                </div>
              )}
              
              <div className="flex flex-col h-full relative">
                <div className="flex-1 min-h-0 flex flex-col">
                  {/* Subject title with gradient text */}
                  <div className={`font-bold ${
                    isFinished 
                      ? 'text-gray-400' 
                      : schedule.mode === 'Mock'
                        ? 'text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-green-200'
                        : schedule.mode === 'Seminar'
                          ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-200'
                          : 'text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-sky-200'
                  } text-[clamp(0.75rem,1.2vw,1rem)] leading-tight break-words ${
                    isSmallCard ? 'truncate' : ''
                  }`}>
                    {schedule.subject}
                  </div>
                  
                  {/* Only show additional content if not a small card */}
                  {!isSmallCard && (
                    <>
                      {/* Teacher name */}
                      <div className={`text-[clamp(0.65rem,0.8vw,0.875rem)] font-medium ${
                        isFinished ? 'text-gray-500' : 'text-gray-300'
                      }`}>
                        {schedule.teachers.name}
                      </div>

                      {/* Combined Grade and Curriculum pill */}
                      <div className={`inline-flex items-center rounded-full px-2 py-0.5 text-[clamp(0.65rem,0.8vw,0.875rem)] font-medium min-w-fit ${
                        isFinished
                          ? 'bg-gray-700/60 text-gray-400'
                          : schedule.mode === 'Mock'
                            ? 'bg-emerald-500/20 text-emerald-100'
                            : schedule.mode === 'Seminar'
                              ? 'bg-amber-500/20 text-amber-100'
                              : 'bg-blue-500/20 text-blue-100'
                      } my-1`}>
                        <span className="font-medium">{schedule.grade}</span>
                        <span className="mx-1 opacity-50">•</span>
                        <span className="font-light italic">{schedule.curriculum}</span>
                      </div>

                      {/* Mode */}
                      <div className={`flex items-center mt-1 ${
                        isFinished ? 'text-gray-600' : 'text-gray-400'
                      } text-[clamp(0.65rem,0.8vw,0.875rem)] whitespace-nowrap`}>
                        <span className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs ${
                          isFinished ? 'bg-gray-700 text-gray-400' 
                          : schedule.mode === 'Mock'
                            ? 'bg-emerald-500/20 text-emerald-100'
                            : schedule.mode === 'Seminar'
                              ? 'bg-amber-500/20 text-amber-100'
                              : 'bg-blue-500/20 text-blue-100'
                        }`}>
                          {schedule.mode}
                        </span>
                      </div>
                      
                      {/* Time with eye-catching style */}
                      <div className={`flex items-center mt-1 ${
                        isFinished ? 'text-gray-500' : 'text-gray-300'
                      } text-[clamp(0.65rem,0.8vw,0.875rem)] font-medium whitespace-nowrap`}>
                        <ClockIcon className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
                        <span className={`${isFinished ? '' : 'tracking-wide'}`}>
                          {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                        </span>
                      </div>

                      {/* Room */}
                      {schedule.room && (
                        <div className={`flex items-center mt-1 ${
                          isFinished ? 'text-gray-600' : 'text-gray-400'
                        } text-[clamp(0.65rem,0.8vw,0.875rem)] whitespace-nowrap`}>
                          <MapPinIcon className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
                          <span className="break-words">{schedule.room}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        
        {/* Add scheduling option for empty cells if user has scheduling rights */}
        {canSchedule && schedules.length === 0 && (
          <div 
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div 
              onClick={() => handleScheduleClick(day, hour)}
              className="w-8 h-8 rounded-full bg-gray-800/80 border border-gray-700/50 flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-opacity duration-200 hover:bg-gray-700/80 cursor-pointer pointer-events-auto"
            >
              <PlusIcon className="h-5 w-5 text-blue-400" />
            </div>
          </div>
        )}
      </div>
    );
  };

  // Group teachers by name and collect their subjects
  const teachersWithSubjects = teachers.reduce((acc: TeacherWithSubjects[], teacher) => {
    const existingTeacher = acc.find(t => t.name === teacher.name);
    if (existingTeacher) {
      if (!existingTeacher.subjects.includes(teacher.subject)) {
        existingTeacher.subjects.push(teacher.subject);
      }
    } else {
      acc.push({
        id: teacher.id,
        name: teacher.name,
        subjects: [teacher.subject]
      });
    }
    return acc;
  }, []);

  // Get the selected teacher's subjects
  const selectedTeacherSubjects = selectedTeacher 
    ? teachersWithSubjects.find(t => t.name === selectedTeacher.name)?.subjects || []
    : [];

  // Handle teacher selection
  const handleTeacherSelect = (teacherId: string) => {
    if (showAllSchedules) {
      setShowAllSchedules(false);
    }
    
    const teacher = teachers.find(t => t.id === parseInt(teacherId));
    if (teacher) {
      setSelectedTeacher(teacher);
      // Reset subject selection when teacher changes
      setSelectedSubject(null);
    }
  };

  // Handle "Show All" button click
  const handleShowAllClick = () => {
    setShowAllSchedules(true);
    setSelectedTeacher(null);
    setSelectedSubject(null);
  };

  // Handle subject selection
  const handleSubjectSelect = (subject: string) => {
    setSelectedSubject(subject);
    // Update selected teacher with the chosen subject
    const teacher = teachers.find(t => t.name === selectedTeacher?.name && t.subject === subject);
    if (teacher) {
      setSelectedTeacher(teacher);
    }
  };

  // Handle home button click
  const handleHomeClick = () => {
    // Check if user is authenticated, which means they came from the dashboard
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    
    // If authenticated, send to dashboard, otherwise to login
    if (isAuthenticated) {
      window.location.href = '/dashboard';
    } else {
      // If not authenticated, we assume they came from login page
      window.location.href = '/login';
    }
  };

  return (
    <div className="h-screen w-full bg-[#0a0a0a] flex flex-col overflow-hidden">
      {/* Enhanced background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Primary gradient mesh - larger, more diffused gradients */}
        <div className="absolute -top-[10%] right-[5%] w-[80vw] h-[70vh] bg-gradient-to-bl from-blue-600/8 via-blue-400/5 to-transparent rounded-[100%] filter blur-[80px]"></div>
        <div className="absolute -bottom-[10%] left-[5%] w-[80vw] h-[70vh] bg-gradient-to-tr from-blue-500/8 via-sky-400/5 to-transparent rounded-[100%] filter blur-[80px]"></div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-gray-900 rounded-lg border border-gray-700/50 shadow-xl overflow-hidden"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
        >
          <button
            onClick={() => {
              handleScheduleClick(contextMenu.day, contextMenu.hour);
              setContextMenu(null);
            }}
            className="w-full px-4 py-2 text-left text-gray-200 hover:bg-gray-800 flex items-center space-x-2"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Add Class</span>
          </button>
        </div>
      )}

      <div className="relative z-10 flex flex-col h-full p-4 md:p-6">
        <div className="flex-none mb-6 flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex flex-col md:flex-row md:items-center md:space-x-6 space-y-4 md:space-y-0">
            <div className="flex items-center">
              <button
                onClick={handleHomeClick}
                className="mr-3 p-2 rounded-lg bg-gray-800/60 text-gray-300 hover:bg-gray-700 hover:text-white transition-all duration-200 flex items-center"
                aria-label="Go to home"
              >
                <HomeIcon className="h-5 w-5 mr-1" />
                <span>Home</span>
              </button>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Teacher Schedule</h1>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
            <div className="flex flex-wrap gap-4 items-center w-full">
              <select
                value={selectedTeacher?.id || (showAllSchedules ? 'all' : '')}
                onChange={(e) => {
                  if (e.target.value === 'all') {
                    handleShowAllClick();
                  } else {
                    handleTeacherSelect(e.target.value);
                  }
                }}
                className="bg-gray-800 border border-gray-700/50 rounded-lg p-2.5 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto sm:min-w-[220px] appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNNy40MDYgOC4wMDAwMUwxMiAxMi41OTRMMTYuNTk0IDguMDAwMDFMMTggOS40MDYwMUwxMiAxNS40MDZMNiA5LjQwNjAxTDcuNDA2IDguMDAwMDFaIiBmaWxsPSJjdXJyZW50Q29sb3IiLz48L3N2Zz4=')] bg-[position:right_10px_center] bg-no-repeat pr-10"
              >
                <option value="">Select a teacher</option>
                <option value="all">All Teachers</option>
                {teachersWithSubjects.map(teacher => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
              
              {selectedTeacher && selectedTeacherSubjects.length > 1 && (
                <select
                  value={selectedSubject || ''}
                  onChange={(e) => handleSubjectSelect(e.target.value)}
                  className="bg-gray-800 border border-gray-700/50 rounded-lg p-2.5 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto sm:min-w-[180px] appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNNy40MDYgOC4wMDAwMUwxMiAxMi41OTRMMTYuNTk0IDguMDAwMDFMMTggOS40MDYwMUwxMiAxNS40MDZMNiA5LjQwNjAxTDcuNDA2IDguMDAwMDFaIiBmaWxsPSJjdXJyZW50Q29sb3IiLz48L3N2Zz4=')] bg-[position:right_10px_center] bg-no-repeat pr-10"
                >
                  <option value="">Select subject</option>
                  {selectedTeacherSubjects.map(subject => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-800/50 text-red-300 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <div className="flex-1 rounded-xl border border-gray-700/50 bg-gray-800/40 backdrop-blur-md shadow-2xl flex flex-col overflow-hidden">
          {/* Date Navigation Bar */}
          <div className="flex-none flex items-center justify-between px-4 py-3 border-b border-gray-700/50 bg-gray-800/60">
            <button
              onClick={isMobileView ? goToPreviousDay : goToPreviousWeek}
              className="p-1.5 hover:bg-gray-700/50 rounded-full text-gray-300 hover:text-white transition-colors"
              aria-label="Previous"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            
            <div className="font-semibold text-gray-200">
              {isMobileView 
                ? `${format(mobileStartDate, 'MMM d')} - ${format(addDays(mobileStartDate, 1), 'MMM d, yyyy')}`
                : `${format(startDate, 'MMM d')} - ${format(addDays(startDate, 6), 'MMM d, yyyy')}`
              }
            </div>
            
            <button
              onClick={isMobileView ? goToNextDay : goToNextWeek}
              className="p-1.5 hover:bg-gray-700/50 rounded-full text-gray-300 hover:text-white transition-colors"
              aria-label="Next"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>
          
          <div ref={tableRef} className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-20">
                <tr>
                  <th className="border-r border-b border-gray-700 p-3 text-gray-300 bg-gray-800 rounded-tl-xl sticky left-0 z-20">
                    <div className="font-medium text-gray-400 text-xs">Time</div>
                  </th>
                  {isMobileView ? (
                    // Mobile view: show current day and next day
                    Array.from({ length: 2 }, (_, i) => {
                      const date = addDays(mobileStartDate, i);
                      const isToday = isSameDay(date, new Date());
                      return (
                        <th key={i} className={`border border-gray-700 p-3 ${isToday ? 'bg-blue-900' : 'bg-gray-800'}`}>
                          <div className={`font-bold text-base ${isToday ? 'text-blue-300' : 'text-gray-200'}`}>{format(date, 'EEE')}</div>
                          <div className="text-sm text-gray-400">{format(date, 'MMM d')}</div>
                        </th>
                      );
                    })
                  ) : (
                    // Desktop view: show full week
                    Array.from({ length: 7 }, (_, i) => {
                      const date = addDays(startDate, i);
                      const isToday = isSameDay(date, new Date());
                      return (
                        <th key={i} className={`border border-gray-700 p-3 ${isToday ? 'bg-blue-900' : 'bg-gray-800'}`}>
                          <div className={`font-bold text-base ${isToday ? 'text-blue-300' : 'text-gray-200'}`}>{format(date, 'EEE')}</div>
                          <div className="text-sm text-gray-400">{format(date, 'MMM d')}</div>
                        </th>
                      );
                    })
                  )}
                </tr>
              </thead>
              <tbody>
                {HOURS.map((hour, rowIndex) => {
                  const currentTimePos = getCurrentTimePosition();
                  const isCurrentHour = currentTimePos?.rowIndex === rowIndex;
                  const isLastRow = rowIndex === HOURS.length - 1;
                  
                  return (
                    <tr key={hour} className="relative group transition-colors hover:bg-gray-800/20" id={isCurrentHour ? 'current-hour-row' : undefined}>
                      <td className={`border-r border-b border-gray-700 p-2 text-sm text-gray-300 bg-gray-800 sticky left-0 z-10 ${isLastRow ? 'rounded-bl-xl' : ''}`}>
                        <div className="font-medium">
                          {format(new Date().setHours(hour), 'h a')}
                        </div>
                        {/* Current time indicator indicator for this cell */}
                        {isCurrentHour && currentTimePos && (
                          <div className="absolute -right-1 top-0 bottom-0 w-2">
                            <div 
                              className="absolute right-0 w-2 h-2 bg-red-500 rounded-full transform -translate-y-1/2 z-30"
                              style={{ top: `${currentTimePos.position}%` }}
                            ></div>
                          </div>
                        )}
                      </td>
                      {isMobileView ? (
                        // Mobile view: current day and next day cells
                        Array.from({ length: 2 }, (_, i) => {
                          const date = addDays(mobileStartDate, i);
                          const isToday = isSameDay(date, new Date());
                          
                          return (
                            <td 
                              key={i} 
                              className={`border border-gray-700 p-0 ${isToday ? 'bg-blue-900/10' : ''} relative`}
                            >
                              {/* Current time indicator for this cell */}
                              {isCurrentHour && isToday && currentTimePos && (
                                <div 
                                  className="absolute left-0 right-0 h-0.5 bg-red-500 z-30"
                                  style={{ 
                                    top: `${currentTimePos.position}%`,
                                    width: '100%' // Added full width
                                  }}
                                >
                                  {/* Time indicator displayed only on today's column */}
                                  <div 
                                    className="absolute bg-red-500 px-2 py-1 rounded text-white text-xs font-medium min-w-[72px] text-center whitespace-nowrap flex items-center justify-center"
                                    style={{
                                      top: '0',
                                      right: '8px',
                                      transform: 'translateY(-50%)'
                                    }}
                                  >
                                    <div className="absolute left-[-4px] top-1/2 transform -translate-y-1/2 w-2 h-2 bg-red-500 rotate-45"></div>
                                    {currentTimePos.formattedTime}
                                  </div>
                                </div>
                              )}
                              {renderScheduleCell(date, hour)}
                            </td>
                          );
                        })
                      ) : (
                        // Desktop view: full week cells
                        Array.from({ length: 7 }, (_, i) => {
                          const date = addDays(startDate, i);
                          const isToday = isSameDay(date, new Date());
                          
                          return (
                            <td 
                              key={i} 
                              className={`border border-gray-700 p-0 ${isToday ? 'bg-blue-900/10' : ''} relative`}
                            >
                              {/* Current time indicator for this cell */}
                              {isCurrentHour && isToday && currentTimePos && (
                                <div 
                                  className="absolute left-0 right-0 h-0.5 bg-red-500 z-30"
                                  style={{ top: `${currentTimePos.position}%`, width: '100%' }}
                                >
                                  {/* Time indicator displayed only on today's column */}
                                  <div 
                                    className="absolute bg-red-500 px-2 py-1 rounded text-white text-xs font-medium min-w-[72px] text-center whitespace-nowrap flex items-center justify-center"
                                    style={{
                                      top: '0',
                                      right: '8px',
                                      transform: 'translateY(-50%)'
                                    }}
                                  >
                                    <div className="absolute left-[-4px] top-1/2 transform -translate-y-1/2 w-2 h-2 bg-red-500 rotate-45"></div>
                                    {currentTimePos.formattedTime}
                                  </div>
                                </div>
                              )}
                              {renderScheduleCell(date, hour)}
                            </td>
                          );
                        })
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {loading && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700/50 text-gray-200 shadow-2xl flex flex-col items-center">
              <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4"></div>
              <div className="text-lg font-medium">Loading schedule...</div>
            </div>
          </div>
        )}

        {/* Schedule Detail Modal */}
        {isModalOpen && selectedSchedule && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto" onClick={closeModal}>
            <div 
              className="bg-gray-900 rounded-xl border border-gray-700/50 shadow-2xl w-full max-w-2xl my-8 overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header with Accent Gradient */}
              <div className="relative">
                <div className={`absolute inset-0 ${
                  selectedSchedule.mode === 'Mock'
                    ? 'bg-gradient-to-r from-emerald-600 to-green-400'
                    : selectedSchedule.mode === 'Seminar'
                      ? 'bg-gradient-to-r from-amber-600 to-yellow-400'
                      : 'bg-gradient-to-r from-blue-600 to-sky-400'
                } opacity-90`}></div>
                <div className="relative p-5 flex justify-between items-center">
                  <h3 className="text-xl font-bold text-white">{selectedSchedule.subject}</h3>
                  <button 
                    onClick={closeModal}
                    className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>
              
              {/* Modal Content */}
              <div className="p-5 space-y-5">
                {/* Main info grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start space-x-3">
                    <ClockIcon className="h-5 w-5 text-blue-400 mt-0.5" />
                    <div>
                      <p className="text-gray-400 text-sm font-medium">Time</p>
                      <p className="text-white text-base">
                        {formatTime(selectedSchedule.start_time)} - {formatTime(selectedSchedule.end_time)}
                      </p>
                      <p className="text-gray-500 text-xs mt-1">
                        {selectedSchedule.repeats ? 'Weekly' : 'One-time'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <AcademicCapIcon className="h-5 w-5 text-blue-400 mt-0.5" />
                    <div>
                      <p className="text-gray-400 text-sm font-medium">Class</p>
                      <p className="text-white text-base">{selectedSchedule.grade}</p>
                      <p className="text-gray-500 text-xs mt-1">{selectedSchedule.curriculum}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <MapPinIcon className="h-5 w-5 text-blue-400 mt-0.5" />
                    <div>
                      <p className="text-gray-400 text-sm font-medium">Room</p>
                      <p className="text-white text-base">{selectedSchedule.room || 'Not specified'}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <AcademicCapIcon className="h-5 w-5 text-blue-400 mt-0.5" />
                    <div>
                      <p className="text-gray-400 text-sm font-medium">Mode</p>
                      <p className="text-white text-base">{selectedSchedule.mode}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <UserIcon className="h-5 w-5 text-blue-400 mt-0.5" />
                    <div>
                      <p className="text-gray-400 text-sm font-medium">Teacher</p>
                      <p className="text-white text-base">{selectedSchedule.teachers.name}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <BookOpenIcon className="h-5 w-5 text-blue-400 mt-0.5" />
                    <div>
                      <p className="text-gray-400 text-sm font-medium">Day</p>
                      <p className="text-white text-base">{getScheduleDay(selectedSchedule)}</p>
                    </div>
                  </div>
                </div>
                
                {/* Description section if available */}
                {selectedSchedule.description && (
                  <div className="pt-4 border-t border-gray-800">
                    <h4 className="text-gray-300 font-medium mb-2">Description</h4>
                    <p className="text-gray-400">{selectedSchedule.description}</p>
                  </div>
                )}
              </div>
              
              {/* Modal Footer */}
              <div className="border-t border-gray-800 p-4 flex justify-end">
                {canSchedule && (
                  <button 
                    onClick={(e) => {
                      closeModal();
                      if (selectedSchedule && selectedScheduleDay) {
                        handleEditClick(e as React.MouseEvent<HTMLButtonElement>, selectedSchedule, selectedScheduleDay);
                      }
                    }}
                    className="px-4 py-2 mr-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center"
                  >
                    <PencilIcon className="h-4 w-4 mr-1" />
                    Edit
                  </button>
                )}
                <button 
                  onClick={closeModal}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal for Deletion/Cancellation */}
        {isConfirmDeleteOpen && selectedSchedule && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto" onClick={closeConfirmDelete}>
            <div 
              className="bg-gray-900 rounded-xl border border-gray-700/50 shadow-2xl w-full max-w-md my-8 overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-400 opacity-90"></div>
                <div className="relative p-5 flex justify-between items-center">
                  <h3 className="text-xl font-bold text-white">
                    {deleteMode === 'cancel' ? 'Cancel Class' : 'Delete Class'}
                  </h3>
                  <button 
                    onClick={closeConfirmDelete}
                    className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>
              
              {/* Modal Content */}
              <div className="p-5">
                <p className="text-gray-300 mb-4">
                  {deleteMode === 'cancel'
                    ? `Are you sure you want to cancel this class on ${format(selectedScheduleDay!, 'MMMM d, yyyy')}?`
                    : 'Are you sure you want to delete all occurrences of this class?'
                  }
                </p>
                <p className="text-sm text-gray-400 mb-6">
                  {deleteMode === 'cancel'
                    ? 'This will only cancel this specific occurrence of the class.'
                    : 'This action cannot be undone and will remove all instances of this class from the schedule.'
                  }
                </p>
              </div>
              
              {/* Modal Footer */}
              <div className="border-t border-gray-800 p-4 flex justify-end space-x-3">
                <button 
                  onClick={closeConfirmDelete}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  className={`px-4 py-2 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-300 ${
                    deleteMode === 'cancel'
                      ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400'
                      : 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400'
                  }`}
                >
                  {deleteMode === 'cancel' ? 'Cancel Class' : 'Delete Class'}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Class Scheduling Modal */}
        {isSchedulingModalOpen && selectedScheduleDay && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 p-2 sm:p-4 overflow-y-auto" onClick={closeSchedulingModal}>
            <div 
              className="bg-gray-900 rounded-xl border border-gray-700/50 shadow-2xl w-full max-w-3xl my-4 sm:my-8 overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header with Accent Gradient */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-sky-400 opacity-90"></div>
                <div className="relative p-3 sm:p-5 flex justify-between items-center">
                  <h3 className="text-lg sm:text-xl font-bold text-white">
                    {isEditMode ? 'Edit Class' : 'Schedule New Class'}
                  </h3>
                  <button 
                    onClick={closeSchedulingModal}
                    className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                  </button>
                </div>
              </div>
              
              {/* Modal Content */}
              <div className="p-3 sm:p-8 space-y-6 max-h-[calc(100vh-8rem)] overflow-y-auto">
                <div className="text-gray-300 mb-4 text-xs sm:text-sm">
                  Scheduling for: <span className="text-blue-400 font-medium">{format(selectedScheduleDay, 'EEEE, MMMM d')}</span> at <span className="text-blue-400 font-medium">{selectedScheduleHour && format(new Date().setHours(selectedScheduleHour, 0), 'h:mm a')}</span>
                </div>
                
                {/* Scheduling Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                  {/* Teacher */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-1">Teacher</label>
                    <select
                      value={schedulingFormData.teacher_id}
                      onChange={e => handleFormTeacherChange(parseInt(e.target.value))}
                      className={`w-full px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-800/80 border rounded-lg text-sm sm:text-base text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                        !isEditMode && schedulingFormData.teacher_id === 0 ? 'border-amber-500' : 'border-gray-700'
                      }`}
                      required
                    >
                      <option value={0} disabled>Select a teacher</option>
                      {teachersWithSubjects.map(teacher => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.name}
                        </option>
                      ))}
                    </select>
                    {!isEditMode && schedulingFormData.teacher_id === 0 && (
                      <p className="mt-1 text-xs text-amber-500">Please select a teacher</p>
                    )}
                  </div>
                  
                  {/* Subject */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-1">Subject</label>
                    <select
                      value={schedulingFormData.subject}
                      onChange={e => setSchedulingFormData({...schedulingFormData, subject: e.target.value})}
                      className="w-full px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-800/80 border border-gray-700 rounded-lg text-sm sm:text-base text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      required
                      disabled={schedulingFormData.teacher_id === 0}
                    >
                      {schedulingFormData.teacher_id === 0 ? (
                        <option value="">Select a teacher first</option>
                      ) : (
                        getTeacherSubjects(schedulingFormData.teacher_id).map(subject => (
                          <option key={subject} value={subject}>
                            {subject}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  
                  {/* Grade */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-1">Grade</label>
                    <select
                      value={schedulingFormData.grade}
                      onChange={e => setSchedulingFormData({...schedulingFormData, grade: e.target.value})}
                      className="w-full px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-800/80 border border-gray-700 rounded-lg text-sm sm:text-base text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      required
                    >
                      <option value="Grade 9">Grade 9</option>
                      <option value="Grade 10">Grade 10</option>
                      <option value="AS">AS</option>
                    </select>
                  </div>
                  
                  {/* Curriculum */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-1">Curriculum</label>
                    <select
                      value={schedulingFormData.curriculum}
                      onChange={e => setSchedulingFormData({...schedulingFormData, curriculum: e.target.value})}
                      className="w-full px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-800/80 border border-gray-700 rounded-lg text-sm sm:text-base text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      required
                    >
                      <option value="Edexcel">Edexcel</option>
                      <option value="Cambridge">Cambridge</option>
                    </select>
                  </div>
                  
                  {/* Room */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-1">Room</label>
                    <input
                      type="text"
                      value={schedulingFormData.room}
                      onChange={e => setSchedulingFormData({...schedulingFormData, room: e.target.value})}
                      className="w-full px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-800/80 border border-gray-700 rounded-lg text-sm sm:text-base text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter room number/name"
                    />
                  </div>

                  {/* Mode */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-1">Mode</label>
                    <select
                      value={schedulingFormData.mode}
                      onChange={e => setSchedulingFormData({...schedulingFormData, mode: e.target.value})}
                      className="w-full px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-800/80 border border-gray-700 rounded-lg text-sm sm:text-base text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      required
                    >
                      <option value="Mock">Mock</option>
                      <option value="Class">Class</option>
                      <option value="Seminar">Seminar</option>
                    </select>
                  </div>
                  
                  {/* Start & End Time */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-1">Start Time</label>
                    <input
                      type="time"
                      value={schedulingFormData.start_time}
                      onChange={e => setSchedulingFormData({...schedulingFormData, start_time: e.target.value})}
                      className="w-full px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-800/80 border border-gray-700 rounded-lg text-sm sm:text-base text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-1">End Time</label>
                    <input
                      type="time"
                      value={schedulingFormData.end_time}
                      onChange={e => setSchedulingFormData({...schedulingFormData, end_time: e.target.value})}
                      className="w-full px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-800/80 border border-gray-700 rounded-lg text-sm sm:text-base text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      required
                    />
                  </div>
                  
                  {/* Repeat Option */}
                  <div>
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="repeats"
                        checked={schedulingFormData.repeats}
                        onChange={e => setSchedulingFormData({...schedulingFormData, repeats: e.target.checked})}
                        className="h-4 w-4 rounded border-gray-700 bg-gray-800 text-blue-500 focus:ring-blue-600"
                      />
                      <label htmlFor="repeats" className="text-xs sm:text-sm font-medium text-gray-300">
                        Repeats Weekly
                      </label>
                    </div>
                  </div>
                  
                  {/* Description */}
                  <div className="col-span-2">
                    <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-1">Description (Optional)</label>
                    <textarea
                      value={schedulingFormData.description}
                      onChange={e => setSchedulingFormData({...schedulingFormData, description: e.target.value})}
                      className="w-full px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-800/80 border border-gray-700 rounded-lg text-sm sm:text-base text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Additional details about the class"
                      rows={3}
                    ></textarea>
                  </div>
                </div>
              </div>
              
              {/* Modal Footer - Stacked layout on mobile */}
              <div className="border-t border-gray-800 p-3 sm:p-4 flex flex-col-reverse sm:flex-row sm:justify-between items-stretch sm:items-center gap-3">
                {/* Delete options - only shown in edit mode */}
                {isEditMode && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button 
                      onClick={() => handleDeleteClick('cancel')}
                      className="px-3 sm:px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 rounded-lg transition-colors flex items-center justify-center sm:justify-start space-x-1 text-sm"
                    >
                      <XMarkIcon className="h-4 w-4" />
                      <span>Cancel This Occurrence</span>
                    </button>
                    <button 
                      onClick={() => handleDeleteClick('delete')}
                      className="px-3 sm:px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors flex items-center justify-center sm:justify-start space-x-1 text-sm"
                    >
                      <XMarkIcon className="h-4 w-4" />
                      <span>Delete All Occurrences</span>
                    </button>
                  </div>
                )}
                
                {/* Save/Cancel buttons */}
                <div className="flex-grow flex sm:flex-grow-0 gap-2 sm:gap-3 justify-end">
                  <button 
                    onClick={closeSchedulingModal}
                    className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleScheduleSubmit}
                    className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-300 text-sm"
                  >
                    {isEditMode ? 'Update Class' : 'Schedule Class'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add custom scrollbar styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(31, 41, 55, 0.5);
          border-radius: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(75, 85, 99, 0.5);
          border-radius: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(107, 114, 128, 0.7);
        }
        
        /* For Firefox */
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(75, 85, 99, 0.5) rgba(31, 41, 55, 0.5);
        }
      `}</style>
    </div>
  );
}