'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Calendar, Users, FileText, Clock, School, X } from 'lucide-react';
import Link from 'next/link';
import LogoutButton from '@/components/auth/logout-button';
import JoinClassroomForm from '@/components/student/join-classroom-form';
import ClassroomCard from '@/components/student/classroom-card';
import ClassroomDetailsModal from '@/components/shared/classroom-details-modal';
import ActivityFeed from '@/components/shared/activity-feed';

interface Classroom {
  id: number;
  name: string;
  faculty_name?: string;
  review_deadlines?: Record<string, string>;
  teams_count?: number;
  students_count?: number;
}

export default function StudentDashboard() {
  const [user, setUser] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [upcomingReviews, setUpcomingReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [showClassroomDetailsModal, setShowClassroomDetailsModal] = useState(false);
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null);
  const supabase = createClientComponentClient();

  const fetchData = async () => {
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

      // Get student's classrooms
      const { data: classroomStudents, error: classroomStudentsError } = await supabase
        .from('classroom_students')
        .select('classroom_id')
        .eq('student_id', userData.id);

      if (classroomStudentsError) {
        throw classroomStudentsError;
      }

      if (classroomStudents && classroomStudents.length > 0) {
        const classroomIds = classroomStudents.map(cs => cs.classroom_id);
        
        // Get classroom details
        const { data: classroomData, error: classroomError } = await supabase
          .from('classrooms')
          .select(`
            id,
            name,
            review_deadlines,
            faculty:faculty_id(name)
          `)
          .in('id', classroomIds);

        if (classroomError) {
          console.error('Error fetching classrooms:', classroomError);
          throw classroomError;
        }

        // Format classroom data
        const formattedClassrooms = [];
        
        for (const classroom of classroomData) {
          // Count teams in this classroom
          const { data: teamsCount, error: teamsCountError } = await supabase
            .from('teams')
            .select('id', { count: 'exact', head: true })
            .eq('classroom_id', classroom.id);
            
          // Count students in this classroom
          const { data: studentsCount, error: studentsCountError } = await supabase
            .from('classroom_students')
            .select('student_id', { count: 'exact', head: true })
            .eq('classroom_id', classroom.id);
          
          formattedClassrooms.push({
            id: classroom.id,
            name: classroom.name,
            faculty_name: classroom.faculty?.name,
            review_deadlines: classroom.review_deadlines,
            teams_count: teamsCount?.count || 0,
            students_count: studentsCount?.count || 0
          });
        }

        console.log('Formatted classrooms:', formattedClassrooms);
        setClassrooms(formattedClassrooms);
      } else {
        console.log('No classrooms found');
        setClassrooms([]);
      }

      // Get student teams
      const { data: teamData, error: teamError } = await supabase
        .from('team_members')
        .select(`
          team:team_id(
            id,
            name,
            project_title,
            classroom_id,
            classroom:classroom_id(name)
          ),
          role,
          student_id
        `)
        .eq('student_id', userData.id);

      if (teamError) {
        throw teamError;
      }

      // Format team data
      const formattedTeams = [];
      
      if (teamData && teamData.length > 0) {
        // Get unique team IDs
        const teamIds = [...new Set(teamData.map(item => item.team.id))];
        
        // For each team, get member count and details
        for (const teamId of teamIds) {
          const teamItem = teamData.find(item => item.team.id === teamId);
          
          if (teamItem) {
            try {
              // Get member count for this team - use a direct count query
              const { count, error: membersCountError } = await supabase
                .from('team_members')
                .select('*', { count: 'exact', head: true })
                .eq('team_id', teamId);
                
              if (membersCountError) {
                console.error('Error getting member count:', membersCountError);
              }
              
              // As a backup, get the actual members to count them
              const { data: teamMembers, error: teamMembersError } = await supabase
                .from('team_members')
                .select('*')
                .eq('team_id', teamId);
                
              // Use the count from the query or fall back to the length of the members array
              const memberCount = count !== null ? count : (teamMembers ? teamMembers.length : 0);
              
              console.log(`Team ${teamId} has ${memberCount} members`);
                
              formattedTeams.push({
                id: teamItem.team.id,
                name: teamItem.team.name,
                project_title: teamItem.team.project_title,
                classroom_id: teamItem.team.classroom_id,
                classroom_name: teamItem.team.classroom?.name,
                role: teamItem.role,
                members_count: memberCount
              });
            } catch (error) {
              console.error('Error processing team:', error);
              // Add the team with a default count of at least 1 (since the user is a member)
              formattedTeams.push({
                id: teamItem.team.id,
                name: teamItem.team.name,
                project_title: teamItem.team.project_title,
                classroom_id: teamItem.team.classroom_id,
                classroom_name: teamItem.team.classroom?.name,
                role: teamItem.role,
                members_count: 1 // At least the current user is a member
              });
            }
          }
        }
      }

      setTeams(formattedTeams);

      // Get the user's teams
      const { data: userTeams, error: userTeamsError } = await supabase
        .from('team_members')
        .select(`
          team:team_id(
            id,
            name,
            classroom_id
          )
        `)
        .eq('student_id', userData.id);

      if (userTeamsError) {
        console.error('Error fetching user teams:', userTeamsError);
      }

      // Get team IDs
      const teamIds = userTeams?.map(item => item.team.id) || [];

      // Fetch booked slots (upcoming reviews)
      if (teamIds.length > 0) {
        const { data: bookings, error: bookingsError } = await supabase
          .from('bookings')
          .select(`
            id,
            slot:slot_id(
              id,
              day,
              start_time,
              end_time,
              review_stage,
              classroom:classroom_id(name)
            ),
            team:team_id(name, project_title),
            is_confirmed,
            created_at
          `)
          .in('team_id', teamIds)
          .eq('is_confirmed', true)
          .order('created_at', { ascending: false });

        if (bookingsError) {
          console.error('Error fetching bookings:', bookingsError);
        } else {
          // Format upcoming reviews
          const formattedReviews = bookings?.map(booking => {
            const slot = booking.slot;
            const today = new Date();
            const reviewDate = getDayDate(slot.day);
            const isPast = reviewDate < today;

            return {
              id: booking.id,
              title: slot.review_stage,
              date: reviewDate.toLocaleDateString(),
              time: `${slot.start_time} - ${slot.end_time}`,
              status: isPast ? 'Completed' : 'Scheduled',
              classroom: slot.classroom.name,
              team: booking.team.name
            };
          }).filter(review => review.status !== 'Completed') || [];

          setUpcomingReviews(formattedReviews);
        }
      } else {
        setUpcomingReviews([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get the date for a day of the week
  const getDayDate = (day: string) => {
    const days = {
      'MON': 1,
      'TUE': 2,
      'WED': 3,
      'THU': 4,
      'FRI': 5,
      'SAT': 6,
      'SUN': 0
    };
    
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const targetDay = days[day as keyof typeof days];
    
    // Calculate days to add
    let daysToAdd = targetDay - currentDay;
    if (daysToAdd <= 0) daysToAdd += 7; // If target day is today or earlier, go to next week
    
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysToAdd);
    return targetDate;
  };

  useEffect(() => {
    fetchData();
  }, [supabase]);

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
          className="mb-8"
        >
          <motion.div variants={itemVariants} className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold">Student Dashboard</h2>
              <p className="text-gray-400">Manage your classrooms, teams, and review schedules</p>
            </div>
            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium"
                onClick={() => setShowJoinForm(true)}
              >
                <School size={18} />
                Join Classroom
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white text-black px-4 py-2 rounded-lg flex items-center gap-2 font-medium"
                disabled={classrooms.length === 0}
                title={classrooms.length === 0 ? "Join a classroom first" : "Create or join a team"}
              >
                <Plus size={18} />
                Join Team
              </motion.button>
            </div>
          </motion.div>

          {/* Stats overview */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-900/30 rounded-lg">
                  <School className="text-indigo-400" size={24} />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Classrooms</p>
                  <h3 className="text-2xl font-bold">{classrooms.length}</h3>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-900/30 rounded-lg">
                  <Users className="text-purple-400" size={24} />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Teams</p>
                  <h3 className="text-2xl font-bold">{teams.length}</h3>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-900/30 rounded-lg">
                  <Calendar className="text-emerald-400" size={24} />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Upcoming Reviews</p>
                  <h3 className="text-2xl font-bold">{upcomingReviews.length}</h3>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-rose-900/30 rounded-lg">
                  <Clock className="text-rose-400" size={24} />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Roll Number</p>
                  <h3 className="text-sm font-medium truncate max-w-[120px]">{user?.roll_number || 'Not set'}</h3>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Available Review Slots */}
          <motion.div variants={itemVariants} className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Available Review Slots</h3>
              <Link href="/student/slots" className="text-sm text-indigo-400 hover:text-indigo-300">View all</Link>
            </div>
            
            <div className="bg-gradient-to-r from-indigo-900/30 to-purple-900/20 rounded-xl p-5 border border-indigo-800/30 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-indigo-600 p-2 rounded-lg shadow-md">
                  <Calendar size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Book Your Review Slots</h3>
                  <p className="text-gray-400 text-sm">Select a time slot for your team's project review</p>
                </div>
              </div>
              
              {classrooms.length === 0 ? (
                <div className="bg-gray-900/70 rounded-lg p-4 backdrop-blur-sm border border-gray-800 text-center">
                  <p className="text-gray-400 mb-3">You haven't joined any classrooms yet</p>
                  <Link href="/student/join" className="bg-indigo-600 text-white px-4 py-2 rounded-lg inline-block text-sm font-medium hover:bg-indigo-700 transition-colors">
                    Join a Classroom
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {classrooms.map((classroom) => (
                    <Link 
                      key={classroom.id}
                      href={`/student/classroom/${classroom.id}/slots`}
                      className="bg-gray-900/70 rounded-lg p-4 backdrop-blur-sm border border-gray-800 hover:bg-gray-800/70 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold">{classroom.name}</h4>
                        <span className="text-xs bg-indigo-900/50 text-indigo-300 px-2 py-0.5 rounded-full">
                          View Slots
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm mb-3">
                        {classroom.faculty_name ? `Faculty: ${classroom.faculty_name}` : 'No faculty assigned'}
                      </p>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock size={14} className="text-indigo-400" />
                        <span>Book your review slot now</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Join Classroom Form */}
          <AnimatePresence>
            {showJoinForm && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="mb-8"
              >
                <JoinClassroomForm 
                  onSuccess={() => {
                    setShowJoinForm(false);
                    fetchData();
                  }}
                  onCancel={() => setShowJoinForm(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Classrooms */}
          <motion.div variants={itemVariants} className="mb-8">
            <h3 className="text-xl font-bold mb-4">Your Classrooms</h3>
            
            {classrooms.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
                <div className="mb-4 mx-auto w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center">
                  <School size={24} className="text-gray-400" />
                </div>
                <h4 className="text-lg font-medium mb-2">No classrooms joined yet</h4>
                <p className="text-gray-400 mb-6">Join a classroom to start creating or joining teams</p>
                <button 
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium mx-auto"
                  onClick={() => setShowJoinForm(true)}
                >
                  <Plus size={18} />
                  Join Classroom
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {classrooms.map((classroom) => (
                  <div key={classroom.id} className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:bg-gray-800 transition-colors" onClick={() => {
                    setSelectedClassroom(classroom);
                    setShowClassroomDetailsModal(true);
                  }}>
                    <h4 className="font-bold text-lg mb-2">{classroom.name}</h4>
                    <p className="text-gray-400 text-sm mb-4">{classroom.faculty_name}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs bg-gray-800 px-2 py-1 rounded-full">
                        {classroom.teams_count || 0} team{classroom.teams_count !== 1 ? 's' : ''}
                      </span>
                      <span className="text-xs bg-indigo-900/30 text-indigo-400 px-2 py-1 rounded-full">
                        {classroom.students_count || 0} student{classroom.students_count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Teams */}
          <motion.div variants={itemVariants} className="mb-8">
            <h3 className="text-xl font-bold mb-4">Your Teams</h3>
            
            {teams.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
                <div className="mb-4 mx-auto w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center">
                  <Users size={24} className="text-gray-400" />
                </div>
                <h4 className="text-lg font-medium mb-2">No teams yet</h4>
                <p className="text-gray-400 mb-6">Join a team or create one to start scheduling reviews</p>
                <button 
                  className="bg-white text-black px-4 py-2 rounded-lg flex items-center gap-2 font-medium mx-auto"
                  disabled={classrooms.length === 0}
                  title={classrooms.length === 0 ? "Join a classroom first" : "Create or join a team"}
                >
                  <Plus size={18} />
                  Join Team
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {teams.map((team) => (
                  <Link 
                    href={`/student/team/${team.id}`} 
                    key={team.id}
                    className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:bg-gray-800 transition-colors"
                  >
                    <h4 className="font-bold text-lg mb-2">{team.name}</h4>
                    <p className="text-gray-400 text-sm mb-4">{team.project_title}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs bg-gray-800 px-2 py-1 rounded-full">
                        {team.members_count || 0} member{team.members_count !== 1 ? 's' : ''}
                      </span>
                      <span className="text-xs bg-indigo-900/30 text-indigo-400 px-2 py-1 rounded-full">
                        {team.classroom_name}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </motion.div>

          {/* Activity Feed */}
          <motion.div variants={itemVariants} className="mb-12">
            <h3 className="text-xl font-bold mb-4">Activity Feed</h3>
            <ActivityFeed userRole="student" />
          </motion.div>

          {/* Upcoming Reviews */}
          <motion.div variants={itemVariants}>
            <h3 className="text-xl font-bold mb-4">Upcoming Reviews</h3>
            
            {upcomingReviews.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
                <div className="mb-4 mx-auto w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center">
                  <Calendar size={24} className="text-gray-400" />
                </div>
                <h4 className="text-lg font-medium mb-2">No upcoming reviews</h4>
                <p className="text-gray-400">Your scheduled reviews will appear here</p>
              </div>
            ) : (
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Review</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Classroom</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Team</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {upcomingReviews.map((review, index) => (
                        <tr key={review.id} className={index !== upcomingReviews.length - 1 ? "border-b border-gray-800" : ""}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{review.title}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{review.date}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{review.time}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{review.classroom}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{review.team}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs rounded-full bg-emerald-900/30 text-emerald-400">
                              {review.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                            <Link href={`/student/bookings/${review.id}`} className="text-indigo-400 hover:text-indigo-300">
                              View Details
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      </main>

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
