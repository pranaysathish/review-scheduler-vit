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
          is_leader: membership.role === 'leader'
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
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 max-w-md">
          <h2 className="text-xl font-bold mb-4 text-red-400">Error</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <Link href="/student/dashboard" className="bg-indigo-600 text-white px-4 py-2 rounded-lg inline-flex items-center gap-2">
            <ArrowLeft size={18} />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 max-w-md">
          <h2 className="text-xl font-bold mb-4">Team Not Found</h2>
          <p className="text-gray-300 mb-6">The team you're looking for doesn't exist or you don't have access to it.</p>
          <Link href="/student/dashboard" className="bg-indigo-600 text-white px-4 py-2 rounded-lg inline-flex items-center gap-2">
            <ArrowLeft size={18} />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="mb-8"
        >
          <motion.div variants={itemVariants} className="mb-6">
            <Link href={`/student/classroom/${team.classroom_id}`} className="text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-2 mb-4">
              <ArrowLeft size={18} />
              Back to Classroom
            </Link>
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold">{team.name}</h2>
                <p className="text-gray-400">Classroom: {team.classroom_name}</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium hover:bg-red-700"
                onClick={handleLeaveTeam}
              >
                <LogOut size={18} />
                {confirmLeave ? 'Confirm Leave' : 'Leave Team'}
              </motion.button>
            </div>
          </motion.div>

          {/* Team Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Team Information */}
            <motion.div variants={itemVariants} className="md:col-span-2">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-xl font-bold mb-4">Team Information</h3>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm text-gray-400 mb-1">Project Title</h4>
                    <p className="font-medium">{team.project_title || 'No project title set'}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm text-gray-400 mb-1">Team Size</h4>
                    <p className="font-medium">{team.members.length} / {team.max_members} members</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm text-gray-400 mb-1">Invitation Code</h4>
                    <div className="flex items-center gap-2">
                      <p className="font-mono font-medium">{team.invitation_code}</p>
                      <button 
                        className="text-indigo-400 hover:text-indigo-300"
                        onClick={() => {
                          navigator.clipboard.writeText(team.invitation_code);
                          setCodeCopied(true);
                          setTimeout(() => setCodeCopied(false), 2000);
                        }}
                      >
                        {codeCopied ? (
                          <span className="text-green-400 text-xs">Copied!</span>
                        ) : (
                          <Copy size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm text-gray-400 mb-1">Your Role</h4>
                    <p className="font-medium capitalize">{team.is_leader ? 'Team Leader' : 'Team Member'}</p>
                  </div>
                </div>
              </div>
            </motion.div>
            
            {/* Team Members */}
            <motion.div variants={itemVariants}>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-xl font-bold mb-4">Team Members</h3>
                
                <div className="space-y-4">
                  {team.members.map((member) => (
                    <div 
                      key={member.id} 
                      className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{member.name}</p>
                        {member.roll_number && (
                          <p className="text-gray-400 text-xs">{member.roll_number}</p>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        member.role === 'leader' 
                          ? 'bg-indigo-900/30 text-indigo-400' 
                          : 'bg-gray-700 text-gray-400'
                      }`}>
                        {member.role === 'leader' ? 'Leader' : 'Member'}
                      </span>
                    </div>
                  ))}
                  
                  {team.members.length < team.max_members && (
                    <div className="p-3 bg-gray-800/50 border border-dashed border-gray-700 rounded-lg text-center">
                      <p className="text-gray-400 text-sm mb-2">
                        {team.max_members - team.members.length} more {team.max_members - team.members.length === 1 ? 'member' : 'members'} can join
                      </p>
                      <p className="text-xs text-gray-500">
                        Share your team code: <span className="font-mono font-medium text-indigo-400">{team.invitation_code}</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
          
          {/* Upcoming Reviews */}
          <motion.div variants={itemVariants}>
            <h3 className="text-xl font-bold mb-4">Upcoming Reviews</h3>
            
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
              <div className="mb-4 mx-auto w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center">
                <Calendar size={24} className="text-gray-400" />
              </div>
              <h4 className="text-lg font-medium mb-2">No upcoming reviews</h4>
              <p className="text-gray-400">Your scheduled reviews will appear here</p>
            </div>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
