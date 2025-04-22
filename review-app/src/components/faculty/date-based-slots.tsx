'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, X, Check } from 'lucide-react';
import { FreeSlot } from '@/utils/timetable-parser';
import { getDayStringFromDate, formatDateForInput } from '@/lib/utils';

interface DateBasedSlotsProps {
  selectedDates: Date[];
  allFreeSlots: FreeSlot[];
  reviewDuration: string;
  onSlotsSelected: (slots: Array<FreeSlot & { slot_date: Date }>) => void;
  onBack: () => void;
  onCancel: () => void;
}

export default function DateBasedSlots({
  selectedDates,
  allFreeSlots,
  reviewDuration,
  onSlotsSelected,
  onBack,
  onCancel
}: DateBasedSlotsProps) {
  // State for slots organized by date
  const [slotsByDate, setSlotsByDate] = useState<Record<string, FreeSlot[]>>({});
  // State for selected slots with their dates
  const [selectedSlots, setSelectedSlots] = useState<Array<FreeSlot & { slot_date: Date }>>([]);
  
  // Organize slots by date when component mounts or dependencies change
  useEffect(() => {
    const newSlotsByDate: Record<string, FreeSlot[]> = {};
    
    // For each selected date
    selectedDates.forEach(date => {
      const dateString = formatDateForInput(date);
      const dayOfWeek = getDayStringFromDate(date);
      
      // Filter slots that match the day of week
      const matchingSlots = allFreeSlots.filter(slot => slot.day === dayOfWeek);
      
      if (matchingSlots.length > 0) {
        newSlotsByDate[dateString] = matchingSlots;
      }
    });
    
    setSlotsByDate(newSlotsByDate);
  }, [selectedDates, allFreeSlots]);
  
  // Toggle slot selection
  const toggleSlotSelection = (date: Date, slot: FreeSlot) => {
    const dateString = formatDateForInput(date);
    const slotWithDate = { ...slot, slot_date: date };
    
    // Check if this slot is already selected
    const isSelected = selectedSlots.some(
      s => s.slot_date.getTime() === date.getTime() && 
           s.start === slot.start && 
           s.end === slot.end
    );
    
    if (isSelected) {
      // Remove from selection
      setSelectedSlots(selectedSlots.filter(
        s => !(s.slot_date.getTime() === date.getTime() && 
               s.start === slot.start && 
               s.end === slot.end)
      ));
    } else {
      // Add to selection
      setSelectedSlots([...selectedSlots, slotWithDate]);
    }
  };
  
  // Check if a slot is selected
  const isSlotSelected = (date: Date, slot: FreeSlot): boolean => {
    return selectedSlots.some(
      s => s.slot_date.getTime() === date.getTime() && 
           s.start === slot.start && 
           s.end === slot.end
    );
  };
  
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">Select Slots to Publish</h3>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-white"
        >
          <X size={20} />
        </button>
      </div>
      
      <div className="mb-4">
        <p className="text-gray-400 text-sm mb-2">
          Now, select the specific time slots you want to publish for the dates you've chosen.
          These slots will be available for students to book.
        </p>
        <div className="bg-indigo-900/20 border border-indigo-800/50 rounded-lg p-3 text-sm">
          <p className="text-indigo-300">
            <span className="font-medium">Selected Dates:</span> {selectedDates.length} dates
          </p>
          <p className="text-indigo-300 mt-1">
            <span className="font-medium">Slot Duration:</span> {reviewDuration} minutes
          </p>
        </div>
      </div>
      
      <div className="space-y-6 max-h-[400px] overflow-y-auto pr-1">
        {Object.keys(slotsByDate).length === 0 ? (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-center">
            <p className="text-gray-400">No free slots available for the selected dates</p>
            <p className="text-xs text-gray-500 mt-1">Try selecting different dates or check your timetable</p>
          </div>
        ) : (
          Object.entries(slotsByDate)
            .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
            .map(([dateString, slots]) => {
              const date = new Date(dateString);
              return (
                <div key={dateString} className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
                  <div className="bg-gray-700 p-3 flex items-center gap-2">
                    <Calendar size={16} className="text-indigo-400" />
                    <h4 className="font-medium">
                      {date.toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </h4>
                  </div>
                  <div className="p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {slots.map((slot, index) => {
                      const isSelected = isSlotSelected(date, slot);
                      return (
                        <div
                          key={`${dateString}-${index}`}
                          className={`p-2 border rounded-lg cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-indigo-900/30 border-indigo-700 text-indigo-300'
                              : 'bg-gray-800/50 border-gray-700/50 text-gray-300 hover:bg-gray-700 hover:border-gray-600'
                          }`}
                          onClick={() => toggleSlotSelection(date, slot)}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${isSelected ? 'bg-indigo-500' : 'bg-gray-600'}`}></div>
                            <div>
                              <div className="text-sm font-medium">
                                {slot.start} - {slot.end}
                              </div>
                              <div className="text-xs text-gray-400">
                                {parseInt(reviewDuration)} min
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
        )}
      </div>
      
      <div className="mt-6 pt-4 border-t border-gray-700 flex justify-between">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm hover:bg-gray-600 transition-colors"
        >
          Back to Date Selection
        </button>
        
        <button
          onClick={() => onSlotsSelected(selectedSlots)}
          disabled={selectedSlots.length === 0}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            selectedSlots.length === 0
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          Publish {selectedSlots.length} {selectedSlots.length === 1 ? 'Slot' : 'Slots'}
        </button>
      </div>
    </div>
  );
}
