"use client";

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Calendar, Users, FileText, Settings, Clock, Upload, Grid, BookOpen, AlertCircle, CheckCircle } from 'lucide-react';
import LogoutButton from '@/components/auth/logout-button';
import { parseTimetableSlots, getAllFreeSlots, FreeSlot, Schedule, splitAllSlotsByDuration } from '@/utils/timetable-parser';
import CreateClassroomForm from '@/components/faculty/create-classroom-form';
import ClassroomDetailsModal from '@/components/faculty/classroom-details-modal';
import ActivityFeed from '@/components/shared/activity-feed';

export default function FacultyDashboard() {
  const [user, setUser] = useState<any>(null);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [reviewSlots, setReviewSlots] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const supabase = createClientComponentClient();

  // Classroom state
  const [showCreateClassroomForm, setShowCreateClassroomForm] = useState(false);
  const [selectedClassroom, setSelectedClassroom] = useState<any>(null);
  const [showClassroomDetailsModal, setShowClassroomDetailsModal] = useState(false);

  // Timetable state
  const [timetableText, setTimetableText] = useState('');
  const [parsedSchedule, setParsedSchedule] = useState<Schedule | null>(null);
  const [allFreeSlots, setAllFreeSlots] = useState<FreeSlot[]>([]);
  const [splitFreeSlots, setSplitFreeSlots] = useState<FreeSlot[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<FreeSlot[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseSuccess, setParseSuccess] = useState(false);
  const [highlightedSlot, setHighlightedSlot] = useState<string | null>(null);

  // Review slot form state
  const [reviewDuration, setReviewDuration] = useState('10');
  const [reviewStage, setReviewStage] = useState('Review 1');
  const [selectedClassroomId, setSelectedClassroomId] = useState('');
  const [bookingDeadline, setBookingDeadline] = useState('');
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [publishError, setPublishError] = useState(false);
  const [publishMessage, setPublishMessage] = useState('');

  // Function to check if a slot is selected
  const isSlotSelected = (day: string, time: string, endTime: string) => {
    return selectedSlots.some(
      slot => slot.day === day && slot.start === time && slot.end === endTime
    );
  };

  // Function to toggle slot selection
  const toggleSlotSelection = (day: string, time: string, endTime: string, isFree: boolean) => {
    if (!isFree) return; // Can't select busy slots
    
    const slotKey = `${day}-${time}-${endTime}`;
    
    if (isSlotSelected(day, time, endTime)) {
      // Remove from selected
      setSelectedSlots(selectedSlots.filter(
        slot => !(slot.day === day && slot.start === time && slot.end === endTime)
      ));
    } else {
      // Add to selected
      setSelectedSlots([...selectedSlots, {
        day,
        start: time,
        end: endTime,
        code: null
      }]);
    }
  };

  // Effect to update split slots when duration changes
  useEffect(() => {
    if (allFreeSlots.length > 0) {
      const duration = parseInt(reviewDuration, 10);
      const splitSlots = splitAllSlotsByDuration(allFreeSlots, duration);
      setSplitFreeSlots(splitSlots);
    }
  }, [reviewDuration, allFreeSlots]);

  // Function to fetch classroom data with student counts
  const fetchData = async () => {
    try {
      setLoading(true);
      
      console.log('Current user:', user);
      
      // First, try to fetch all classrooms directly to see what's available
      const { data: allClassrooms, error: allClassroomsError } = await supabase
        .from('classrooms')
        .select('*');
      
      // Get current user's Supabase ID
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      // Try to use the RPC function first
      try {
        // Attempt to call the RPC function
        const { data: classroomData, error: classroomError } = await supabase
          .rpc('get_classrooms_with_student_counts', { p_faculty_id: user?.id });
        
        if (!classroomError && classroomData) {
          // If RPC was successful, use the data directly
          console.log('RPC function succeeded:', classroomData);
          setClassrooms(classroomData || []);
        } else {
          // Fallback to standard query if RPC fails
          console.log('RPC function failed, using fallback query');
          let fallbackData, fallbackError;
          
          // Try with the database user ID first - use a more detailed query
          const { data: data1, error: error1 } = await supabase
            .from('classrooms')
            .select(`
              *,
              teams:teams(count),
              students:classroom_students(count),
              classroom_students(*)
            `)
            .eq('faculty_id', user?.id);
            
          console.log('Direct query with database ID result:', { data1, error1 });
          
          if (data1 && data1.length > 0) {
            fallbackData = data1;
            fallbackError = error1;
          } else {
            // If no results, try with the Supabase user ID
            const { data: data2, error: error2 } = await supabase
              .from('classrooms')
              .select(`
                *,
                teams:teams(count),
                students:classroom_students(count)
              `)
              .eq('faculty_id', currentUser?.id);
              
            console.log('Direct query with Supabase ID result:', { data2, error2 });
            
            fallbackData = data2;
            fallbackError = error2;
          }

          if (fallbackError) {
            throw fallbackError;
          }

          // Process the counts from the join with improved student counting
          const processedClassrooms = fallbackData?.map(classroom => {
            // Calculate student count manually if needed
            let studentCount = classroom.students?.count || 0;
            
            // If we have classroom_students data, count them directly
            if (classroom.classroom_students && Array.isArray(classroom.classroom_students)) {
              studentCount = classroom.classroom_students.length;
              console.log(`Manual count for ${classroom.name}:`, studentCount);
            }
            
            return {
              ...classroom,
              teams_count: classroom.teams?.count || 0,
              students_count: studentCount
            };
          }) || [];
          
          // After processing classrooms, fetch student counts directly
          const fetchStudentCounts = async () => {
            try {
              for (const classroom of processedClassrooms) {
                // Direct query for classroom students
                const { data: students, error } = await supabase
                  .from('classroom_students')
                  .select('*')
                  .eq('classroom_id', classroom.id);
                  
                if (!error && students) {
                  // Update the classroom with the actual student count
                  classroom.students_count = students.length;
                  console.log(`Direct student count for ${classroom.name}:`, students.length);
                  console.log('Student data:', students);
                }
              }
              
              // Update the state with the corrected data
              setClassrooms([...processedClassrooms]);
            } catch (error) {
              console.error('Error fetching student counts:', error);
            }
          };
          
          // Execute the student count fetch
          fetchStudentCounts();
          
          // Initial set of classrooms before the fetch completes
          setClassrooms(processedClassrooms);
        }
      } catch (error) {
        console.error('Error with RPC function:', error);
        // Continue with fallback approach if there's an error with the RPC call
      }
      
      // After classrooms are loaded, fetch slots and submissions
      fetchReviewSlots();
      fetchSubmissions();
    } catch (error) {
      console.error('Error fetching classroom data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        
        // Get current user
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        if (!currentUser) {
          throw new Error('User not found');
        }

        // Get user details from the database
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('supabase_user_id', currentUser.id)
          .single();

        if (userError) {
          throw userError;
        }

        setUser(userData);
        fetchData();
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, [supabase]);
  
  // Function to fetch review slots
  const fetchReviewSlots = async () => {
    try {
      setSlotsLoading(true);
      // Check if API endpoint exists before fetching
      try {
        const response = await fetch('/api/faculty/slots');
        
        if (!response.ok) {
          // If API returns error, just set empty array and don't throw
          setReviewSlots([]);
          return;
        }
        
        const { data } = await response.json();
        setReviewSlots(data || []);
      } catch (error) {
        // If API doesn't exist or network error, just set empty array
        setReviewSlots([]);
      }
    } catch (error) {
      // This won't be reached due to inner try/catch, but keeping for safety
      console.error('Error fetching review slots:', error);
      setReviewSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };
  
  // Function to fetch submissions
  const fetchSubmissions = async () => {
    try {
      setSubmissionsLoading(true);
      // Check if API endpoint exists before fetching
      try {
        const response = await fetch('/api/faculty/submissions');
        
        if (!response.ok) {
          // If API returns error, just set empty array and don't throw
          setSubmissions([]);
          return;
        }
        
        const { data } = await response.json();
        setSubmissions(data || []);
      } catch (error) {
        // If API doesn't exist or network error, just set empty array
        setSubmissions([]);
      }
    } catch (error) {
      // This won't be reached due to inner try/catch, but keeping for safety
      console.error('Error fetching submissions:', error);
      setSubmissions([]);
    } finally {
      setSubmissionsLoading(false);
    }
  };

  // Helper function to convert day number to full day name
  const getDayFullName = (day: number) => {
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    return days[day] || 'Unknown';
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
      opacity: 1,
      transition: {
        duration: 0.5
      }
    }
  };

  const fadeInVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">VIT Review</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-400">{user?.name}</span>
            <LogoutButton variant="minimal" />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {/* Welcome message with fade-in animation */}
          <motion.div
            variants={fadeInVariants}
            className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 rounded-xl p-8 mb-8 border border-indigo-800/50"
          >
            <h1 className="text-2xl font-bold mb-2">Welcome back, {user?.name || 'Faculty'}</h1>
            <p className="text-gray-300 mb-4">
              Manage your classrooms, review schedules, and student submissions from this dashboard.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 ${
                  activeTab === 'overview'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <Grid size={16} />
                Overview
              </button>
              <button
                onClick={() => setActiveTab('timetable')}
                className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 ${
                  activeTab === 'timetable'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <Calendar size={16} />
                Timetable
              </button>
              <button
                onClick={() => setActiveTab('slots')}
                className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 ${
                  activeTab === 'slots'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <Clock size={16} />
                Review Slots
              </button>
              <button
                onClick={() => setActiveTab('submissions')}
                className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 ${
                  activeTab === 'submissions'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <FileText size={16} />
                Submissions
              </button>
            </div>
          </motion.div>

          {activeTab === 'overview' && (
            <>
              <motion.div variants={itemVariants} className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Dashboard Overview</h2>
                  <p className="text-gray-400">Manage your classrooms and review schedules</p>
                </div>
                <button
                  onClick={() => setShowCreateClassroomForm(true)}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors"
                >
                  <Plus size={18} />
                  New Classroom
                </button>
              </motion.div>

              {/* Stats grid */}
              <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-indigo-900/30 rounded-lg">
                      <Users className="text-indigo-400" size={24} />
                    </div>
                    <span className="text-xs text-gray-500">Total</span>
                  </div>
                  <h3 className="text-2xl font-bold mb-1">{classrooms.length}</h3>
                  <p className="text-gray-400 text-sm">Classrooms</p>
                </div>
                
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-emerald-900/30 rounded-lg">
                      <Users className="text-emerald-400" size={24} />
                    </div>
                    <span className="text-xs text-gray-500">Total</span>
                  </div>
                  <h3 className="text-2xl font-bold mb-1">
                    {classrooms.reduce((sum, classroom) => sum + (classroom.students_count || 0), 0)}
                  </h3>
                  <p className="text-gray-400 text-sm">Students</p>
                </div>
                
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-amber-900/30 rounded-lg">
                      <Users className="text-amber-400" size={24} />
                    </div>
                    <span className="text-xs text-gray-500">Total</span>
                  </div>
                  <h3 className="text-2xl font-bold mb-1">
                    {classrooms.reduce((sum, classroom) => sum + (classroom.teams_count || 0), 0)}
                  </h3>
                  <p className="text-gray-400 text-sm">Teams</p>
                </div>
                
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-purple-900/30 rounded-lg">
                      <Calendar className="text-purple-400" size={24} />
                    </div>
                    <span className="text-xs text-gray-500">Total</span>
                  </div>
                  <h3 className="text-2xl font-bold mb-1">{reviewSlots.length}</h3>
                  <p className="text-gray-400 text-sm">Review Slots</p>
                </div>
              </motion.div>

              <motion.div variants={itemVariants}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold">Your Classrooms</h3>
                  <button className="text-sm text-indigo-400 hover:text-indigo-300">View all</button>
                </div>
                
                {classrooms.length === 0 ? (
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
                    <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <BookOpen className="text-gray-400" size={24} />
                    </div>
                    <h4 className="text-lg font-medium mb-2">No classrooms yet</h4>
                    <p className="text-gray-400 mb-6">Create your first classroom to get started</p>
                    <button
                      onClick={() => setShowCreateClassroomForm(true)}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg inline-flex items-center gap-2"
                    >
                      <Plus size={18} />
                      Create Classroom
                    </button>
                  </div>
                ) : (
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {classrooms.map((classroom) => (
                      <motion.div 
                        key={classroom.id} 
                        whileHover={{ scale: 1.02 }}
                        className="bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800 rounded-xl p-6 hover:border-indigo-600 transition-all cursor-pointer shadow-lg hover:shadow-indigo-900/20"
                        onClick={() => {
                          setSelectedClassroom(classroom);
                          setShowClassroomDetailsModal(true);
                        }}
                      >
                        <div className="flex justify-between items-start mb-5">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-900/30 rounded-lg">
                              <BookOpen className="text-indigo-400" size={18} />
                            </div>
                            <h4 className="font-bold text-lg">{classroom.name}</h4>
                          </div>
                          <span className="px-3 py-1 bg-indigo-900/30 border border-indigo-800/50 rounded-full text-xs font-mono font-bold text-indigo-400">
                            {classroom.link_code}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-5">
                          <div className="bg-gray-800/50 rounded-lg p-3 flex flex-col items-center justify-center">
                            <div className="flex items-center gap-2 mb-1">
                              <Users size={14} className="text-blue-400" />
                              <span className="text-gray-400 text-xs">Students</span>
                            </div>
                            <span className="text-xl font-bold">
                              {classroom.students_count || 0}
                            </span>
                          </div>
                          <div className="bg-gray-800/50 rounded-lg p-3 flex flex-col items-center justify-center">
                            <div className="flex items-center gap-2 mb-1">
                              <Users size={14} className="text-amber-400" />
                              <span className="text-gray-400 text-xs">Teams</span>
                            </div>
                            <span className="text-xl font-bold">{classroom.teams_count || 0}</span>
                          </div>
                        </div>
                        
                        <button className="w-full py-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-800/50 rounded-lg text-sm font-medium text-indigo-300 transition-colors flex items-center justify-center gap-2">
                          <span>View Details</span>
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>

              {/* Recent activity */}
              <motion.div variants={itemVariants} className="mt-8">
                <h3 className="text-xl font-bold mb-4">Recent Activity</h3>
                <ActivityFeed userRole="faculty" />
              </motion.div>
            </>
          )}

          {activeTab === 'timetable' && (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={containerVariants}
            >
              <motion.div variants={itemVariants} className="mb-6 text-center">
                <h2 className="text-2xl font-bold mb-2">Timetable Management</h2>
                <p className="text-gray-400 max-w-2xl mx-auto">Upload and parse your VIT timetable to automatically identify free slots for scheduling reviews</p>
              </motion.div>

              {/* Timetable upload */}
              <motion.div variants={itemVariants} className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
                <div className="mb-4">
                  <h3 className="text-xl font-bold mb-2">Parse Timetable</h3>
                  <p className="text-gray-400 text-sm">
                    Copy and paste your VIT timetable text here. The system will automatically identify your free slots.
                  </p>
                </div>

                <div className="space-y-4">
                  <textarea
                    value={timetableText}
                    onChange={(e) => setTimetableText(e.target.value)}
                    className="w-full h-40 bg-gray-800 border border-gray-700 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Paste your timetable text here..."
                  />

                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        try {
                          setParseError(null);
                          setParseSuccess(false);
                          
                          if (!timetableText.trim()) {
                            setParseError('Please paste your timetable text first');
                            return;
                          }
                          
                          const schedule = parseTimetableSlots(timetableText);
                          setParsedSchedule(schedule);
                          
                          const freeSlots = getAllFreeSlots(schedule);
                          setAllFreeSlots(freeSlots);
                          
                          const duration = parseInt(reviewDuration, 10);
                          const splitSlots = splitAllSlotsByDuration(freeSlots, duration);
                          setSplitFreeSlots(splitSlots);
                          
                          setParseSuccess(true);
                        } catch (error) {
                          console.error('Error parsing timetable:', error);
                          setParseError('Failed to parse timetable. Please check the format and try again.');
                        }
                      }}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors"
                    >
                      <Upload size={18} />
                      Parse Timetable
                    </button>
                  </div>

                  {parseError && (
                    <div className="flex items-center gap-2 text-red-400 bg-red-900/20 p-3 rounded-lg">
                      <AlertCircle size={18} />
                      <span>{parseError}</span>
                    </div>
                  )}

                  {parseSuccess && (
                    <div className="flex items-center gap-2 text-green-400 bg-green-900/20 p-3 rounded-lg">
                      <CheckCircle size={18} />
                      <span>Timetable parsed successfully! {allFreeSlots.length} free slots found.</span>
                    </div>
                  )}
                </div>
              </motion.div>

              {allFreeSlots.length > 0 && (
                <motion.div 
                  variants={itemVariants}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  {/* Available Slots List */}
                  <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                    <div className="border-b border-gray-800 p-3 flex justify-between items-center">
                      <h3 className="text-xl font-bold">Available Slots</h3>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-400">Duration:</label>
                        <select
                          value={reviewDuration}
                          onChange={(e) => setReviewDuration(e.target.value)}
                          className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-sm text-white"
                        >
                          <option value="10">10 min</option>
                          <option value="15">15 min</option>
                          <option value="20">20 min</option>
                          <option value="30">30 min</option>
                          <option value="45">45 min</option>
                          <option value="60">60 min</option>
                        </select>
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
                        {splitFreeSlots.length === 0 ? (
                          <div className="text-center py-4 text-gray-400">
                            <Clock size={24} className="mx-auto mb-2 text-gray-600" />
                            No slots available with the selected duration
                          </div>
                        ) : (
                          splitFreeSlots.map((slot, index) => {
                            const isSelected = isSlotSelected(slot.day, slot.start, slot.end);
                            const slotKey = `${slot.day}-${slot.start || ''}-${slot.end || ''}`;
                            const isHighlighted = highlightedSlot === slotKey;
                            
                            return (
                              <div
                                key={index}
                                className={`p-2 border rounded-lg flex justify-between items-center cursor-pointer transition-colors ${isSelected
                                  ? 'bg-indigo-900/30 border-indigo-700 text-indigo-300'
                                  : isHighlighted
                                  ? 'bg-gray-800 border-gray-700 text-white'
                                  : 'bg-gray-800/50 border-gray-700/50 text-gray-300 hover:bg-gray-800 hover:border-gray-700'
                                }`}
                                onClick={() => toggleSlotSelection(slot.day, slot.start, slot.end, true)}
                                onMouseEnter={() => setHighlightedSlot(slotKey || null)}
                                onMouseLeave={() => setHighlightedSlot(null)}
                              >
                                <div className="flex items-center gap-2">
                                  <div className={`w-3 h-3 rounded-full ${isSelected ? 'bg-indigo-500' : 'bg-gray-600'}`}></div>
                                  <span className="text-sm">
                                    {slot.day}, {slot.start} - {slot.end}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500">
                                  {parseInt(reviewDuration)} min
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-gray-800 flex justify-between items-center text-sm">
                        <div className="text-gray-400">
                          {selectedSlots.length} slots selected
                        </div>
                        <button
                          onClick={() => setSelectedSlots([])}
                          className="text-red-400 hover:text-red-300"
                          disabled={selectedSlots.length === 0}
                        >
                          Clear Selection
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Publish Slots Form */}
                  <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                    <div className="border-b border-gray-800 p-3">
                      <h3 className="font-bold text-sm flex items-center gap-2">
                        <Calendar size={14} className="text-indigo-400" />
                        Publish Review Slots
                      </h3>
                    </div>
                    <div className="p-3">
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">
                            Review Stage
                          </label>
                          <select
                            value={reviewStage}
                            onChange={(e) => setReviewStage(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                          >
                            <option value="Review 1">Review 1</option>
                            <option value="Review 2">Review 2</option>
                            <option value="Review 3">Review 3</option>
                            <option value="Final Review">Final Review</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">
                            Classroom
                          </label>
                          <select
                            value={selectedClassroomId}
                            onChange={(e) => setSelectedClassroomId(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                          >
                            <option value="">Select a classroom</option>
                            {classrooms.map((classroom) => (
                              <option key={classroom.id} value={classroom.id}>
                                {classroom.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">
                            Booking Deadline
                          </label>
                          <input
                            type="date"
                            value={bookingDeadline}
                            onChange={(e) => setBookingDeadline(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                          />
                        </div>
                        
                        <div className="pt-2">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`w-full py-2 px-4 rounded-lg text-sm flex items-center justify-center gap-2 ${
                              selectedSlots.length > 0 && selectedClassroomId && bookingDeadline
                                ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                : 'bg-gray-700 text-gray-300 cursor-not-allowed'
                            }`}
                            disabled={!(selectedSlots.length > 0 && selectedClassroomId && bookingDeadline)}
                            onClick={async () => {
                              try {
                                setPublishSuccess(false);
                                setPublishError(false);
                                setPublishMessage('');
                                
                                if (!(selectedSlots.length > 0 && selectedClassroomId && bookingDeadline)) {
                                  return;
                                }
                                
                                // Create slots in the database
                                const { data, error } = await supabase
                                  .from('slots')
                                  .insert(
                                    selectedSlots.map(slot => ({
                                      day: slot.day,
                                      start_time: slot.start,
                                      end_time: slot.end,
                                      duration: parseInt(reviewDuration),
                                      classroom_id: selectedClassroomId,
                                      review_stage: reviewStage,
                                      booking_deadline: bookingDeadline,
                                      is_available: true
                                    }))
                                  );
                                
                                if (error) {
                                  throw error;
                                }
                                
                                setPublishSuccess(true);
                                setPublishMessage(`Successfully published ${selectedSlots.length} review slots!`);
                                setSelectedSlots([]);
                                fetchReviewSlots();
                              } catch (error) {
                                console.error('Error publishing slots:', error);
                                setPublishError(true);
                                setPublishMessage('Failed to publish slots. Please try again.');
                              }
                            }}
                          >
                            <Calendar size={16} />
                            Publish {selectedSlots.length} Slots
                          </motion.button>
                        </div>
                        
                        {publishSuccess && (
                          <div className="mt-2 flex items-center gap-2 text-green-400 bg-green-900/20 p-3 rounded-lg">
                            <CheckCircle size={18} />
                            <span>{publishMessage}</span>
                          </div>
                        )}
                        
                        {publishError && (
                          <div className="mt-2 flex items-center gap-2 text-red-400 bg-red-900/20 p-3 rounded-lg">
                            <AlertCircle size={18} />
                            <span>{publishMessage}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
          {activeTab === 'slots' && (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={containerVariants}
            >
              <motion.div variants={itemVariants} className="mb-6">
                <h2 className="text-2xl font-bold mb-2">Review Slots</h2>
                <p className="text-gray-400">Manage and monitor your published review slots</p>
              </motion.div>

              {/* Review Slots List */}
              <motion.div variants={itemVariants} className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold">Published Slots</h3>
                  <div className="flex gap-2">
                    <select className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1 text-sm text-white">
                      <option value="all">All Classrooms</option>
                      {classrooms.map((classroom) => (
                        <option key={classroom.id} value={classroom.id}>
                          {classroom.name}
                        </option>
                      ))}
                    </select>
                    <select className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1 text-sm text-white">
                      <option value="all">All Stages</option>
                      <option value="Review 1">Review 1</option>
                      <option value="Review 2">Review 2</option>
                      <option value="Review 3">Review 3</option>
                      <option value="Final Review">Final Review</option>
                    </select>
                  </div>
                </div>

                <motion.div variants={itemVariants} className="bg-gray-900 border border-gray-800 rounded-xl p-6 overflow-hidden">
                  {slotsLoading ? (
                    <div className="flex justify-center items-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                    </div>
                  ) : reviewSlots.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="mb-4 mx-auto w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center">
                        <Calendar size={24} className="text-gray-400" />
                      </div>
                      <h4 className="text-lg font-medium mb-2">No review slots found</h4>
                      <p className="text-gray-400 mb-6">Create review slots by parsing your timetable</p>
                      <button 
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg inline-flex items-center gap-2 font-medium"
                        onClick={() => setActiveTab('timetable')}
                      >
                        <Clock size={18} />
                        Parse Timetable
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-800">
                        <thead>
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Time Slot</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Duration</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Classroom</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Review Stage</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Bookings</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                          {reviewSlots.map((slot) => (
                            <tr key={slot.id} className="bg-gray-900 hover:bg-gray-800">
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-white">
                                {getDayFullName(slot.day)}, {slot.time}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400">
                                {slot.duration} mins
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400">
                                {slot.classroom}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400">
                                {slot.review_stage}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400">
                                {slot.bookings_count}/{slot.is_available ? 'Open' : 'Closed'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  slot.status === 'Available' ? 'bg-emerald-900/30 text-emerald-400' :
                                  slot.status === 'Booked' ? 'bg-amber-900/30 text-amber-400' :
                                  'bg-red-900/30 text-red-400'
                                }`}>
                                  {slot.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400">
                                <button className="text-indigo-400 hover:text-indigo-300 mr-2">
                                  Edit
                                </button>
                                <button className="text-red-400 hover:text-red-300">
                                  Cancel
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </motion.div>
              </motion.div>

              {/* Calendar View */}
              <motion.div variants={itemVariants} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-xl font-bold mb-4">Calendar View</h3>
                <p className="text-gray-400 text-sm mb-6">
                  Green slots are available, yellow are partially booked, and red are fully booked
                </p>
                <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                  {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => (
                    <div key={day} className="bg-gray-800 rounded-lg p-3">
                      <h4 className="text-center font-medium mb-3 pb-2 border-b border-gray-700">{day}</h4>
                      <div className="space-y-2">
                        {Array.from({ length: 8 }).map((_, timeIndex) => {
                          const hour = 9 + timeIndex;
                          const status = Math.random() > 0.7 ? 'booked' : Math.random() > 0.5 ? 'partial' : 'available';

                          return (
                            <div
                              key={`${day}-${timeIndex}`}
                              className={`p-2 rounded-md text-xs ${
                                status === 'available'
                                  ? 'bg-green-900/20 border border-green-800/30 text-green-400'
                                  : status === 'partial'
                                  ? 'bg-yellow-900/20 border border-yellow-800/30 text-yellow-400'
                                  : 'bg-red-900/20 border border-red-800/30 text-red-400'
                              }`}
                            >
                              {hour}:00 - {hour}:30
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}

          {activeTab === 'submissions' && (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={containerVariants}
            >
              <motion.div variants={itemVariants} className="mb-6">
                <h2 className="text-2xl font-bold mb-2">Submissions</h2>
                <p className="text-gray-400">Review and manage student submissions</p>
              </motion.div>

              {/* Submissions List */}
              <motion.div variants={itemVariants} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold">Recent Submissions</h3>
                  <div className="flex gap-2">
                    <select className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1 text-sm text-white">
                      <option value="all">All Classrooms</option>
                      {classrooms.map((classroom) => (
                        <option key={classroom.id} value={classroom.id}>
                          {classroom.name}
                        </option>
                      ))}
                    </select>
                    <select className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1 text-sm text-white">
                      <option value="all">All Statuses</option>
                      <option value="pending">Pending</option>
                      <option value="reviewed">Reviewed</option>
                      <option value="graded">Graded</option>
                    </select>
                  </div>
                </div>

                {submissionsLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                  </div>
                ) : submissions.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="mb-4 mx-auto w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center">
                      <FileText size={24} className="text-gray-400" />
                    </div>
                    <h4 className="text-lg font-medium mb-2">No submissions yet</h4>
                    <p className="text-gray-400">Student submissions will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {submissions.map((submission) => (
                      <div key={submission.id} className="bg-gray-800 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium">{submission.title}</h4>
                            <p className="text-gray-400 text-sm">Team {submission.team_name} - {submission.project_title}</p>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            submission.status === 'Pending' ? 'bg-amber-900/30 text-amber-400' :
                            submission.status === 'Reviewed' ? 'bg-emerald-900/30 text-emerald-400' :
                            submission.status === 'Graded' ? 'bg-indigo-900/30 text-indigo-400' :
                            'bg-gray-700 text-gray-300'
                          }`}>
                            {submission.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300 mb-3 line-clamp-2">
                          {submission.description || 'No description provided'}
                        </p>
                        <div className="flex justify-between items-center text-xs text-gray-400">
                          <span>Submitted on {submission.formatted_date}</span>
                          <div className="flex gap-2">
                            {submission.file_url && (
                              <a 
                                href={submission.file_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-indigo-400 hover:text-indigo-300"
                              >
                                View File
                              </a>
                            )}
                            <button className="text-green-400 hover:text-green-300">
                              {submission.status === 'Pending' ? 'Mark as Reviewed' : 'Update Status'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      </main>

      {/* Create Classroom Modal */}
      <AnimatePresence>
        {showCreateClassroomForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
          >
            <div className="w-full max-w-lg">
              <CreateClassroomForm
                onSuccess={(classroomId) => {
                  setShowCreateClassroomForm(false);
                  // Refresh the data
                  fetchData();
                }}
                onCancel={() => setShowCreateClassroomForm(false)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Classroom Details Modal */}
      <AnimatePresence>
        {showClassroomDetailsModal && (
          <ClassroomDetailsModal
            classroom={selectedClassroom}
            onClose={() => setShowClassroomDetailsModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper function to get full day name
function getDayFullName(day: string): string {
  const days: Record<string, string> = {
    'MON': 'Monday',
    'TUE': 'Tuesday',
    'WED': 'Wednesday',
    'THU': 'Thursday',
    'FRI': 'Friday',
    'SAT': 'Saturday',
    'SUN': 'Sunday'
  };
  
  return days[day] || day;
}
