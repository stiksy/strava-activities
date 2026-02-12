#!/usr/bin/env python3
"""
Strava Activities Fetcher
Retrieves activities from Strava API with focus on time and power data.
"""

import os
import requests
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env.local')

# Strava API configuration
CLIENT_ID = os.getenv('CLIENT_ID')
CLIENT_SECRET = os.getenv('CLIENT_SECRET')
ACCESS_TOKEN = os.getenv('ACCESS_TOKEN')
REFRESH_TOKEN = os.getenv('REFRESH_TOKEN')

STRAVA_API_BASE = 'https://www.strava.com/api/v3'


def refresh_access_token():
    """Refresh the access token using the refresh token."""
    url = 'https://www.strava.com/oauth/token'
    payload = {
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET,
        'refresh_token': REFRESH_TOKEN,
        'grant_type': 'refresh_token'
    }

    response = requests.post(url, data=payload)
    if response.status_code == 200:
        data = response.json()
        new_access_token = data['access_token']
        new_refresh_token = data['refresh_token']
        print("✓ Access token refreshed successfully")
        print(f"  New ACCESS_TOKEN: {new_access_token}")
        print(f"  New REFRESH_TOKEN: {new_refresh_token}")
        print("  Please update your .env.local file with these new tokens")
        return new_access_token
    else:
        print(f"✗ Failed to refresh token: {response.status_code}")
        print(response.text)
        return None


def get_activities(access_token, per_page=30, page=1):
    """Fetch activities from Strava API."""
    url = f'{STRAVA_API_BASE}/athlete/activities'
    headers = {'Authorization': f'Bearer {access_token}'}
    params = {
        'per_page': per_page,
        'page': page
    }

    response = requests.get(url, headers=headers, params=params)

    if response.status_code == 401:
        print("Access token expired, refreshing...")
        new_token = refresh_access_token()
        if new_token:
            headers = {'Authorization': f'Bearer {new_token}'}
            response = requests.get(url, headers=headers, params=params)

    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error fetching activities: {response.status_code}")
        print(response.text)
        return None


def get_activity_details(activity_id, access_token):
    """Fetch detailed information for a specific activity."""
    url = f'{STRAVA_API_BASE}/activities/{activity_id}'
    headers = {'Authorization': f'Bearer {access_token}'}

    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error fetching activity {activity_id}: {response.status_code}")
        return None


def format_time(seconds):
    """Convert seconds to HH:MM:SS format."""
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60
    return f"{int(hours):02d}:{int(minutes):02d}:{int(secs):02d}"


def display_activities(activities):
    """Display activities with time and power data."""
    if not activities:
        print("No activities found.")
        return

    print(f"\n{'='*100}")
    print(f"Found {len(activities)} activities")
    print(f"{'='*100}\n")

    for idx, activity in enumerate(activities, 1):
        # Basic info
        activity_id = activity.get('id')
        name = activity.get('name', 'Unnamed Activity')
        activity_type = activity.get('type', 'Unknown')
        date = activity.get('start_date_local', '')

        # Format date
        if date:
            date_obj = datetime.fromisoformat(date.replace('Z', '+00:00'))
            formatted_date = date_obj.strftime('%Y-%m-%d %H:%M')
        else:
            formatted_date = 'Unknown date'

        # Time data
        moving_time = activity.get('moving_time', 0)
        elapsed_time = activity.get('elapsed_time', 0)

        # Power data
        average_watts = activity.get('average_watts')
        weighted_average_watts = activity.get('weighted_average_watts')
        max_watts = activity.get('max_watts')
        has_power = activity.get('device_watts', False)

        # Display
        print(f"{idx}. {name}")
        print(f"   ID: {activity_id}")
        print(f"   Type: {activity_type}")
        print(f"   Date: {formatted_date}")
        print(f"   Moving Time: {format_time(moving_time)}")
        print(f"   Elapsed Time: {format_time(elapsed_time)}")

        if has_power and average_watts:
            print(f"   Power Data:")
            print(f"     Average: {average_watts:.1f}W")
            if weighted_average_watts:
                print(f"     Weighted Avg: {weighted_average_watts:.1f}W")
            if max_watts:
                print(f"     Max: {max_watts:.1f}W")
        else:
            print(f"   Power Data: Not available")

        # Additional useful metrics
        distance = activity.get('distance')
        if distance:
            print(f"   Distance: {distance/1000:.2f} km")

        print()


def main():
    """Main function to fetch and display Strava activities."""
    # Check if credentials are loaded
    if not all([CLIENT_ID, CLIENT_SECRET, ACCESS_TOKEN, REFRESH_TOKEN]):
        print("Error: Missing credentials in .env.local file")
        print("Required variables: CLIENT_ID, CLIENT_SECRET, ACCESS_TOKEN, REFRESH_TOKEN")
        return

    print("Fetching your Strava activities...\n")

    # Fetch activities
    activities = get_activities(ACCESS_TOKEN)

    if activities:
        display_activities(activities)

        # Option to fetch more detailed data for specific activities
        print(f"{'='*100}")
        print("Note: For more detailed power analysis (power zones, streams, etc.),")
        print("use get_activity_details() with a specific activity ID.")
    else:
        print("Failed to fetch activities.")


if __name__ == '__main__':
    main()
