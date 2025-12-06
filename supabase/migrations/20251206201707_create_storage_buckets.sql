/*
  # Create Storage Buckets for Bathroom Configurator

  1. Buckets
    - `catalog-images` - public bucket for product catalog images
    - `user-uploads` - authenticated bucket for user bathroom photos
    - `generated-images` - authenticated bucket for AI-generated visualizations

  2. Security
    - catalog-images: public read access
    - user-uploads: authenticated users can upload and read their own files
    - generated-images: authenticated users can read their own project images
*/

-- Create catalog-images bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('catalog-images', 'catalog-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create user-uploads bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-uploads', 'user-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Create generated-images bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('generated-images', 'generated-images', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for catalog-images (public read)
CREATE POLICY "Public can view catalog images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'catalog-images');

CREATE POLICY "Authenticated users can upload catalog images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'catalog-images');

-- Storage policies for user-uploads
CREATE POLICY "Users can upload their own bathroom photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'user-uploads'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own uploads"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'user-uploads'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own uploads"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'user-uploads'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for generated-images
CREATE POLICY "Users can view their own generated images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'generated-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can create generated images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'generated-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own generated images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'generated-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );