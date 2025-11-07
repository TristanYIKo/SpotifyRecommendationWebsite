-- Function to handle new user signup and store Spotify tokens
-- This function needs to be set up as a Database Webhook/Trigger in Supabase

-- First, create a function to store provider tokens
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Insert user profile
  INSERT INTO public.profiles (user_id, spotify_id, display_name, avatar_url)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'provider_id',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    spotify_id = EXCLUDED.spotify_id,
    display_name = EXCLUDED.display_name,
    avatar_url = EXCLUDED.avatar_url;

  RETURN new;
END;
$$;

-- Create trigger to run on user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Note: Spotify provider tokens are stored in auth.identities
-- We need to access them differently. Let's create a helper function.

-- Function to get current user's Spotify tokens from auth.identities
CREATE OR REPLACE FUNCTION get_my_spotify_tokens()
RETURNS TABLE (
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT 
    (identity_data->>'access_token')::TEXT as access_token,
    (identity_data->>'refresh_token')::TEXT as refresh_token,
    to_timestamp((identity_data->>'expires_at')::BIGINT) as expires_at
  FROM auth.identities
  WHERE user_id = auth.uid()
    AND provider = 'spotify'
  LIMIT 1;
$$;
