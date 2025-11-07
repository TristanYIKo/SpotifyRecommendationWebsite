import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

/**
 * Test endpoint to verify Spotify API access
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.provider_token) {
      return NextResponse.json({ error: 'No token' }, { status: 401 })
    }

    const token = session.provider_token

    // Test 1: Get user profile
    console.log('Testing /v1/me endpoint...')
    const meResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const meData = await meResponse.json()
    console.log('Me endpoint:', meResponse.status, meData)

    // Test 2: Get top tracks
    console.log('Testing /v1/me/top/tracks endpoint...')
    const topResponse = await fetch('https://api.spotify.com/v1/me/top/tracks?limit=1', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const topData = await topResponse.json()
    console.log('Top tracks endpoint:', topResponse.status, topData)

    // Test 3: Try recommendations with a known good track ID
    const testSeed = '11dFghVXANMlKmJXsNCbNl' // Known good track ID (Cut To The Feeling)
    const recUrl = `https://api.spotify.com/v1/recommendations?seed_tracks=${testSeed}&limit=5&market=US`
    console.log('Testing recommendations endpoint:', recUrl)
    
    const recResponse = await fetch(recUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const recData = await recResponse.json()
    console.log('Recommendations endpoint:', recResponse.status, recData)

    return NextResponse.json({
      tokenValid: meResponse.ok,
      topTracksWorks: topResponse.ok,
      recommendationsWorks: recResponse.ok,
      meStatus: meResponse.status,
      topStatus: topResponse.status,
      recStatus: recResponse.status,
      recError: recResponse.ok ? null : recData,
      message: recResponse.ok 
        ? '✅ All endpoints working!' 
        : `❌ Recommendations endpoint failed with ${recResponse.status}`,
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
