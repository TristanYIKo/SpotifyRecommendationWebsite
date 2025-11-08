-- Create user_spotify_data table to store synced Spotify data
CREATE TABLE IF NOT EXISTS user_spotify_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Store data as JSONB for flexibility
    top_tracks JSONB NOT NULL DEFAULT '[]'::jsonb,
    top_artists JSONB NOT NULL DEFAULT '[]'::jsonb,
    playlists JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_spotify_data_user_id ON user_spotify_data(user_id);

-- Enable Row Level Security
ALTER TABLE user_spotify_data ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only see their own synced data
CREATE POLICY "Users can view own spotify data"
    ON user_spotify_data
    FOR SELECT
    USING (auth.uid() = user_id);

-- Create policy: Users can insert their own synced data
CREATE POLICY "Users can insert own spotify data"
    ON user_spotify_data
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can update their own synced data
CREATE POLICY "Users can update own spotify data"
    ON user_spotify_data
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Create policy: Users can delete their own synced data
CREATE POLICY "Users can delete own spotify data"
    ON user_spotify_data
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_spotify_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function
DROP TRIGGER IF EXISTS update_user_spotify_data_updated_at_trigger ON user_spotify_data;
CREATE TRIGGER update_user_spotify_data_updated_at_trigger
    BEFORE UPDATE ON user_spotify_data
    FOR EACH ROW
    EXECUTE FUNCTION update_user_spotify_data_updated_at();

COMMENT ON TABLE user_spotify_data IS 'Stores synced Spotify data for users (top tracks, top artists, playlists)';
COMMENT ON COLUMN user_spotify_data.top_tracks IS 'Array of top tracks with id, name, artists, album, image, preview_url, spotify_url';
COMMENT ON COLUMN user_spotify_data.top_artists IS 'Array of top artists with id, name, image';
COMMENT ON COLUMN user_spotify_data.playlists IS 'Array of playlists with id, name, owner, total_tracks, image';
