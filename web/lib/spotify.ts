/**
 * Spotify API helper functions
 */

export interface SpotifyTrack {
  id: string
  name: string
  artists: string[]
  album: string
  preview_url: string | null
  external_url: string
  image: string | null
}

export interface SpotifyTokens {
  access_token: string
  refresh_token: string
  expires_at: string
}

/**
 * Check if a token is expired
 */
export function isTokenExpired(expiresAt: string): boolean {
  const expiryTime = new Date(expiresAt).getTime()
  const now = Date.now()
  // Consider expired if within 5 minutes of expiry
  return now >= expiryTime - 5 * 60 * 1000
}

/**
 * Refresh a Spotify access token using the refresh token
 */
export async function refreshSpotifyToken(refreshToken: string): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
}> {
  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Spotify token refresh failed:', error)
    throw new Error(`Failed to refresh Spotify token: ${response.status}`)
  }

  const data = await response.json()
  
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token || refreshToken, // Spotify may not return a new refresh token
    expires_in: data.expires_in,
  }
}

/**
 * Get user's top tracks from Spotify
 */
export async function getUserTopTracks(
  accessToken: string,
  limit: number = 5,
  timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term'
): Promise<any[]> {
  const url = `https://api.spotify.com/v1/me/top/tracks?limit=${limit}&time_range=${timeRange}`
  
  console.log('Fetching top tracks from:', url)
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Failed to fetch top tracks:', response.status, error)
    throw new Error(`Spotify API error: ${response.status}`)
  }

  const data = await response.json()
  return data.items || []
}

/**
 * Get user's recently played tracks from Spotify
 */
export async function getRecentlyPlayedTracks(
  accessToken: string,
  limit: number = 10
): Promise<any[]> {
  const url = `https://api.spotify.com/v1/me/player/recently-played?limit=${limit}`
  
  console.log('Fetching recently played from:', url)
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Failed to fetch recently played:', response.status, error)
    throw new Error(`Spotify API error: ${response.status}`)
  }

  const data = await response.json()
  return data.items?.map((item: any) => item.track) || []
}

/**
 * Get recommendations using artist top tracks directly
 * Simpler method that just gets popular tracks from the same artists
 */
