-- Add date column to slots table
ALTER TABLE slots ADD COLUMN slot_date DATE;

-- Update existing slots to use the current date (this is just a placeholder)
UPDATE slots SET slot_date = CURRENT_DATE WHERE slot_date IS NULL;

-- Make slot_date required for future inserts
ALTER TABLE slots ALTER COLUMN slot_date SET NOT NULL;

-- Create an index on slot_date for faster queries
CREATE INDEX idx_slots_date ON slots(slot_date);

-- Update the view or function that gets slots if needed
-- For example, if you have a get_available_slots function:
CREATE OR REPLACE FUNCTION get_available_slots(p_classroom_id INTEGER)
RETURNS TABLE (
  id INTEGER,
  day TEXT,
  slot_date DATE,
  start_time TEXT,
  end_time TEXT,
  duration INTEGER,
  review_stage TEXT,
  is_available BOOLEAN,
  booking_deadline DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.day,
    s.slot_date,
    s.start_time,
    s.end_time,
    s.duration,
    s.review_stage,
    s.is_available,
    s.booking_deadline::DATE
  FROM slots s
  WHERE s.classroom_id = p_classroom_id
  AND s.is_available = TRUE
  AND (s.booking_deadline IS NULL OR s.booking_deadline >= CURRENT_DATE)
  ORDER BY s.slot_date, s.start_time;
END;
$$ LANGUAGE plpgsql;
