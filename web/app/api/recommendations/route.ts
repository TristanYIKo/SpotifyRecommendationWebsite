import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getSpotifyTokens, saveSpotifyTokens, saveShownRecommendations, getShownTrackIds } from '@/lib/supabase'
import {
  isTokenExpired,
  refreshSpotifyToken,
  getUserTopTracks,
  getRecentlyPlayedTracks,
  getSpotifyRecommendations,
  getRecommendationsFromRelatedArtists,
  getRecommendationsFromArtistTopTracks,
  type SpotifyTrack,
} from '@/lib/spotify'

export async function GET(request: NextRequest) {
  try {
    // Get the current user from Supabase session
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    console.log('Getting recommendations for user:', user.id)

    // Get Spotify tokens from database
    let tokens = await getSpotifyTokens(user.id)

    if (!tokens) {
      // Try to get from session as fallback
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.provider_token && session?.provider_refresh_token) {
        console.log('Using tokens from session')
        tokens = {
          access_token: session.provider_token,
          refresh_token: session.provider_refresh_token,
          expires_at: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour from now
        }
        
        // Save to database for future use
        try {
          await saveSpotifyTokens(user.id, tokens.access_token, tokens.refresh_token, 3600)
        } catch (e) {
          console.log('Could not save tokens to DB (table may not exist):', e)
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

    // Check if token is expired and refresh if needed
    if (isTokenExpired(tokens.expires_at)) {
      console.log('Token expired, refreshing...')
      try {
        const newTokens = await refreshSpotifyToken(refreshToken)
        accessToken = newTokens.access_token
        
        // Save refreshed tokens
        await saveSpotifyTokens(
          user.id,
          newTokens.access_token,
          newTokens.refresh_token,
          newTokens.expires_in
        )
        console.log('Token refreshed successfully')
      } catch (error) {
        console.error('Token refresh failed:', error)
        return NextResponse.json(
          { error: 'Failed to refresh Spotify token. Please log in again.' },
          { status: 401 }
        )
      }
    }

    // Step 1: Get seed tracks from user's listening history
    let seedTracks: string[] = []
    let fullSeedTracks: any[] = [] // Keep full track objects for alternative method
    
    try {
      // Try to get top tracks first
      console.log('Attempting to get top tracks...')
      const topTracks = await getUserTopTracks(accessToken, 5, 'medium_term')
      
      if (topTracks.length > 0) {
        seedTracks = topTracks.map((track: any) => track.id)
        fullSeedTracks = topTracks
        console.log(`Got ${seedTracks.length} top tracks as seeds:`, topTracks.map((t: any) => `${t.name} by ${t.artists[0].name}`))
      }
    } catch (error: any) {
      console.log('Failed to get top tracks, trying recently played...')
      
      // Fallback to recently played
      try {
        const recentTracks = await getRecentlyPlayedTracks(accessToken, 10)
        
        if (recentTracks.length > 0) {
          // Get unique track IDs (in case of duplicates)
          const uniqueTracks = Array.from(new Set(recentTracks.map((track: any) => track.id)))
          seedTracks = uniqueTracks.slice(0, 5)
          fullSeedTracks = recentTracks.slice(0, 5)
          console.log(`Got ${seedTracks.length} recently played tracks as seeds`)
        }
      } catch (recentError) {
        console.error('Failed to get recently played tracks:', recentError)
      }
    }

    // If no seeds found, return error
    if (seedTracks.length === 0) {
      return NextResponse.json(
        { error: 'No listening data found for user. Please listen to some music on Spotify first!' },
        { status: 400 }
      )
    }

    // Step 2: Get recommendations from Spotify
    let recommendations: SpotifyTrack[] = []
    
    try {
      console.log('Trying Spotify recommendations API...')
      recommendations = await getSpotifyRecommendations(accessToken, seedTracks, {
        limit: 20,
        minPopularity: 20,
      })
      
      console.log(`✅ Got ${recommendations.length} recommendations from Spotify API`)
    } catch (error: any) {
      console.log('Spotify recommendations API failed, using alternative method...')
      
      // Try method 1: Artist top tracks (simpler, more reliable)
      try {
        console.log('Trying artist top tracks method...')
        recommendations = await getRecommendationsFromArtistTopTracks(
          accessToken,
          fullSeedTracks,
          20
        )
        console.log(`✅ Got ${recommendations.length} recommendations from artist top tracks`)
      } catch (altError1: any) {
        console.error('Artist top tracks method failed:', altError1)
        
        // Try method 2: Related artists
        try {
          console.log('Trying related artists method...')
          recommendations = await getRecommendationsFromRelatedArtists(
            accessToken,
            fullSeedTracks,
            20
          )
          console.log(`✅ Got ${recommendations.length} recommendations from related artists`)
        } catch (altError2: any) {
          console.error('All recommendation methods failed:', altError2)
          return NextResponse.json(
            { 
              error: 'Unable to generate recommendations. Your Spotify account may not have permission to access the recommendations API.',
              details: 'Please try logging out and logging back in with Spotify, or contact support.'
            },
            { status: 500 }
          )
        }
      }
    }
    
    if (recommendations.length === 0) {
      return NextResponse.json(
        { error: 'No recommendations found. Please try again.' },
        { status: 404 }
      )
    }

    // Step 3: Filter out tracks user has already seen (optional)
    try {
      const shownTrackIds = await getShownTrackIds(user.id)
      if (shownTrackIds.length > 0) {
        const beforeFilter = recommendations.length
        recommendations = recommendations.filter(track => !shownTrackIds.includes(track.id))
        console.log(`Filtered out ${beforeFilter - recommendations.length} previously shown tracks`)
      }
    } catch (error) {
      console.log('Could not filter shown tracks (table may not exist):', error)
    }

    // Step 4: Save shown recommendations
    try {
      const trackIds = recommendations.map(track => track.id)
      await saveShownRecommendations(user.id, trackIds)
      console.log(`Saved ${trackIds.length} shown recommendations`)
    } catch (error) {
      console.log('Could not save shown recommendations (table may not exist):', error)
    }

    // Return the recommendations
    return NextResponse.json({
      recommendations,
      count: recommendations.length,
    })

  } catch (error: any) {
    console.error('Unexpected error in recommendations API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
