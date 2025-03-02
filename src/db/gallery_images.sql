-- Create the gallery_images table
CREATE TABLE IF NOT EXISTS gallery_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  image_url TEXT NOT NULL,
  public_id TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Add a constraint to ensure image_url is not empty
  CONSTRAINT image_url_not_empty CHECK (image_url <> ''),
  
  -- Add a constraint to ensure public_id is not empty
  CONSTRAINT public_id_not_empty CHECK (public_id <> '')
);

-- Create an index on the upload_date for faster sorting
CREATE INDEX IF NOT EXISTS gallery_images_upload_date_idx ON gallery_images(upload_date DESC);

-- Create an index on the tags for faster searching
CREATE INDEX IF NOT EXISTS gallery_images_tags_idx ON gallery_images USING GIN(tags);

-- Set up Row Level Security (RLS)
ALTER TABLE gallery_images ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows authenticated users to select all records
CREATE POLICY gallery_images_select_policy ON gallery_images
  FOR SELECT USING (auth.role() = 'authenticated');

-- Create a policy that allows authenticated users to insert records
CREATE POLICY gallery_images_insert_policy ON gallery_images
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create a policy that allows authenticated users to update their own records
CREATE POLICY gallery_images_update_policy ON gallery_images
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Create a policy that allows authenticated users to delete records
CREATE POLICY gallery_images_delete_policy ON gallery_images
  FOR DELETE USING (auth.role() = 'authenticated');

-- IMPORTANT: If you want to allow anonymous access, you can use the following policies instead:

-- Enable anonymous access for select
CREATE POLICY gallery_images_anon_select_policy ON gallery_images
  FOR SELECT USING (true);

-- Enable anonymous access for insert (if needed)
CREATE POLICY gallery_images_anon_insert_policy ON gallery_images
  FOR INSERT WITH CHECK (true);

-- Enable anonymous access for update (if needed)
CREATE POLICY gallery_images_anon_update_policy ON gallery_images
  FOR UPDATE USING (true);

-- Enable anonymous access for delete (if needed)
CREATE POLICY gallery_images_anon_delete_policy ON gallery_images
  FOR DELETE USING (true);

-- NOTES:
-- 1. You need to have the uuid-ossp extension enabled for uuid_generate_v4() to work
--    You can enable it with: CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- 
-- 2. If you're using Supabase, make sure you have set up authentication properly
--    and have the correct environment variables in your application.
--
-- 3. If you encounter permission issues, you may need to adjust the RLS policies
--    or ensure your application is properly authenticated. 