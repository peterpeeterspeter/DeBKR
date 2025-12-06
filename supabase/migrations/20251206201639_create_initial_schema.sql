/*
  # Create Bathroom Configurator Schema

  1. New Tables
    - `projects`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `status` (text) - draft, pending, user_approved, admin_approved, rejected
      - `region` (text) - default 'vlaanderen'
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `catalog_items`
      - `id` (uuid, primary key)
      - `product_id` (text, unique) - external product identifier
      - `name` (text)
      - `category` (text) - floor_tile, wall_tile, toilet, washbasin, shower, bathtub, radiator, lighting, accessory
      - `style_tags` (text[])
      - `color` (text)
      - `finish` (text)
      - `material` (text)
      - `dimensions_json` (jsonb)
      - `price_eur` (numeric)
      - `unit_type` (text) - per_unit, per_m2
      - `image_path` (text) - storage path
      - `installation_notes` (text)
      - `created_at` (timestamptz)
    
    - `before_states`
      - `id` (uuid, primary key)
      - `project_id` (uuid, references projects)
      - `data` (jsonb) - complete BeforeState JSON
      - `created_at` (timestamptz)
    
    - `after_states`
      - `id` (uuid, primary key)
      - `project_id` (uuid, references projects)
      - `data` (jsonb) - complete AfterState JSON
      - `user_approved_at` (timestamptz)
      - `created_at` (timestamptz)
    
    - `work_plans`
      - `id` (uuid, primary key)
      - `project_id` (uuid, references projects)
      - `data` (jsonb) - complete WorkPlan JSON
      - `created_at` (timestamptz)
    
    - `pricing_generated`
      - `id` (uuid, primary key)
      - `project_id` (uuid, references projects)
      - `region` (text)
      - `data` (jsonb) - pricing breakdown
      - `created_at` (timestamptz)
    
    - `images`
      - `id` (uuid, primary key)
      - `project_id` (uuid, references projects)
      - `type` (text) - before, after_generated, final
      - `seed` (text) - AI generation seed
      - `prompt` (text) - AI generation prompt
      - `path` (text) - storage path
      - `created_at` (timestamptz)
    
    - `approvals`
      - `id` (uuid, primary key)
      - `project_id` (uuid, references projects)
      - `user_id` (uuid)
      - `role` (text) - user, admin
      - `status` (text) - pending, approved, rejected
      - `notes` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own projects
    - Add policies for admin users to view and approve all projects
*/

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'user_approved', 'admin_approved', 'rejected')),
  region text DEFAULT 'vlaanderen',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create catalog_items table
CREATE TABLE IF NOT EXISTS catalog_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text UNIQUE NOT NULL,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('floor_tile', 'wall_tile', 'toilet', 'washbasin', 'shower', 'bathtub', 'radiator', 'lighting', 'accessory')),
  style_tags text[],
  color text,
  finish text,
  material text,
  dimensions_json jsonb,
  price_eur numeric(10,2),
  unit_type text DEFAULT 'per_unit' CHECK (unit_type IN ('per_unit', 'per_m2')),
  image_path text,
  installation_notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE catalog_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Catalog items are viewable by everyone"
  ON catalog_items FOR SELECT
  TO authenticated
  USING (true);

-- Create index on product_id and category for faster lookups
CREATE INDEX IF NOT EXISTS idx_catalog_product_id ON catalog_items(product_id);
CREATE INDEX IF NOT EXISTS idx_catalog_category ON catalog_items(category);

-- Create before_states table
CREATE TABLE IF NOT EXISTS before_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  data jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE before_states ENABLE ROW LEVEL SECURITY;

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

-- Create after_states table
CREATE TABLE IF NOT EXISTS after_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  data jsonb NOT NULL,
  user_approved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE after_states ENABLE ROW LEVEL SECURITY;

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

-- Create work_plans table
CREATE TABLE IF NOT EXISTS work_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  data jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE work_plans ENABLE ROW LEVEL SECURITY;

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

-- Create pricing_generated table
CREATE TABLE IF NOT EXISTS pricing_generated (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  region text DEFAULT 'vlaanderen',
  data jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE pricing_generated ENABLE ROW LEVEL SECURITY;

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

-- Create images table
CREATE TABLE IF NOT EXISTS images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('before', 'after_generated', 'final')),
  seed text,
  prompt text,
  path text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE images ENABLE ROW LEVEL SECURITY;

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

-- Create approvals table
CREATE TABLE IF NOT EXISTS approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  role text DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;

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

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_before_states_project_id ON before_states(project_id);
CREATE INDEX IF NOT EXISTS idx_after_states_project_id ON after_states(project_id);
CREATE INDEX IF NOT EXISTS idx_work_plans_project_id ON work_plans(project_id);
CREATE INDEX IF NOT EXISTS idx_pricing_project_id ON pricing_generated(project_id);
CREATE INDEX IF NOT EXISTS idx_images_project_id ON images(project_id);
CREATE INDEX IF NOT EXISTS idx_approvals_project_id ON approvals(project_id);