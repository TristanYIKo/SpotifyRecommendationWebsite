'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { AlertCircle } from 'lucide-react'

// Import new dashboard components
import { ListeningActivityChart } from '@/components/dashboard/ListeningActivityChart'
import { GenrePieChart } from '@/components/dashboard/GenrePieChart'
import { PlaylistsChart } from '@/components/dashboard/PlaylistsChart'
import { MoodProfileRadar } from '@/components/dashboard/MoodProfileRadar'

interface Track {
  played_at: string
  track: {
    id: string
    duration_ms: number
  }
}

interface Artist {
  id: string
  name: string
  images: { url: string }[]
  popularity?: number
  genres?: string[]
}

interface Playlist {
  id: string
  name: string
  tracks: {
    total: number
  }
}

interface AudioFeatures {
  energy: number
  danceability: number
  valence: number
  acousticness: number
  tempo: number
}

export default function DashboardPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Data states
  const [recentTracks, setRecentTracks] = useState<Track[]>([])
  const [topArtists, setTopArtists] = useState<Artist[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [audioFeatures, setAudioFeatures] = useState<AudioFeatures[]>([])

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadDashboardData() {
    try {
      setLoading(true)
      setError(null)

      // Get user session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Please log in to view your dashboard')
        setLoading(false)
        return
      }

      // Load all data in parallel
      await Promise.all([
        loadRecentlyPlayed(),
        loadTopArtists(),
        loadPlaylists(),
        loadAudioFeatures()
      ])

      setLoading(false)
    } catch (err) {
      console.error('Dashboard error:', err)
      setError('Failed to load dashboard data')
      setLoading(false)
    }
  }

  async function loadRecentlyPlayed() {
    try {
      const response = await fetch('/api/spotify/recently-played?limit=50')
      
      if (!response.ok) {
        console.error('Failed to fetch recently played:', response.status)
        return
      }

      const data = await response.json()
      setRecentTracks(data.items || [])
    } catch (error) {
      console.error('Error loading recently played:', error)
    }
  }

  async function loadTopArtists() {
    try {
      const response = await fetch('/api/spotify/top-artists?limit=50&time_range=medium_term')
      
      if (!response.ok) {
        console.error('Failed to fetch top artists:', response.status)
        return
      }

      const data = await response.json()
      setTopArtists(data.items || [])
    } catch (error) {
      console.error('Error loading top artists:', error)
    }
  }

  async function loadPlaylists() {
    try {
      const response = await fetch('/api/spotify/playlists')
      
      if (!response.ok) {
        console.error('Failed to fetch playlists:', response.status)
        return
      }

      const data = await response.json()
      setPlaylists(data.playlists || [])
    } catch (error) {
      console.error('Error loading playlists:', error)
    }
  }

  async function loadAudioFeatures() {
    try {
      // Get user's synced data for track IDs
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: syncedData } = await supabase
        .from('user_spotify_data')
        .select('top_tracks')
        .eq('user_id', user.id)
        .single()

      if (!syncedData?.top_tracks) {
        console.log('No synced tracks found for audio features')
        return
      }

      // Get track IDs (limit to 50 for API)
      const trackIds = syncedData.top_tracks
        .slice(0, 50)
        .map((t: any) => t.id)
        .filter(Boolean)
        .join(',')

      if (!trackIds) return

      // Fetch audio features
      const featuresResponse = await fetch(`/api/spotify/audio-features?ids=${trackIds}`)
      
      if (!featuresResponse.ok) {
        console.error('Failed to fetch audio features:', featuresResponse.status)
        return
      }

      const data = await featuresResponse.json()
      setAudioFeatures(data.audioFeatures || [])
    } catch (error) {
      console.error('Error loading audio features:', error)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Your Music Dashboard</h1>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-64" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-48 w-full" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-48 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Your Music Dashboard</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Your Music Dashboard</h1>
      
      <div className="space-y-6">
        {/* Section 1: Listening Activity - Full Width */}
        <ListeningActivityChart tracks={recentTracks} />

        {/* Section 2 & 3: Top Artists and Genres - Two Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top Artists */}
          <Card>
            <CardHeader>
              <h3 className="text-xl font-semibold">Top Artists</h3>
              <p className="text-sm text-muted-foreground">Your most listened to artists</p>
            </CardHeader>
            <CardContent>
              {topArtists.length > 0 ? (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {topArtists.slice(0, 10).map((artist, index) => (
                    <div key={artist.id} className="flex items-center gap-3">
                      <span className="text-lg font-semibold text-muted-foreground w-7">
                        {index + 1}
                      </span>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={artist.images[0]?.url} alt={artist.name} />
                        <AvatarFallback>{artist.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-sm">{artist.name}</p>
                        {artist.popularity !== undefined && (
                          <p className="text-xs text-muted-foreground">
                            Popularity: {artist.popularity}/100
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 text-center">
                  <p className="text-muted-foreground">
                    No top artists found. Listen more on Spotify and sync your data.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Genres - Pie Chart */}
          <GenrePieChart artists={topArtists} />
        </div>

        {/* Section 4 & 5: Playlists and Mood Profile - Two Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PlaylistsChart playlists={playlists} />
          <MoodProfileRadar audioFeatures={audioFeatures} />
        </div>
      </div>
    </div>
  )
}
