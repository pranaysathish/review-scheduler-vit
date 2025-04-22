export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: number
          supabase_user_id: string
          email: string
          name: string
          role: string
          department: string | null
          roll_number: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          supabase_user_id: string
          email: string
          name: string
          role: string
          department?: string | null
          roll_number?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          supabase_user_id?: string
          email?: string
          name?: string
          role?: string
          department?: string | null
          roll_number?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      classrooms: {
        Row: {
          id: number
          name: string
          faculty_id: string
          link_code: string
          review_deadlines: Json
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          faculty_id: string
          link_code: string
          review_deadlines: Json
          created_at?: string
        }
        Update: {
          id?: number
          name?: string
          faculty_id?: string
          link_code?: string
          review_deadlines?: Json
          created_at?: string
        }
      }
      timetables: {
        Row: {
          id: number
          faculty_id: string
          data: Json
          created_at: string
        }
        Insert: {
          id?: number
          faculty_id: string
          data: Json
          created_at?: string
        }
        Update: {
          id?: number
          faculty_id?: string
          data?: Json
          created_at?: string
        }
      }
      slots: {
        Row: {
          id: number
          classroom_id: number
          day: string
          start_time: string
          end_time: string
          duration: number
          max_teams: number
          review_stage: string
          status: string
          created_at: string
        }
        Insert: {
          id?: number
          classroom_id: number
          day: string
          start_time: string
          end_time: string
          duration: number
          max_teams: number
          review_stage: string
          status: string
          created_at?: string
        }
        Update: {
          id?: number
          classroom_id?: number
          day?: string
          start_time?: string
          end_time?: string
          duration?: number
          max_teams?: number
          review_stage?: string
          status?: string
          created_at?: string
        }
      }
      teams: {
        Row: {
          id: number
          name: string
          members: Json
          classroom_id: number
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          members: Json
          classroom_id: number
          created_at?: string
        }
        Update: {
          id?: number
          name?: string
          members?: Json
          classroom_id?: number
          created_at?: string
        }
      }
      submissions: {
        Row: {
          id: number
          team_id: number
          file_url: string
          review_stage: string
          created_at: string
        }
        Insert: {
          id?: number
          team_id: number
          file_url: string
          review_stage: string
          created_at?: string
        }
        Update: {
          id?: number
          team_id?: number
          file_url?: string
          review_stage?: string
          created_at?: string
        }
      }
      bookings: {
        Row: {
          id: number
          slot_id: number
          team_id: number
          created_at: string
        }
        Insert: {
          id?: number
          slot_id: number
          team_id: number
          created_at?: string
        }
        Update: {
          id?: number
          slot_id?: number
          team_id?: number
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_booking_and_update_slot: {
        Args: {
          p_slot_id: number
          p_team_id: number
        }
        Returns: {
          id: number
          slot_id: number
          team_id: number
          created_at: string
        }
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
