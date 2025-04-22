'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, ArrowLeft, School, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface Slot {
  id: number;
  classroom_id: number;
  day: string;
  start_time: string;
  end_time: string;
  duration: number;
  review_stage: string;
  is_available: boolean;
  booking_deadline: string;
}

interface Classroom {
  id: number;
  name: string;
  faculty_name?: string;
}

interface SlotsByClassroom {
  [classroomId: number]: {
    classroom: Classroom;
    slots: Slot[];
  };
}

export default function StudentSlotsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slotsByClassroom, setSlotsByClassroom] = useState<SlotsByClassroom>({});
  const supabase = createClientComponentClient();
  
  useEffect(() => {
    const fetchAllSlots = async () => {
      try {
        setLoading(true);
        
        // Get current user
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        if (!currentUser) {
          throw new Error('Not authenticated');
        }
        
        // Get user data
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, role')
          .eq('supabase_user_id', currentUser.id)
          .single();
          
        if (userError) {
          throw userError;
        }
        
        if (userData.role !== 'student') {
          throw new Error('Only students can access this page');
        }
        
        // Get classrooms the student is a member of
        const { data: classroomStudents, error: classroomStudentsError } = await supabase
          .from('classroom_students')
          .select('classroom_id')
          .eq('student_id', userData.id);
          
        if (classroomStudentsError) {
          throw classroomStudentsError;
        }
        
        if (!classroomStudents || classroomStudents.length === 0) {
          // No classrooms, return empty
          setSlotsByClassroom({});
          setLoading(false);
          return;
        }
        
        const classroomIds = classroomStudents.map(cs => cs.classroom_id);
        
        // Get classroom details
        const { data: classrooms, error: classroomsError } = await supabase
          .from('classrooms')
          .select(`
            id,
            name,
            faculty:faculty_id(name)
          `)
          .in('id', classroomIds);
          
        if (classroomsError) {
          throw classroomsError;
        }
        
        // Get available slots for all classrooms
        const { data: slots, error: slotsError } = await supabase
          .from('slots')
          .select('*')
          .in('classroom_id', classroomIds)
          .eq('is_available', true)
          .order('day')
          .order('start_time');
          
        if (slotsError) {
          throw slotsError;
        }
        
        // Group slots by classroom
        const groupedSlots: SlotsByClassroom = {};
        
        classrooms.forEach(classroom => {
          groupedSlots[classroom.id] = {
            classroom: {
              id: classroom.id,
              name: classroom.name,
              faculty_name: classroom.faculty?.name
            },
            slots: []
          };
        });
        
        slots.forEach(slot => {
          if (groupedSlots[slot.classroom_id]) {
            groupedSlots[slot.classroom_id].slots.push(slot);
          }
        });
        
        setSlotsByClassroom(groupedSlots);
      } catch (error: any) {
        console.error('Error fetching slots:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAllSlots();
  }, [supabase]);
  
  // Format day name
  const formatDay = (day: string) => {
    const days = {
      'MON': 'Monday',
      'TUE': 'Tuesday',
      'WED': 'Wednesday',
      'THU': 'Thursday',
      'FRI': 'Friday',
      'SAT': 'Saturday',
      'SUN': 'Sunday'
    };
    return days[day as keyof typeof days] || day;
  };
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Error</h1>
          <p className="text-red-400">{error}</p>
          <Link href="/student/dashboard" className="text-indigo-400 mt-4 inline-block">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="mb-8">
            <Link href="/student/dashboard" className="text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-2 mb-4">
              <ArrowLeft size={18} />
              Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold">Available Review Slots</h1>
            <p className="text-gray-400">View and book available slots for your project reviews</p>
          </motion.div>
          
          {/* Slots by Classroom */}
          {Object.keys(slotsByClassroom).length > 0 ? (
            <motion.div variants={itemVariants} className="space-y-8">
              {Object.values(slotsByClassroom).map(({ classroom, slots }) => (
                <div key={classroom.id} className="bg-gradient-to-r from-indigo-900/30 to-purple-900/20 rounded-xl p-5 border border-indigo-800/30 shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-indigo-600 p-2 rounded-lg shadow-md">
                        <School size={18} className="text-white" />
                      </div>
                      <div>
                        <h2 className="font-bold text-lg">{classroom.name}</h2>
                        {classroom.faculty_name && (
                          <p className="text-gray-400 text-sm">Faculty: {classroom.faculty_name}</p>
                        )}
                      </div>
                    </div>
                    <Link 
                      href={`/student/classroom/${classroom.id}/slots`}
                      className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-indigo-700 transition-colors shadow-md"
                    >
                      Book Slots
                    </Link>
                  </div>
                  
                  {slots.length > 0 ? (
                    <div className="bg-gray-900/70 backdrop-blur-sm border border-gray-800 rounded-lg overflow-hidden">
                      <div className="p-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {slots.slice(0, 4).map(slot => (
                            <div
                              key={slot.id}
                              className="bg-gray-800/80 p-3 rounded-lg flex items-center justify-between"
                            >
                              <div className="flex items-center gap-3">
                                <div className="bg-gray-700/80 p-1.5 rounded">
                                  <Clock size={16} className="text-indigo-300" />
                                </div>
                                <div>
                                  <p className="font-medium">{formatDay(slot.day)}, {slot.start_time} - {slot.end_time}</p>
                                  <p className="text-gray-400 text-xs">{slot.duration} minutes • {slot.review_stage}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {slots.length > 4 && (
                          <div className="mt-3 text-center">
                            <Link 
                              href={`/student/classroom/${classroom.id}/slots`}
                              className="text-indigo-400 text-sm hover:text-indigo-300"
                            >
                              View {slots.length - 4} more slots
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-900/70 backdrop-blur-sm border border-gray-800 rounded-lg p-4 text-center">
                      <p className="text-gray-400">No available slots for this classroom</p>
                    </div>
                  )}
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div variants={itemVariants}>
              <div className="bg-gradient-to-r from-indigo-900/30 to-purple-900/20 rounded-xl p-5 border border-indigo-800/30 shadow-xl">
                <div className="bg-gray-900/70 backdrop-blur-sm border border-gray-800 rounded-lg p-6 text-center">
                  <Calendar size={32} className="text-gray-600 mx-auto mb-3" />
                  <h2 className="text-lg font-medium mb-2">No Available Slots</h2>
                  <p className="text-gray-400 mb-4">
                    There are no review slots available for booking at this time.
                  </p>
                  <Link
                    href="/student/dashboard"
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg inline-block text-sm hover:bg-indigo-700 transition-colors"
                  >
                    Return to Dashboard
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
