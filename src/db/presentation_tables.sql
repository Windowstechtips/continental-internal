-- Table for presentation settings
CREATE TABLE IF NOT EXISTS presentation_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  show_classes BOOLEAN DEFAULT TRUE,
  show_news BOOLEAN DEFAULT TRUE,
  fullscreen BOOLEAN DEFAULT FALSE,
  transition_speed INTEGER DEFAULT 5,
  display_duration INTEGER DEFAULT 5,
  class_duration INTEGER DEFAULT 10,
  active_category_id UUID REFERENCES presentation_categories(id) NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN presentation_settings.display_duration IS 'Duration in seconds for how long each image is displayed before transitioning to the next one';
COMMENT ON COLUMN presentation_settings.class_duration IS 'Duration in seconds for how long each class is displayed in the class carousel before transitioning to the next one';

-- Table for presentation image categories
CREATE TABLE IF NOT EXISTS presentation_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for presentation images
CREATE TABLE IF NOT EXISTS presentation_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES presentation_categories(id) NOT NULL,
  image_url TEXT NOT NULL,
  file_type VARCHAR(20) DEFAULT 'image',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON COLUMN presentation_images.file_type IS 'Type of presentation file (image, ppt, etc.)';

-- Create index for faster queries on category_id
CREATE INDEX IF NOT EXISTS idx_presentation_images_category_id ON presentation_images(category_id);

-- Insert default presentation settings if not exists
INSERT INTO presentation_settings (id, show_classes, show_news, fullscreen, transition_speed)
SELECT '00000000-0000-0000-0000-000000000001', TRUE, TRUE, TRUE, 5
WHERE NOT EXISTS (SELECT 1 FROM presentation_settings);

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