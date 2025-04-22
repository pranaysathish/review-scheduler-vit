'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, UserPlus, School, Calendar, Clock, Plus, UserX } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

interface Student {
  id: number;
  name: string;
  email: string;
  roll_number: string;
  team?: {
    id: number;
    name: string;
    project_title?: string;
    role?: string;
  };
}

interface Team {
  id: number;
  name: string;
  project_title?: string;
  members_count: number;
  members: {
    id: number;
    name: string;
    email: string;
    roll_number?: string;
    role: string;
  }[];
}

interface Classroom {
  id: number;
  name: string;
  link_code: string;
  review_deadlines: Record<string, string>;
  created_at: string;
}

export default function ClassroomManagementPage() {
  const params = useParams();
  const router = useRouter();
  const classroomId = params.id as string;
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('students');

  useEffect(() => {
    const fetchClassroomData = async () => {
      try {
        setLoading(true);
        
        // Fetch classroom details first
        const classroomResponse = await fetch(`/api/classrooms/${classroomId}/data`);
        
        if (!classroomResponse.ok) {
          const errorData = await classroomResponse.json();
          throw new Error(errorData.message || 'Failed to fetch classroom data');
        }
        
        const classroomData = await classroomResponse.json();
        console.log('Received classroom data:', classroomData);
        
        setClassroom(classroomData.classroom);
        setStudents(classroomData.students || []);
        
        // Fetch teams separately using the dedicated endpoint
        const teamsResponse = await fetch(`/api/classrooms/${classroomId}/teams`);
        
        if (teamsResponse.ok) {
          const teamsData = await teamsResponse.json();
          console.log('Received teams data:', teamsData);
          setTeams(teamsData.teams || []);
        } else {
          console.error('Failed to fetch teams, but continuing with other data');
          setTeams([]);
        }
      } catch (error: any) {
        console.error('Error fetching classroom data:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    if (classroomId) {
      fetchClassroomData();
    }
  }, [classroomId]);

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

  if (error || !classroom) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Error</h1>
          <p className="text-red-400">{error || 'Classroom not found'}</p>
          <Link href="/faculty/dashboard" className="text-indigo-400 mt-4 inline-block">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => router.back()}
                className="p-2 rounded-full bg-gray-900 hover:bg-gray-800 transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-2xl font-bold">{classroom.name}</h1>
                <p className="text-gray-400">Classroom Management</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 mb-6">
              <div className="bg-indigo-900/30 text-indigo-300 px-4 py-2 rounded-lg flex items-center gap-2">
                <Users size={18} />
                <span>{students.length} students</span>
              </div>
              <div className="bg-emerald-900/30 text-emerald-300 px-4 py-2 rounded-lg flex items-center gap-2">
                <School size={18} />
                <span>{teams.length} teams</span>
              </div>
              <div className="bg-gray-800 px-4 py-2 rounded-lg flex items-center gap-2">
                <Calendar size={18} className="text-purple-400" />
                <span>
                  {Object.keys(classroom.review_deadlines || {}).length > 0
                    ? `${Object.keys(classroom.review_deadlines).length} deadlines`
                    : 'No deadlines set'}
                </span>
              </div>
            </div>

            {/* Invitation Code */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-400 mb-2">Classroom Invitation Code</p>
              <div className="flex items-center justify-between">
                <code className="font-mono text-indigo-300 text-lg">{classroom.link_code}</code>
                <button
                  className="text-indigo-400 hover:text-indigo-300 p-2"
                  onClick={() => {
                    navigator.clipboard.writeText(classroom.link_code);
                    alert('Invitation code copied to clipboard!');
                  }}
                >
                  Copy
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-800 mb-6">
              <div className="flex gap-6">
                <button
                  className={`pb-3 px-1 ${
                    activeTab === 'students'
                      ? 'text-white border-b-2 border-indigo-500 font-medium'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                  onClick={() => setActiveTab('students')}
                >
                  Students
                </button>
                <button
                  className={`pb-3 px-1 ${
                    activeTab === 'teams'
                      ? 'text-white border-b-2 border-indigo-500 font-medium'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                  onClick={() => setActiveTab('teams')}
                >
                  Teams
                </button>
              </div>
            </div>
          </motion.div>

          {/* Students Tab */}
          {activeTab === 'students' && (
            <motion.div variants={itemVariants}>
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                  <h2 className="font-medium">All Students</h2>
                  <span className="text-sm text-gray-400">{students.length} total</span>
                </div>

                {!students || students.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <UserX size={32} className="mx-auto mb-2 text-gray-600" />
                    <p>No students have joined this classroom yet</p>
                    <p className="text-sm mt-2">Share the invitation code with your students</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-800/50 text-left">
                        <tr>
                          <th className="px-4 py-3 text-sm font-medium text-gray-400">Name</th>
                          <th className="px-4 py-3 text-sm font-medium text-gray-400">Roll Number</th>
                          <th className="px-4 py-3 text-sm font-medium text-gray-400">Email</th>
                          <th className="px-4 py-3 text-sm font-medium text-gray-400">Team</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {students.map((student) => (
                          <tr key={student.id} className="hover:bg-gray-800/50">
                            <td className="px-4 py-3">{student.name || 'Unknown'}</td>
                            <td className="px-4 py-3 font-mono text-sm text-gray-300">
                              {student.roll_number || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-300">{student.email || '-'}</td>
                            <td className="px-4 py-3">
                              {student.team ? (
                                <span className="bg-emerald-900/30 text-emerald-300 px-2 py-1 rounded text-sm">
                                  {student.team.name}
                                </span>
                              ) : (
                                <span className="bg-gray-800 text-gray-400 px-2 py-1 rounded text-sm">
                                  No Team
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Teams Tab */}
          {activeTab === 'teams' && (
            <motion.div variants={itemVariants}>
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mb-6">
                <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                  <h2 className="font-medium">All Teams</h2>
                  <span className="text-sm text-gray-400">{teams.length} total</span>
                </div>

                {!teams || teams.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <Users size={32} className="mx-auto mb-2 text-gray-600" />
                    <p>No teams have been created in this classroom yet</p>
                    <p className="text-sm mt-2">Students can create teams after joining</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-800">
                    {teams.map((team) => (
                      <div key={team.id} className="p-4">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-medium text-lg">{team.name || 'Unnamed Team'}</h3>
                            {team.project_title && (
                              <p className="text-gray-400 text-sm">{team.project_title}</p>
                            )}
                          </div>
                          <span className="bg-indigo-900/30 text-indigo-300 px-3 py-1 rounded-lg text-sm">
                            {team.members_count || 0} members
                          </span>
                        </div>

                        {team.members && team.members.length > 0 ? (
                          <div className="bg-gray-800/50 rounded-lg overflow-hidden">
                            <table className="w-full">
                              <thead className="bg-gray-800 text-left">
                                <tr>
                                  <th className="px-4 py-2 text-xs font-medium text-gray-400">Name</th>
                                  <th className="px-4 py-2 text-xs font-medium text-gray-400">Roll Number</th>
                                  <th className="px-4 py-2 text-xs font-medium text-gray-400">Role</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-700/30">
                                {team.members.map((member) => (
                                  <tr key={member.id} className="hover:bg-gray-800/70">
                                    <td className="px-4 py-2">{member.name || 'Unknown'}</td>
                                    <td className="px-4 py-2 font-mono text-xs text-gray-300">
                                      {member.roll_number || '-'}
                                    </td>
                                    <td className="px-4 py-2">
                                      <span className={`px-2 py-1 rounded text-xs ${
                                        member.role === 'leader' 
                                          ? 'bg-indigo-900/30 text-indigo-300' 
                                          : 'bg-gray-800 text-gray-300'
                                      }`}>
                                        {member.role || 'member'}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="bg-gray-800/50 rounded-lg p-4 text-center text-gray-400">
                            <p>No members in this team</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
