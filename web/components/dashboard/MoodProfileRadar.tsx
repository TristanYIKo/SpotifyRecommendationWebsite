'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts'

interface AudioFeatures {
  energy: number
  danceability: number
  valence: number
  acousticness: number
  tempo: number
}

interface MoodProfileRadarProps {
  audioFeatures: AudioFeatures[]
}

export function MoodProfileRadar({ audioFeatures }: MoodProfileRadarProps) {
  const moodData = useMemo(() => {
    if (!audioFeatures || audioFeatures.length === 0) return []

    // Calculate averages
    const totals = audioFeatures.reduce(
      (acc, features) => ({
        energy: acc.energy + features.energy,
        danceability: acc.danceability + features.danceability,
        valence: acc.valence + features.valence,
        acousticness: acc.acousticness + features.acousticness,
        tempo: acc.tempo + features.tempo
      }),
      { energy: 0, danceability: 0, valence: 0, acousticness: 0, tempo: 0 }
    )

    const count = audioFeatures.length
    
    // Normalize tempo (0-200 BPM range to 0-1)
    const avgTempo = (totals.tempo / count) / 200

    return [
      { metric: 'Energy', value: (totals.energy / count) * 100, fullMark: 100 },
      { metric: 'Danceability', value: (totals.danceability / count) * 100, fullMark: 100 },
      { metric: 'Happiness', value: (totals.valence / count) * 100, fullMark: 100 },
      { metric: 'Acoustic', value: (totals.acousticness / count) * 100, fullMark: 100 },
      { metric: 'Tempo', value: avgTempo * 100, fullMark: 100 }
    ]
  }, [audioFeatures])

  const moodDescription = useMemo(() => {
    if (moodData.length === 0) return ''

    const energy = moodData.find(m => m.metric === 'Energy')?.value || 0
    const valence = moodData.find(m => m.metric === 'Happiness')?.value || 0

    if (energy > 70 && valence > 70) {
      return 'High energy and happy vibes!'
    } else if (energy > 70 && valence < 40) {
      return 'Intense and powerful mood'
    } else if (energy < 40 && valence > 70) {
      return 'Chill and positive atmosphere'
    } else if (energy < 40 && valence < 40) {
      return 'Mellow and contemplative'
    } else {
      return 'Balanced listening profile'
    }
  }, [moodData])

  if (!audioFeatures || audioFeatures.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mood Profile</CardTitle>
          <CardDescription>Your listening characteristics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No mood data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mood Profile</CardTitle>
        <CardDescription>{moodDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={moodData}>
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis 
              dataKey="metric" 
              tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
            />
            <PolarRadiusAxis 
              angle={90} 
              domain={[0, 100]}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            />
            <Radar
              name="Your Mood"
              dataKey="value"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.6}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
              formatter={(value: any) => `${Math.round(value)}%`}
            />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
