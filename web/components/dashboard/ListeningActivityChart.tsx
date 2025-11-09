'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Music2 } from 'lucide-react'

interface Track {
  played_at: string
  track: {
    name: string
    duration_ms: number
  }
}

interface ListeningActivityChartProps {
  tracks: Track[]
}

interface HourData {
  hour: number
  count: number
}

export default function ListeningActivityChart({ tracks }: ListeningActivityChartProps) {
  // Group tracks by hour of day
  const hourMap: { [key: number]: number } = {}
  
  tracks.forEach(item => {
    const playedAt = new Date(item.played_at)
    const hour = playedAt.getHours()
    hourMap[hour] = (hourMap[hour] || 0) + 1
  })

  // Create data for all 24 hours
  const hourData: HourData[] = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    count: hourMap[i] || 0
  }))

  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM'
    if (hour === 12) return '12 PM'
    if (hour < 12) return `${hour} AM`
    return `${hour - 12} PM`
  }

  const maxHour = hourData.reduce((max, curr) => curr.count > max.count ? curr : max, hourData[0])
  const totalPlays = tracks.length

  return (
    <Card>
      <CardHeader>
        <CardTitle>When You Listen</CardTitle>
        <CardDescription>
          {totalPlays > 0 
            ? `${totalPlays} plays from your last 50 songs. Most active around ${formatHour(maxHour.hour)}`
            : 'Your listening activity by hour of day'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {totalPlays > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={hourData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="hour"
                tickFormatter={formatHour}
                tick={{ fontSize: 11 }}
                interval={2}
              />
              <YAxis label={{ value: 'Plays', angle: -90, position: 'insideLeft' }} />
              <Tooltip 
                labelFormatter={(hour) => formatHour(hour as number)}
                formatter={(value: number) => [value, 'Plays']}
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
            <div className="space-y-2">
              <Music2 className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">
                No recent listening data. Play something on Spotify and sync again.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