export async function getRecommendationsFromArtistTopTracks(
  accessToken: string,
  seedTracks: any[],
  limit: number = 20
): Promise<SpotifyTrack[]> {
  console.log('Using simple recommendation method: artist top tracks')
  console.log('Seed tracks received:', seedTracks.length)
  
  const recommendations: SpotifyTrack[] = []
  const seenTrackIds = new Set<string>()
  
  // Add seed track IDs to seen set to avoid recommending them
  seedTracks.forEach(track => {
    if (track.id) seenTrackIds.add(track.id)
  })
  
  // Extract artist IDs from seed tracks
  const artistIds = new Set<string>()
  seedTracks.forEach(track => {
    if (track.artists && Array.isArray(track.artists)) {
      track.artists.forEach((artist: any) => {
        if (artist.id) {
          artistIds.add(artist.id)
          console.log(`Added artist: ${artist.name} (${artist.id})`)
        }
      })
    }
  })
  
  console.log(`Found ${artistIds.size} unique artists from seed tracks`)
  
  if (artistIds.size === 0) {
    console.error('No artist IDs found in seed tracks!')
    return []
  }
  
  // For each artist, get their top tracks
  for (const artistId of Array.from(artistIds)) {
    if (recommendations.length >= limit) break
    
    try {
      console.log(`Fetching top tracks for artist ${artistId}...`)
      
      const topTracksUrl = `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`
      const topTracksResponse = await fetch(topTracksUrl, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
      
      if (!topTracksResponse.ok) {
        console.error(`Failed to fetch top tracks: ${topTracksResponse.status}`)
        const errorText = await topTracksResponse.text()
        console.error('Error response:', errorText)
        continue
      }
      
      const topTracksData = await topTracksResponse.json()
      const tracks = topTracksData.tracks || []
      
      console.log(`✓ Got ${tracks.length} tracks from artist ${artistId}`)
      
      // Add tracks to recommendations (skip ones we already have)
      let added = 0
      tracks.forEach((track: any) => {
        if (!seenTrackIds.has(track.id) && recommendations.length < limit) {
          seenTrackIds.add(track.id)
          recommendations.push(formatTrack(track))
          added++
        }
      })
      
      console.log(`Added ${added} new tracks (total: ${recommendations.length})`)
      
    } catch (error) {
      console.error('Error fetching top tracks for artist:', error)
    }
  }
  
  console.log(`Generated ${recommendations.length} recommendations from artist top tracks`)
  return recommendations
}

/**
 * Get recommendations using related artists and their top tracks
 * This is an alternative that works when the recommendations endpoint is not available
 */
export async function getRecommendationsFromRelatedArtists(
  accessToken: string,
  seedTracks: any[],
  limit: number = 20
): Promise<SpotifyTrack[]> {
  console.log('Using alternative recommendation method: related artists')
  console.log('Seed tracks received:', seedTracks.length)
  
  const recommendations: SpotifyTrack[] = []
  const seenTrackIds = new Set<string>()
  
  // Add seed track IDs to seen set to avoid recommending them
  seedTracks.forEach(track => {
    if (track.id) seenTrackIds.add(track.id)
  })
  
  // Extract artist IDs from seed tracks
  const artistIds = new Set<string>()
  seedTracks.slice(0, 5).forEach(track => {
    if (track.artists && Array.isArray(track.artists)) {
      track.artists.forEach((artist: any) => {
        if (artist.id) {
          artistIds.add(artist.id)
          console.log(`Added artist: ${artist.name} (${artist.id})`)
        }
      })
    }
  })
  
  console.log(`Found ${artistIds.size} unique artists from seed tracks`)
  
  if (artistIds.size === 0) {
    console.error('No artist IDs found in seed tracks!')
    return []
  }
  
  // For each artist, get related artists
  for (const artistId of Array.from(artistIds).slice(0, 3)) {
    try {
      console.log(`Fetching related artists for ${artistId}...`)
      
      // Get related artists
      const relatedUrl = `https://api.spotify.com/v1/artists/${artistId}/related-artists`
      const relatedResponse = await fetch(relatedUrl, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
      
      if (!relatedResponse.ok) {
        console.error(`Failed to fetch related artists: ${relatedResponse.status}`)
        const errorText = await relatedResponse.text()
        console.error('Error response:', errorText)
        continue
      }
      
      const relatedData = await relatedResponse.json()
      const relatedArtists = relatedData.artists?.slice(0, 3) || []
      
      console.log(`✓ Found ${relatedArtists.length} related artists for artist ${artistId}`)
      
      // For each related artist, get their top tracks
      for (const relatedArtist of relatedArtists) {
        try {
          console.log(`  Fetching top tracks for ${relatedArtist.name}...`)
          
          const topTracksUrl = `https://api.spotify.com/v1/artists/${relatedArtist.id}/top-tracks?market=US`
          const topTracksResponse = await fetch(topTracksUrl, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          })
          
          if (!topTracksResponse.ok) {
            console.error(`  Failed to fetch top tracks: ${topTracksResponse.status}`)
            continue
          }
          
          const topTracksData = await topTracksResponse.json()
          const tracks = topTracksData.tracks?.slice(0, 3) || []
          
          console.log(`  ✓ Got ${tracks.length} tracks from ${relatedArtist.name}`)
          
          // Add tracks to recommendations
          let added = 0
          tracks.forEach((track: any) => {
            if (!seenTrackIds.has(track.id) && recommendations.length < limit) {
              seenTrackIds.add(track.id)
              recommendations.push(formatTrack(track))
              added++
            }
          })
          
          console.log(`  Added ${added} new tracks to recommendations (total: ${recommendations.length})`)
          
          if (recommendations.length >= limit) {
            console.log(`Reached limit of ${limit} recommendations`)
            break
          }
        } catch (error) {
          console.error('  Error fetching top tracks:', error)
        }
      }
      
      if (recommendations.length >= limit) break
    } catch (error) {
      console.error('Error fetching related artists:', error)
    }
  }
  
  console.log(`Generated ${recommendations.length} recommendations from related artists`)
  return recommendations
}

/**
 * Get recommendations from Spotify based on seed tracks
 */
export async function getSpotifyRecommendations(
  accessToken: string,
  seedTracks: string[],
  options: {
    limit?: number
    minPopularity?: number
    targetEnergy?: number
    targetDanceability?: number
    targetValence?: number
  } = {}
): Promise<SpotifyTrack[]> {
  const { limit = 20, minPopularity, targetEnergy, targetDanceability, targetValence } = options

  // Ensure we have valid track IDs
  const validSeeds = seedTracks.filter(id => id && id.length > 0).slice(0, 5)
  
  if (validSeeds.length === 0) {
    throw new Error('No valid seed tracks provided')
  }

  console.log('Valid seed tracks:', validSeeds)

  // Build URL with proper encoding
  const baseUrl = 'https://api.spotify.com/v1/recommendations'
  const queryParams = new URLSearchParams()
  
  // Add seed_tracks as comma-separated string (not encoded)
  queryParams.set('seed_tracks', validSeeds.join(','))
  queryParams.set('limit', limit.toString())

  if (minPopularity !== undefined) {
    queryParams.set('min_popularity', minPopularity.toString())
  }
  if (targetEnergy !== undefined) {
    queryParams.set('target_energy', targetEnergy.toString())
  }
  if (targetDanceability !== undefined) {
    queryParams.set('target_danceability', targetDanceability.toString())
  }
  if (targetValence !== undefined) {
    queryParams.set('target_valence', targetValence.toString())
  }

  // Manually construct URL to avoid comma encoding
  const seedParam = `seed_tracks=${validSeeds.join(',')}`
  const limitParam = `limit=${limit}`
  const marketParam = 'market=US' // Add market parameter (required by some Spotify apps)
  
  const otherParams = [limitParam, marketParam]
  
  if (minPopularity !== undefined) {
    otherParams.push(`min_popularity=${minPopularity}`)
  }
  if (targetEnergy !== undefined) {
    otherParams.push(`target_energy=${targetEnergy}`)
  }
  if (targetDanceability !== undefined) {
    otherParams.push(`target_danceability=${targetDanceability}`)
  }
  if (targetValence !== undefined) {
    otherParams.push(`target_valence=${targetValence}`)
  }
  
  const url = `${baseUrl}?${seedParam}&${otherParams.join('&')}`
  
  console.log('Full recommendations URL:', url)
  console.log('Authorization token (first 20 chars):', accessToken.substring(0, 20))
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Failed to fetch recommendations:', response.status, error)
    console.error('Full URL that failed:', url)
    throw new Error(`Spotify recommendations API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  const tracks = data.tracks || []

  // Transform to simplified format
  return tracks.map((track: any) => ({
    id: track.id,
    name: track.name,
    artists: track.artists.map((artist: any) => artist.name),
    album: track.album.name,
    preview_url: track.preview_url,
    external_url: track.external_urls.spotify,
    image: track.album.images[0]?.url || null,
  }))
}

/**
 * Format track data for display
 */
export function formatTrack(track: any): SpotifyTrack {
  return {
    id: track.id,
    name: track.name,
    artists: track.artists.map((artist: any) => artist.name),
    album: track.album.name,
    preview_url: track.preview_url,
    external_url: track.external_urls.spotify,
    image: track.album.images[0]?.url || null,
  }
}
