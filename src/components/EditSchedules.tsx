import { useState, useEffect, Fragment, useRef } from 'react';
import { supabase } from '../lib/supabase';
import TeacherFilter from './TeacherFilter';
import { format, parse, isAfter, isBefore, set } from 'date-fns';
import { PlusIcon, PencilIcon, ChevronDownIcon, TrashIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { Menu, Transition } from '@headlessui/react';

interface Teacher {
  id: number;
  name: string;
  subject: string;
}

interface Schedule {
  id: number;
  teacher_id: number | null;
  day: string;
  start_time: string;
  end_time: string;
  room: string | null;
  grade: string;
  curriculum: string;
  date_tag: string;
  repeats: boolean;
  subject: string;
  teachers: Teacher | null;
  canceled_dates?: string[];
}

interface NewSchedule {
  teacher_id: number | null;
  day: string;
  start_time: string;
  end_time: string;
  grade: string;
  curriculum: string;
  repeats: boolean;
  date_tag: string;
  subject: string;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const GRADES = ['Grade 9', 'Grade 10'];
const CURRICULUMS = ['Edexcel', 'Cambridge'];

export default function EditSchedules() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [newSchedule, setNewSchedule] = useState<NewSchedule>({
    teacher_id: 0,
    day: DAYS_OF_WEEK[0],
    start_time: '',
    end_time: '',
    grade: GRADES[0],
    curriculum: CURRICULUMS[0],
    repeats: true,
    date_tag: format(new Date(), 'M/d'),
    subject: '',
  });
  const [showAddTeacherForm, setShowAddTeacherForm] = useState(false);
  const [newTeacher, setNewTeacher] = useState({ name: '', subject: '' });

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Fetch teachers and schedules
  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch teachers
        const { data: teachersData, error: teachersError } = await supabase
          .from('teachers')
          .select('id, name, subject')
          .order('name');

        if (teachersError) throw teachersError;
        setTeachers(teachersData || []);

        // Fetch schedules
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

  const handleAddSchedule = async () => {
    try {
      // Validate required fields
      if (!newSchedule.start_time || !newSchedule.end_time) {
        setError('Please select both start and end times');
        return;
      }

      // Create the schedule object with only valid database fields
      const scheduleData = {
        teacher_id: selectedTeacher?.id,
        day: newSchedule.day,
        start_time: newSchedule.start_time,
        end_time: newSchedule.end_time,
        grade: newSchedule.grade,
        curriculum: newSchedule.curriculum,
        repeats: newSchedule.repeats,
        date_tag: format(new Date(), 'M/d')
      };

      const { data, error } = await supabase
        .from('class_schedules')
        .insert([scheduleData])
        .select(`
          *,
          teachers (
            id,
            name,
            subject
          )
        `)
        .single();

      if (error) throw error;

      setSchedules([...schedules, data]);
      setShowAddForm(false);
      setNewSchedule({
        teacher_id: 0,
        day: DAYS_OF_WEEK[0],
        start_time: '',
        end_time: '',
        grade: GRADES[0],
        curriculum: CURRICULUMS[0],
        repeats: true,
        date_tag: format(new Date(), 'M/d'),
        subject: ''
      });
      setError(null);
    } catch (err: any) {
      console.error('Error adding schedule:', err);
      setError(err.message || 'Failed to add schedule. Please try again.');
    }
  };

  const handleEditSchedule = async () => {
    if (!editingSchedule) return;

    try {
      const { data, error } = await supabase
        .from('class_schedules')
        .update({
          day: editingSchedule.day,
          start_time: editingSchedule.start_time,
          end_time: editingSchedule.end_time,
          grade: editingSchedule.grade,
          curriculum: editingSchedule.curriculum,
          repeats: editingSchedule.repeats,
          date_tag: editingSchedule.date_tag,
          subject: editingSchedule.subject,
        })
        .eq('id', editingSchedule.id)
        .select(`
          *,
          teachers (
            id,
            name,
            subject
          )
        `)
        .single();

      if (error) throw error;

      setSchedules(schedules.map(s => s.id === data.id ? data : s));
      setEditingSchedule(null);
    } catch (err) {
      console.error('Error updating schedule:', err);
      setError('Failed to update schedule. Please try again.');
    }
  };

  const handleDeleteSchedule = async (scheduleId: number) => {
    if (!confirm('Are you sure you want to permanently delete this schedule?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('class_schedules')
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;

      setSchedules(schedules.filter(s => s.id !== scheduleId));
    } catch (err) {
      console.error('Error deleting schedule:', err);
      setError('Failed to delete schedule. Please try again.');
    }
  };

  const handleCancelClass = async (schedule: Schedule) => {
    const today = format(new Date(), 'M/d');
    const canceledDates = schedule.canceled_dates || [];
    
    try {
      const { data, error } = await supabase
        .from('class_schedules')
        .update({
          canceled_dates: [...canceledDates, today]
        })
        .eq('id', schedule.id)
        .select()
        .single();

      if (error) throw error;

      setSchedules(schedules.map(s => s.id === data.id ? { ...s, canceled_dates: data.canceled_dates } : s));
    } catch (err) {
      console.error('Error canceling class:', err);
      setError('Failed to cancel class. Please try again.');
    }
  };

  const formatTime = (time: string) => {
    try {
      if (!time || !/^\d{1,2}:\d{2}$/.test(time)) {
        console.warn('Invalid time format:', time);
        return 'Invalid time';
      }
      
      const [hours, minutes] = time.split(':').map(Number);
      
      // Validate hours and minutes
      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        console.warn('Invalid time values:', { hours, minutes });
        return 'Invalid time';
      }

      const date = new Date();
      date.setHours(hours);
      date.setMinutes(minutes);
      return format(date, 'h:mm a');
    } catch (error) {
      console.error('Error formatting time:', error);
      return 'Invalid time';
    }
  };

  const filteredSchedules = schedules.filter((schedule) => {
    return selectedTeacher ? schedule.teachers?.name === selectedTeacher.name : false;
  });

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

  const handleAddTeacher = async () => {
    try {
      if (!newTeacher.name || !newTeacher.subject) {
        setError('Please fill in all fields');
        return;
      }

      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .insert([
          {
            name: newTeacher.name,
            subject: newTeacher.subject
          }
        ])
        .select();

      if (teacherError) throw teacherError;

      // Refresh teachers list
      const { data: teachersData, error: teachersError } = await supabase
        .from('teachers')
        .select('id, name, subject')
        .order('name');

      if (teachersError) throw teachersError;
      setTeachers(teachersData || []);

      // Reset form
      setNewTeacher({ name: '', subject: '' });
      setShowAddTeacherForm(false);
      setError(null);
    } catch (err) {
      console.error('Error adding teacher:', err);
      setError('Failed to add teacher. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  const currentDay = format(currentTime, 'EEEE');
  const currentTimeString = format(currentTime, 'h:mm a');
  const currentDateString = format(currentTime, 'MMMM d, yyyy');

  const TimeSelector = ({ 
    value, 
    onChange, 
    label 
  }: { 
    value: string, 
    onChange: (time: string) => void,
    label: string 
  }) => {
    const [selectedTime, setSelectedTime] = useState(() => {
      if (!value) return { hour: 1, minute: 0, period: 'AM' };
      const date = parse(value, 'HH:mm', new Date());
      const formattedTime = format(date, 'h:mm a');
      const [time, period] = formattedTime.split(' ');
      const [hour, minute] = time.split(':').map(Number);
      return { hour, minute, period };
    });

    const [tempMinute, setTempMinute] = useState('');
    const [tempHour, setTempHour] = useState('');
    const [isMinuteFocused, setIsMinuteFocused] = useState(false);
    const [isHourFocused, setIsHourFocused] = useState(false);
    
    // Create refs for the inputs
    const minuteInputRef = useRef<HTMLInputElement>(null);
    const hourInputRef = useRef<HTMLInputElement>(null);

    const handleTimeChange = (type: 'hour' | 'minute' | 'period', value: number | string) => {
      let newValue = value;
      
      if (type === 'hour') {
        newValue = Math.max(1, Math.min(12, Number(value)));
      } else if (type === 'minute') {
        newValue = Math.max(0, Math.min(59, Number(value)));
      }

      const newTime = { ...selectedTime, [type]: newValue };
      setSelectedTime(newTime);
      
      let hour24 = Number(newTime.hour);
      if (newTime.period === 'PM' && hour24 !== 12) hour24 += 12;
      if (newTime.period === 'AM' && hour24 === 12) hour24 = 0;
      
      const timeString = format(
        set(new Date(), { hours: hour24, minutes: Number(newTime.minute) }),
        'HH:mm'
      );
      onChange(timeString);
    };

    const togglePeriod = () => {
      handleTimeChange('period', selectedTime.period === 'AM' ? 'PM' : 'AM');
    };

    const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.replace(/\D/g, ''); // Allow only numeric input
      setTempHour(value); // Update the tempHour state
      if (value.length > 0) {
        handleTimeChange('hour', Number(value)); // Update the hour if there's a valid input
      }
    };
    
    const handleHourBlur = () => {
      const hourValue = parseInt(tempHour, 10);
    
      if (tempHour === '' || isNaN(hourValue) || hourValue < 1 || hourValue > 12) {
        setTempHour(selectedTime.hour.toString()); // Reset to the current valid hour
      } else {
        setTempHour(hourValue.toString());
        handleTimeChange('hour', hourValue);
      }
    };
    

    return (
      <div className="relative">
        <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
        <div className="flex items-center gap-2">
          <div className="flex items-center">
            <input
              ref={hourInputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={2}
              className="w-8 bg-[#1A1A1A] text-center text-white focus:outline-none border border-gray-700 rounded-sm px-1 py-1.5"
              value={tempHour}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, ''); // Allow only numeric input
                setTempHour(value); // Update the tempHour state
                if (value.length > 0) {
                  handleTimeChange('hour', Number(value)); // Update the hour if there's a valid input
                }
              }}
              onFocus={(e) => {
                setTempHour(''); // Set to empty string on focus
                e.target.select();
              }}
              onBlur={handleHourBlur}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault(); // Prevent losing focus on Enter key
                  hourInputRef.current?.focus(); // Keep focus on the hour input
                }
              }}
            />
            <span className="text-gray-400 mx-1">:</span>
            <input
              ref={minuteInputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={2}
              value={isMinuteFocused ? tempMinute : selectedTime.minute.toString().padStart(2, '0')}
              onChange={(e) => {
                const val = e.target.value;
                if (/^\d*$/.test(val)) {
                  setTempMinute(val);
                  if (val.length === 2) {
                    const numVal = Number(val);
                    if (numVal >= 0 && numVal <= 59) {
                      handleTimeChange('minute', numVal);
                    }
                  }
                }
              }}
              onFocus={(e) => {
                setIsMinuteFocused(true);
                setTempMinute('');
                e.target.select();
              }}
              onBlur={() => {
                setIsMinuteFocused(false);
                if (tempMinute && Number(tempMinute) >= 0 && Number(tempMinute) <= 59) {
                  handleTimeChange('minute', Number(tempMinute));
                } else {
                  handleTimeChange('minute', 0);
                }
              }}
              className="w-10 bg-[#1E1E1E] text-white px-2 py-1.5 text-center focus:outline-none border border-gray-700 rounded-sm"
            />
          </div>
          <button
            type="button"
            onClick={togglePeriod}
            className={`min-w-[48px] px-2 py-1.5 text-sm border border-gray-700 rounded-sm ${
              selectedTime.period === 'PM' 
                ? 'bg-blue-500 text-white border-blue-500' 
                : 'bg-[#1E1E1E] text-gray-400'
            }`}
          >
            {selectedTime.period}
          </button>
        </div>
      </div>
    );
  };

  const ScheduleForm = ({ schedule, onSubmit, onCancel }: { 
    schedule: NewSchedule | Schedule, 
    onSubmit: () => void,
    onCancel: () => void 
  }) => {
    const [formData, setFormData] = useState(schedule);
    const today = new Date();
    const formattedToday = format(today, 'yyyy-MM-dd');

    // Get the current teacher's subjects
    const currentTeacher = teachers.find(t => t.id === selectedTeacher?.id);
    const teacherSubjects = teachers
      .filter(t => t.name === currentTeacher?.name)
      .map(t => t.subject);
    const hasMultipleSubjects = teacherSubjects.length > 1;
    
    const handleChange = (field: keyof (NewSchedule | Schedule), value: any) => {
      setFormData({ ...formData, [field]: value });
      if ('id' in schedule) {
        setEditingSchedule({ ...editingSchedule!, [field]: value });
      } else {
        setNewSchedule({ ...newSchedule, [field]: value });
      }
    };

    // Group teachers by name
    const groupedTeachers = teachers.reduce((acc, teacher) => {
      if (!acc[teacher.name]) {
        acc[teacher.name] = {
          id: teacher.id,
          name: teacher.name,
          subjects: [teacher.subject]
        };
      } else if (!acc[teacher.name].subjects.includes(teacher.subject)) {
        acc[teacher.name].subjects.push(teacher.subject);
      }
      return acc;
    }, {} as Record<string, { id: number; name: string; subjects: string[] }>);

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Teacher</label>
          <Menu as="div" className="relative w-full">
            <Menu.Button className="inline-flex w-full justify-between items-center rounded-md bg-[#2A2A2A] px-4 py-2 text-sm font-medium text-white hover:bg-[#3A3A3A] transition-colors">
              {selectedTeacher?.name || 'Select Teacher'}
              <ChevronDownIcon className="-mr-1 ml-2 h-5 w-5" aria-hidden="true" />
            </Menu.Button>

            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 z-10 mt-2 w-full origin-top-right rounded-md bg-[#2A2A2A] shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none max-h-[400px] overflow-y-auto">
                <div className="py-1">
                  {Object.values(groupedTeachers).map((teacher) => (
                    <Menu.Item key={teacher.name}>
                      {({ active }) => (
                        <button
                          onClick={() => {
                            const firstTeacherEntry = teachers.find(t => t.name === teacher.name);
                            setSelectedTeacher(firstTeacherEntry || null);
                          }}
                          className={`${
                            active ? 'bg-[#3A3A3A]' : ''
                          } text-white group flex w-full items-center justify-center px-4 py-2 text-sm`}
                        >
                          <div className="text-center">
                            <div className="font-medium">{teacher.name}</div>
                            <div className="text-xs text-emerald-400 mt-0.5">
                              {teacher.subjects.join(' • ')}
                            </div>
                          </div>
                        </button>
                      )}
                    </Menu.Item>
                  ))}
                </div>
              </Menu.Items>
            </Transition>
          </Menu>

          {selectedTeacher && hasMultipleSubjects && (
            <div className="mt-2">
              <label className="block text-sm font-medium text-gray-300 mb-1">Subject</label>
              <select
                value={formData.subject || currentTeacher?.subject}
                onChange={(e) => handleChange('subject', e.target.value)}
                className="w-full bg-[#2A2A2A] text-white rounded-md px-3 py-2"
              >
                {teacherSubjects.map((subject) => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Date</label>
          <input
            type="date"
            defaultValue={formattedToday}
            onChange={(e) => {
              const date = new Date(e.target.value);
              const dateTag = format(date, 'M/d');
              handleChange('date_tag', dateTag);
            }}
            className="w-full bg-[#2A2A2A] text-white rounded-md px-3 py-2"
          />
          <p className="text-sm text-gray-400 mt-1">
            Selected date: {formData.date_tag || format(today, 'M/d')}
          </p>
        </div>

        <div className="space-y-4">
          <TimeSelector
            label="Start Time"
            value={formData.start_time}
            onChange={(time) => handleChange('start_time', time)}
          />
          <TimeSelector
            label="End Time"
            value={formData.end_time}
            onChange={(time) => handleChange('end_time', time)}
          />
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onSubmit}
            className="flex-1 bg-blue-600 text-white rounded-md py-2 hover:bg-blue-700 transition-colors"
          >
            {'id' in schedule ? 'Update Schedule' : 'Add Schedule'}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-[#2A2A2A] text-white rounded-md py-2 hover:bg-[#3A3A3A] transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  const ScheduleCard = ({ schedule, isPast }: { schedule: Schedule; isPast: boolean }) => {
    const active = isScheduleActive(schedule);
    const upcoming = isScheduleUpcoming(schedule);
    const today = format(new Date(), 'M/d');
    const isCanceledToday = schedule.canceled_dates?.includes(today);
    
    return (
      <div
        className={`rounded-lg p-4 sm:p-6 group relative transition-all ${
            isPast ? 'opacity-50 grayscale bg-opacity-50 hover:opacity-60 bg-[#1E1E1E]' : 
            isCanceledToday ? 'bg-red-900/10 ring-1 ring-red-500/20' :
            'bg-[#1E1E1E]'
          }`}
      >
        <div className="absolute top-2 right-2 flex items-center gap-2">
          <button
            onClick={() => handleCancelClass(schedule)}
            className="p-2 rounded-full bg-[#2A2A2A] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-900/30"
            title={isCanceledToday ? "Class is canceled for today" : "Mark as canceled for today"}
          >
            <svg
              className={`h-4 w-4 ${isCanceledToday ? 'text-red-500' : 'text-gray-400'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
          <button
            onClick={() => setEditingSchedule(schedule)}
            className="p-2 rounded-full bg-[#2A2A2A] opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <PencilIcon className="h-4 w-4 text-gray-400" />
          </button>
          <button
            onClick={() => handleDeleteSchedule(schedule.id)}
            className="p-2 rounded-full bg-[#2A2A2A] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-900/30"
          >
            <TrashIcon className="h-4 w-4 text-gray-400" />
          </button>
        </div>
        {isCanceledToday && (
          <div className="absolute -top-3 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-xs">
            Canceled
          </div>
        )}
        <div className="flex justify-between items-start mb-3 sm:mb-4">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-white">
              {schedule.teachers?.name}
            </h3>
            <p className="text-sm text-emerald-400 mt-1">
              {schedule.teachers?.subject}
            </p>
            <div className="flex items-center gap-2 text-gray-400 text-sm mt-2">
              <span>{schedule.grade}</span>
              <span>•</span>
              <span>{schedule.curriculum}</span>
            </div>
          </div>
          <span className="bg-[#2A2A2A] text-gray-300 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm">
            {schedule.day}
          </span>
        </div>
        <div className="flex items-center text-gray-400 text-sm sm:text-base">
          <svg
            className="w-4 h-4 sm:w-5 sm:h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
          {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
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
              Edit Schedules
            </h2>
            <p className="text-gray-400 text-sm sm:text-base">
              {currentDateString} - {currentTimeString}
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
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-900/20 rounded-lg p-4 mb-4">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Add/Edit Schedule Modal - Moved outside teacher selection */}
        {(showAddForm || editingSchedule) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-[#1E1E1E] rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-white mb-4">
                {editingSchedule ? 'Edit Schedule' : 'Add New Schedule'}
              </h3>
              <ScheduleForm
                schedule={editingSchedule || newSchedule}
                onSubmit={editingSchedule ? handleEditSchedule : handleAddSchedule}
                onCancel={() => {
                  setShowAddForm(false);
                  setEditingSchedule(null);
                }}
              />
            </div>
          </div>
        )}

        {!selectedTeacher ? (
          <div className="bg-[#1E1E1E] rounded-lg p-4">
            <p className="text-gray-400">Please select a teacher to edit their schedules.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {/* Add Schedule Card */}
              <div
                className="bg-[#1E1E1E] rounded-lg p-4 sm:p-6 cursor-pointer hover:bg-[#2A2A2A] transition-colors"
                onClick={() => setShowAddForm(true)}
              >
                <div className="flex items-center justify-center h-full">
                  <PlusIcon className="h-8 w-8 text-gray-400" />
                </div>
              </div>

              {/* Active and Upcoming Schedules */}
              {filteredSchedules
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
                    isPast={false} 
                  />
                ))}
            </div>
          </>
        )}

        {/* Add Teacher Form */}
        <div className="mt-8 border-t border-gray-800 pt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-light text-white">Teachers</h2>
            <button
              onClick={() => setShowAddTeacherForm(!showAddTeacherForm)}
              className="px-4 py-2 text-sm bg-[#2A2A2A] text-white rounded-md hover:bg-[#3A3A3A] transition-colors flex items-center gap-2"
            >
              <PlusIcon className="h-5 w-5" />
              Add Teacher
            </button>
          </div>

          {showAddTeacherForm && (
            <div className="bg-[#1E1E1E] rounded-lg p-6 mb-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Teacher Name
                  </label>
                  <input
                    type="text"
                    value={newTeacher.name}
                    onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })}
                    className="w-full bg-[#2A2A2A] text-white rounded-md px-3 py-2 text-sm"
                    placeholder="Enter teacher name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={newTeacher.subject}
                    onChange={(e) => setNewTeacher({ ...newTeacher, subject: e.target.value })}
                    className="w-full bg-[#2A2A2A] text-white rounded-md px-3 py-2 text-sm"
                    placeholder="Enter subject"
                  />
                </div>
              </div>
              <div className="flex justify-end mt-4 gap-3">
                <button
                  onClick={() => {
                    setShowAddTeacherForm(false);
                    setNewTeacher({ name: '', subject: '' });
                  }}
                  className="px-4 py-2 text-sm bg-[#2A2A2A] text-white rounded-md hover:bg-[#3A3A3A] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddTeacher}
                  className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
                >
                  Add Teacher
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 