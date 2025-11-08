'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

interface Artist {
  genres?: string[]
}

interface GenrePieChartProps {
  artists: Artist[]
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
]

export function GenrePieChart({ artists }: GenrePieChartProps) {
  const genreData = useMemo(() => {
    if (!artists || artists.length === 0) return []

    // Collect all genres
    const genreMap = new Map<string, number>()
    
    artists.forEach(artist => {
      artist.genres?.forEach(genre => {
        genreMap.set(genre, (genreMap.get(genre) || 0) + 1)
      })
    })

    // Convert to array and sort
    const genreArray = Array.from(genreMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5) // Top 5 genres

    // Calculate percentages
    const total = genreArray.reduce((sum, g) => sum + g.count, 0)
    
    return genreArray.map(genre => ({
      name: genre.name,
      value: genre.count,
      percentage: Math.round((genre.count / total) * 100)
    }))
  }, [artists])

  if (!artists || artists.length === 0 || genreData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Genres</CardTitle>
          <CardDescription>Your favorite music styles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No genre data available
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderCustomLabel = (entry: any) => {
    return `${entry.percentage}%`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Genres</CardTitle>
        <CardDescription>Your favorite music styles</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={genreData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {genreData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
              formatter={(value: any, name: any, props: any) => [
                `${props.payload.percentage}% (${value} artists)`,
                props.payload.name
              ]}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              formatter={(value, entry: any) => {
                const item = genreData.find(g => g.name === value)
                return `${value} (${item?.percentage}%)`
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
