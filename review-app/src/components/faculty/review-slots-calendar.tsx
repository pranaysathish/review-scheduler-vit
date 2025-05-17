'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface ReviewSlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  day_of_week: string;
  status: string;
}

interface ReviewSlotsCalendarProps {
  slots: ReviewSlot[];
}

export default function ReviewSlotsCalendar({ slots }: ReviewSlotsCalendarProps) {
  const [slotsByDay, setSlotsByDay] = useState<Record<string, ReviewSlot[]>>({});
  
  // Group slots by day of week
  useEffect(() => {
    const groupedSlots: Record<string, ReviewSlot[]> = {
      'MON': [],
      'TUE': [],
      'WED': [],
      'THU': [],
      'FRI': [],
      'SAT': [],
      'SUN': []
    };
    
    slots.forEach(slot => {
      // Extract day of week from date
      const day = slot.day_of_week || 'MON';
      if (groupedSlots[day]) {
        groupedSlots[day].push(slot);
      }
    });
    
    setSlotsByDay(groupedSlots);
  }, [slots]);
  
  // Animation variants
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3
      }
    }
  };
  
  return (
    <motion.div
      variants={itemVariants}
      className="bg-[#141414] border border-[#1e1e1e] rounded-lg overflow-hidden p-4 max-w-5xl mx-auto"
    >
      <div className="mb-3">
        <p className="text-[#a0a0a0] text-sm">
          Green slots are available, yellow are partially booked, and red are fully booked
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {Object.entries(slotsByDay).map(([day, daySlots]) => (
          <div key={day} className="bg-[#1a1a1a] border border-[#252525] rounded-lg p-3">
            <h4 className="text-center font-medium mb-3">{day}</h4>
            <div className="space-y-2">
              {daySlots.length === 0 ? (
                <div className="text-center text-xs text-[#505050] py-2">No slots</div>
              ) : (
                daySlots.map(slot => {
                  let statusColor = 'bg-[#4ade80]/10 border-[#4ade80]/20 text-[#4ade80]';
                  if (slot.status === 'Booked') {
                    statusColor = 'bg-[#f87171]/10 border-[#f87171]/20 text-[#f87171]';
                  } else if (slot.status === 'Partially Booked') {
                    statusColor = 'bg-[#f59e0b]/10 border-[#f59e0b]/20 text-[#f59e0b]';
                  }
                  
                  return (
                    <div 
                      key={slot.id}
                      className={`border rounded-md p-2 text-xs ${statusColor}`}
                    >
                      {slot.start_time} - {slot.end_time}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
