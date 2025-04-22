-- Create a stored procedure for booking a slot and updating its status
CREATE OR REPLACE FUNCTION create_booking_and_update_slot(
  p_slot_id INT,
  p_team_id INT
) RETURNS bookings AS $$
DECLARE
  v_booking bookings;
BEGIN
  -- Insert the booking
  INSERT INTO bookings (slot_id, team_id)
  VALUES (p_slot_id, p_team_id)
  RETURNING * INTO v_booking;
  
  -- Update the slot status to 'booked'
  UPDATE slots
  SET status = 'booked'
  WHERE id = p_slot_id;
  
  -- Return the booking
  RETURN v_booking;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
