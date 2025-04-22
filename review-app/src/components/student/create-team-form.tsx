'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Check, X, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';

interface CreateTeamFormProps {
  classroomId: number;
  onSuccess?: (teamId: number) => void;
  onCancel?: () => void;
}

interface FormData {
  name: string;
  projectTitle: string;
  maxMembers: number;
}

export default function CreateTeamForm({ classroomId, onSuccess, onCancel }: CreateTeamFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [teamId, setTeamId] = useState<number | null>(null);
  const [invitationCode, setInvitationCode] = useState<string | null>(null);
  const supabase = createClientComponentClient();
  
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      name: '',
      projectTitle: '',
      maxMembers: 4
    }
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
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

      // Check if user is already in a team in this classroom
      const { data: existingTeam, error: teamError } = await supabase
        .from('team_members')
        .select(`
          teams!inner(
            id,
            classroom_id
          )
        `)
        .eq('student_id', userData.id)
        .eq('teams.classroom_id', classroomId);

      if (existingTeam && existingTeam.length > 0) {
        throw new Error('You are already in a team in this classroom');
      }

      // Create the team
      const { data: team, error: createError } = await supabase
        .from('teams')
        .insert({
          name: data.name,
          project_title: data.projectTitle,
          max_members: data.maxMembers,
          classroom_id: classroomId,
          members: [] // Initialize with empty array
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      // Add the current user as team leader
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: team.id,
          student_id: userData.id,
          role: 'leader'
        });

      if (memberError) {
        throw memberError;
      }

      // Get the invitation code
      const { data: teamWithCode, error: codeError } = await supabase
        .from('teams')
        .select('invitation_code')
        .eq('id', team.id)
        .single();

      if (codeError) {
        throw codeError;
      }

      setTeamId(team.id);
      setInvitationCode(teamWithCode.invitation_code);
      setSuccess(true);
      
      setTimeout(() => {
        if (onSuccess) onSuccess(team.id);
      }, 3000);
    } catch (error: any) {
      setError(error.message || 'Failed to create team');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-gray-900 border border-gray-800 rounded-xl p-6"
    >
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold">Create New Team</h3>
        {onCancel && (
          <button 
            onClick={onCancel}
            className="text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {success ? (
        <div className="flex flex-col items-center justify-center py-6">
          <div className="w-16 h-16 bg-green-900/30 rounded-full flex items-center justify-center mb-4">
            <Check className="h-8 w-8 text-green-400" />
          </div>
          <h4 className="text-lg font-medium mb-2">Team created successfully!</h4>
          <p className="text-gray-400 text-center mb-6">Your team has been created and you've been added as the team leader</p>
          
          {invitationCode && (
            <div className="w-full bg-gray-800 border border-gray-700 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-400 mb-2">Share this code with your teammates:</p>
              <div className="flex items-center justify-between">
                <p className="text-xl font-mono font-bold tracking-wider text-indigo-400">{invitationCode}</p>
                <button 
                  className="text-indigo-400 hover:text-indigo-300 text-sm"
                  onClick={() => {
                    navigator.clipboard.writeText(invitationCode);
                    alert('Invitation code copied to clipboard!');
                  }}
                >
                  Copy
                </button>
              </div>
            </div>
          )}
          
          <button
            onClick={() => {
              if (onSuccess && teamId) onSuccess(teamId);
            }}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            View Team
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
                Team Name *
              </label>
              <input
                id="name"
                type="text"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Enter a name for your team"
                disabled={isSubmitting}
                {...register('name', { 
                  required: 'Team name is required',
                  maxLength: {
                    value: 50,
                    message: 'Team name cannot exceed 50 characters'
                  }
                })}
              />
              {errors.name && (
                <p className="mt-2 text-red-400 text-sm">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="projectTitle" className="block text-sm font-medium text-gray-300 mb-1">
                Project Title
              </label>
              <input
                id="projectTitle"
                type="text"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Enter your project title (optional)"
                disabled={isSubmitting}
                {...register('projectTitle', { 
                  maxLength: {
                    value: 100,
                    message: 'Project title cannot exceed 100 characters'
                  }
                })}
              />
              {errors.projectTitle && (
                <p className="mt-2 text-red-400 text-sm">{errors.projectTitle.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="maxMembers" className="block text-sm font-medium text-gray-300 mb-1">
                Maximum Team Members
              </label>
              <select
                id="maxMembers"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                disabled={isSubmitting}
                {...register('maxMembers', { 
                  required: 'Maximum members is required',
                  min: {
                    value: 1,
                    message: 'Team must have at least 1 member'
                  },
                  max: {
                    value: 4,
                    message: 'Team cannot have more than 4 members'
                  }
                })}
              >
                <option value="1">1 member</option>
                <option value="2">2 members</option>
                <option value="3">3 members</option>
                <option value="4">4 members</option>
              </select>
              {errors.maxMembers && (
                <p className="mt-2 text-red-400 text-sm">{errors.maxMembers.message}</p>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg flex items-start gap-3">
                <X className="text-red-400 h-5 w-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-red-400 font-medium">Error creating team</p>
                  <p className="text-red-300/80 text-sm">{error}</p>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4">
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="mr-4 px-4 py-2 text-gray-300 hover:text-white"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
              )}
              <motion.button
                type="submit"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Team'
                )}
              </motion.button>
            </div>
          </div>
        </form>
      )}
    </motion.div>
  );
}
