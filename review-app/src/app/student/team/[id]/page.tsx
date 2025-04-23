'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, Calendar, FileText, Clock, School, Copy, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

interface TeamMember {
  id: number;
  name: string;
  role: string;
  roll_number?: string;
  joined_at: string;
}

interface BookedSlot {
  id: string;
  day: string;
  date: string;
  start_time: string;
  end_time: string;
  review_stage: string;
  classroom_name: string;
  booking_id: string;
}

interface Team {
  id: number;
  name: string;
  project_title?: string;
  invitation_code: string;
  max_members: number;
  classroom_id: number;
  classroom_name: string;
  members: TeamMember[];
  is_leader: boolean;
  booked_slots: BookedSlot[];
}

export default function TeamPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params.id as string;
  
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [bookedSlots, setBookedSlots] = useState<BookedSlot[]>([]);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchTeamData = async () => {
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
          .select('id')
          .eq('supabase_user_id', currentUser.id)
          .single();

        if (userError) {
          throw userError;
        }

        // Check if user is a member of this team
        const { data: membership, error: membershipError } = await supabase
          .from('team_members')
          .select('id, role')
          .eq('team_id', teamId)
          .eq('student_id', userData.id)
          .single();

        if (membershipError) {
          if (membershipError.code === 'PGRST116') {
            router.push('/student/dashboard');
            throw new Error('You are not a member of this team');
          }
          throw membershipError;
        }

        // Get team details
        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .select(`
            id,
            name,
            project_title,
            invitation_code,
            max_members,
            classroom_id,
            classrooms(name)
          `)
          .eq('id', teamId)
          .single();

        if (teamError) {
          throw teamError;
        }

        // Get team members
        const { data: membersData, error: membersError } = await supabase
          .from('team_members')
          .select(`
            id,
            role,
            joined_at,
            users:student_id(
              id,
              name,
              roll_number
            )
          `)
          .eq('team_id', teamId)
          .order('role', { ascending: false }) // Leaders first
          .order('joined_at', { ascending: true });

        if (membersError) {
          throw membersError;
        }

        // Get booked slots for this team
        const { data: bookings, error: bookingsError } = await supabase
          .from('bookings')
          .select(`
            id,
            slot_id,
            created_at,
            slots(
              id,
              day,
              slot_date,
              start_time,
              end_time,
              review_stage,
              classroom_id
            )
          `)
          .eq('team_id', teamId);
          
        if (bookingsError) {
          console.error('Error fetching bookings:', bookingsError);
        }
        
        // Get classroom names for the booked slots
        const bookedSlotsWithClassrooms: BookedSlot[] = [];
        if (bookings && bookings.length > 0) {
          for (const booking of bookings) {
            // TypeScript fix - ensure slots exists and has the expected properties
            const slots = booking.slots as any;
            if (slots && slots.classroom_id) {
              const { data: classroomData } = await supabase
                .from('classrooms')
                .select('name')
                .eq('id', slots.classroom_id)
                .single();
                
              const classroomName = classroomData ? classroomData.name : 'Unknown Classroom';
              
              // Format the date
              const slotDate = slots.slot_date ? new Date(slots.slot_date) : null;
              const formattedDate = slotDate ? 
                new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(slotDate) : 
                slots.day;
              
              bookedSlotsWithClassrooms.push({
                id: slots.id,
                day: slots.day,
                date: formattedDate,
                start_time: slots.start_time,
                end_time: slots.end_time,
                review_stage: slots.review_stage,
                classroom_name: classroomName,
                booking_id: booking.id
              });
            }
          }
        }
        
        // Sort booked slots by date/time
        bookedSlotsWithClassrooms.sort((a, b) => {
          // First compare by date if available
          if (a.date && b.date) {
            return new Date(a.date).getTime() - new Date(b.date).getTime();
          }
          // Then by day of week
          const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
          const dayDiff = days.indexOf(a.day) - days.indexOf(b.day);
          if (dayDiff !== 0) return dayDiff;
          // Then by start time
          return a.start_time.localeCompare(b.start_time);
        });
        
        setBookedSlots(bookedSlotsWithClassrooms);
        
        // Format team data
        const formattedTeam = {
          id: teamData.id,
          name: teamData.name,
          project_title: teamData.project_title,
          invitation_code: teamData.invitation_code,
          max_members: teamData.max_members,
          classroom_id: teamData.classroom_id,
          classroom_name: teamData.classrooms?.name,
          members: membersData.map(member => ({
            id: member.users.id,
            name: member.users.name,
            role: member.role,
            roll_number: member.users.roll_number,
            joined_at: member.joined_at
          })),
          is_leader: membership.role === 'leader',
          booked_slots: bookedSlotsWithClassrooms
        };

        setTeam(formattedTeam);
      } catch (error: any) {
        console.error('Error fetching team data:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    if (teamId) {
      fetchTeamData();
    }
  }, [teamId, supabase, router]);

  const handleLeaveTeam = async () => {
    try {
      if (!confirmLeave) {
        setConfirmLeave(true);
        return;
      }

      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('User not found');
      }

      // Get user details from the database
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('supabase_user_id', currentUser.id)
        .single();

      if (userError) {
        throw userError;
      }

      // Check if user is the team leader
      if (team?.is_leader) {
        // If there are other members, promote the next member to leader
        if (team.members.length > 1) {
          const nextLeader = team.members.find(member => member.id !== userData.id);
          
          if (nextLeader) {
            // Promote next member to leader
            const { error: promoteError } = await supabase
              .from('team_members')
              .update({ role: 'leader' })
              .eq('team_id', teamId)
              .eq('student_id', nextLeader.id);

            if (promoteError) {
              throw promoteError;
            }
          }
        } else {
          // If user is the only member, delete the team
          const { error: deleteTeamError } = await supabase
            .from('teams')
            .delete()
            .eq('id', teamId);

          if (deleteTeamError) {
            throw deleteTeamError;
          }
          
          router.push(`/student/classroom/${team.classroom_id}`);
          return;
        }
      }

      // Remove user from team
      const { error: leaveError } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId)
        .eq('student_id', userData.id);

      if (leaveError) {
        throw leaveError;
      }

      router.push(`/student/classroom/${team.classroom_id}`);
    } catch (error: any) {
      console.error('Error leaving team:', error);
      alert(`Failed to leave team: ${error.message}`);
      setConfirmLeave(false);
    }
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
      <div className="min-h-screen bg-[#0e0e0e] text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0e0e0e] text-white flex items-center justify-center">
        <div className="bg-[#141414] border border-[#1e1e1e] rounded-lg p-8 max-w-md">
          <h2 className="text-lg font-medium mb-3 text-red-400">Error</h2>
          <p className="text-[#a0a0a0] text-sm mb-6">{error}</p>
          <Link 
            href="/student/dashboard" 
            className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-md inline-flex items-center gap-2 text-sm font-medium shadow-md shadow-blue-500/10"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-[#0e0e0e] text-white flex items-center justify-center">
        <div className="bg-[#141414] border border-[#1e1e1e] rounded-lg p-8 max-w-md">
          <h2 className="text-lg font-medium mb-3">Team Not Found</h2>
          <p className="text-[#a0a0a0] text-sm mb-6">The team you're looking for doesn't exist or you don't have access to it.</p>
          <Link 
            href="/student/dashboard" 
            className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-md inline-flex items-center gap-2 text-sm font-medium shadow-md shadow-blue-500/10"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-white">
      {/* Header */}
      <header className="border-b border-[#1e1e1e]">
        <div className="container mx-auto px-6 py-5 flex justify-between items-center">
          <Link href="/student/dashboard" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"></div>
            <h1 className="text-lg font-medium">Review Scheduler</h1>
          </Link>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {}}
              className="w-8 h-8 rounded-full bg-[#1e1e1e] hover:bg-[#252525] flex items-center justify-center transition-colors duration-200 relative group"
            >
              <span className="absolute -bottom-8 right-0 bg-[#252525] text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">View Profile</span>
              <Users size={14} className="text-[#a0a0a0]" />
            </button>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="container mx-auto px-6 py-8">
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="mb-8"
        >
          <motion.div variants={itemVariants} className="mb-8">
            <Link 
              href="/student/dashboard" 
              className="text-[#a0a0a0] hover:text-white inline-flex items-center gap-2 mb-4 text-sm transition-colors duration-200"
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </Link>
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-medium">{team.name}</h2>
                <p className="text-[#a0a0a0] text-sm mt-1">Classroom: {team.classroom_name}</p>
              </div>
              <motion.button
                whileHover={{ y: -2, transition: { duration: 0.2 } }}
                whileTap={{ scale: 0.98 }}
                className="bg-[#1e1e1e] hover:bg-[#252525] text-[#a0a0a0] hover:text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm transition-colors duration-200"
                onClick={handleLeaveTeam}
              >
                <LogOut size={18} />
                {confirmLeave ? 'Confirm Leave' : 'Leave Team'}
              </motion.button>
            </div>
          </motion.div>

          {/* Team Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Team Information */}
            <motion.div variants={itemVariants} className="md:col-span-2">
              <div className="bg-[#141414] border border-[#1e1e1e] rounded-lg p-5">
                <div className="flex justify-between items-center mb-5">
                  <div>
                    <h3 className="text-lg font-medium">Team Information</h3>
                    <p className="text-[#a0a0a0] text-xs mt-1">Details about your team</p>
                  </div>
                </div>
                
                <div className="space-y-5">
                  <div className="bg-[#1a1a1a] rounded-lg p-4">
                    <h4 className="text-xs font-medium mb-2">Project Details</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] text-[#a0a0a0] mb-1">Project Title</p>
                        <p className="text-sm">{team.project_title || 'No project title set'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[#a0a0a0] mb-1">Team Size</p>
                        <p className="text-sm">{team.members.length} / {team.max_members} members</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-[#1a1a1a] rounded-lg p-4">
                    <h4 className="text-xs font-medium mb-2">Team Access</h4>
                    <div>
                      <p className="text-[10px] text-[#a0a0a0] mb-1">Invitation Code</p>
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-sm">{team.invitation_code}</p>
                        <button 
                          className="w-6 h-6 rounded-full bg-[#252525] hover:bg-[#303030] flex items-center justify-center transition-colors duration-200"
                          onClick={() => {
                            navigator.clipboard.writeText(team.invitation_code);
                            setCodeCopied(true);
                            setTimeout(() => setCodeCopied(false), 2000);
                          }}
                        >
                          {codeCopied ? (
                            <span className="text-green-400 text-[10px]">✓</span>
                          ) : (
                            <Copy size={12} className="text-[#a0a0a0]" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-[#1a1a1a] rounded-lg p-4">
                    <h4 className="text-xs font-medium mb-2">Your Status</h4>
                    <div>
                      <p className="text-[10px] text-[#a0a0a0] mb-1">Role</p>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-[10px] rounded-full ${team.is_leader ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'}`}>
                          {team.is_leader ? 'Team Leader' : 'Team Member'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
            
            {/* Team Members */}
            <motion.div variants={itemVariants}>
              <div className="bg-[#141414] border border-[#1e1e1e] rounded-lg p-5">
                <div className="flex justify-between items-center mb-5">
                  <div>
                    <h3 className="text-lg font-medium">Team Members</h3>
                    <p className="text-[#a0a0a0] text-xs mt-1">People in your team</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {team.members.map((member) => (
                    <div 
                      key={member.id} 
                      className="flex items-center justify-between p-3 bg-[#1a1a1a] rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#252525] flex items-center justify-center text-xs font-medium">
                          {member.name ? member.name.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{member.name}</p>
                          {member.roll_number && (
                            <p className="text-[#a0a0a0] text-[10px]">{member.roll_number}</p>
                          )}
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        member.role === 'leader' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'
                      }`}>
                        {member.role === 'leader' ? 'Leader' : 'Member'}
                      </span>
                    </div>
                  ))}
                  
                  {team.members.length < team.max_members && (
                    <div className="p-3 bg-[#1a1a1a] rounded-lg text-center">
                      <p className="text-[#a0a0a0] text-sm mb-2">
                        {team.max_members - team.members.length} more {team.max_members - team.members.length === 1 ? 'member' : 'members'} can join
                      </p>
                      <p className="text-xs text-[#a0a0a0]">
                        Share your team code: <span className="font-mono font-medium text-[#a0a0a0]">{team.invitation_code}</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
          
          {/* Upcoming Reviews */}
          <motion.div variants={itemVariants}>
            <div className="bg-[#141414] border border-[#1e1e1e] rounded-lg p-5">
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h3 className="text-lg font-medium">Upcoming Reviews</h3>
                  <p className="text-[#a0a0a0] text-xs mt-1">Scheduled review sessions</p>
                </div>
              </div>
              
              {team?.booked_slots && team.booked_slots.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#252525]">
                        <th className="px-5 py-3 text-left text-[10px] font-medium text-[#a0a0a0] uppercase tracking-wider">Date</th>
                        <th className="px-5 py-3 text-left text-[10px] font-medium text-[#a0a0a0] uppercase tracking-wider">Time</th>
                        <th className="px-5 py-3 text-left text-[10px] font-medium text-[#a0a0a0] uppercase tracking-wider">Review Stage</th>
                        <th className="px-5 py-3 text-left text-[10px] font-medium text-[#a0a0a0] uppercase tracking-wider">Classroom</th>
                      </tr>
                    </thead>
                    <tbody>
                      {team.booked_slots.map((slot, index) => (
                        <tr key={slot.id} className={index !== team.booked_slots.length - 1 ? "border-b border-[#1e1e1e]" : ""}>
                          <td className="px-5 py-3 whitespace-nowrap text-xs font-medium">
                            {slot.date || slot.day}
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap text-xs text-[#a0a0a0]">
                            {slot.start_time} - {slot.end_time}
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 text-[10px] rounded-full bg-blue-500/10 text-blue-400">
                              {slot.review_stage}
                            </span>
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap text-xs text-[#a0a0a0]">
                            {slot.classroom_name}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="w-10 h-10 bg-[#1e1e1e] rounded-full flex items-center justify-center mx-auto mb-3">
                    <Calendar size={18} className="text-[#a0a0a0]" />
                  </div>
                  <h4 className="text-sm font-medium mb-1">No upcoming reviews</h4>
                  <p className="text-[#a0a0a0] text-xs">Your scheduled reviews will appear here</p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
