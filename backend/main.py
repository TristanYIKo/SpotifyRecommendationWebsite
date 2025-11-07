"""
FastAPI backend for music recommendation service
"""
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any
import os
from dotenv import load_dotenv

from recommender import generate_recommendations
from supabase_client import get_user_tracks, save_recommendations

# Load environment variables
load_dotenv()

app = FastAPI(
    title="Music Recommender API",
    description="ML-powered music recommendation service",
    version="1.0.0"
)

# Configure CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://*.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "Music Recommender API",
        "status": "running",
        "version": "1.0.0"
    }


@app.get("/recommend")
async def recommend_tracks(
    user_id: str = Query(..., description="Supabase user ID"),
    spotify_token: str = Query(..., description="Valid Spotify access token")
) -> Dict[str, Any]:
    """
    Generate NEW music recommendations using Spotify's API
    
    Args:
        user_id: The Supabase user ID
        spotify_token: Valid Spotify access token from the user's session
        
    Returns:
        Dictionary containing user_id and list of NEW song recommendations
    """
    try:
        # Fetch user's tracks from Supabase
        user_tracks = get_user_tracks(user_id)
        
        if not user_tracks:
            raise HTTPException(
                status_code=400,
                detail="No tracks found for user. Please sync your Spotify data first."
            )
        
        # Generate NEW recommendations using Spotify's API
        recommendations = generate_recommendations(
            user_tracks=user_tracks,
            spotify_token=spotify_token,
            top_n=10
        )
        
        if not recommendations:
            raise HTTPException(
                status_code=500,
                detail="Failed to generate recommendations. Please try again."
            )
        
        # Optionally save recommendations to database
        try:
            save_recommendations(user_id, recommendations)
        except Exception as e:
            print(f"Warning: Failed to save recommendations: {e}")
            # Don't fail the request if saving fails
        
        return {
            "user_id": user_id,
            "recommendations": recommendations,
            "count": len(recommendations)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error generating recommendations: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@app.get("/health")
async def health_check():
    """Detailed health check with environment validation"""
    supabase_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    return {
        "status": "healthy",
        "supabase_configured": bool(supabase_url and service_key),
        "supabase_url": supabase_url[:30] + "..." if supabase_url else None
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
