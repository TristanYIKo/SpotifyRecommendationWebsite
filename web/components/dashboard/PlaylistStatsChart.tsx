'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface Playlist {
  id: string
  name: string
  tracks: {
    total: number
  }
}

interface PlaylistStatsChartProps {
  playlists: Playlist[]
}

interface CategoryData {
  category: string
  count: number
}

export default function PlaylistStatsChart({ playlists }: PlaylistStatsChartProps) {
  // Filter out invalid playlists
  const validPlaylists = playlists.filter(p => p && p.tracks && typeof p.tracks.total === 'number')
  
  // Categorize playlists by song count
  const categories = [
    { label: '0-10 songs', min: 0, max: 10 },
    { label: '11-50 songs', min: 11, max: 50 },
    { label: '51-100 songs', min: 51, max: 100 },
    { label: '101-500 songs', min: 101, max: 500 },
    { label: '500+ songs', min: 501, max: Infinity }
  ]

  const categoryData: CategoryData[] = categories.map(cat => {
    const count = validPlaylists.filter(p => 
      p.tracks.total >= cat.min && p.tracks.total <= cat.max
    ).length
    
    return {
      category: cat.label,
      count
    }
  })

  const totalPlaylists = validPlaylists.length
  const totalTracks = validPlaylists.reduce((sum, p) => sum + p.tracks.total, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Playlist Size Distribution</CardTitle>
        <CardDescription>
          {totalPlaylists > 0 
            ? `${totalPlaylists} playlists • ${totalTracks.toLocaleString()} total tracks`
            : 'Your playlists by size'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {totalPlaylists > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart 
              data={categoryData}
              margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="category"
                tick={{ fontSize: 11 }}
                angle={-15}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                label={{ value: 'Number of Playlists', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                formatter={(value: number) => [`${value} playlists`, 'Count']}
              />
              <Bar 
                dataKey="count" 
                fill="hsl(173 80% 40%)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-64 text-center">
            <p className="text-muted-foreground">
              No playlists found
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
