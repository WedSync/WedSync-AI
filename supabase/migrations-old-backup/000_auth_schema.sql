-- Create auth schema for development
CREATE SCHEMA IF NOT EXISTS auth;

-- Create a simple mock auth.uid() function for development
-- In production, this would be handled by Supabase Auth
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS UUID
LANGUAGE SQL
STABLE
AS $$
  -- Return a fixed UUID for development testing
  -- In a real Supabase environment, this returns the current user's ID
  SELECT '00000000-0000-0000-0000-000000000000'::UUID;
$$;

-- Create auth.users table for development
CREATE TABLE IF NOT EXISTS auth.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  encrypted_password VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert a test user for development
INSERT INTO auth.users (id, email) 
VALUES ('00000000-0000-0000-0000-000000000000', 'dev@wedsync.com')
ON CONFLICT (id) DO NOTHING;