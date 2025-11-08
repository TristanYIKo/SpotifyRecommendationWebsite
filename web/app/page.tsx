'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { User } from '@supabase/supabase-js'
import SpotifyFeatures from '@/components/SpotifyFeatures'

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    // Check for existing session
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)
    }

    checkUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'spotify',
      options: {
        scopes: 'user-read-email user-top-read user-read-recently-played playlist-read-private playlist-read-collaborative',
        redirectTo: `${window.location.origin}/`,
      },
    })

    if (error) {
      console.error('Login error:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-2xl">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <div className="text-center max-w-2xl">
          <h1 className="text-5xl font-bold mb-6">
            Resonate - Music Recommender
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            Get personalized music recommendations based on your Spotify listening history
          </p>
          <button
            onClick={handleLogin}
            className="bg-spotify-green hover:bg-green-600 text-white font-bold py-4 px-8 rounded-full text-lg transition-colors"
          >
            Login with Spotify
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header with Title */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">
          Get Recommendations
        </h1>
        <p className="text-gray-400">
          Discover new music based on your Spotify taste
        </p>
      </div>

      {/* Spotify Features Component */}
      <SpotifyFeatures />
    </div>
  )
}
