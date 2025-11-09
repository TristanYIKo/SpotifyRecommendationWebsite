# Resonate: Music Recommender - Full Stack Web App

https://resonate-song-rec.vercel.app/ 

I’m currently in developer mode — if you’d like to try it out, just send me an email at Tristanko1116@gmail.com with your full name and email address.

A modern full-stack web application that connects to your Spotify account to provide personalized music insights and AI-powered song recommendations. Visualize your listening habits, discover your top artists and tracks, and get tailored music suggestions based on your unique taste. A full-stack music recommendation web application that uses Spotify data and machine learning to generate personalized track recommendations.



## 🎵 Features



### Dashboard Analytics- **Spotify OAuth Authentication** via Supabase

- **Listening Activity** - View when you listen to music throughout the day with hour-by-hour breakdown- **Sync Spotify Listening History** - Fetch your top tracks and audio features

- **Top Genres** - Pie chart visualization of your most listened-to genres- **ML-Powered Recommendations** - Get personalized recommendations based on your music taste

- **Top Artists** - Your favorite artists ranked by popularity- **Modern UI** - Built with Next.js and Tailwind CSS

- **Top Tracks** - Your most played songs with album artwork and popularity scores- **Scalable Architecture** - Separate frontend and backend services


## 🛠️ Tech Stack

- **Supabase** (PostgreSQL)

### Frontend

- **Next.js 14** 

- **Tailwind CSS** 

- **shadcn/ui** 

- **Recharts** 

- **Lucide React** 

### Backend/API

- **Next.js API Routes** 

- **SpotifyAPI** 



## 📊 How It Works├── backend/ 

│   ├── main.py

### Architecture Flow│   ├── recommender.py

│   ├── supabase_client.py

```│   └── requirements.txt

┌─────────────┐│

│   User      │└── database/

│  (Browser)  │    └── schema.sql               # Supabase database schema

└──────┬──────┘```

       │

       │ 1. Login with Spotify## 🚀 Getting Started

       ▼

┌─────────────────────────┐### Prerequisites

│   Supabase Auth         │

│  (OAuth Provider)       │- Node.js 18+ and npm/yarn

└──────┬──────────────────┘- Python 3.9+

       │- Supabase account

       │ 2. Store tokens & user data- Spotify Developer account

       ▼

┌─────────────────────────┐### 1. Supabase Setup

│   Next.js Frontend      │

│   (React + TypeScript)  │1. Create a new project at [supabase.com](https://supabase.com)

└──────┬──────────────────┘2. Enable Spotify OAuth provider in Authentication > Providers

       │3. Run the SQL schema in `database/schema.sql` in the Supabase SQL Editor

       │ 3. Sync Spotify Data4. Get your project URL and keys from Settings > API

       ▼

┌─────────────────────────┐### 2. Spotify Developer Setup

│   Spotify API           │

│   - /me/top/tracks      │1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)

│   - /me/top/artists     │2. Create a new app

│   - /me/recently-played │3. Add redirect URI: `https://[your-project].supabase.co/auth/v1/callback`

│   - /audio-features     │4. Copy Client ID and Client Secret

└──────┬──────────────────┘5. Add these to Supabase Spotify OAuth settings

       │

       │ 4. Store in Database### 3. Frontend Setup

       ▼

┌─────────────────────────┐```bash

│   Supabase PostgreSQL   │cd web

│   - user_spotify_data   │

│   - listening_history   │# Install dependencies

│   - spotify_tokens      │npm install

└──────┬──────────────────┘

       │# Copy environment template

       │ 5. Dashboard renders datacp .env.local.example .env.local

       ▼

┌─────────────────────────┐# Edit .env.local with your values:

│   Dashboard Components  │# - NEXT_PUBLIC_SUPABASE_URL

│   - ListeningActivity   │# - NEXT_PUBLIC_SUPABASE_ANON_KEY

│   - GenrePieChart       │# - SPOTIFY_CLIENT_ID

│   - TopTracksList       │# - SPOTIFY_CLIENT_SECRET

│   - TopArtistsList      │# - NEXT_PUBLIC_BACKEND_URL

└─────────────────────────┘

# Run development server

For Recommendations:npm run dev

┌──────────────────────────┐```

│  User clicks "Get Recs"  │

└──────┬───────────────────┘The frontend will be available at `http://localhost:3000`

       │

       │ 6. Request recommendations### 4. Backend Setup

       ▼

┌─────────────────────────┐```bash

│   FastAPI Backend       │cd backend

│   (ML Service)          │

└──────┬──────────────────┘# Create virtual environment

       │python -m venv venv

       │ 7. Fetch user profile from DB

       ▼# Activate virtual environment

┌─────────────────────────┐# Windows:

│   ML Algorithm          │venv\Scripts\activate

│   - Calculate avg       │# Mac/Linux:

│     audio features      │source venv/bin/activate

│   - Cosine similarity   │

│   - Rank tracks         │# Install dependencies

└──────┬──────────────────┘pip install -r requirements.txt

       │

       │ 8. Return top matches# Copy environment template

       ▼cp .env.example .env

┌─────────────────────────┐

│   Display Results       │# Edit .env with your values:

│   - Track info          │# - SUPABASE_URL

│   - Play on Spotify     │# - SUPABASE_SERVICE_ROLE_KEY

└─────────────────────────┘

```# Run FastAPI server

```
## Data Processing Pipeline



1. **Authentication**: User logs in via Spotify OAuth, tokens stored in SupabaseThe backend API will be available at `http://localhost:8000`

2. **Sync**: Fetches top tracks (300), top artists (75), recent plays (50) from Spotify API

3. **Storage**: Data stored in PostgreSQL with user_id association## 🔧 Usage

4. **Analysis**: Dashboard components process data for visualizations

5. **Recommendations**: backend analyzes audio features and generates personalized suggestions1. **Login**: Click "Login with Spotify" on the homepage
