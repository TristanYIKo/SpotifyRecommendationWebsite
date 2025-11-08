import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getSpotifyTokens, saveSpotifyTokens } from '@/lib/supabase'
import {
  isTokenExpired,
  refreshSpotifyToken,
  fetchUserTopTracks,
  fetchUserTopArtists,
  fetchUserPlaylists,
  formatTrack,
} from '@/lib/spotify'

/**
 * API Route: /api/spotify/sync
 * Syncs user's Spotify data (top tracks, top artists, playlists) to the database
 */
export async function POST(request: NextRequest) {
  try {
    // Get current user
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    console.log('Syncing Spotify data for user:', user.id)

    // Get Spotify tokens
    let tokens = await getSpotifyTokens(user.id)

    if (!tokens) {
      // Fallback to session tokens
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.provider_token && session?.provider_refresh_token) {
        tokens = {
          access_token: session.provider_token,
          refresh_token: session.provider_refresh_token,
          expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
        }
      } else {
        return NextResponse.json(
          { error: 'No Spotify tokens found. Please log in with Spotify again.' },
          { status: 400 }
        )
      }
    }

    let accessToken = tokens.access_token
    const refreshToken = tokens.refresh_token

    // Refresh token if expired
    if (isTokenExpired(tokens.expires_at)) {
      console.log('Token expired, refreshing...')
      try {
        const newTokens = await refreshSpotifyToken(refreshToken)
        accessToken = newTokens.access_token
        
        await saveSpotifyTokens(
          user.id,
          newTokens.access_token,
          newTokens.refresh_token,
          newTokens.expires_in
        )
      } catch (error) {
        console.error('Token refresh failed:', error)
        return NextResponse.json(
          { error: 'Failed to refresh Spotify token. Please log in again.' },
          { status: 401 }
        )
      }
    }

    // Fetch data from Spotify
    console.log('Fetching top tracks...')
    let topTracksRaw
    try {
      topTracksRaw = await fetchUserTopTracks(accessToken, 300)
      console.log(`✓ Fetched ${topTracksRaw.length} top tracks`)
    } catch (error: any) {
      console.error('Error fetching top tracks:', error.message)
      throw error
    }
    
    const topTracks = topTracksRaw.map(formatTrack)

    console.log('Fetching top artists...')
    let topArtists
    try {
      topArtists = await fetchUserTopArtists(accessToken, 75)
      console.log(`✓ Fetched ${topArtists.length} top artists`)
    } catch (error: any) {
      console.error('Error fetching top artists:', error.message)
      throw error
    }

    console.log('Fetching playlists...')
    let playlists
    try {
      playlists = await fetchUserPlaylists(accessToken, 50)
      console.log(`✓ Fetched ${playlists.length} playlists`)
    } catch (error: any) {
      console.error('Error fetching playlists:', error.message)
      throw error
    }

    // Save to database
    console.log('Saving to database...')
    
    // Save as JSON in a user_spotify_data table (or update existing structure)
    const { error: upsertError } = await supabase
      .from('user_spotify_data')
      .upsert({
        user_id: user.id,
        top_tracks: topTracks,
        top_artists: topArtists,
        playlists: playlists,
        synced_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      })

    if (upsertError) {
      console.error('Database error:', upsertError)
      return NextResponse.json(
        { error: 'Failed to save data to database', details: upsertError.message },
        { status: 500 }
      )
    }

    console.log('Sync complete!')

    return NextResponse.json({
      success: true,
      stats: {
        top_tracks: topTracks.length,
        top_artists: topArtists.length,
        playlists: playlists.length,
      }
    })

  } catch (error: any) {
    console.error('Sync error:', error)
    
    // Handle 401 specifically
    if (error.message?.includes('401')) {
      return NextResponse.json(
        { error: 'Spotify authentication failed. Please log in again.' },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to sync Spotify data', details: error.message },
      { status: 500 }
    )
  }
}
