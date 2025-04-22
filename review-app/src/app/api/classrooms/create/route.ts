import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const requestData = await request.json();
    const { name, faculty_id, link_code, review_deadlines } = requestData;
    
    // Validate required fields
    if (!name || !faculty_id || !link_code) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Create a Supabase client with the user's cookies
    const supabase = createRouteHandlerClient({ cookies });
    
    // Verify the user is authenticated and is a faculty
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Verify the user is creating a classroom for themselves
    if (user.id !== faculty_id) {
      return NextResponse.json(
        { message: 'You can only create classrooms for yourself' },
        { status: 403 }
      );
    }
    
    // Use the RPC function to create the classroom
    const { data, error } = await supabase.rpc('create_classroom', {
      p_name: name,
      p_faculty_id: faculty_id,
      p_link_code: link_code,
      p_review_deadlines: review_deadlines
    });
    
    // If RPC fails (possibly because the function doesn't exist yet), fall back to direct insert
    if (error && error.message.includes('function "create_classroom" does not exist')) {
      console.log('RPC function not found, falling back to direct insert');
      
      // Get the faculty's database ID
      const { data: facultyData, error: facultyError } = await supabase
        .from('users')
        .select('id')
        .eq('supabase_user_id', faculty_id)
        .single();
        
      if (facultyError) {
        return NextResponse.json(
          { message: `Failed to get faculty ID: ${facultyError.message}` },
          { status: 500 }
        );
      }
      
      // Check if link code is already in use
      const { data: existingClassroom, error: checkError } = await supabase
        .from('classrooms')
        .select('id')
        .eq('link_code', link_code)
        .single();
        
      if (existingClassroom) {
        return NextResponse.json(
          { message: 'Link code is already in use. Please try a different code.' },
          { status: 400 }
        );
      }
      
      // Insert the classroom directly
      const { data: insertData, error: insertError } = await supabase
        .from('classrooms')
        .insert({
          name: name,
          faculty_id: facultyData.id,
          link_code: link_code,
          review_deadlines: review_deadlines
        })
        .select()
        .single();
      
      if (insertError) {
        return NextResponse.json(
          { message: `Failed to create classroom: ${insertError.message}` },
          { status: 500 }
        );
      }
      
      return NextResponse.json(insertData);
    }
    
    if (error) {
      console.error('Error creating classroom:', error);
      return NextResponse.json(
        { message: `Failed to create classroom: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error in classroom creation API:', error);
    return NextResponse.json(
      { message: `Server error: ${error.message}` },
      { status: 500 }
    );
  }
}
