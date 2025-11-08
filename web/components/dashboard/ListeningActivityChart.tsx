'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Button } from '@/components/ui/button'
import { Clock, Calendar } from 'lucide-react'

interface Track {
  played_at: string
}

interface ListeningActivityChartProps {
  tracks: Track[]
}

type ViewMode = 'hour' | 'day'

export function ListeningActivityChart({ tracks }: ListeningActivityChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('hour')

  const chartData = useMemo(() => {
    if (!tracks || tracks.length === 0) return []

    if (viewMode === 'hour') {
      // Group by hour of day
      const hourCounts = new Array(24).fill(0)
      
      tracks.forEach(track => {
        const date = new Date(track.played_at)
        const hour = date.getHours()
        hourCounts[hour]++
      })

      return hourCounts.map((count, hour) => ({
        label: `${hour.toString().padStart(2, '0')}:00`,
        count,
        hour
      }))
    } else {
      // Group by day of week
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const dayCounts = new Array(7).fill(0)

      tracks.forEach(track => {
        const date = new Date(track.played_at)
        const day = date.getDay()
        dayCounts[day]++
      })

      return dayCounts.map((count, day) => ({
        label: dayNames[day],
        count,
        day
      }))
    }
  }, [tracks, viewMode])

  const peakActivity = useMemo(() => {
    if (chartData.length === 0) return null

    const maxEntry = chartData.reduce((max, entry) => 
      entry.count > max.count ? entry : max, chartData[0]
    )

    if (viewMode === 'hour' && 'hour' in maxEntry) {
      const hour = maxEntry.hour
      const period = hour >= 12 ? 'PM' : 'AM'
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
      return `Most listening happens around ${displayHour} ${period}`
    } else {
      return `You listen most on ${maxEntry.label}s`
    }
  }, [chartData, viewMode])

  if (!tracks || tracks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Listening Activity</CardTitle>
          <CardDescription>When you listen to music the most</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No recent listening data available
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
            <CardTitle>Listening Activity</CardTitle>
            <CardDescription>{peakActivity}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'hour' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('hour')}
            >
              <Clock className="w-4 h-4 mr-1" />
              By Hour
            </Button>
            <Button
              variant={viewMode === 'day' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('day')}
            >
              <Calendar className="w-4 h-4 mr-1" />
              By Day
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="label" 
              angle={viewMode === 'hour' ? -45 : 0}
              textAnchor={viewMode === 'hour' ? 'end' : 'middle'}
              height={viewMode === 'hour' ? 80 : 60}
              tick={{ fontSize: 12 }}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
              formatter={(value) => [`${value} plays`, 'Count']}
            />
            <Bar 
              dataKey="count" 
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
