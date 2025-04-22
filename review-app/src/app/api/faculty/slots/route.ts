import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Get current user
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user details from the database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('supabase_user_id', currentUser.id)
      .single();

    if (userError || userData.role !== 'faculty') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get faculty's classrooms
    const { data: classrooms, error: classroomsError } = await supabase
      .from('classrooms')
      .select('id')
      .eq('faculty_id', userData.id);

    if (classroomsError) {
      return NextResponse.json({ error: 'Failed to fetch classrooms' }, { status: 500 });
    }

    // Get classroom IDs
    const classroomIds = classrooms.map(classroom => classroom.id);

    if (classroomIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Fetch review slots for faculty's classrooms
    const { data: slots, error: slotsError } = await supabase
      .from('slots')
      .select(`
        id,
        day,
        start_time,
        end_time,
        duration,
        review_stage,
        is_available,
        booking_deadline,
        classroom_id,
        classroom:classroom_id(id, name),
        bookings:bookings(
          id, 
          team_id, 
          team:team_id(
            id, 
            name, 
            project_title
          )
        )
      `)
      .in('classroom_id', classroomIds)
      .order('day')
      .order('start_time');

    if (slotsError) {
      return NextResponse.json({ error: 'Failed to fetch slots' }, { status: 500 });
    }

    // Format slots data
    const formattedSlots = slots.map(slot => ({
      id: slot.id,
      day: slot.day,
      start_time: slot.start_time,
      end_time: slot.end_time,
      time: `${slot.start_time} - ${slot.end_time}`,
      duration: slot.duration,
      classroom_id: slot.classroom_id,
      classroom: slot.classroom?.name || 'Unknown',
      review_stage: slot.review_stage,
      booking_deadline: slot.booking_deadline,
      is_available: slot.is_available,
      bookings: slot.bookings || [],
      bookings_count: slot.bookings?.length || 0,
      status: !slot.is_available ? 'Unavailable' : 
              slot.bookings?.length === 0 ? 'Available' : 
              'Booked'
    }));

    return NextResponse.json({ data: formattedSlots });
  } catch (error) {
    console.error('Error fetching slots:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
