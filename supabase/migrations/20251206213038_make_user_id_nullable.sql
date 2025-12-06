/*
  # Make user_id nullable for anonymous projects

  1. Changes
    - Remove foreign key constraint from projects.user_id
    - Make user_id nullable
    - Add text column for anonymous user tracking
    - Update RLS policies to handle both authenticated and anonymous users

  2. Security
    - Anonymous users can access all projects (temporary for development)
    - Authenticated users can only access their own projects
*/

-- Drop existing foreign key constraint
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_user_id_fkey;

-- Make user_id nullable
ALTER TABLE projects ALTER COLUMN user_id DROP NOT NULL;

-- Add anonymous_user_id column for tracking anonymous users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'anonymous_user_id'
  ) THEN
    ALTER TABLE projects ADD COLUMN anonymous_user_id text;
  END IF;
END $$;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Users can create own projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;

-- Create new policies that handle both authenticated and anonymous users
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anonymous users can view own projects"
  ON projects FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Users can create own projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anonymous users can create projects"
  ON projects FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anonymous users can update own projects"
  ON projects FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
