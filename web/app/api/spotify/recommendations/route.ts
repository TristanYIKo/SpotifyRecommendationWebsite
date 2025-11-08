import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getSpotifyTokens, saveSpotifyTokens } from '@/lib/supabase'
import {
  isTokenExpired,
  refreshSpotifyToken,
  getGeneralRecommendations,
  getPlaylistRecommendations,
  getArtistRecommendations,
  searchArtist,
  getRecommendationsFromArtistTopTracks,
  getPlaylistTracks,
  type SpotifyTrack,
} from '@/lib/spotify'

/**
 * API Route: /api/spotify/recommendations
 * Gets recommendations based on different modes: general, playlist, or artist
 * 
 * Query params:
 * - mode: "general" | "playlist" | "artist"
 * - playlist_id: (required if mode=playlist)
 * - artist_id or artist_name: (required if mode=artist)
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
    const mode = searchParams.get('mode') || 'general'
    const playlistId = searchParams.get('playlist_id')
    const artistId = searchParams.get('artist_id')
    const artistName = searchParams.get('artist_name')

    console.log('Getting recommendations for user:', user.id, 'mode:', mode)

    // Get Spotify tokens
    let tokens = await getSpotifyTokens(user.id)

    if (!tokens) {
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

    let recommendations: SpotifyTrack[] = []

    // Handle different modes
    if (mode === 'general') {
      // Try to get user's synced data from database
      const { data: syncedData, error: dbError } = await supabase
        .from('user_spotify_data')
        .select('top_tracks, top_artists')
        .eq('user_id', user.id)
        .single()

      let topTrackIds: string[] = []
      let topArtistIds: string[] = []

      // If no synced data, fetch live from Spotify as fallback
      if (dbError || !syncedData) {
        console.log('No synced data found, fetching live from Spotify...')
        
        try {
          // Fetch top tracks live from Spotify
          const topTracksUrl = 'https://api.spotify.com/v1/me/top/tracks?limit=5&time_range=medium_term'
          const tracksResponse = await fetch(topTracksUrl, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          })

          if (!tracksResponse.ok) {
            console.error('Failed to fetch live top tracks:', tracksResponse.status)
            throw new Error(`Failed to fetch top tracks: ${tracksResponse.status}`)
          }

          const tracksData = await tracksResponse.json()
          topTrackIds = (tracksData.items || []).map((t: any) => t.id)
          
          console.log(`✓ Fetched ${topTrackIds.length} top tracks live from Spotify`)
        } catch (error: any) {
          // Retry once if 401
          if (error.message?.includes('401')) {
            const newTokens = await refreshSpotifyToken(refreshToken)
            accessToken = newTokens.access_token
            await saveSpotifyTokens(user.id, newTokens.access_token, newTokens.refresh_token, newTokens.expires_in)
            
            const topTracksUrl = 'https://api.spotify.com/v1/me/top/tracks?limit=5&time_range=medium_term'
            const tracksResponse = await fetch(topTracksUrl, {
              headers: { 'Authorization': `Bearer ${accessToken}` }
            })
            const tracksData = await tracksResponse.json()
            topTrackIds = (tracksData.items || []).map((t: any) => t.id)
          } else {
            throw error
          }
        }

        if (topTrackIds.length === 0) {
          return NextResponse.json(
            { error: 'No listening history found. Please listen to some songs on Spotify first.' },
            { status: 400 }
          )
        }
      } else {
        // Use synced data
        topTrackIds = (syncedData.top_tracks || []).map((t: any) => t.id)
        topArtistIds = (syncedData.top_artists || []).map((a: any) => a.id)
        console.log(`Using synced data: ${topTrackIds.length} tracks, ${topArtistIds.length} artists`)
      }

      try {
        recommendations = await getGeneralRecommendations(
          accessToken,
          topTrackIds,
          topArtistIds,
          20
        )
      } catch (error: any) {
        console.error('General recommendations error:', error.message)
        
        // If we get a 404 (recommendations API not available), use fallback method
        if (error.message?.includes('404')) {
          console.log('Spotify recommendations API returned 404, using fallback method...')
          
          try {
            // Fetch full track objects for the fallback method
            const topTracksUrl = 'https://api.spotify.com/v1/me/top/tracks?limit=5&time_range=medium_term'
            const tracksResponse = await fetch(topTracksUrl, {
              headers: { 'Authorization': `Bearer ${accessToken}` }
            })
            
            if (tracksResponse.ok) {
              const tracksData = await tracksResponse.json()
              const fullSeedTracks = tracksData.items || []
              
              console.log('Using artist top tracks fallback method...')
              recommendations = await getRecommendationsFromArtistTopTracks(
                accessToken,
                fullSeedTracks,
                20
              )
              console.log(`✅ Got ${recommendations.length} recommendations from fallback method`)
            } else {
              throw new Error('Failed to fetch tracks for fallback method')
            }
          } catch (fallbackError: any) {
            console.error('Fallback method also failed:', fallbackError.message)
            return NextResponse.json(
              { 
                error: 'Unable to generate recommendations. Your Spotify account may not have access to the recommendations API.',
                details: error.message
              },
              { status: 500 }
            )
          }
        } else if (error.message?.includes('401')) {
          // Retry once if 401
          const newTokens = await refreshSpotifyToken(refreshToken)
          accessToken = newTokens.access_token
          await saveSpotifyTokens(user.id, newTokens.access_token, newTokens.refresh_token, newTokens.expires_in)
          
          recommendations = await getGeneralRecommendations(
            accessToken,
            topTrackIds,
            topArtistIds,
            20
          )
        } else {
          throw error
        }
      }

    } else if (mode === 'playlist') {
      if (!playlistId) {
        return NextResponse.json(
          { error: 'playlist_id is required for playlist mode' },
          { status: 400 }
        )
      }

      console.log('Getting playlist recommendations for playlist:', playlistId)

      try {
        recommendations = await getPlaylistRecommendations(accessToken, playlistId, 20)
        console.log(`✓ Got ${recommendations.length} playlist recommendations`)
      } catch (error: any) {
        console.error('Playlist recommendations error:', error.message)
        
        // If we get a 404 (recommendations API not available), use fallback method
        if (error.message?.includes('404')) {
          console.log('Spotify recommendations API returned 404, using fallback method for playlist...')
          
          try {
            // Fetch tracks from the playlist
            const trackIds = await getPlaylistTracks(accessToken, playlistId, 50)
            
            if (trackIds.length === 0) {
              return NextResponse.json(
                { error: 'No tracks found in this playlist' },
                { status: 400 }
              )
            }
            
            // Fetch full track objects
            const trackIdsToFetch = trackIds.slice(0, 5).join(',')
            const tracksUrl = `https://api.spotify.com/v1/tracks?ids=${trackIdsToFetch}`
            const tracksResponse = await fetch(tracksUrl, {
              headers: { 'Authorization': `Bearer ${accessToken}` }
            })
            
            if (tracksResponse.ok) {
              const tracksData = await tracksResponse.json()
              const fullSeedTracks = tracksData.tracks || []
              
              console.log('Using artist top tracks fallback method for playlist...')
              recommendations = await getRecommendationsFromArtistTopTracks(
                accessToken,
                fullSeedTracks,
                20
              )
              console.log(`✅ Got ${recommendations.length} recommendations from fallback method`)
            } else {
              throw new Error('Failed to fetch tracks for fallback method')
            }
          } catch (fallbackError: any) {
            console.error('Fallback method also failed:', fallbackError.message)
            return NextResponse.json(
              { 
                error: 'Unable to generate playlist recommendations. Your Spotify account may not have access to the recommendations API.',
                details: error.message
              },
              { status: 500 }
            )
          }
        } else if (error.message?.includes('401')) {
          console.log('Token expired, refreshing and retrying...')
          const newTokens = await refreshSpotifyToken(refreshToken)
          accessToken = newTokens.access_token
          await saveSpotifyTokens(user.id, newTokens.access_token, newTokens.refresh_token, newTokens.expires_in)
          
          recommendations = await getPlaylistRecommendations(accessToken, playlistId, 20)
        } else {
          // Log the full error for debugging
          console.error('Full error:', error)
          throw error
        }
      }

    } else if (mode === 'artist') {
      let finalArtistId = artistId

      // If artist_name is provided, search for the artist
      if (!finalArtistId && artistName) {
        console.log('Searching for artist:', artistName)
        
        try {
          finalArtistId = await searchArtist(accessToken, artistName)
          console.log(`✓ Found artist ID: ${finalArtistId}`)
        } catch (error: any) {
          console.error('Artist search error:', error.message)
          
          if (error.message?.includes('401')) {
            const newTokens = await refreshSpotifyToken(refreshToken)
            accessToken = newTokens.access_token
            await saveSpotifyTokens(user.id, newTokens.access_token, newTokens.refresh_token, newTokens.expires_in)
            
            finalArtistId = await searchArtist(accessToken, artistName)
          } else {
            throw error
          }
        }

        if (!finalArtistId) {
          return NextResponse.json(
            { error: `Artist "${artistName}" not found` },
            { status: 404 }
          )
        }
      }

      if (!finalArtistId) {
        return NextResponse.json(
          { error: 'artist_id or artist_name is required for artist mode' },
          { status: 400 }
        )
      }

      console.log('Getting artist recommendations for artist:', finalArtistId)

      try {
        recommendations = await getArtistRecommendations(accessToken, finalArtistId, 20)
        console.log(`✓ Got ${recommendations.length} artist recommendations`)
      } catch (error: any) {
        console.error('Artist recommendations error:', error.message)
        
        if (error.message?.includes('401')) {
          const newTokens = await refreshSpotifyToken(refreshToken)
          accessToken = newTokens.access_token
          await saveSpotifyTokens(user.id, newTokens.access_token, newTokens.refresh_token, newTokens.expires_in)
          
          recommendations = await getArtistRecommendations(accessToken, finalArtistId, 20)
        } else {
          console.error('Full error:', error)
          throw error
        }
      }

    } else {
      return NextResponse.json(
        { error: 'Invalid mode. Must be: general, playlist, or artist' },
        { status: 400 }
      )
    }

    // Return simplified track list
    return NextResponse.json(recommendations)

  } catch (error: any) {
    console.error('Recommendations error:', error)
    return NextResponse.json(
      { error: 'Failed to get recommendations', details: error.message },
      { status: 500 }
    )
  }
}
