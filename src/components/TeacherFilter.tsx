import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';

interface Teacher {
  id: number;
  name: string;
  subject: string;
}

interface TeacherFilterProps {
  teachers: Teacher[];
  selectedTeacher: Teacher | null;
  onSelect: (teacher: Teacher | null) => void;
  showAllOption?: boolean;
}

interface GroupedTeacher {
  id: number;
  name: string;
  subjects: string[];
}

function groupTeachers(teachers: Teacher[]): GroupedTeacher[] {
  // Create a map to group teachers by name (since same name = same teacher)
  const teacherMap = new Map<string, GroupedTeacher>();

  teachers.forEach(teacher => {
    if (!teacherMap.has(teacher.name)) {
      teacherMap.set(teacher.name, {
        id: teacher.id,
        name: teacher.name,
        subjects: [teacher.subject]
      });
    } else {
      const existing = teacherMap.get(teacher.name)!;
      if (!existing.subjects.includes(teacher.subject)) {
        existing.subjects.push(teacher.subject);
      }
    }
  });

  // Sort subjects for each teacher
  teacherMap.forEach(teacher => {
    teacher.subjects.sort();
  });

  // Convert to array and sort by teacher name
  return Array.from(teacherMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export default function TeacherFilter({ teachers, selectedTeacher, onSelect, showAllOption = false }: TeacherFilterProps) {
  const groupedTeachers = groupTeachers(teachers);

  const handleSelect = (groupedTeacher: GroupedTeacher) => {
    // Find the first subject entry for this teacher
    const teacherEntry = teachers.find(t => t.name === groupedTeacher.name);
    if (teacherEntry) {
      onSelect(teacherEntry);
    }
  };

  return (
    <Menu as="div" className="relative inline-block text-left">
      <div>
        <Menu.Button className="inline-flex w-full justify-between items-center rounded-md bg-[#2A2A2A] px-4 py-2 text-sm font-medium text-white hover:bg-[#3A3A3A] transition-colors min-w-[200px]">
          {selectedTeacher ? selectedTeacher.name : 'Select Teacher'}
          <ChevronDownIcon className="-mr-1 ml-2 h-5 w-5" aria-hidden="true" />
        </Menu.Button>
      </div>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 z-10 mt-2 w-72 origin-top-right rounded-md bg-[#2A2A2A] shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none max-h-[400px] overflow-y-auto">
          <div className="py-1">
            {showAllOption && (
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={() => onSelect(null)}
                    className={`${
                      active ? 'bg-[#3A3A3A]' : ''
                    } text-white group flex w-full items-center justify-center px-4 py-2 text-sm`}
                  >
                    All Teachers
                  </button>
                )}
              </Menu.Item>
            )}
            {groupedTeachers.map((teacher) => (
              <Menu.Item key={teacher.name}>
                {({ active }) => (
                  <button
                    onClick={() => handleSelect(teacher)}
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
  );
} 