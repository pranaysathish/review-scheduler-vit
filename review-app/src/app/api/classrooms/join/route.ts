import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const requestData = await request.json();
    const { linkCode } = requestData;
    
    // Validate required fields
    if (!linkCode) {
      return NextResponse.json(
        { message: 'Missing link code' },
        { status: 400 }
      );
    }
    
    // Create a Supabase client with the user's cookies
    const supabase = createRouteHandlerClient({ cookies });
    
    // Verify the user is authenticated and is a student
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get user details from the database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('supabase_user_id', user.id)
      .single();

    if (userError) {
      console.error('Error getting user details:', userError);
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    if (userData.role !== 'student') {
      return NextResponse.json(
        { message: 'Only students can join classrooms' },
        { status: 403 }
      );
    }

    // Find the classroom by link code
    const { data: classroom, error: classroomError } = await supabase
      .from('classrooms')
      .select('id')
      .eq('link_code', linkCode)
      .single();

    if (classroomError) {
      console.error('Error finding classroom:', classroomError);
      return NextResponse.json(
        { message: 'Classroom not found. Please check the link code and try again.' },
        { status: 404 }
      );
    }

    // Check if student is already in the classroom
    const { data: existingMembership, error: membershipError } = await supabase
      .from('classroom_students')
      .select('id')
      .eq('classroom_id', classroom.id)
      .eq('student_id', userData.id)
      .single();

    if (existingMembership) {
      return NextResponse.json(
        { 
          success: false,
          alreadyJoined: true,
          message: 'You are already a member of this classroom'
        }
      );
    }

    // Join the classroom - use RPC for security but also direct insert as fallback
    try {
      const { data: joinResult, error: joinError } = await supabase.rpc('join_classroom', {
        p_link_code: linkCode,
        p_user_id: user.id
      });
      
      if (joinError) {
        throw joinError;
      }
      
      return NextResponse.json(joinResult);
    } catch (rpcError: any) {
      console.error('RPC error, trying direct insert:', rpcError);
      
      // Check if the error is because the function doesn't exist
      if (rpcError.message && rpcError.message.includes('function "join_classroom" does not exist')) {
        console.log('RPC function not found, falling back to direct insert');
      } else if (rpcError.message) {
        // If it's another type of error from the RPC function, return it
        return NextResponse.json(
          { message: rpcError.message },
          { status: 400 }
        );
      }
      
      // Fallback to direct insert if RPC fails
      const { error: insertError } = await supabase
        .from('classroom_students')
        .insert({
          classroom_id: classroom.id,
          student_id: userData.id
        });
      
      if (insertError) {
        console.error('Error joining classroom:', insertError);
        return NextResponse.json(
          { message: `Failed to join classroom: ${insertError.message}` },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        success: true,
        alreadyJoined: false,
        classroom_id: classroom.id,
        message: 'Successfully joined classroom'
      });
    }
  } catch (error: any) {
    console.error('Error in classroom joining API:', error);
    return NextResponse.json(
      { message: `Server error: ${error.message}` },
      { status: 500 }
    );
  }
}
