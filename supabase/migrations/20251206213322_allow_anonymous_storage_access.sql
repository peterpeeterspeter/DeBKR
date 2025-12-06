/*
  # Allow Anonymous Storage Access

  1. Changes
    - Add storage policies for anonymous users to upload and access files
    - Allow anonymous users to upload to user-uploads bucket
    - Allow anonymous users to view and manage their uploads
    - Allow anonymous users to access generated-images bucket

  2. Security
    - Anonymous users can upload and access any files (temporary for development)
    - Authenticated users maintain existing access control
*/

-- Storage policies for user-uploads (anonymous)
CREATE POLICY "Anonymous users can upload files"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'user-uploads');

CREATE POLICY "Anonymous users can view uploads"
  ON storage.objects FOR SELECT
  TO anon
  USING (bucket_id = 'user-uploads');

CREATE POLICY "Anonymous users can update uploads"
  ON storage.objects FOR UPDATE
  TO anon
  USING (bucket_id = 'user-uploads')
  WITH CHECK (bucket_id = 'user-uploads');

CREATE POLICY "Anonymous users can delete uploads"
  ON storage.objects FOR DELETE
  TO anon
  USING (bucket_id = 'user-uploads');

-- Storage policies for generated-images (anonymous)
CREATE POLICY "Anonymous users can view generated images"
  ON storage.objects FOR SELECT
  TO anon
  USING (bucket_id = 'generated-images');

CREATE POLICY "Anonymous users can create generated images"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'generated-images');

CREATE POLICY "Anonymous users can update generated images"
  ON storage.objects FOR UPDATE
  TO anon
  USING (bucket_id = 'generated-images')
  WITH CHECK (bucket_id = 'generated-images');

CREATE POLICY "Anonymous users can delete generated images"
  ON storage.objects FOR DELETE
  TO anon
  USING (bucket_id = 'generated-images');

-- Storage policies for catalog-images (anonymous read)
CREATE POLICY "Anonymous users can view catalog images"
  ON storage.objects FOR SELECT
  TO anon
  USING (bucket_id = 'catalog-images');
