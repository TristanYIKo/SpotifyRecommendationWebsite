'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { AlertCircle, Music2, TrendingUp } from 'lucide-react'

interface MonthData {
  month: string
  hours: number
}

interface Artist {
  id: string
  name: string
  images: { url: string }[]
  popularity?: number
  genres?: string[]
}

interface GenreData {
  name: string
  count: number
  percentage: number
}

export default function DashboardPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Data states
  const [yearData, setYearData] = useState<MonthData[]>([])
  const [topArtists, setTopArtists] = useState<Artist[]>([])
  const [topGenres, setTopGenres] = useState<GenreData[]>([])
  const [hasHistoricalData, setHasHistoricalData] = useState(false)

  const currentYear = new Date().getFullYear()

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
        loadYearSummary(),
        loadTopArtists()
      ])

      setLoading(false)
    } catch (err) {
      console.error('Dashboard error:', err)
      setError('Failed to load dashboard data')
      setLoading(false)
    }
  }

  async function loadYearSummary() {
    try {
      // First, fetch stored listening history from database
      const historyResponse = await fetch('/api/spotify/listening-history')
      const storedHistory: { [key: string]: number } = {}
      
      if (historyResponse.ok) {
        const { history } = await historyResponse.json()
        // Convert stored history to month map
        history?.forEach((record: any) => {
          if (record.year === currentYear) {
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
            const monthName = monthNames[record.month - 1]
            storedHistory[monthName] = record.hours
          }
        })
      }

      // Fetch recently played tracks from Spotify to get current data
      const response = await fetch('/api/spotify/recently-played?limit=50')
      
      if (!response.ok) {
        console.error('Failed to fetch recently played:', response.status)
        // If we have stored data, use it
        if (Object.keys(storedHistory).length > 0) {
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
          const currentMonth = new Date().getMonth()
          const chartData: MonthData[] = months.slice(0, currentMonth + 1).map(month => ({
            month,
            hours: storedHistory[month] || 0
          }))
          setYearData(chartData)
          setHasHistoricalData(chartData.some(d => d.hours > 0))
        } else {
          setHasHistoricalData(false)
        }
        return
      }

      const data = await response.json()
      const items = data.items || []

      // Group by month and calculate total listening hours from recent plays
      const monthMap: { [key: string]: { hours: number; trackCount: number } } = {}
      const currentYearStr = currentYear.toString()

      items.forEach((item: any) => {
        const playedAt = new Date(item.played_at)
        if (playedAt.getFullYear().toString() !== currentYearStr) return

        const monthName = playedAt.toLocaleString('default', { month: 'short' })
        const durationMs = item.track?.duration_ms || 0
        const durationHours = durationMs / (1000 * 60 * 60)

        if (!monthMap[monthName]) {
          monthMap[monthName] = { hours: 0, trackCount: 0 }
        }
        monthMap[monthName].hours += durationHours
        monthMap[monthName].trackCount++
      })

      // Save data for ALL months we have records for (not just current month)
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const savePromises: Promise<any>[] = []
      
      for (const [monthName, stats] of Object.entries(monthMap)) {
        const monthIndex = months.indexOf(monthName)
        if (monthIndex !== -1 && stats.hours > 0) {
          // Save each month's data to database
          savePromises.push(
            fetch('/api/spotify/listening-history', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                year: currentYear,
                month: monthIndex + 1,
                hours: stats.hours,
                track_count: stats.trackCount
              })
            }).catch(err => console.error(`Failed to save ${monthName}:`, err))
          )
        }
      }

      // Wait for all saves to complete
      await Promise.all(savePromises)

      // Create chart data combining stored and recent data
      // Prefer recent data if available, otherwise use stored data
      const currentMonthIndex = new Date().getMonth()
      const chartData: MonthData[] = months.map((month, index) => {
        // Use recent data if we have it for this month
        if (monthMap[month]) {
          return {
            month,
            hours: parseFloat(monthMap[month].hours.toFixed(1))
          }
        } else {
          // Otherwise use stored data
          return {
            month,
            hours: parseFloat((storedHistory[month] || 0).toFixed(1))
          }
        }
      })

      // Only show data up to current month
      const filteredData = chartData.slice(0, currentMonthIndex + 1)

      setYearData(filteredData)
      setHasHistoricalData(filteredData.some(d => d.hours > 0))

    } catch (error) {
      console.error('Error loading year summary:', error)
      setHasHistoricalData(false)
    }
  }

  async function loadTopArtists() {
    try {
      // Fetch top 50 artists from Spotify to extract genres
      const response = await fetch('/api/spotify/top-artists?limit=50&time_range=medium_term')
      
      if (!response.ok) {
        console.error('Failed to fetch top artists:', response.status)
        return
      }

      const data = await response.json()
      const allArtists = data.items || []

      // Display top 10 artists
      setTopArtists(allArtists.slice(0, 10))

      // Calculate top 7 genres from all 50 artists
      if (allArtists.length > 0) {
        calculateTopGenres(allArtists)
      }

    } catch (error) {
      console.error('Error loading top artists:', error)
    }
  }

  function calculateTopGenres(artists: Artist[]) {
    const genreMap: { [key: string]: number } = {}
    let totalGenres = 0

    artists.forEach(artist => {
      artist.genres?.forEach(genre => {
        genreMap[genre] = (genreMap[genre] || 0) + 1
        totalGenres++
      })
    })

    const genreData: GenreData[] = Object.entries(genreMap)
      .map(([name, count]) => ({
        name,
        count,
        percentage: parseFloat(((count / totalGenres) * 100).toFixed(1))
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 7)

    setTopGenres(genreData)
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
      <h1 className="text-3xl font-bold mb-6 text-gray-900">Your Music Dashboard</h1>
      
      <div className="space-y-6">
        {/* Year Summary - Full Width */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Your {currentYear} Listening Summary
            </CardTitle>
            <CardDescription>
              Estimated listening time based on your recent activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasHistoricalData ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={yearData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                  <Tooltip formatter={(value) => [`${value} hours`, 'Listening Time']} />
                  <Line 
                    type="monotone" 
                    dataKey="hours" 
                    stroke="hsl(173 80% 40%)" 
                    strokeWidth={2} 
                    dot={{ fill: 'hsl(173 80% 40%)' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-center">
                <div className="space-y-2">
                  <Music2 className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">
                    We don't have enough history to show your yearly listening yet.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    We'll track your listening over time as you use the app.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Artists and Top Genres - Two Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top 10 Artists */}
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Artists</CardTitle>
              <CardDescription>Your most listened to artists</CardDescription>
            </CardHeader>
            <CardContent>
              {topArtists.length > 0 ? (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {topArtists.map((artist, index) => (
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
                    No top artists found. Listen more on Spotify.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top 7 Genres - Vertical Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Top 7 Genres</CardTitle>
              <CardDescription>Based on your top 50 artists</CardDescription>
            </CardHeader>
            <CardContent>
              {topGenres.length > 0 ? (
                <ResponsiveContainer width="100%" height={600}>
                  <BarChart data={topGenres} margin={{ top: 20, right: 20, bottom: 100, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      tick={{ fontSize: 11 }}
                      tickFormatter={(value) => {
                        const capitalized = value.charAt(0).toUpperCase() + value.slice(1)
                        return capitalized.length > 20 ? capitalized.slice(0, 20) + '...' : capitalized
                      }}
                    />
                    <YAxis label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip 
                      formatter={(value: any, name: string) => {
                        if (name === 'percentage') return [`${value}%`, 'Percentage']
                        return [value, name]
                      }}
                      labelFormatter={(label) => label.charAt(0).toUpperCase() + label.slice(1)}
                    />
                    <Bar 
                      dataKey="percentage" 
                      fill="hsl(173 80% 40%)" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-48 text-center">
                  <p className="text-muted-foreground">
                    {topArtists.length > 0 
                      ? 'No genre data available for these artists.'
                      : 'Listen to more artists to see genre breakdown.'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
