/*
  # Update RLS policies for related tables

  1. Changes
    - Update policies for before_states, after_states, work_plans, pricing_generated, images, approvals
    - Allow anonymous access to these tables for development

  2. Security
    - Anonymous users can access all records (temporary for development)
    - Authenticated users can only access their own project data
*/

-- before_states policies
DROP POLICY IF EXISTS "Users can view own before states" ON before_states;
DROP POLICY IF EXISTS "Users can create own before states" ON before_states;

CREATE POLICY "Users can view own before states"
  ON before_states FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = before_states.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Anonymous users can view before states"
  ON before_states FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Users can create own before states"
  ON before_states FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = before_states.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Anonymous users can create before states"
  ON before_states FOR INSERT
  TO anon
  WITH CHECK (true);

-- after_states policies
DROP POLICY IF EXISTS "Users can view own after states" ON after_states;
DROP POLICY IF EXISTS "Users can create own after states" ON after_states;
DROP POLICY IF EXISTS "Users can update own after states" ON after_states;

CREATE POLICY "Users can view own after states"
  ON after_states FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = after_states.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Anonymous users can view after states"
  ON after_states FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Users can create own after states"
  ON after_states FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = after_states.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Anonymous users can create after states"
  ON after_states FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Users can update own after states"
  ON after_states FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = after_states.project_id
      AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = after_states.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Anonymous users can update after states"
  ON after_states FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- work_plans policies
DROP POLICY IF EXISTS "Users can view own work plans" ON work_plans;
DROP POLICY IF EXISTS "Users can create own work plans" ON work_plans;

CREATE POLICY "Users can view own work plans"
  ON work_plans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = work_plans.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Anonymous users can view work plans"
  ON work_plans FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Users can create own work plans"
  ON work_plans FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = work_plans.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Anonymous users can create work plans"
  ON work_plans FOR INSERT
  TO anon
  WITH CHECK (true);

-- pricing_generated policies
DROP POLICY IF EXISTS "Users can view own pricing" ON pricing_generated;
DROP POLICY IF EXISTS "Users can create own pricing" ON pricing_generated;

CREATE POLICY "Users can view own pricing"
  ON pricing_generated FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = pricing_generated.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Anonymous users can view pricing"
  ON pricing_generated FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Users can create own pricing"
  ON pricing_generated FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = pricing_generated.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Anonymous users can create pricing"
  ON pricing_generated FOR INSERT
  TO anon
  WITH CHECK (true);

-- images policies
DROP POLICY IF EXISTS "Users can view own images" ON images;
DROP POLICY IF EXISTS "Users can create own images" ON images;
DROP POLICY IF EXISTS "Users can update own images" ON images;

CREATE POLICY "Users can view own images"
  ON images FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = images.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Anonymous users can view images"
  ON images FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Users can create own images"
  ON images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = images.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Anonymous users can create images"
  ON images FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Users can update own images"
  ON images FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = images.project_id
      AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = images.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Anonymous users can update images"
  ON images FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- approvals policies
DROP POLICY IF EXISTS "Users can view approvals for own projects" ON approvals;
DROP POLICY IF EXISTS "Users can create approvals for own projects" ON approvals;

CREATE POLICY "Users can view approvals for own projects"
  ON approvals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = approvals.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Anonymous users can view approvals"
  ON approvals FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Users can create approvals for own projects"
  ON approvals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = approvals.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Anonymous users can create approvals"
  ON approvals FOR INSERT
  TO anon
  WITH CHECK (true);
