import { NextResponse } from 'next/server'
import { createServerSupabaseClient, getSpotifyTokens } from '@/lib/supabase'

/**
 * GET /api/spotify/top-tracks
 * Fetches user's top tracks from Spotify
 */
export async function GET(request: Request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get Spotify access token
    const tokens = await getSpotifyTokens(user.id)
    let accessToken = tokens?.access_token
    
    if (!accessToken) {
      // Try to get token from session
      const { data: { session } } = await supabase.auth.getSession()
      accessToken = session?.provider_token || null
    }

    if (!accessToken) {
      return NextResponse.json({ error: 'No Spotify access token found' }, { status: 401 })
    }

    // Get params from query (limit, time_range)
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)
    const timeRange = searchParams.get('time_range') || 'medium_term' // short_term, medium_term, long_term

    // Fetch top tracks from Spotify
    const response = await fetch(
      `https://api.spotify.com/v1/me/top/tracks?limit=${limit}&time_range=${timeRange}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    )

    if (response.status === 401) {
      // Token expired, try to refresh
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.provider_token) {
        const newToken = session.provider_token
        
        // Retry the request with new token
        const retryResponse = await fetch(
          `https://api.spotify.com/v1/me/top/tracks?limit=${limit}&time_range=${timeRange}`,
          {
            headers: {
              'Authorization': `Bearer ${newToken}`,
            },
          }
        )
        
        if (!retryResponse.ok) {
          const errorText = await retryResponse.text()
          console.error('Spotify top-tracks error after refresh:', retryResponse.status, errorText)
          return NextResponse.json({ 
            error: 'Failed to fetch top tracks',
            details: errorText 
          }, { status: retryResponse.status })
        }
        
        const data = await retryResponse.json()
        return NextResponse.json(data)
      }
      
      return NextResponse.json({ error: 'Token expired and refresh failed' }, { status: 401 })
    }

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Spotify top-tracks error:', response.status, errorText)
      return NextResponse.json({ 
        error: 'Failed to fetch top tracks',
        details: errorText 
      }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error('Top-tracks API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
