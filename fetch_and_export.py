#!/usr/bin/env python3
"""
Strava Data Exporter
Fetches all activities and exports them to JSON for the static website.
"""

import os
import json
import requests
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env.local')

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
        return data['access_token']
    else:
        print(f"Failed to refresh token: {response.status_code}")
        return None


def get_all_activities(access_token):
    """Fetch ALL activities from Strava API (paginated)."""
    all_activities = []
    page = 1
    per_page = 200  # Max allowed by Strava

    while True:
        url = f'{STRAVA_API_BASE}/athlete/activities'
        headers = {'Authorization': f'Bearer {access_token}'}
        params = {
            'per_page': per_page,
            'page': page
        }

        response = requests.get(url, headers=headers, params=params)

        if response.status_code == 401:
            print("Access token expired, refreshing...")
            access_token = refresh_access_token()
            if access_token:
                headers = {'Authorization': f'Bearer {access_token}'}
                response = requests.get(url, headers=headers, params=params)
            else:
                break

        if response.status_code == 200:
            activities = response.json()
            if not activities:  # No more activities
                break

            all_activities.extend(activities)
            print(f"Fetched page {page}: {len(activities)} activities")
            page += 1
        else:
            print(f"Error fetching activities: {response.status_code}")
            break

    return all_activities


def process_activity(activity):
    """Extract relevant data from an activity."""
    return {
        'id': activity.get('id'),
        'name': activity.get('name'),
        'type': activity.get('type'),
        'sport_type': activity.get('sport_type'),
        'start_date': activity.get('start_date_local'),
        'distance': activity.get('distance', 0),  # meters
        'moving_time': activity.get('moving_time', 0),  # seconds
        'elapsed_time': activity.get('elapsed_time', 0),  # seconds
        'total_elevation_gain': activity.get('total_elevation_gain', 0),  # meters
        'average_speed': activity.get('average_speed', 0),  # m/s
        'max_speed': activity.get('max_speed', 0),  # m/s
        'average_watts': activity.get('average_watts'),
        'weighted_average_watts': activity.get('weighted_average_watts'),
        'max_watts': activity.get('max_watts'),
        'kilojoules': activity.get('kilojoules'),
        'device_watts': activity.get('device_watts', False),
        'average_heartrate': activity.get('average_heartrate'),
        'max_heartrate': activity.get('max_heartrate'),
        'average_cadence': activity.get('average_cadence'),
        'has_heartrate': activity.get('has_heartrate', False),
        'suffer_score': activity.get('suffer_score'),
    }


def calculate_statistics(activities):
    """Calculate overall statistics from activities."""
    stats = {
        'total_activities': len(activities),
        'by_type': {},
        'total_distance': 0,
        'total_time': 0,
        'total_elevation': 0,
    }

    # Group by activity type
    for activity in activities:
        activity_type = activity['type']

        if activity_type not in stats['by_type']:
            stats['by_type'][activity_type] = {
                'count': 0,
                'total_distance': 0,
                'total_time': 0,
                'total_elevation': 0,
                'avg_power': [],
                'avg_heartrate': [],
            }

        stats['by_type'][activity_type]['count'] += 1
        stats['by_type'][activity_type]['total_distance'] += activity['distance']
        stats['by_type'][activity_type]['total_time'] += activity['moving_time']
        stats['by_type'][activity_type]['total_elevation'] += activity['total_elevation_gain']

        if activity.get('average_watts'):
            stats['by_type'][activity_type]['avg_power'].append(activity['average_watts'])

        if activity.get('average_heartrate'):
            stats['by_type'][activity_type]['avg_heartrate'].append(activity['average_heartrate'])

        stats['total_distance'] += activity['distance']
        stats['total_time'] += activity['moving_time']
        stats['total_elevation'] += activity['total_elevation_gain']

    # Calculate averages
    for activity_type in stats['by_type']:
        type_stats = stats['by_type'][activity_type]
        if type_stats['avg_power']:
            type_stats['average_power'] = sum(type_stats['avg_power']) / len(type_stats['avg_power'])
        if type_stats['avg_heartrate']:
            type_stats['average_heartrate'] = sum(type_stats['avg_heartrate']) / len(type_stats['avg_heartrate'])

        # Clean up temporary lists
        del type_stats['avg_power']
        del type_stats['avg_heartrate']

    return stats


def main():
    """Main function to fetch and export Strava data."""
    if not all([CLIENT_ID, CLIENT_SECRET, ACCESS_TOKEN, REFRESH_TOKEN]):
        print("Error: Missing credentials in .env.local file")
        return

    print("Fetching ALL Strava activities...\n")

    # Fetch all activities
    activities = get_all_activities(ACCESS_TOKEN)

    if not activities:
        print("No activities found or failed to fetch.")
        return

    print(f"\nTotal activities fetched: {len(activities)}")

    # Process activities
    processed_activities = [process_activity(activity) for activity in activities]

    # Calculate statistics
    stats = calculate_statistics(processed_activities)

    # Create output data
    output_data = {
        'generated_at': datetime.now().isoformat(),
        'statistics': stats,
        'activities': processed_activities
    }

    # Save to JSON file
    output_file = 'docs/data/activities.json'
    os.makedirs(os.path.dirname(output_file), exist_ok=True)

    with open(output_file, 'w') as f:
        json.dump(output_data, f, indent=2)

    print(f"\n✓ Data exported to {output_file}")
    print(f"  Total activities: {stats['total_activities']}")
    print(f"  Total distance: {stats['total_distance']/1000:.2f} km")
    print(f"  Total time: {stats['total_time']/3600:.2f} hours")
    print("\n  By activity type:")
    for activity_type, type_stats in stats['by_type'].items():
        print(f"    {activity_type}: {type_stats['count']} activities, {type_stats['total_distance']/1000:.2f} km")


if __name__ == '__main__':
    main()
