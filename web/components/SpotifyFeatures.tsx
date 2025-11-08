'use client'

import { useState, useEffect } from 'react'

interface Track {
  id: string
  name: string
  artists: string[]
  album: string
  image: string | null
  spotify_url: string
}

interface Playlist {
  id: string
  name: string
  owner: string
  total_tracks: number
  image: string | null
}

export default function SpotifyFeatures() {
  const [syncing, setSyncing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingPlaylists, setLoadingPlaylists] = useState(false)
  const [message, setMessage] = useState('')
  const [recommendations, setRecommendations] = useState<Track[]>([])
  const [mode, setMode] = useState<'general' | 'playlist' | 'artist'>('general')
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [selectedPlaylistId, setSelectedPlaylistId] = useState('')
  const [playlistSearch, setPlaylistSearch] = useState('')
  const [artistName, setArtistName] = useState('')

  // Fetch playlists when playlist mode is selected
  useEffect(() => {
    if (mode === 'playlist' && playlists.length === 0) {
      fetchPlaylists()
    }
  }, [mode])

  const fetchPlaylists = async () => {
    setLoadingPlaylists(true)
    try {
      const response = await fetch('/api/spotify/playlists')
      const data = await response.json()

      if (response.ok) {
        setPlaylists(data.playlists || [])
        if (data.playlists.length === 0) {
          setMessage('ℹ️ No playlists found in your library')
        }
      } else {
        setMessage(`❌ Error loading playlists: ${data.error}`)
      }
    } catch (error) {
      console.error('Fetch playlists error:', error)
      setMessage('❌ Failed to load playlists')
    } finally {
      setLoadingPlaylists(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    setMessage('Syncing your Spotify data...')
    
    try {
      const response = await fetch('/api/spotify/sync', { method: 'POST' })
      const data = await response.json()

      if (response.ok) {
        setMessage(`✅ Synced! ${data.stats.top_tracks} tracks, ${data.stats.top_artists} artists, ${data.stats.playlists} playlists`)
      } else {
        setMessage(`❌ Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Sync error:', error)
      setMessage('❌ Failed to sync')
    } finally {
      setSyncing(false)
    }
  }

  const handleGetRecommendations = async () => {
    setLoading(true)
    setMessage('Getting recommendations...')
    setRecommendations([])
    
    try {
      let url = `/api/spotify/recommendations?mode=${mode}`
      
      if (mode === 'playlist') {
        if (!selectedPlaylistId) {
          setMessage('❌ Please select a playlist first')
          setLoading(false)
          return
        }
        url += `&playlist_id=${selectedPlaylistId}`
      } else if (mode === 'artist') {
        if (!artistName.trim()) {
          setMessage('❌ Please enter an artist name')
          setLoading(false)
          return
        }
        url += `&artist_name=${encodeURIComponent(artistName)}`
      }

      console.log('Fetching recommendations from:', url)
      const response = await fetch(url)
      const data = await response.json()

      if (response.ok) {
        setRecommendations(data)
        setMessage(`✨ Found ${data.length} recommendations!`)
      } else {
        console.error('Recommendations error response:', data)
        setMessage(`❌ Error: ${data.error || 'Failed to get recommendations'}`)
      }
    } catch (error) {
      console.error('Recommendations error:', error)
      setMessage('❌ Failed to get recommendations')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Sync Section */}
      <div className="bg-gray-900 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">🔄 Sync My Spotify</h2>
        <p className="text-gray-400 mb-4">
          Pull your top tracks, artists, and playlists from Spotify
        </p>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="bg-spotify-green hover:bg-green-600 disabled:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
        >
          {syncing ? 'Syncing...' : 'Sync My Spotify'}
        </button>
      </div>

      {/* Recommendations Section */}
      <div className="bg-gray-900 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">🎵 Get Recommendations</h2>
        
        {/* Mode Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Mode:</label>
          <div className="flex gap-4">
            <button
              onClick={() => setMode('general')}
              className={`px-4 py-2 rounded ${mode === 'general' ? 'bg-spotify-green' : 'bg-gray-700'}`}
            >
              General (Default)
            </button>
            <button
              onClick={() => setMode('playlist')}
              className={`px-4 py-2 rounded ${mode === 'playlist' ? 'bg-spotify-green' : 'bg-gray-700'}`}
            >
              Playlist
            </button>
            <button
              onClick={() => setMode('artist')}
              className={`px-4 py-2 rounded ${mode === 'artist' ? 'bg-spotify-green' : 'bg-gray-700'}`}
            >
              Artist
            </button>
          </div>
        </div>

        {/* Playlist Selector */}
        {mode === 'playlist' && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Select a Playlist:
              {loadingPlaylists && <span className="ml-2 text-gray-400 text-xs">Loading...</span>}
            </label>
            
            {/* Search filter */}
            <input
              type="text"
              value={playlistSearch}
              onChange={(e) => setPlaylistSearch(e.target.value)}
              placeholder="Search your playlists..."
              className="w-full px-4 py-2 rounded bg-gray-800 border border-gray-700 focus:border-spotify-green mb-2"
            />

            {/* Playlist list */}
            <div className="max-h-60 overflow-y-auto bg-gray-800 border border-gray-700 rounded">
              {playlists.length === 0 && !loadingPlaylists ? (
                <div className="p-4 text-gray-400 text-sm">
                  No playlists found. {' '}
                  <button 
                    onClick={fetchPlaylists}
                    className="text-spotify-green hover:underline"
                  >
                    Refresh
                  </button>
                </div>
              ) : (
                playlists
                  .filter(p => 
                    playlistSearch === '' || 
                    p.name.toLowerCase().includes(playlistSearch.toLowerCase())
                  )
                  .map((playlist) => (
                    <button
                      key={playlist.id}
                      onClick={() => setSelectedPlaylistId(playlist.id)}
                      className={`w-full flex items-center gap-3 p-3 hover:bg-gray-700 transition-colors ${
                        selectedPlaylistId === playlist.id ? 'bg-gray-700 border-l-4 border-spotify-green' : ''
                      }`}
                    >
                      {playlist.image ? (
                        <img
                          src={playlist.image}
                          alt={playlist.name}
                          className="w-12 h-12 rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded bg-gray-600 flex items-center justify-center text-2xl">
                          🎵
                        </div>
                      )}
                      <div className="flex-1 text-left">
                        <p className="font-medium text-sm">{playlist.name}</p>
                        <p className="text-xs text-gray-400">
                          By {playlist.owner} · {playlist.total_tracks} tracks
                        </p>
                      </div>
                      {selectedPlaylistId === playlist.id && (
                        <span className="text-spotify-green">✓</span>
                      )}
                    </button>
                  ))
              )}
            </div>
          </div>
        )}

        {/* Artist Input */}
        {mode === 'artist' && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Artist Name:</label>
            <input
              type="text"
              value={artistName}
              onChange={(e) => setArtistName(e.target.value)}
              placeholder="Enter artist name"
              className="w-full px-4 py-2 rounded bg-gray-800 border border-gray-700 focus:border-spotify-green"
            />
          </div>
        )}

        <button
          onClick={handleGetRecommendations}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
        >
          {loading ? 'Loading...' : 'Get Recommendations'}
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className="bg-gray-800 rounded-lg p-4">
          <p>{message}</p>
        </div>
      )}

      {/* Recommendations List */}
      {recommendations.length > 0 && (
        <div className="bg-gray-900 rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4">Recommended Songs:</h3>
          <div className="space-y-3">
            {recommendations.map((track, index) => (
              <div
                key={track.id}
                className="flex items-center gap-4 bg-gray-800 hover:bg-gray-750 p-4 rounded-lg transition-colors"
              >
                {track.image && (
                  <img
                    src={track.image}
                    alt={track.album}
                    className="w-16 h-16 rounded"
                  />
                )}
                <div className="flex-1">
                  <p className="font-semibold">{track.name}</p>
                  <p className="text-sm text-gray-400">{track.artists.join(', ')}</p>
                  <p className="text-xs text-gray-500">{track.album}</p>
                </div>
                <a
                  href={track.spotify_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-spotify-green hover:bg-green-600 text-white font-bold py-2 px-4 rounded-full text-sm transition-colors"
                >
                  ▶ Play
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
