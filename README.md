# Strava Activities Fitness Tracker

A static website fitness tracker that visualizes your Strava cycling and running activities with charts and statistics.

## Features

- 📊 Interactive charts showing distance, power, and pace progression
- 📈 Weekly volume analysis
- 🎯 Separate views for cycling and running activities
- ⚡ Power metrics and distribution for cycling
- 🏃 Pace progression and heart rate analysis for running
- 📅 Activity history with search and sorting
- 📱 Responsive design for mobile and desktop

## Setup

### 1. Strava API Setup

1. Create a Strava API application at https://www.strava.com/settings/api
2. Copy your `CLIENT_ID` and `CLIENT_SECRET`
3. Create a `.env.local` file in the project root:

```bash
CLIENT_ID=your_client_id
CLIENT_SECRET=your_client_secret
ACCESS_TOKEN=your_access_token
REFRESH_TOKEN=your_refresh_token
```

### 2. Get Access Tokens

Run the authorization script to get your access tokens:

```bash
python authorize.py
```

Follow the instructions to authorize the app and update your `.env.local` file with the tokens.

### 3. Fetch Your Activities

```bash
pip install -r requirements.txt
python fetch_and_export.py
```

This will fetch all your Strava activities and generate `docs/data/activities.json`.

### 4. View the Website

Open `docs/index.html` in your browser, or deploy to GitHub Pages.

## GitHub Pages Deployment

1. Push this repository to GitHub
2. Go to repository Settings → Pages
3. Set source to "Deploy from a branch"
4. Select the `main` branch and `/docs` folder
5. Save and wait for deployment

Your fitness tracker will be available at: `https://your-username.github.io/strava-activities/`

## Updating Data

To update your activity data:

```bash
python fetch_and_export.py
git add docs/data/activities.json
git commit -m "Update activities data"
git push
```

GitHub Pages will automatically update within a few minutes.

## Data Displayed

### Cycling Activities
- Power metrics (average, max, weighted average)
- Distance and elevation gain
- Speed and cadence
- Power distribution charts
- Power progression over time

### Running Activities
- Pace progression
- Distance and elevation gain
- Heart rate analysis
- Average pace per run
- Heart rate zones

## Files

- `fetch_and_export.py` - Fetches activities from Strava API and exports to JSON
- `authorize.py` - Helper script for OAuth authorization
- `strava_activities.py` - Simple command-line viewer for activities
- `docs/` - Static website files for GitHub Pages
  - `index.html` - Main HTML structure
  - `styles.css` - Styling
  - `app.js` - JavaScript for charts and data visualization
  - `data/activities.json` - Your activity data (generated)

## Technologies

- **Frontend**: HTML, CSS, JavaScript
- **Charts**: Chart.js
- **Data**: Strava API v3
- **Hosting**: GitHub Pages

## Privacy

- Your `.env.local` file is git-ignored to protect your credentials
- Only activity data is made public through the website
- No authentication required to view the published site

## License

MIT
