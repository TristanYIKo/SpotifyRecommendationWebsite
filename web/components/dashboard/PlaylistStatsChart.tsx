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

interface PlaylistData {
  name: string
  tracks: number
}

export default function PlaylistStatsChart({ playlists }: PlaylistStatsChartProps) {
  // Filter out invalid playlists and sort by track count, take top 5
  const validPlaylists = playlists.filter(p => p && p.tracks && typeof p.tracks.total === 'number')
  
  const topPlaylists: PlaylistData[] = [...validPlaylists]
    .sort((a, b) => b.tracks.total - a.tracks.total)
    .slice(0, 5)
    .map(p => ({
      name: p.name.length > 20 ? p.name.slice(0, 20) + '...' : p.name,
      tracks: p.tracks.total
    }))

  const totalTracks = validPlaylists.reduce((sum, p) => sum + p.tracks.total, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Playlist Stats</CardTitle>
        <CardDescription>
          {validPlaylists.length > 0 
            ? `${validPlaylists.length} playlists • ${totalTracks.toLocaleString()} total tracks`
            : 'Your biggest playlists'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {topPlaylists.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart 
              data={topPlaylists} 
              layout="vertical"
              margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="number"
                label={{ value: 'Number of Tracks', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                type="category"
                dataKey="name"
                width={90}
                tick={{ fontSize: 11 }}
              />
              <Tooltip 
                formatter={(value: number) => [`${value.toLocaleString()} tracks`, 'Tracks']}
              />
              <Bar 
                dataKey="tracks" 
                fill="hsl(173 80% 40%)"
                radius={[0, 4, 4, 0]}
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
