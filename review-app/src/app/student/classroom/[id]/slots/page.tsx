'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, Clock, CheckCircle, AlertCircle, Plus } from 'lucide-react';
import Link from 'next/link';

interface Slot {
  id: number;
  day: string;
  start_time: string;
  end_time: string;
  duration: number;
  review_stage: string;
  is_available: boolean;
  booking_deadline: string;
}

interface Team {
  id: number;
  name: string;
  project_title?: string;
  isLeader: boolean;
}

export default function StudentSlotBookingPage() {
  const params = useParams();
  const router = useRouter();
  const classroomId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsByDay, setSlotsByDay] = useState<Record<string, Slot[]>>({});
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [bookingStatus, setBookingStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [bookingMessage, setBookingMessage] = useState<string>('');
  
  // Fetch available slots
  useEffect(() => {
    const fetchSlots = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/slots/available/${classroomId}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch slots');
        }
        
        const data = await response.json();
        setSlots(data.slots || []);
        setSlotsByDay(data.slotsByDay || {});
        setTeams(data.teams || []);
        
        // Auto-select team if there's only one
        if (data.teams && data.teams.length === 1) {
          setSelectedTeam(data.teams[0].id);
        }
      } catch (error: any) {
        console.error('Error fetching slots:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSlots();
  }, [classroomId]);
  
  // Book a slot
  const bookSlot = async () => {
    if (!selectedTeam || !selectedSlot) {
      setBookingStatus('error');
      setBookingMessage('Please select a team and a slot');
      return;
    }
    
    try {
      setBookingStatus('loading');
      
      const response = await fetch('/api/slots/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slotId: selectedSlot,
          teamId: selectedTeam
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to book slot');
      }
      
      const result = await response.json();
      setBookingStatus('success');
      setBookingMessage(result.message || 'Slot booked successfully!');
      
      // Remove the booked slot from the list
      setSlots(slots.filter(slot => slot.id !== selectedSlot));
      
      // Update slotsByDay
      const updatedSlotsByDay = { ...slotsByDay };
      Object.keys(updatedSlotsByDay).forEach(day => {
        updatedSlotsByDay[day] = updatedSlotsByDay[day].filter(slot => slot.id !== selectedSlot);
        if (updatedSlotsByDay[day].length === 0) {
          delete updatedSlotsByDay[day];
        }
      });
      setSlotsByDay(updatedSlotsByDay);
      
      // Reset selection
      setSelectedSlot(null);
      
      // Redirect after a delay
      setTimeout(() => {
        router.push(`/student/classroom/${classroomId}`);
      }, 2000);
    } catch (error: any) {
      console.error('Error booking slot:', error);
      setBookingStatus('error');
      setBookingMessage(error.message);
    }
  };
  
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
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => router.back()}
                className="p-2 rounded-full bg-gray-900 hover:bg-gray-800 transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-2xl font-bold">Book Review Slot</h1>
                <p className="text-gray-400">Select a time slot for your team's review</p>
              </div>
            </div>
            
            {/* Booking Deadline Alert */}
            {slots.length > 0 && slots[0].booking_deadline && (
              <div className="bg-amber-900/20 border border-amber-800/50 rounded-lg p-4 mt-4 flex items-start gap-3">
                <Clock className="text-amber-400 h-5 w-5 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-amber-300">Booking Deadline</h3>
                  <p className="text-amber-200/80">
                    You must book your slot before {new Date(slots[0].booking_deadline).toLocaleDateString()} for {slots[0].review_stage}
                  </p>
                </div>
              </div>
            )}
          </motion.div>
          
          {/* Team Selection */}
          {teams.length > 0 ? (
            <motion.div variants={itemVariants} className="mb-6">
              <h2 className="text-lg font-medium mb-3">Select Your Team</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {teams.map(team => (
                  <div
                    key={team.id}
                    className={`p-4 rounded-lg cursor-pointer transition-colors ${
                      selectedTeam === team.id
                        ? 'bg-indigo-900/50 border border-indigo-700'
                        : 'bg-gray-900 border border-gray-800 hover:bg-gray-800'
                    } ${!team.isLeader ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => team.isLeader && setSelectedTeam(team.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{team.name}</h3>
                        {team.project_title && (
                          <p className="text-gray-400 text-sm">{team.project_title}</p>
                        )}
                      </div>
                      {team.isLeader ? (
                        <span className="text-xs bg-indigo-900/30 text-indigo-300 px-2 py-1 rounded-full">
                          Team Leader
                        </span>
                      ) : (
                        <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded-full">
                          Member
                        </span>
                      )}
                    </div>
                    {!team.isLeader && (
                      <p className="text-amber-400 text-xs mt-2">
                        Only team leaders can book slots
                      </p>
                    )}
                  </div>
                ))}
              </div>
              {teams.length === 0 && (
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-center">
                  <p className="text-gray-400">You are not a member of any team in this classroom</p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div variants={itemVariants} className="mb-6">
              <div className="bg-amber-900/20 border border-amber-800/50 rounded-lg p-4">
                <h2 className="text-lg font-medium text-amber-300 mb-2">No Teams Available</h2>
                <p className="text-amber-200/80">
                  You need to join or create a team in this classroom before you can book a review slot.
                </p>
                <Link 
                  href={`/student/classroom/${classroomId}/teams`}
                  className="mt-3 inline-block text-amber-300 hover:text-amber-200"
                >
                  Go to Teams Page
                </Link>
              </div>
            </motion.div>
          )}
          
          {/* Available Slots */}
          {Object.keys(slotsByDay).length > 0 ? (
            <motion.div variants={itemVariants}>
              <h2 className="text-lg font-medium mb-3">Available Slots</h2>
              <div className="bg-gradient-to-r from-indigo-900/30 to-purple-900/20 rounded-xl p-5 border border-indigo-800/30 shadow-xl">
                <div className="space-y-4">
                  {Object.entries(slotsByDay).map(([day, daySlots]) => (
                    <div key={day} className="bg-gray-900/70 backdrop-blur-sm border border-gray-800 rounded-lg overflow-hidden">
                      <div className="bg-gray-800/80 p-3 border-b border-gray-700">
                        <h3 className="font-medium flex items-center gap-2">
                          <Calendar size={16} className="text-indigo-400" />
                          {formatDay(day)}
                        </h3>
                      </div>
                      <div className="p-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {daySlots.map(slot => (
                            <div
                              key={slot.id}
                              className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                                selectedSlot === slot.id
                                  ? 'bg-indigo-900/50 border border-indigo-700'
                                  : 'bg-gray-800/80 hover:bg-gray-700/80'
                              } ${!selectedTeam || teams.every(t => !t.isLeader) ? 'opacity-50 cursor-not-allowed' : ''}`}
                              onClick={() => {
                                if (selectedTeam && teams.some(t => t.id === selectedTeam && t.isLeader)) {
                                  setSelectedSlot(slot.id);
                                }
                              }}
                            >
                              <div className="flex items-center gap-3">
                                <div className="bg-gray-700/80 p-1.5 rounded">
                                  <Clock size={16} className="text-indigo-300" />
                                </div>
                                <div>
                                  <p className="font-medium">{slot.start_time} - {slot.end_time}</p>
                                  <p className="text-gray-400 text-xs">{slot.duration} minutes • {slot.review_stage}</p>
                                </div>
                              </div>
                              <div>
                                {selectedSlot === slot.id ? (
                                  <div className="bg-indigo-900/50 p-1.5 rounded-full">
                                    <CheckCircle size={16} className="text-indigo-300" />
                                  </div>
                                ) : (
                                  <div className="bg-gray-700/50 p-1.5 rounded-full opacity-50 group-hover:opacity-100">
                                    <Plus size={14} className="text-gray-300" />
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div variants={itemVariants}>
              <div className="bg-gradient-to-r from-indigo-900/30 to-purple-900/20 rounded-xl p-5 border border-indigo-800/30 shadow-xl">
                <div className="bg-gray-900/70 backdrop-blur-sm border border-gray-800 rounded-lg p-6 text-center">
                  <Calendar size={32} className="text-gray-600 mx-auto mb-3" />
                  <h2 className="text-lg font-medium mb-2">No Available Slots</h2>
                  <p className="text-gray-400">
                    There are no review slots available for booking at this time.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
          
          {/* Booking Action */}
          {(selectedTeam && selectedSlot) && (
            <motion.div 
              variants={itemVariants} 
              className="mt-6 bg-gradient-to-r from-indigo-900/30 to-purple-900/20 rounded-xl p-5 border border-indigo-800/30 shadow-xl"
            >
              <div className="bg-gray-900/70 backdrop-blur-sm border border-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-indigo-600 p-2 rounded-lg shadow-md">
                      <Calendar size={18} className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-medium">Ready to Book</h3>
                      <p className="text-gray-400 text-sm">
                        Book this slot for your team's review
                      </p>
                    </div>
                  </div>
                  <button
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-md"
                    onClick={bookSlot}
                    disabled={bookingStatus === 'loading'}
                  >
                    {bookingStatus === 'loading' ? 'Booking...' : 'Book Slot'}
                  </button>
                </div>
                
                {bookingStatus === 'success' && (
                  <div className="mt-3 p-3 bg-green-900/30 border border-green-800 rounded-lg flex items-start gap-2">
                    <CheckCircle className="text-green-400 h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-green-300 font-medium">Booking Successful!</p>
                      <p className="text-green-300/80 text-sm">{bookingMessage}</p>
                    </div>
                  </div>
                )}
                
                {bookingStatus === 'error' && (
                  <div className="mt-3 p-3 bg-red-900/30 border border-red-800 rounded-lg flex items-start gap-2">
                    <AlertCircle className="text-red-400 h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-red-300 font-medium">Booking Failed</p>
                      <p className="text-red-300/80 text-sm">{bookingMessage}</p>
                    </div>
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
