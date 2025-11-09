'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Music } from 'lucide-react'

interface Track {
  id: string
  name: string
  artists: { name: string }[]
  album: {
    images: { url: string }[]
  }
  popularity?: number
}

interface TopTracksListProps {
  tracks: Track[]
}

export default function TopTracksList({ tracks }: TopTracksListProps) {
  const topTracks = tracks.slice(0, 10)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Tracks</CardTitle>
        <CardDescription>
          {tracks.length > 0 
            ? `Your ${topTracks.length} most played songs`
            : 'Your most listened to tracks'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {topTracks.length > 0 ? (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {topTracks.map((track, index) => (
              <div key={track.id} className="flex items-center gap-3">
                <span className="text-lg font-semibold text-muted-foreground w-7">
                  {index + 1}
                </span>
                {track.album?.images?.[0]?.url ? (
                  <img 
                    src={track.album.images[0].url} 
                    alt={track.name}
                    className="h-10 w-10 rounded object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                    <Music className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-sm">{track.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {track.artists?.map(a => a.name).join(', ')}
                  </p>
                </div>
                {track.popularity !== undefined && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {track.popularity}/100
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-center">
            <div className="space-y-2">
              <Music className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">
                No top tracks found. Listen more on Spotify and sync your data.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
