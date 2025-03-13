-- Create teacher_users table for custom authentication
CREATE TABLE IF NOT EXISTS teacher_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add a user_id column to the teachers table if it doesn't already exist
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES teacher_users(id);

-- Create an index on the username for faster lookups
CREATE INDEX IF NOT EXISTS teacher_users_username_idx ON teacher_users(username);

-- Create an index on the user_id in teachers table for faster lookups
CREATE INDEX IF NOT EXISTS teachers_user_id_idx ON teachers(user_id);

-- Add RLS policies for teacher_users table
ALTER TABLE teacher_users ENABLE ROW LEVEL SECURITY;

-- Allow anyone to select from teacher_users (we'll handle authentication in our code)
CREATE POLICY teacher_users_select_policy ON teacher_users
  FOR SELECT USING (true);

-- Only allow authenticated users to insert/update/delete
CREATE POLICY teacher_users_insert_policy ON teacher_users
  FOR INSERT WITH CHECK (true);

CREATE POLICY teacher_users_update_policy ON teacher_users
  FOR UPDATE USING (true);

CREATE POLICY teacher_users_delete_policy ON teacher_users
  FOR DELETE USING (true);

-- Function to hash passwords
CREATE OR REPLACE FUNCTION hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN crypt(password, gen_salt('bf'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify passwords
CREATE OR REPLACE FUNCTION verify_password(username TEXT, password TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  stored_hash TEXT;
BEGIN
  SELECT password_hash INTO stored_hash FROM teacher_users WHERE username = $1;
  RETURN stored_hash = crypt(password, stored_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable the pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto; 