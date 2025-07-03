-- First, create tables if they don't exist
CREATE TABLE IF NOT EXISTS presentation_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  show_classes BOOLEAN DEFAULT TRUE,
  show_news BOOLEAN DEFAULT TRUE,
  transition_speed INTEGER DEFAULT 5,
  active_category_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS presentation_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS presentation_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES presentation_categories(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries on category_id
CREATE INDEX IF NOT EXISTS idx_presentation_images_category_id ON presentation_images(category_id);

-- Add fullscreen column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'presentation_settings'
    AND column_name = 'fullscreen'
  ) THEN
    ALTER TABLE presentation_settings
    ADD COLUMN fullscreen BOOLEAN DEFAULT TRUE;
  END IF;
END $$;

-- Add display_duration column to presentation_settings table
-- This column stores how long each image should be displayed in seconds
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'presentation_settings'
    AND column_name = 'display_duration'
  ) THEN
    ALTER TABLE presentation_settings
    ADD COLUMN display_duration INTEGER DEFAULT 5;
  END IF;
END $$;

-- Comment on display_duration column
COMMENT ON COLUMN presentation_settings.display_duration IS 'Duration in seconds for how long each image is displayed before transitioning to the next one';

-- Add class_duration column to presentation_settings table
-- This column stores how long each class should be displayed in the carousel (in seconds)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'presentation_settings'
    AND column_name = 'class_duration'
  ) THEN
    ALTER TABLE presentation_settings
    ADD COLUMN class_duration INTEGER DEFAULT 10;
  END IF;
END $$;

-- Comment on class_duration column
COMMENT ON COLUMN presentation_settings.class_duration IS 'Duration in seconds for how long each class is displayed in the class carousel before transitioning to the next one';

-- Insert default presentation settings if not exists
INSERT INTO presentation_settings (id, show_classes, show_news, transition_speed)
SELECT '00000000-0000-0000-0000-000000000001', TRUE, TRUE, 5
WHERE NOT EXISTS (SELECT 1 FROM presentation_settings);

-- Update existing rows to set fullscreen = true if it was newly added
UPDATE presentation_settings
SET fullscreen = TRUE
WHERE fullscreen IS NULL;

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to presentation_settings
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_trigger 
    WHERE tgname = 'set_updated_at_presentation_settings'
  ) THEN
    CREATE TRIGGER set_updated_at_presentation_settings
    BEFORE UPDATE ON presentation_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Add trigger to presentation_categories
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_trigger 
    WHERE tgname = 'set_updated_at_presentation_categories'
  ) THEN
    CREATE TRIGGER set_updated_at_presentation_categories
    BEFORE UPDATE ON presentation_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Add trigger to presentation_images
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_trigger 
    WHERE tgname = 'set_updated_at_presentation_images'
  ) THEN
    CREATE TRIGGER set_updated_at_presentation_images
    BEFORE UPDATE ON presentation_images
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Add file_type column to presentation_images table
-- This column stores the type of the presentation file (image or ppt)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'presentation_images'
    AND column_name = 'file_type'
  ) THEN
    ALTER TABLE presentation_images
    ADD COLUMN file_type VARCHAR(20) DEFAULT 'image';
  END IF;
END $$;

-- Comment on file_type column
COMMENT ON COLUMN presentation_images.file_type IS 'Type of presentation file (image, ppt, etc.)'; 