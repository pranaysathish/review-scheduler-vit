'use server';

import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with service role key to bypass RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration');
}

// Create admin client with service role key
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function createUserInDatabase(userData: {
  supabase_user_id: string;
  email: string;
  name: string;
  role: string;
  department?: string | null;
  roll_number?: string | null;
}) {
  try {
    // Validate required fields
    if (!userData.supabase_user_id || !userData.email || !userData.name || !userData.role) {
      return { error: 'Missing required user data' };
    }

    // Insert user data with admin privileges
    const { error } = await supabaseAdmin.from('users').insert({
      supabase_user_id: userData.supabase_user_id,
      email: userData.email,
      name: userData.name,
      role: userData.role,
      department: userData.department,
      roll_number: userData.roll_number,
    });

    if (error) {
      console.error('Error creating user in database:', error);
      return { error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Server error in createUserInDatabase:', error);
    return { error: error.message || 'Internal server error' };
  }
}
