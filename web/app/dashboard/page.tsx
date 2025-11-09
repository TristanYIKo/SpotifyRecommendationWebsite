'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabaseClient'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { AlertCircle } from 'lucide-react'

// Dynamically import chart components to avoid SSR issues with Recharts
const GenrePieChart = dynamic(() => import('@/components/dashboard/GenrePieChart'), {
  ssr: false,
  loading: () => (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-96 w-full" />
      </CardContent>
    </Card>
  )
})

const ListeningActivityChart = dynamic(() => import('@/components/dashboard/ListeningActivityChart'), {
  ssr: false,
  loading: () => (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>
  )
})

const TopTracksList = dynamic(() => import('@/components/dashboard/TopTracksList'), {
  ssr: false,
  loading: () => (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-96 w-full" />
      </CardContent>
    </Card>
  )
})

interface Artist {
  id: string
  name: string
  images: { url: string }[]
  popularity?: number
  genres?: string[]
}

interface RecentTrack {
  played_at: string
  track: {
    name: string
    duration_ms: number
  }
}

interface TopTrack {
  id: string
  name: string
  artists: { name: string }[]
  album: {
    images: { url: string }[]
  }
  popularity?: number
}

export default function DashboardPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Data states
  const [recentTracks, setRecentTracks] = useState<RecentTrack[]>([])
  const [topArtists, setTopArtists] = useState<Artist[]>([])
  const [topTracks, setTopTracks] = useState<TopTrack[]>([])

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
        loadRecentTracks(),
        loadTopArtists(),
        loadTopTracks()
      ])

      setLoading(false)
    } catch (err) {
      console.error('Dashboard error:', err)
      setError('Failed to load dashboard data')
      setLoading(false)
    }
  }

  async function loadRecentTracks() {
    try {
      const response = await fetch('/api/spotify/recently-played?limit=50')
      
      if (!response.ok) {
        console.error('Failed to fetch recently played:', response.status)
        return
      }

      const data = await response.json()
      setRecentTracks(data.items || [])
    } catch (error) {
      console.error('Error loading recent tracks:', error)
    }
  }

  async function loadTopArtists() {
    try {
      // Fetch top 50 artists from Spotify for genres
      const response = await fetch('/api/spotify/top-artists?limit=50&time_range=medium_term')
      
      if (!response.ok) {
        console.error('Failed to fetch top artists:', response.status)
        return
      }

      const data = await response.json()
      const allArtists = data.items || []
      
      // Store all artists for genre chart
      setTopArtists(allArtists)
    } catch (error) {
      console.error('Error loading top artists:', error)
    }
  }

  async function loadTopTracks() {
    try {
      const response = await fetch('/api/spotify/top-tracks?limit=50&time_range=medium_term')
      
      if (!response.ok) {
        console.error('Failed to fetch top tracks:', response.status)
        return
      }

      const data = await response.json()
      console.log('Top tracks data:', data)
      setTopTracks(data.items || [])
    } catch (error) {
      console.error('Error loading top tracks:', error)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6 text-gray-900">Your Music Dashboard</h1>
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
        <h1 className="text-3xl font-bold mb-6 text-gray-900">Your Music Dashboard</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-white">Your Music Dashboard</h1>
      
      <div className="space-y-6">
        {/* Row 1: Listening Activity - Full Width */}
        <ListeningActivityChart tracks={recentTracks} />

        {/* Row 2: Genres (half) | Top Tracks (half) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <GenrePieChart artists={topArtists} />
          <TopTracksList tracks={topTracks} />
        </div>

        {/* Top Artists List */}
        <Card>
          <CardHeader>
            <CardTitle>Top Artists</CardTitle>
            <CardDescription>Your most listened to artists (last 6 months)</CardDescription>
          </CardHeader>
          <CardContent>
            {topArtists.length > 0 ? (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
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
              <div className="flex items-center justify-center h-48 text-center">
                <p className="text-muted-foreground">
                  No top artists found. Listen more on Spotify and sync your data.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
