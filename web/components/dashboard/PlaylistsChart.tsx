'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Music } from 'lucide-react'

interface Playlist {
  id: string
  name: string
  tracks: {
    total: number
  }
}

interface PlaylistsChartProps {
  playlists: Playlist[]
}

export function PlaylistsChart({ playlists }: PlaylistsChartProps) {
  const chartData = useMemo(() => {
    if (!playlists || playlists.length === 0) return []

    // Sort by track count and take top 5
    return playlists
      .sort((a, b) => b.tracks.total - a.tracks.total)
      .slice(0, 5)
      .map(playlist => ({
        name: playlist.name.length > 20 
          ? playlist.name.substring(0, 20) + '...' 
          : playlist.name,
        fullName: playlist.name,
        tracks: playlist.tracks.total
      }))
  }, [playlists])

  const totalStats = useMemo(() => {
    if (!playlists || playlists.length === 0) return { playlists: 0, tracks: 0 }

    return {
      playlists: playlists.length,
      tracks: playlists.reduce((sum, p) => sum + p.tracks.total, 0)
    }
  }, [playlists])

  if (!playlists || playlists.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Playlists</CardTitle>
          <CardDescription>Your biggest collections</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No playlists found
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Your Playlists</CardTitle>
            <CardDescription>Top 5 by track count</CardDescription>
          </div>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Music className="w-4 h-4" />
              <span>{totalStats.playlists} playlists</span>
            </div>
            <div>
              <span>{totalStats.tracks.toLocaleString()} tracks</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart 
            data={chartData} 
            layout="vertical"
            margin={{ left: 100, right: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis 
              type="category" 
              dataKey="name" 
              width={100}
              tick={{ fontSize: 12 }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
              formatter={(value, name, props) => [
                `${value} tracks`,
                props.payload.fullName
              ]}
            />
            <Bar 
              dataKey="tracks" 
              fill="hsl(var(--primary))"
              radius={[0, 4, 4, 0]}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={`hsl(var(--chart-${(index % 5) + 1}))`}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
