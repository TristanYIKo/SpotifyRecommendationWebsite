import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getSpotifyTokens } from '@/lib/supabase'

/**
 * API Route: GET /api/spotify/audio-features
 * Get audio features for tracks
 * Query params: ?ids=track_id1,track_id2,...
 */
export async function GET(request: NextRequest) {
  try {
    // Get current user
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get query params
    const searchParams = request.nextUrl.searchParams
    const ids = searchParams.get('ids')

    if (!ids) {
      return NextResponse.json({ error: 'Track IDs required' }, { status: 400 })
    }

    // Get session first
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'No active session. Please log in with Spotify again.' },
        { status: 401 }
      )
    }

    // Try to get token from session first (most reliable on Vercel)
    let accessToken = session.provider_token

    // Fallback to database tokens if session doesn't have them
    if (!accessToken) {
      const tokens = await getSpotifyTokens(user.id)
      
      if (tokens) {
        accessToken = tokens.access_token
      } else {
        return NextResponse.json(
          { error: 'No Spotify tokens found. Please log out and log in with Spotify again.' },
          { status: 401 }
        )
      }
    }

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Missing Spotify access token. Please log out and log in again.' },
        { status: 401 }
      )
    }

    // Fetch audio features from Spotify
    const url = `https://api.spotify.com/v1/audio-features?ids=${ids}`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      console.error('Audio features fetch failed:', response.status)
      return NextResponse.json(
        { error: 'Failed to fetch audio features' },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    // Filter out null entries (invalid track IDs)
    const audioFeatures = (data.audio_features || []).filter((f: any) => f !== null)

    return NextResponse.json({ audioFeatures })

  } catch (error: any) {
    console.error('Audio features API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch audio features', details: error.message },
      { status: 500 }
    )
  }
}
