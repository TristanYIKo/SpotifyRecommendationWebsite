# 🎵 Testing Guide - New Spotify Features

## ✅ What We Just Added

### 1. **New Database Table** (`user_spotify_data`)
- Stores top 100 tracks, 50 artists, and 50 playlists as JSONB
- Automatic timestamps and RLS policies

### 2. **New API Endpoint** (`/api/spotify/sync`)
- POST request that syncs comprehensive Spotify data
- Returns stats about synced items

### 3. **New API Endpoint** (`/api/spotify/recommendations`)
- GET request with 3 modes:
  - **General**: Based on your overall taste
  - **Playlist**: Based on a specific playlist
  - **Artist**: Based on a specific artist

### 4. **New UI Component** (`SpotifyFeatures`)
- Clean interface to test all new features
- Displays recommendations with album art and Spotify links

---

## 🚀 Step-by-Step Testing Instructions

### Step 1: Run Database Migration

1. Go to your Supabase dashboard: https://cmooatsolqckgdpacolr.supabase.co
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `database/user_spotify_data.sql`
5. Paste into the query editor
6. Click **Run** or press `Ctrl+Enter`
7. You should see: `Success. No rows returned`

### Step 2: Restart Your Development Server (if needed)

If the server isn't running or you want a fresh start:
```powershell
cd web
npm run dev
```

### Step 3: Re-login to Get New Permissions

The app now requests additional Spotify scopes for playlist access:
- `playlist-read-private`
- `playlist-read-collaborative`

**Important**: Log out and log back in to grant these new permissions!

1. Go to http://localhost:3000
2. Click **Logout** (if logged in)
3. Click **Login with Spotify**
4. You'll be prompted to authorize the app again with new permissions
5. Click **Agree**

### Step 4: Sync Your Spotify Data

1. Once logged in, you'll see the new UI
2. Click **🔄 Sync My Spotify** button
3. Wait for sync to complete (may take 5-10 seconds)
4. You should see: `✅ Synced! 100 tracks, 50 artists, X playlists`

### Step 5: Test General Recommendations

1. Make sure **Mode: General** is selected
2. Click **Get Recommendations**
3. You should see a list of recommended songs based on your overall taste
4. Each song will have:
   - Album artwork
   - Song name
   - Artist(s)
   - Album name
   - **▶ Play** button that opens Spotify

### Step 6: Test Playlist Recommendations

1. Select **Mode: Playlist**
2. Get a playlist ID from Spotify:
   - Open Spotify web or desktop
   - Go to any playlist
   - Click **Share** → **Copy Playlist Link**
   - Extract the ID from the URL
   - Example: `https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M`
   - ID is: `37i9dQZF1DXcBWIGoYBM5M`
3. Paste the playlist ID into the input field
4. Click **Get Recommendations**
5. You should see recommendations based on that playlist's vibe

### Step 7: Test Artist Recommendations

1. Select **Mode: Artist**
2. Enter an artist name (e.g., "Daft Punk", "Taylor Swift", "Kendrick Lamar")
3. Click **Get Recommendations**
4. You should see recommendations similar to that artist's style

---

## 🐛 Common Issues & Solutions

### Issue: "Error: Missing required parameter"
**Solution**: Make sure you've filled in the required field for the mode:
- Playlist mode → Enter playlist ID
- Artist mode → Enter artist name

### Issue: "Error: No user found"
**Solution**: You're not logged in. Click "Login with Spotify"

### Issue: "Error: Failed to refresh Spotify token"
**Solution**: 
1. Log out
2. Log back in
3. Try syncing again

### Issue: Recommendations endpoint returns 404
**Solution**: This is a known Spotify API limitation. The `/v1/recommendations` endpoint may not be available for all accounts/regions. If this happens:
1. Check the browser console for error details
2. The old recommendation method in "Legacy Features" might work better

### Issue: "No synced data found"
**Solution**: Click "Sync My Spotify" first before trying General recommendations

### Issue: Playlist ID doesn't work
**Solution**: 
- Make sure you copied just the ID, not the full URL
- Try a different playlist (some private playlists might not work)
- Make sure you logged out and back in to get playlist permissions

---

## 📊 What to Look For

### Successful Sync:
```
✅ Synced! 100 tracks, 50 artists, 15 playlists
```

### Successful Recommendations:
```
✨ Found 20 recommendations!
```

Then you'll see a list of songs with:
- Album artwork (64x64 images)
- Song name
- Artist names (comma-separated if multiple)
- Album name
- Play button linking to Spotify

---

## 🔍 Advanced Testing

### Check Database Directly

1. Go to Supabase dashboard
2. Click **Table Editor**
3. Find `user_spotify_data` table
4. You should see one row with your user_id
5. Click on the row to see the JSONB data:
   - `top_tracks`: Array of 100 track objects
   - `top_artists`: Array of 50 artist objects
   - `playlists`: Array of your playlists

### Check Browser Console

Open DevTools (F12) and look for:
- Network requests to `/api/spotify/sync` and `/api/spotify/recommendations`
- Response data showing track/artist counts
- Any error messages

### Check Terminal Output

Your Next.js dev server will show:
- API route hits
- Any server-side errors
- Token refresh attempts

---

## 🎯 Expected Behavior

### General Mode:
- Uses up to 5 of your top tracks
- Uses up to 2 of your top artists
- Returns 20 recommendations (default)

### Playlist Mode:
- Fetches all tracks from the playlist
- Randomly selects 5 as seeds
- Returns 20 recommendations similar to that playlist

### Artist Mode:
- Searches for the artist by name
- Uses that artist as the sole seed
- Returns 20 recommendations similar to that artist

---

## 📝 Notes

- **Old features still work**: Your original sync and recommendations are under "Legacy Features"
- **No data loss**: This update adds new tables and routes without modifying existing ones
- **Spotify API limits**: If you see 429 errors, you're hitting rate limits (wait a minute)
- **Token refresh**: Happens automatically when tokens expire (every ~1 hour)

---

## 🎉 Success Checklist

- [ ] Database migration ran successfully
- [ ] Logged out and back in with new permissions
- [ ] Sync completed with 100 tracks, 50 artists
- [ ] General recommendations worked
- [ ] Playlist recommendations worked (with a valid playlist ID)
- [ ] Artist recommendations worked (with a valid artist name)
- [ ] Can click "▶ Play" to open songs in Spotify
- [ ] Old "Legacy Features" still work

---

## 💡 Tips

1. **First time?** Start with General mode after syncing
2. **Exploring?** Try different playlists to see varied recommendations
3. **Discovering?** Search for artists outside your usual taste
4. **Stuck?** Check the message area for detailed error info
5. **Curious?** Look at browser DevTools Network tab to see API responses

---

Happy music discovering! 🎶
