"""
Music recommendation engine using Spotify's recommendation API
"""
import numpy as np
from typing import List, Dict, Any, Optional
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import StandardScaler
import requests
import random


def generate_recommendations(
    user_tracks: List[Dict[str, Any]], 
    spotify_token: str,
    top_n: int = 10
) -> List[Dict[str, Any]]:
    """
    Generate NEW track recommendations using Spotify's recommendation API
    
    This function:
    1. Analyzes user's saved tracks to understand their taste
    2. Selects seed tracks from user's most played songs
    3. Calls Spotify's recommendations API to get NEW similar songs
    4. Filters out songs the user already has
    5. Returns fresh recommendations they haven't heard
    
    Args:
        user_tracks: List of track dictionaries from user's library
        spotify_token: Valid Spotify access token
        top_n: Number of recommendations to return
        
    Returns:
        List of NEW track recommendations with metadata
    """
    if not user_tracks or len(user_tracks) == 0:
        return []
    
    # Get user's existing track IDs to filter them out
    existing_track_ids = {track['spotify_track_id'] for track in user_tracks}
    
    print(f"User has {len(user_tracks)} tracks in library")
    
    # First, try to get fresh track IDs directly from Spotify
    # This ensures we're using valid, current track IDs
    try:
        fresh_tracks = get_user_top_tracks_from_spotify(spotify_token, limit=50)
        if fresh_tracks:
            print(f"Got {len(fresh_tracks)} fresh tracks from Spotify API")
            # Use the first 5 as seeds
            seed_track_ids = [t['id'] for t in fresh_tracks[:5]]
            print(f"Using seed tracks: {[t['name'] + ' by ' + t['artists'][0]['name'] for t in fresh_tracks[:5]]}")
        else:
            # Fallback: use stored track IDs
            seed_track_ids = [t['spotify_track_id'] for t in user_tracks[:5]]
            print(f"Using stored track IDs as seeds")
    except Exception as e:
        print(f"Error fetching fresh tracks: {e}, using stored IDs")
        seed_track_ids = [t['spotify_track_id'] for t in user_tracks[:5]]
    
    # Calculate average audio features to use as target parameters
    feature_columns = ['danceability', 'energy', 'valence', 'acousticness', 'instrumentalness']
    avg_features = {}
    
    for feature in feature_columns:
        values = [t.get(feature) for t in user_tracks if t.get(feature) is not None]
        if values:
            avg_features[f'target_{feature}'] = sum(values) / len(values)
    
    # Get tempo average (if available)
    tempo_values = [t.get('tempo') for t in user_tracks if t.get('tempo') is not None]
    if tempo_values:
        avg_features['target_tempo'] = sum(tempo_values) / len(tempo_values)
    
    # Call Spotify's recommendations API
    try:
        recommendations = get_spotify_recommendations(
            seed_track_ids=seed_track_ids,
            target_features=avg_features,
            spotify_token=spotify_token,
            limit=50  # Get more than needed so we can filter
        )
        
        # Filter out songs user already has
        new_recommendations = []
        for rec in recommendations:
            if rec['spotify_track_id'] not in existing_track_ids:
                new_recommendations.append(rec)
                if len(new_recommendations) >= top_n:
                    break
        
        print(f"Returning {len(new_recommendations)} new recommendations")
        return new_recommendations
        
    except Exception as e:
        print(f"Error getting Spotify recommendations with track seeds: {e}")
        
        # Fallback: Try using genre seeds instead
        print("Attempting fallback with genre seeds...")
        try:
            # Use popular genres as seeds
            genre_seeds = ['pop', 'rock', 'hip-hop', 'electronic', 'indie']
            recommendations = get_spotify_recommendations_by_genre(
                seed_genres=genre_seeds,
                target_features=avg_features,
                spotify_token=spotify_token,
                limit=50
            )
            
            # Filter out songs user already has
            new_recommendations = []
            for rec in recommendations:
                if rec['spotify_track_id'] not in existing_track_ids:
                    new_recommendations.append(rec)
                    if len(new_recommendations) >= top_n:
                        break
            
            print(f"Genre-based fallback returned {len(new_recommendations)} recommendations")
            return new_recommendations
            
        except Exception as e2:
            print(f"Genre fallback also failed: {e2}")
            return []


def get_user_top_tracks_from_spotify(spotify_token: str, limit: int = 50) -> List[Dict[str, Any]]:
    """
    Fetch user's current top tracks directly from Spotify
    
    Args:
        spotify_token: Valid Spotify access token
        limit: Number of tracks to fetch
        
    Returns:
        List of track objects from Spotify
    """
    url = "https://api.spotify.com/v1/me/top/tracks"
    params = {
        'limit': min(limit, 50),
        'time_range': 'medium_term'  # last ~6 months
    }
    headers = {
        'Authorization': f'Bearer {spotify_token}'
    }
    
    response = requests.get(url, headers=headers, params=params)
    
    if response.status_code != 200:
        print(f"Error fetching top tracks: {response.status_code}")
        return []
    
    data = response.json()
    return data.get('items', [])


