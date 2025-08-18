-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON storage.objects;

-- Drop and recreate the bucket to ensure proper setup
DROP BUCKET IF EXISTS checklist-photos;

-- Create the bucket with proper configuration
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'checklist-photos',
  'checklist-photos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png']::text[]
);

-- Create storage policies for checklist photos
CREATE POLICY "Enable read access for authenticated users"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'checklist-photos');

CREATE POLICY "Enable insert access for authenticated users"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'checklist-photos' AND
  array_length(regexp_split_to_array(name, '/'), 1) <= 3 AND -- Ensure proper path structure
  octet_length(content) <= 5242880 -- 5MB file size check
);

CREATE POLICY "Enable update access for authenticated users"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'checklist-photos');

CREATE POLICY "Enable delete access for authenticated users"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'checklist-photos');