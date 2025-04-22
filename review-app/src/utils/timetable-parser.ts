/**
 * Timetable parser utility
 * Adapted from the Flask implementation to work with TypeScript/Next.js
 */

export interface TimeSlot {
  start: string;
  end: string;
}

export interface FreeSlot {
  start: string;
  end: string;
  code: string | null;
  day?: string;
}

export interface Schedule {
  [key: string]: FreeSlot[];
}

/**
 * Check if a slot is occupied (has a course code with room number and -ALL)
 */
export function isOccupiedSlot(slot: string): boolean {
  return Boolean(slot && slot.includes('-') && slot.includes('-ALL'));
}

/**
 * Check if a given time falls within any lab session
 */
export function isTimeInLabSession(
  time: string,
  labSlots: Record<number, TimeSlot>,
  labClasses: string[]
): boolean {
  for (let i = 0; i < labClasses.length; i++) {
    const labClass = labClasses[i];
    if (isOccupiedSlot(labClass)) {
      // If this is a lab session, check if time falls within it or the next slot
      // (since lab sessions take two consecutive slots)
      if (i < Object.keys(labSlots).length) {
        const labStart = labSlots[i].start;
        // If this is a lab session, it takes up this slot and the next slot
        const labEnd = i + 1 < Object.keys(labSlots).length ? labSlots[i + 1].end : labSlots[i].end;
        if (labStart <= time && time <= labEnd) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Parse timetable data to extract free slots
 */
export function parseTimetableSlots(rawData: string): Schedule {
  try {
    // Split into lines and filter empty lines
    const lines = rawData.split('\n').map(line => line.trim()).filter(Boolean);
    
    if (lines.length < 12) { // Minimum required lines (4 for timing + 2 each for 5 days)
      throw new Error("Invalid timetable format: insufficient data");
    }

    // Parse timing information
    const theorySlots: Record<number, TimeSlot> = {};
    const labSlots: Record<number, TimeSlot> = {};
    
    // Get theory timings
    const theoryLine = lines[0].split('\t');
    const theoryStart = theoryLine.slice(2).filter(t => t !== 'Lunch'); // Skip 'THEORY' and 'Start'
    
    const theoryEndLine = lines[1].split('\t');
    const theoryEnd = theoryEndLine.slice(1).filter(t => t !== 'Lunch'); // Skip 'End'
    
    // Get lab timings
    const labLine = lines[2].split('\t');
    const labStart = labLine.slice(2).filter(t => t !== 'Lunch'); // Skip 'LAB' and 'Start'
    
    const labEndLine = lines[3].split('\t');
    const labEnd = labEndLine.slice(1).filter(t => t !== 'Lunch'); // Skip 'End'
    
    // Create timing slots
    for (let i = 0; i < theoryStart.length; i++) {
      theorySlots[i] = {
        start: theoryStart[i],
        end: theoryEnd[i]
      };
      labSlots[i] = {
        start: labStart[i],
        end: labEnd[i]
      };
    }
    
    // Parse daily schedule
    const schedule: Schedule = {};
    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
    let currentLine = 4; // Start after timing information
    
    for (const day of days) {
      if (currentLine + 1 >= lines.length) {
        throw new Error(`Missing schedule data for ${day}`);
      }
      
      const theoryLine = lines[currentLine].split('\t');
      const labLine = lines[currentLine + 1].split('\t');
      
      // Get classes for the day (excluding 'Lunch')
      const theoryClasses = theoryLine.slice(2).filter(c => c !== 'Lunch');
      const labClasses = labLine.slice(2).filter(c => c !== 'Lunch');
      
      // Find free slots
      const freeSlots: FreeSlot[] = [];
      
      for (let i = 0; i < Object.keys(theorySlots).length; i++) {
        if (i < theoryClasses.length && i < labClasses.length) {
          const theoryClass = theoryClasses[i];
          
          // Skip if it's lunch time
          if (theorySlots[i].start >= "13:25" && theorySlots[i].end <= "14:00") {
            continue;
          }
          
          // Check if this time slot overlaps with any lab session
          if (
            isTimeInLabSession(theorySlots[i].start, labSlots, labClasses) || 
            isTimeInLabSession(theorySlots[i].end, labSlots, labClasses)
          ) {
            continue;
          }
          
          // Check if theory slot is occupied
          if (!isOccupiedSlot(theoryClass)) {
            const slot: FreeSlot = {
              start: theorySlots[i].start,
              end: theorySlots[i].end,
              code: theoryClass && theoryClass !== '-' ? theoryClass : null,
              day: day
            };
            freeSlots.push(slot);
          }
        }
      }
      
      // Sort free slots by start time
      freeSlots.sort((a, b) => a.start.localeCompare(b.start));
      
      schedule[day] = freeSlots;
      currentLine += 2;
    }
    
    return schedule;
  } catch (error) {
    console.error("Error occurred:", error);
    throw new Error(`Error parsing timetable: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get a flattened list of all free slots with day information
 */
export function getAllFreeSlots(schedule: Schedule): FreeSlot[] {
  const allSlots: FreeSlot[] = [];
  
  for (const day in schedule) {
    const daySlots = schedule[day].map(slot => ({
      ...slot,
      day
    }));
    allSlots.push(...daySlots);
  }
  
  return allSlots;
}

/**
 * Format a time slot for display
 */
export function formatTimeSlot(slot: FreeSlot): string {
  return `${slot.day}, ${slot.start} - ${slot.end}`;
}

/**
 * Function to split a free slot into smaller intervals based on duration
 */
export function splitSlotByDuration(slot: FreeSlot, durationMinutes: number): FreeSlot[] {
  const smallerSlots: FreeSlot[] = [];
  
  // Convert start and end times to minutes since midnight for easier calculation
  const startParts = slot.start.split(':').map(Number);
  const endParts = slot.end.split(':').map(Number);
  
  const startMinutes = startParts[0] * 60 + startParts[1];
  const endMinutes = endParts[0] * 60 + endParts[1];
  
  // Calculate how many smaller slots we can fit
  for (let currentMinutes = startMinutes; currentMinutes + durationMinutes <= endMinutes; currentMinutes += durationMinutes) {
    const slotStartHour = Math.floor(currentMinutes / 60);
    const slotStartMinute = currentMinutes % 60;
    
    const slotEndMinutes = currentMinutes + durationMinutes;
    const slotEndHour = Math.floor(slotEndMinutes / 60);
    const slotEndMinute = slotEndMinutes % 60;
    
    const formattedStartTime = `${slotStartHour.toString().padStart(2, '0')}:${slotStartMinute.toString().padStart(2, '0')}`;
    const formattedEndTime = `${slotEndHour.toString().padStart(2, '0')}:${slotEndMinute.toString().padStart(2, '0')}`;
    
    smallerSlots.push({
      day: slot.day,
      start: formattedStartTime,
      end: formattedEndTime,
      code: slot.code
    });
  }
  
  return smallerSlots;
}

/**
 * Function to split all free slots based on duration
 */
export function splitAllSlotsByDuration(slots: FreeSlot[], durationMinutes: number): FreeSlot[] {
  let allSmallerSlots: FreeSlot[] = [];
  
  for (const slot of slots) {
    const smallerSlots = splitSlotByDuration(slot, durationMinutes);
    allSmallerSlots = [...allSmallerSlots, ...smallerSlots];
  }
  
  return allSmallerSlots;
}
