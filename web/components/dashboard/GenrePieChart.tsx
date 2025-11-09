'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

interface Artist {
  id: string
  name: string
  genres?: string[]
}

interface GenrePieChartProps {
  artists: Artist[]
}

interface GenreData {
  name: string
  value: number
  percentage: number
}

const COLORS = [
  'hsl(173, 80%, 40%)',
  'hsl(197, 37%, 24%)',
  'hsl(43, 74%, 66%)',
  'hsl(27, 87%, 67%)',
  'hsl(12, 76%, 61%)',
]

export default function GenrePieChart({ artists }: GenrePieChartProps) {
  // Calculate top genres from artists
  const genreMap: { [key: string]: number } = {}
  let totalCount = 0

  artists.forEach(artist => {
    artist.genres?.forEach(genre => {
      genreMap[genre] = (genreMap[genre] || 0) + 1
      totalCount++
    })
  })

  // Get top 5 genres
  const genreData: GenreData[] = Object.entries(genreMap)
    .map(([name, value]) => ({
      name,
      value,
      percentage: parseFloat(((value / totalCount) * 100).toFixed(1))
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)

  const renderLabel = (entry: any) => {
    return `${entry.percentage}%`
  }

  const capitalizeGenre = (genre: string) => {
    return genre
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Genres</CardTitle>
        <CardDescription>Your most listened to genres</CardDescription>
      </CardHeader>
      <CardContent>
        {genreData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={genreData as any}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderLabel}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {genreData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number, name: string, props: any) => {
                  const percentage = props.payload.percentage
                  return [`${value} (${percentage}%)`, capitalizeGenre(props.payload.name)]
                }}
                labelFormatter={() => ''}
              />
              <Legend 
                formatter={(value: string, entry: any) => {
                  return capitalizeGenre(entry.payload.name)
                }}
                iconType="circle"
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-64 text-center">
            <p className="text-muted-foreground">
              No genre data available
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