def get_spotify_recommendations(
    seed_track_ids: List[str],
    target_features: Dict[str, float],
    spotify_token: str,
    limit: int = 50
) -> List[Dict[str, Any]]:
    """
    Call Spotify's recommendations API to get similar tracks
    
    Args:
        seed_track_ids: List of track IDs to use as seeds (max 5)
        target_features: Dictionary of target audio features
        spotify_token: Valid Spotify access token
        limit: Number of recommendations to fetch
        
    Returns:
        List of recommended tracks with metadata
    """
    url = "https://api.spotify.com/v1/recommendations"
    
    # Build query parameters
    params = {
        'seed_tracks': ','.join(seed_track_ids[:5]),  # Max 5 seeds
        'limit': min(limit, 100)  # Spotify max is 100
    }
    
    # Add target features
    params.update(target_features)
    
    headers = {
        'Authorization': f'Bearer {spotify_token}'
    }
    
    response = requests.get(url, headers=headers, params=params)
    
    if response.status_code != 200:
        error_detail = response.text
        try:
            error_json = response.json()
            error_detail = error_json.get('error', {}).get('message', response.text)
        except:
            pass
        print(f"Spotify API error: {response.status_code} - {error_detail}")
        print(f"Request URL: {url}")
        print(f"Request params: {params}")
        raise Exception(f"Failed to fetch recommendations: {response.status_code} - {error_detail}")
    
    data = response.json()
    tracks = data.get('tracks', [])
    
    # Format recommendations
    recommendations = []
    for i, track in enumerate(tracks):
        recommendations.append({
            'spotify_track_id': track['id'],
            'name': track['name'],
            'artist': ', '.join([artist['name'] for artist in track['artists']]),
            'album': track['album']['name'],
            'preview_url': track.get('preview_url'),
            'external_url': track['external_urls'].get('spotify'),
            'score': 1.0 - (i * 0.01)  # Decreasing score based on Spotify's ranking
        })
    
    return recommendations


def get_spotify_recommendations_by_genre(
    seed_genres: List[str],
    target_features: Dict[str, float],
    spotify_token: str,
    limit: int = 50
) -> List[Dict[str, Any]]:
    """
    Call Spotify's recommendations API using genre seeds instead of track seeds
    
    Args:
        seed_genres: List of genre names to use as seeds (max 5)
        target_features: Dictionary of target audio features
        spotify_token: Valid Spotify access token
        limit: Number of recommendations to fetch
        
    Returns:
        List of recommended tracks with metadata
    """
    url = "https://api.spotify.com/v1/recommendations"
    
    # Build query parameters
    params = {
        'seed_genres': ','.join(seed_genres[:5]),  # Max 5 seeds
        'limit': min(limit, 100)  # Spotify max is 100
    }
    
    # Add target features
    params.update(target_features)
    
    headers = {
        'Authorization': f'Bearer {spotify_token}'
    }
    
    response = requests.get(url, headers=headers, params=params)
    
    if response.status_code != 200:
        error_detail = response.text
        try:
            error_json = response.json()
            error_detail = error_json.get('error', {}).get('message', response.text)
        except:
            pass
        print(f"Spotify API error (genre): {response.status_code} - {error_detail}")
        raise Exception(f"Failed to fetch genre recommendations: {response.status_code}")
    
    data = response.json()
    tracks = data.get('tracks', [])
    
    # Format recommendations
    recommendations = []
    for i, track in enumerate(tracks):
        recommendations.append({
            'spotify_track_id': track['id'],
            'name': track['name'],
            'artist': ', '.join([artist['name'] for artist in track['artists']]),
            'album': track['album']['name'],
            'preview_url': track.get('preview_url'),
            'external_url': track['external_urls'].get('spotify'),
            'score': 1.0 - (i * 0.01)  # Decreasing score based on Spotify's ranking
        })
    
    return recommendations


def analyze_user_taste_profile(user_tracks: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Analyze user's music taste based on their listening history
    
    Args:
        user_tracks: List of user's track dictionaries
        
    Returns:
        Dictionary with average audio features and other metrics
    """
    feature_columns = ['danceability', 'energy', 'valence', 'acousticness', 'tempo']
    
    profile = {}
    for feature in feature_columns:
        values = [t.get(feature) for t in user_tracks if t.get(feature) is not None]
        if values:
            profile[feature] = {
                'avg': sum(values) / len(values),
                'min': min(values),
                'max': max(values)
            }
    
    return profile


def calculate_diversity_score(recommendation_list: List[Dict[str, Any]]) -> float:
    """
    Calculate diversity score for a list of recommendations
    
    Higher score means more diverse recommendations across audio features
    
    Args:
        recommendation_list: List of recommendation dictionaries
        
    Returns:
        Diversity score between 0 and 1
    """
    if len(recommendation_list) < 2:
        return 0.0
    
    # This is a placeholder for more sophisticated diversity metrics
    # Could be extended with genre diversity, artist diversity, etc.
    return 0.5


def explain_recommendation(
    user_profile: Dict[str, float], 
    track: Dict[str, Any]
) -> str:
    """
    Generate a human-readable explanation for why a track was recommended
    
    Args:
        user_profile: Dictionary of average user features
        track: Track dictionary with audio features
        
    Returns:
        Explanation string
    """
    # This is a simple placeholder
    # Could be extended to provide more detailed explanations
    return f"This track matches your taste based on its audio characteristics"
