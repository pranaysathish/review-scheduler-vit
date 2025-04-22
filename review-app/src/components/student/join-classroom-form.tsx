'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Loader2 } from 'lucide-react';

interface JoinClassroomFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function JoinClassroomForm({ onSuccess, onCancel }: JoinClassroomFormProps) {
  const [linkCode, setLinkCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!linkCode.trim()) {
      setError('Please enter a classroom link code');
      return;
    }
    
    // Format the code properly (remove spaces, make uppercase)
    let formattedCode = linkCode.trim().toUpperCase();
    
    // Add hyphen if missing (XXX-XXX format)
    if (formattedCode.length === 6 && !formattedCode.includes('-')) {
      formattedCode = `${formattedCode.slice(0, 3)}-${formattedCode.slice(3, 6)}`;
    }
    
    // Remove hyphen if needed for backend processing
    const processedCode = formattedCode.replace(/-/g, '');

    setIsSubmitting(true);
    setError(null);

    try {
      // Use the API endpoint to join classroom
      const response = await fetch('/api/classrooms/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          linkCode: processedCode
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to join classroom');
      }

      const result = await response.json();
      
      if (result.alreadyJoined) {
        throw new Error('You are already a member of this classroom');
      }

      setSuccess(true);
      setLinkCode(''); // Reset the link code after joining a classroom
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (error: any) {
      setError(error.message || 'Failed to join classroom');
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
        <h3 className="text-xl font-bold">Join Classroom</h3>
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
          <h4 className="text-lg font-medium mb-2">Successfully joined classroom!</h4>
          <p className="text-gray-400 text-center">You can now create or join teams in this classroom</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="linkCode" className="block text-sm font-medium text-gray-300 mb-1">
              Classroom Link Code
            </label>
            <input
              type="text"
              id="linkCode"
              value={linkCode}
              onChange={(e) => setLinkCode(e.target.value)}
              placeholder="XXX-XXX"
              maxLength={7}
              pattern="[A-Za-z0-9]{3}-?[A-Za-z0-9]{3}"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent uppercase"
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
                'Join Classroom'
              )}
            </motion.button>
          </div>
        </form>
      )}
    </motion.div>
  );
}
