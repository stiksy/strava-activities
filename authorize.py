#!/usr/bin/env python3
"""
Strava OAuth Authorization Helper
Helps you authorize your app with the correct scopes to access activity data.
"""

import os
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env.local')

CLIENT_ID = os.getenv('CLIENT_ID')
CLIENT_SECRET = os.getenv('CLIENT_SECRET')

def get_authorization_url():
    """Generate the authorization URL."""
    scopes = 'read,activity:read_all'  # Scopes needed to read activities
    redirect_uri = 'http://localhost'  # Must match what you set in Strava API settings

    auth_url = (
        f'https://www.strava.com/oauth/authorize'
        f'?client_id={CLIENT_ID}'
        f'&redirect_uri={redirect_uri}'
        f'&response_type=code'
        f'&scope={scopes}'
    )

    return auth_url

def exchange_code_for_token(authorization_code):
    """Exchange authorization code for access token."""
    url = 'https://www.strava.com/oauth/token'
    payload = {
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET,
        'code': authorization_code,
        'grant_type': 'authorization_code'
    }

    response = requests.post(url, data=payload)

    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error: {response.status_code}")
        print(response.text)
        return None

def main():
    """Main authorization flow."""
    if not CLIENT_ID or not CLIENT_SECRET:
        print("Error: CLIENT_ID and CLIENT_SECRET must be set in .env.local")
        return

    print("=" * 80)
    print("Strava Authorization")
    print("=" * 80)
    print()
    print("Step 1: Visit this URL in your browser to authorize the app:")
    print()
    print(get_authorization_url())
    print()
    print("Step 2: After authorizing, you'll be redirected to a URL like:")
    print("        http://localhost/?state=&code=XXXXXXXXXXXXXX&scope=read,activity:read_all")
    print()
    print("Step 3: Copy the 'code' parameter from that URL (the XXXX part)")
    print()

    authorization_code = input("Enter the authorization code: ").strip()

    if not authorization_code:
        print("No code provided. Exiting.")
        return

    print("\nExchanging authorization code for tokens...")
    token_data = exchange_code_for_token(authorization_code)

    if token_data:
        print("\n✓ Success! Here are your tokens:\n")
        print(f"ACCESS_TOKEN={token_data['access_token']}")
        print(f"REFRESH_TOKEN={token_data['refresh_token']}")
        print(f"\nToken expires at: {token_data['expires_at']}")
        print(f"Scopes: {token_data.get('athlete', {}).get('resource_state', 'N/A')}")
        print("\nPlease update your .env.local file with these new tokens.")
    else:
        print("\n✗ Failed to get tokens.")

if __name__ == '__main__':
    main()
