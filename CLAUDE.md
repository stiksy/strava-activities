# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A static fitness tracker website that visualizes Strava activities with interactive charts and statistics. The system consists of Python scripts for data fetching and a vanilla JavaScript frontend for visualization.

**Architecture Pattern**: Data pipeline → Static site
- Python scripts fetch data from Strava API → Export to JSON
- Static website (HTML/CSS/JS) reads JSON → Renders charts and tables
- Deployed via GitHub Pages from `/docs` folder

## Common Commands

### Initial Setup

```bash
# Install dependencies
pip install -r requirements.txt

# Get OAuth tokens (first time only)
python authorize.py
# Follow prompts to authorize and update .env.local with tokens
```

### Data Operations

```bash
# Fetch all activities and regenerate JSON
python fetch_and_export.py
# Outputs to: docs/data/activities.json

# View activities in CLI
python strava_activities.py
```

### Deployment

```bash
# Update data and deploy
python fetch_and_export.py
git add docs/data/activities.json
git commit -m "Update activities data"
git push

# IMPORTANT: Always monitor GitHub Actions after pushing
gh run list --limit 5                    # Check recent runs
gh run watch <run-id> --exit-status      # Watch specific run, exit non-zero on failure
# Or use the run ID from the latest push:
gh run watch $(gh run list --limit 1 --json databaseId --jq '.[0].databaseId') --exit-status

# GitHub Pages deploys from /docs folder, typically completes in 1-2 minutes
# Verify deployment at: https://stiksy.github.io/strava-activities/
```

## Architecture

### Data Flow

1. **Authentication**: OAuth 2.0 flow via `authorize.py` generates access/refresh tokens
2. **Data Fetch**: `fetch_and_export.py` fetches all activities from Strava API v3 (paginated, 200/page)
3. **Processing**: Activities processed to extract relevant metrics (power, pace, HR, etc.)
4. **Export**: Data written to `docs/data/activities.json` with statistics pre-calculated
5. **Visualization**: Frontend loads JSON and renders with Chart.js

### Key Files

**Python Scripts:**
- `authorize.py` - OAuth authorization helper (run once to get tokens)
- `fetch_and_export.py` - Main data pipeline (fetch → process → export)
- `strava_activities.py` - CLI viewer for activities

**Frontend (`docs/`):**
- `index.html` - Main page structure with filter controls
- `app.js` - Data loading, filtering (date/activity type), chart rendering, table population
- `styles.css` - Responsive design with 2800px max-width
- `data/activities.json` - Generated data file (not in git history, regenerated on updates)

**Configuration:**
- `.env.local` - Strava API credentials (git-ignored, required)
- `requirements.txt` - Python dependencies (requests, python-dotenv)

## Important Patterns

### Date & Activity Type Filtering

The frontend implements dual filtering:
- **Date Filter**: Last 30/90/180/365 days or all-time (default: 30 days)
- **Activity Type Filter**: All/Ride/VirtualRide/Run

All data (summary cards, charts, tables, stats) updates via `getFilteredActivities()` which chains both filters. When modifying data display logic, always use this function rather than accessing `activitiesData.activities` directly.

### Token Management

- Access tokens expire every 6 hours
- `fetch_and_export.py` auto-refreshes using refresh token
- New tokens printed to console - update `.env.local` if refresh token changes
- Never commit `.env.local` (protected by `.gitignore`)

### Chart Updates

Charts are managed via global `charts` object. When filters change:
1. Destroy existing chart: `if (charts.chartName) charts.chartName.destroy();`
2. Create new chart with filtered data
3. Store reference: `charts.chartName = new Chart(...)`

This prevents memory leaks and duplicate chart instances.

### Data Structure

`activities.json` format:
```javascript
{
  "generated_at": "ISO timestamp",
  "statistics": { /* pre-calculated stats by activity type */ },
  "activities": [
    {
      "id": number,
      "type": "Ride|Run|VirtualRide|etc",
      "start_date": "ISO timestamp",
      "distance": meters,
      "moving_time": seconds,
      "average_watts": number,  // cycling only
      "average_speed": m/s,
      "average_heartrate": bpm,
      // ... other metrics
    }
  ]
}
```

## Website Features

- **Summary Cards**: Total activities/distance/time/elevation (filtered by current date range)
- **Interactive Charts**: Distance over time, weekly volume, power progression (cycling), pace progression (running)
- **Activity Table**: Searchable, sortable with sport-specific columns (power for cycling, pace for running)
- **Sport-Specific Stats**: Separate stat cards for cycling and running with relevant metrics

## GitHub Pages

- Deployed from `main` branch, `/docs` folder
- Auto-updates 2-3 minutes after push
- URL pattern: `https://stiksy.github.io/strava-activities/`
- No build step required (vanilla HTML/CSS/JS)

## GitHub Actions Monitoring

**CRITICAL**: Always monitor GitHub Actions after every push to capture failures and confirm deployment completion.

**Required Permissions**: Ensure `gh run list` and `gh run watch` are whitelisted in your Claude Code permissions/settings.

```bash
# Check status of recent runs
gh run list --limit 5

# Get the latest run ID
gh run list --limit 1

# Watch a specific run by ID (copy ID from above)
gh run watch <run-id> --exit-status

# View detailed logs if a run fails
gh run view <run-id> --log-failed
```

The `--exit-status` flag ensures the command exits with non-zero status if the run fails, which is important for catching deployment issues immediately.

**Typical workflow:**
1. Push code with `git push`
2. Check the latest run: `gh run list --limit 1`
3. Watch it complete: `gh run watch <run-id> --exit-status` (use the ID from step 2)
4. Wait for "pages build and deployment" to complete (usually 1-2 minutes)
5. Verify changes at https://stiksy.github.io/strava-activities/

**Note**: Use separate commands instead of complex subshells for better permission matching.

## Strava API Notes

- API Base: `https://www.strava.com/api/v3`
- Required scopes: `read,activity:read_all`
- Rate limits apply - pagination handles large activity counts
- Activities returned in reverse chronological order by default
