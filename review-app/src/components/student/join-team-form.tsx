'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Check, X, Loader2 } from 'lucide-react';

interface JoinTeamFormProps {
  classroomId: number;
  onSuccess?: (teamId: number) => void;
  onCancel?: () => void;
}

export default function JoinTeamForm({ classroomId, onSuccess, onCancel }: JoinTeamFormProps) {
  const [invitationCode, setInvitationCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [teamId, setTeamId] = useState<number | null>(null);
  const [teamName, setTeamName] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!invitationCode.trim()) {
      setError('Please enter a team invitation code');
      return;
    }

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

      // Check if team exists
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('id, name, classroom_id, max_members')
        .eq('invitation_code', invitationCode.toUpperCase())
        .single();

      if (teamError) {
        if (teamError.code === 'PGRST116') {
          throw new Error('Team not found. Please check the invitation code and try again.');
        }
        throw teamError;
      }

      // Check if team is in the correct classroom
      if (team.classroom_id !== classroomId) {
        throw new Error('This team is not in the current classroom');
      }

      // Check if student is already in a team in this classroom
      const { data: existingTeam, error: existingTeamError } = await supabase
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

      // Check if team is full
      const { data: teamMembers, error: membersError } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', team.id);

      if (membersError) {
        throw membersError;
      }

      if (teamMembers && teamMembers.length >= team.max_members) {
        throw new Error('This team is already full');
      }

      // Join the team
      const { error: joinError } = await supabase
        .from('team_members')
        .insert({
          team_id: team.id,
          student_id: userData.id,
          role: 'member'
        });

      if (joinError) {
        throw joinError;
      }

      setTeamId(team.id);
      setTeamName(team.name);
      setSuccess(true);
      
      setTimeout(() => {
        if (onSuccess) onSuccess(team.id);
      }, 2000);
    } catch (error: any) {
      setError(error.message || 'Failed to join team');
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
        <h3 className="text-xl font-bold">Join Team</h3>
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
          <h4 className="text-lg font-medium mb-2">Successfully joined team!</h4>
          <p className="text-gray-400 text-center mb-6">
            You have joined <span className="text-white font-medium">{teamName}</span>
          </p>
          
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
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="invitationCode" className="block text-sm font-medium text-gray-300 mb-1">
              Team Invitation Code
            </label>
            <input
              type="text"
              id="invitationCode"
              value={invitationCode}
              onChange={(e) => setInvitationCode(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter the invitation code (e.g., AB12CD)"
              disabled={isSubmitting}
            />
            {error && (
              <p className="mt-2 text-red-400 text-sm">{error}</p>
            )}
          </div>

          <div className="flex justify-end">
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
                  Joining...
                </>
              ) : (
                'Join Team'
              )}
            </motion.button>
          </div>
        </form>
      )}
    </motion.div>
  );
}
