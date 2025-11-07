-- Create shown_recommendations table to track which songs have been shown to users
CREATE TABLE IF NOT EXISTS shown_recommendations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    track_id TEXT NOT NULL,
    shown_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Create index for faster lookups
    CONSTRAINT shown_recommendations_user_track_unique UNIQUE (user_id, track_id)
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_shown_recommendations_user_id ON shown_recommendations(user_id);

-- Create index on shown_at for potential time-based queries
CREATE INDEX IF NOT EXISTS idx_shown_recommendations_shown_at ON shown_recommendations(shown_at);

-- Enable Row Level Security
ALTER TABLE shown_recommendations ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only see their own shown recommendations
CREATE POLICY "Users can view own shown recommendations"
    ON shown_recommendations
    FOR SELECT
    USING (auth.uid() = user_id);

-- Create policy: Users can insert their own shown recommendations
CREATE POLICY "Users can insert own shown recommendations"
    ON shown_recommendations
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can delete their own shown recommendations
CREATE POLICY "Users can delete own shown recommendations"
    ON shown_recommendations
    FOR DELETE
    USING (auth.uid() = user_id);

COMMENT ON TABLE shown_recommendations IS 'Tracks that have been shown to users as recommendations';
COMMENT ON COLUMN shown_recommendations.user_id IS 'Reference to the user who was shown this recommendation';
COMMENT ON COLUMN shown_recommendations.track_id IS 'Spotify track ID';
COMMENT ON COLUMN shown_recommendations.shown_at IS 'When this track was shown to the user';
