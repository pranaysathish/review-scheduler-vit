-- Drop existing tables and functions to start fresh
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS slots CASCADE;
DROP FUNCTION IF EXISTS publish_review_slots CASCADE;

-- Create the slots table without the status column
CREATE TABLE slots (
  id SERIAL PRIMARY KEY,
  classroom_id INTEGER NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  day TEXT NOT NULL, -- e.g., 'MON', 'TUE', etc.
  start_time TEXT NOT NULL, -- e.g., '10:00'
  end_time TEXT NOT NULL, -- e.g., '10:30'
  duration INTEGER NOT NULL, -- in minutes
  max_teams INTEGER NOT NULL DEFAULT 1,
  review_stage TEXT NOT NULL, -- 'Review 1', 'Review 2', 'Final'
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  booking_deadline TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Create indexes for better performance
CREATE INDEX idx_slots_classroom_id ON slots(classroom_id);
CREATE INDEX idx_slots_day ON slots(day);
CREATE INDEX idx_slots_review_stage ON slots(review_stage);
CREATE INDEX idx_slots_is_available ON slots(is_available);

-- Create the bookings table for slot reservations
CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  slot_id INTEGER NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  is_confirmed BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  UNIQUE(slot_id, team_id)
);

-- Create indexes for bookings
CREATE INDEX idx_bookings_slot_id ON bookings(slot_id);
CREATE INDEX idx_bookings_team_id ON bookings(team_id);
CREATE INDEX idx_bookings_is_confirmed ON bookings(is_confirmed);

-- Enable RLS on slots table
ALTER TABLE slots ENABLE ROW LEVEL SECURITY;

-- Enable RLS on bookings table
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Create policies for slots table
-- Faculty can create slots for their classrooms
CREATE POLICY slots_faculty_insert ON slots
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classrooms
      WHERE id = classroom_id
      AND faculty_id = auth.uid()
    )
  );

-- Faculty can view slots for their classrooms
CREATE POLICY slots_faculty_select ON slots
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM classrooms
      WHERE id = classroom_id
      AND faculty_id = auth.uid()
    )
  );

-- Students can view slots for classrooms they are members of
CREATE POLICY slots_student_select ON slots
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM classroom_students cs
      JOIN users u ON cs.student_id = u.id
      WHERE cs.classroom_id = slots.classroom_id
      AND u.supabase_user_id = auth.uid()
    )
  );

-- Create policies for bookings table
-- Faculty can view bookings for their classrooms
CREATE POLICY bookings_faculty_select ON bookings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM slots
      JOIN classrooms ON slots.classroom_id = classrooms.id
      WHERE slots.id = bookings.slot_id
      AND classrooms.faculty_id = auth.uid()
    )
  );

-- Students can view bookings for their teams
CREATE POLICY bookings_student_select ON bookings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN users u ON tm.student_id = u.id
      WHERE tm.team_id = bookings.team_id
      AND u.supabase_user_id = auth.uid()
    )
  );

-- Students can create bookings for their teams
CREATE POLICY bookings_student_insert ON bookings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN users u ON tm.student_id = u.id
      WHERE tm.team_id = bookings.team_id
      AND tm.role = 'leader'
      AND u.supabase_user_id = auth.uid()
    )
  );

-- First, add a booking_deadlines column to the classrooms table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'classrooms' AND column_name = 'booking_deadlines'
  ) THEN
    ALTER TABLE classrooms ADD COLUMN booking_deadlines JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Create function to publish slots
CREATE OR REPLACE FUNCTION publish_review_slots(
  p_classroom_id INTEGER,
  p_slots JSONB,
  p_duration INTEGER,
  p_review_stage TEXT,
  p_booking_deadline TEXT,
  p_created_by UUID
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_slot JSONB;
  v_inserted_count INTEGER := 0;
  v_slot_id INTEGER;
  v_slot_ids INTEGER[] := '{}';
BEGIN
  -- Check if classroom exists and belongs to faculty
  IF NOT EXISTS (
    SELECT 1 FROM classrooms
    WHERE id = p_classroom_id
    AND faculty_id = p_created_by
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Classroom not found or you do not have permission to publish slots'
    );
  END IF;
  
  -- Insert slots
  FOR v_slot IN SELECT jsonb_array_elements(p_slots)
  LOOP
    INSERT INTO slots (
      classroom_id,
      day,
      start_time,
      end_time,
      duration,
      max_teams,
      review_stage,
      is_available,
      booking_deadline,
      created_by
    ) VALUES (
      p_classroom_id,
      v_slot->>'day',
      v_slot->>'start',
      v_slot->>'end',
      p_duration,
      1, -- Always 1 team per slot
      p_review_stage,
      TRUE,
      p_booking_deadline,
      p_created_by
    )
    RETURNING id INTO v_slot_id;
    
    v_inserted_count := v_inserted_count + 1;
    v_slot_ids := array_append(v_slot_ids, v_slot_id);
  END LOOP;
  
  -- Return result
  RETURN jsonb_build_object(
    'success', true,
    'message', format('Successfully published %s slots for %s', v_inserted_count, p_review_stage),
    'count', v_inserted_count,
    'slot_ids', v_slot_ids
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
