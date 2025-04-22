import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const classroomId = params.id;
    
    // Create a Supabase client with the user's cookies
    const supabase = createRouteHandlerClient({ cookies });
    
    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Try multiple approaches to get students
    
    // 1. Direct SQL query (most reliable)
    const { data: directSqlData, error: directSqlError } = await supabase.rpc(
      'get_classroom_students_direct',
      { p_classroom_id: parseInt(classroomId) }
    );
    
    // 2. Standard query with joins
    const { data: standardQueryData, error: standardQueryError } = await supabase
      .from('classroom_students')
      .select(`
        id,
        student_id,
        student:student_id(
          id,
          name,
          email,
          roll_number
        )
      `)
      .eq('classroom_id', classroomId);
    
    // 3. Raw count query
    const { count, error: countError } = await supabase
      .from('classroom_students')
      .select('*', { count: 'exact', head: true })
      .eq('classroom_id', classroomId);
    
    return NextResponse.json({
      directSqlResult: {
        data: directSqlData,
        error: directSqlError ? directSqlError.message : null
      },
      standardQueryResult: {
        data: standardQueryData,
        error: standardQueryError ? standardQueryError.message : null
      },
      countResult: {
        count,
        error: countError ? countError.message : null
      }
    });
  } catch (error: any) {
    console.error('Error checking classroom students:', error);
    return NextResponse.json(
      { message: `Server error: ${error.message}` },
      { status: 500 }
    );
  }
}
