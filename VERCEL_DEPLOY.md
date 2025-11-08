# Spotify Recommendation Website - Vercel Deployment

## Quick Start

This guide will help you deploy your Spotify app to Vercel in just a few minutes!

---

## Step 1: Push to GitHub

Open your terminal in VS Code and run:

```bash
# Make sure you're in the root directory
cd C:\Users\trist\VSCode_PythonFiles\SpotifyRecommendationWebsite

# Add all files
git add .

# Commit
git commit -m "Ready for Vercel deployment"

# Push to GitHub (make sure your repo exists first on GitHub)
git push -u origin main
```

**Don't have a GitHub repo yet?**
1. Go to https://github.com/new
2. Create a new repository called `SpotifyRecommendationWebsite`
3. Don't initialize with README (your local repo already has files)
4. Then run:
```bash
git remote add origin https://github.com/TristanYIKo/SpotifyRecommendationWebsite.git
git push -u origin main
```

---

## Step 2: Deploy on Vercel

### Via Vercel Dashboard (Easiest):

1. **Go to Vercel:**
   - Visit: https://vercel.com/new
   - Sign up/login with GitHub

2. **Import Your Repository:**
   - Click "Import Git Repository"
   - Select `SpotifyRecommendationWebsite`

3. **Configure Project:**
   - **Framework:** Next.js (should auto-detect)
   - **Root Directory:** Click "Edit" and type `web` ← **VERY IMPORTANT!**
   - Leave Build/Output settings as default

4. **Add Environment Variables:**
   Click "Environment Variables" and add:
   
   ```
   Name: NEXT_PUBLIC_SUPABASE_URL
   Value: https://cmooatsolqckgdpacolr.supabase.co
   ```
   
   ```
   Name: NEXT_PUBLIC_SUPABASE_ANON_KEY
   Value: [Get this from Supabase Dashboard → Settings → API]
   ```

5. **Click "Deploy"!**
   - Wait 2-3 minutes for build to complete
   - You'll get a URL like: `https://spotify-recommendation-website.vercel.app`

---

## Step 3: Update Supabase Settings

After deployment, update your auth URLs:

1. **Go to Supabase:**
   - https://supabase.com/dashboard/project/cmooatsolqckgdpacolr/auth/url-configuration

2. **Add Redirect URLs:**
   ```
   https://your-app-name.vercel.app/auth/callback
   https://your-app-name.vercel.app/*
   ```

3. **Update Site URL:**
   ```
   https://your-app-name.vercel.app
   ```

4. Click "Save"

---

## Step 4: Update Spotify App

1. **Go to Spotify Dashboard:**
   - https://developer.spotify.com/dashboard
   - Select your app
   - Click "Edit Settings"

2. **Add Redirect URIs:**
   ```
   https://cmooatsolqckgdpacolr.supabase.co/auth/v1/callback
   https://your-app-name.vercel.app/auth/callback
   ```

3. Click "Save"

---

## Step 5: Test Your App!

1. Visit your Vercel URL
2. Try logging in with Spotify
3. Sync your data
4. Check the dashboard

---

## Where to Get Supabase Anon Key

1. Go to: https://supabase.com/dashboard/project/cmooatsolqckgdpacolr/settings/api
2. Copy the value under **"anon" "public"** key
3. It looks like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

---

## Automatic Deployments

Now that you're connected to GitHub:
- Every `git push` to main → Automatic deployment to production!
- No need to manually deploy again

---

## Need Help?

**Build fails?**
- Check that `web` is set as the root directory
- Verify environment variables are correct

**Login doesn't work?**
- Make sure Supabase redirect URLs are updated
- Check Spotify redirect URIs include your Vercel URL

**Database errors?**
- Run the SQL migrations in Supabase Dashboard → SQL Editor:
  - Copy contents of `web/supabase/migrations/create_listening_history.sql`
  - Run it in SQL Editor

---

## Your URLs Checklist

✅ GitHub Repo: https://github.com/TristanYIKo/SpotifyRecommendationWebsite
✅ Vercel App: `https://[your-app-name].vercel.app` (you'll get this after deploy)
✅ Supabase: https://cmooatsolqckgdpacolr.supabase.co

---

Good luck! 🚀
