'use client'

import Image from 'next/image'

interface Recommendation {
  id: string
  name: string
  artists: string[]
  album: string
  preview_url: string | null
  external_url: string
  image: string | null
}

interface RecommendationListProps {
  recommendations: Recommendation[]
}

export default function RecommendationList({ recommendations }: RecommendationListProps) {
  const openSpotifyTrack = (externalUrl: string) => {
    window.open(externalUrl, '_blank')
  }

  return (
    <div className="bg-gray-900 rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-2">🎵 New Songs For You</h2>
      <p className="text-gray-400 mb-4">
        Fresh recommendations based on your listening taste
      </p>
      
      {recommendations.length === 0 ? (
        <p className="text-gray-400">No recommendations yet. Click "Get Recommendations" to generate some!</p>
      ) : (
        <div className="space-y-3">
          {recommendations.map((rec, index) => (
            <div 
              key={`${rec.id}-${index}`}
              className="flex items-center gap-4 bg-gray-800 hover:bg-gray-750 p-4 rounded-lg transition-colors cursor-pointer"
              onClick={() => openSpotifyTrack(rec.external_url)}
            >
              {/* Album Image */}
              <div className="flex-shrink-0">
                {rec.image ? (
                  <Image
                    src={rec.image}
                    alt={rec.album}
                    width={64}
                    height={64}
                    className="rounded-md"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-700 rounded-md flex items-center justify-center">
                    🎵
                  </div>
                )}
              </div>

              {/* Track Number */}
              <span className="text-2xl font-bold text-gray-600 w-8">
                {index + 1}
              </span>

              {/* Track Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-lg truncate">
                  {rec.name}
                </p>
                <p className="text-sm text-gray-400 truncate">
                  {rec.artists.join(', ')}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {rec.album}
                </p>
              </div>
              
              {/* Play Button */}
              <button 
                className="bg-spotify-green hover:bg-green-600 text-white font-bold py-2 px-6 rounded-full text-sm transition-colors flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation()
                  openSpotifyTrack(rec.external_url)
                }}
              >
                ▶ Play
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
