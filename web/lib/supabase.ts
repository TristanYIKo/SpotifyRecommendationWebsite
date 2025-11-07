import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Creates a Supabase client for use in server components and API routes
 */
export function createServerSupabaseClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

/**
 * Get Spotify tokens for a user from the database
 */
export async function getSpotifyTokens(userId: string) {
  const supabase = createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('spotify_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .single()

  if (error) {
    console.error('Error fetching Spotify tokens:', error)
    return null
  }

  return data
}

/**
 * Save updated Spotify tokens to the database
 */
export async function saveSpotifyTokens(
  userId: string,
  accessToken: string,
  refreshToken: string,
  expiresIn: number
) {
  const supabase = createServerSupabaseClient()
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

  const { error } = await supabase
    .from('spotify_tokens')
    .upsert({
      user_id: userId,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      updated_at: new Date().toISOString()
    })

  if (error) {
    console.error('Error saving Spotify tokens:', error)
    throw error
  }
}

/**
 * Save shown recommendations to track what user has seen
 */
export async function saveShownRecommendations(userId: string, trackIds: string[]) {
  const supabase = createServerSupabaseClient()
  
  const records = trackIds.map(trackId => ({
    user_id: userId,
    track_id: trackId,
    shown_at: new Date().toISOString()
  }))

  const { error } = await supabase
    .from('shown_recommendations')
    .insert(records)

  if (error) {
    console.error('Error saving shown recommendations:', error)
    // Don't throw - this is optional
  }
}

/**
 * Get track IDs that user has already seen
 */
export async function getShownTrackIds(userId: string): Promise<string[]> {
  const supabase = createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('shown_recommendations')
    .select('track_id')
    .eq('user_id', userId)

  if (error) {
    console.error('Error fetching shown tracks:', error)
    return []
  }

  return data.map(row => row.track_id)
}
