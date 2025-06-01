-- Create user_onboarding table to track onboarding progress
CREATE TABLE IF NOT EXISTS user_onboarding (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  has_joined_classroom BOOLEAN NOT NULL DEFAULT FALSE,
  has_joined_team BOOLEAN NOT NULL DEFAULT FALSE,
  has_scheduled_review BOOLEAN NOT NULL DEFAULT FALSE,
  is_onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE,
  first_visit_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Add RLS policies
ALTER TABLE user_onboarding ENABLE ROW LEVEL SECURITY;

-- Allow users to view and update their own onboarding status
CREATE POLICY "Users can view their own onboarding status"
  ON user_onboarding
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own onboarding status"
  ON user_onboarding
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own onboarding status"
  ON user_onboarding
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_user_onboarding_updated_at
BEFORE UPDATE ON user_onboarding
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create function to set completed_date when onboarding is completed
CREATE OR REPLACE FUNCTION set_onboarding_completed_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_onboarding_complete = TRUE AND OLD.is_onboarding_complete = FALSE THEN
    NEW.completed_date = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set completed_date
CREATE TRIGGER set_user_onboarding_completed_date
BEFORE UPDATE ON user_onboarding
FOR EACH ROW
EXECUTE FUNCTION set_onboarding_completed_date();
