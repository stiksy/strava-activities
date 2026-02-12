// Global data storage
let activitiesData = null;
let currentFilter = 'all';
let charts = {};

// Format helpers
function formatDistance(meters) {
    return (meters / 1000).toFixed(2) + ' km';
}

function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}

function formatPace(metersPerSecond, distanceMeters) {
    if (!metersPerSecond || metersPerSecond === 0) return '-';
    // Convert to min/km
    const secondsPerKm = 1000 / metersPerSecond;
    const minutes = Math.floor(secondsPerKm / 60);
    const seconds = Math.floor(secondsPerKm % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
}

function formatSpeed(metersPerSecond) {
    if (!metersPerSecond) return '-';
    return (metersPerSecond * 3.6).toFixed(1) + ' km/h';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Load data
async function loadData() {
    try {
        const response = await fetch('data/activities.json');
        const data = await response.json();
        activitiesData = data;

        // Update last updated time
        document.getElementById('lastUpdated').textContent = formatDateTime(data.generated_at);

        // Initialize the dashboard
        updateSummaryCards();
        populateTable(data.activities);
        createCharts();
        updateStatistics();

    } catch (error) {
        console.error('Error loading data:', error);
        document.getElementById('activitiesTableBody').innerHTML =
            '<tr><td colspan="10" class="loading">Error loading data. Please run the Python script to generate data.</td></tr>';
    }
}

// Update summary cards
function updateSummaryCards() {
    const stats = activitiesData.statistics;
    document.getElementById('totalActivities').textContent = stats.total_activities;
    document.getElementById('totalDistance').textContent = formatDistance(stats.total_distance);
    document.getElementById('totalTime').textContent = formatTime(stats.total_time);
    document.getElementById('totalElevation').textContent = Math.round(stats.total_elevation) + ' m';
}

// Populate activities table
function populateTable(activities) {
    const tbody = document.getElementById('activitiesTableBody');
    tbody.innerHTML = '';

    // Filter activities based on current filter
    let filteredActivities = activities;
    if (currentFilter !== 'all') {
        filteredActivities = activities.filter(a => a.type === currentFilter);
    }

    // Apply search filter
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    if (searchTerm) {
        filteredActivities = filteredActivities.filter(a =>
            a.name.toLowerCase().includes(searchTerm) ||
            a.type.toLowerCase().includes(searchTerm)
        );
    }

    // Sort activities
    const sortValue = document.getElementById('sortSelect')?.value || 'date-desc';
    filteredActivities = sortActivities(filteredActivities, sortValue);

    // Show/hide columns based on filter
    updateColumnVisibility();

    if (filteredActivities.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="loading">No activities found</td></tr>';
        return;
    }

    filteredActivities.forEach(activity => {
        const row = document.createElement('tr');

        const typeBadge = getTypeBadge(activity.type);
        const avgPower = activity.device_watts && activity.average_watts
            ? `${Math.round(activity.average_watts)}W`
            : '-';
        const avgPace = activity.type === 'Run'
            ? formatPace(activity.average_speed, activity.distance)
            : '-';
        const avgHR = activity.has_heartrate && activity.average_heartrate
            ? Math.round(activity.average_heartrate) + ' bpm'
            : '-';

        row.innerHTML = `
            <td>${formatDate(activity.start_date)}</td>
            <td><strong>${activity.name}</strong></td>
            <td>${typeBadge}</td>
            <td>${formatDistance(activity.distance)}</td>
            <td>${formatTime(activity.moving_time)}</td>
            <td>${Math.round(activity.total_elevation_gain)}m</td>
            <td>${formatSpeed(activity.average_speed)}</td>
            <td class="cycling-col">${avgPower}</td>
            <td class="running-col">${avgPace}</td>
            <td>${avgHR}</td>
        `;

        tbody.appendChild(row);
    });
}

function sortActivities(activities, sortValue) {
    const sorted = [...activities];

    switch(sortValue) {
        case 'date-desc':
            return sorted.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
        case 'date-asc':
            return sorted.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
        case 'distance-desc':
            return sorted.sort((a, b) => b.distance - a.distance);
        case 'distance-asc':
            return sorted.sort((a, b) => a.distance - b.distance);
        case 'time-desc':
            return sorted.sort((a, b) => b.moving_time - a.moving_time);
        case 'time-asc':
            return sorted.sort((a, b) => a.moving_time - b.moving_time);
        default:
            return sorted;
    }
}

function getTypeBadge(type) {
    const badges = {
        'Ride': '<span class="activity-badge ride">🚴 Ride</span>',
        'VirtualRide': '<span class="activity-badge virtual-ride">🚴 Virtual Ride</span>',
        'Run': '<span class="activity-badge run">🏃 Run</span>',
    };
    return badges[type] || `<span class="activity-badge">${type}</span>`;
}

function updateColumnVisibility() {
    const cyclingCols = document.querySelectorAll('.cycling-col');
    const runningCols = document.querySelectorAll('.running-col');

    if (currentFilter === 'Run') {
        cyclingCols.forEach(col => col.style.display = 'none');
        runningCols.forEach(col => col.style.display = 'table-cell');
    } else if (currentFilter === 'Ride' || currentFilter === 'VirtualRide') {
        cyclingCols.forEach(col => col.style.display = 'table-cell');
        runningCols.forEach(col => col.style.display = 'none');
    } else {
        cyclingCols.forEach(col => col.style.display = 'table-cell');
        runningCols.forEach(col => col.style.display = 'table-cell');
    }
}

// Create charts
function createCharts() {
    createDistanceChart();
    createWeeklyVolumeChart();
    createPowerChart();
    createPowerDistributionChart();
    createPaceChart();
    createHeartRateChart();
}

function createDistanceChart() {
    const ctx = document.getElementById('distanceChart');

    // Get activities sorted by date
    const activities = [...activitiesData.activities]
        .filter(a => currentFilter === 'all' || a.type === currentFilter)
        .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

    const labels = activities.map(a => formatDate(a.start_date));
    const distances = activities.map(a => a.distance / 1000);

    if (charts.distance) charts.distance.destroy();

    charts.distance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Distance (km)',
                data: distances,
                borderColor: '#fc4c02',
                backgroundColor: 'rgba(252, 76, 2, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function createWeeklyVolumeChart() {
    const ctx = document.getElementById('weeklyVolumeChart');

    // Group activities by week
    const activities = activitiesData.activities
        .filter(a => currentFilter === 'all' || a.type === currentFilter);

    const weeklyData = {};

    activities.forEach(activity => {
        const date = new Date(activity.start_date);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];

        if (!weeklyData[weekKey]) {
            weeklyData[weekKey] = {
                distance: 0,
                time: 0
            };
        }

        weeklyData[weekKey].distance += activity.distance / 1000;
        weeklyData[weekKey].time += activity.moving_time / 3600;
    });

    const weeks = Object.keys(weeklyData).sort();
    const distances = weeks.map(w => weeklyData[w].distance);
    const times = weeks.map(w => weeklyData[w].time);

    if (charts.weeklyVolume) charts.weeklyVolume.destroy();

    charts.weeklyVolume = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: weeks.map(w => formatDate(w)),
            datasets: [{
                label: 'Distance (km)',
                data: distances,
                backgroundColor: '#3498db',
                yAxisID: 'y'
            }, {
                label: 'Time (hours)',
                data: times,
                backgroundColor: '#2ecc71',
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    type: 'linear',
                    position: 'left',
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Distance (km)'
                    }
                },
                y1: {
                    type: 'linear',
                    position: 'right',
                    beginAtZero: true,
                    grid: {
                        drawOnChartArea: false
                    },
                    title: {
                        display: true,
                        text: 'Time (hours)'
                    }
                }
            }
        }
    });
}

function createPowerChart() {
    const ctx = document.getElementById('powerChart');

    const activities = [...activitiesData.activities]
        .filter(a => (a.type === 'Ride' || a.type === 'VirtualRide') && a.device_watts && a.average_watts)
        .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

    if (activities.length === 0) {
        ctx.parentElement.style.display = 'none';
        return;
    }

    const labels = activities.map(a => formatDate(a.start_date));
    const avgPower = activities.map(a => a.average_watts);
    const maxPower = activities.map(a => a.max_watts);

    if (charts.power) charts.power.destroy();

    charts.power = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Average Power (W)',
                data: avgPower,
                borderColor: '#e74c3c',
                backgroundColor: 'rgba(231, 76, 60, 0.1)',
                tension: 0.4
            }, {
                label: 'Max Power (W)',
                data: maxPower,
                borderColor: '#c0392b',
                backgroundColor: 'rgba(192, 57, 43, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function createPowerDistributionChart() {
    const ctx = document.getElementById('powerDistributionChart');

    const activities = activitiesData.activities
        .filter(a => (a.type === 'Ride' || a.type === 'VirtualRide') && a.device_watts && a.average_watts);

    if (activities.length === 0) {
        ctx.parentElement.style.display = 'none';
        return;
    }

    // Create power zones
    const powerValues = activities.map(a => a.average_watts);
    const zones = {
        '0-100W': 0,
        '100-150W': 0,
        '150-200W': 0,
        '200-250W': 0,
        '250-300W': 0,
        '300+W': 0
    };

    powerValues.forEach(power => {
        if (power < 100) zones['0-100W']++;
        else if (power < 150) zones['100-150W']++;
        else if (power < 200) zones['150-200W']++;
        else if (power < 250) zones['200-250W']++;
        else if (power < 300) zones['250-300W']++;
        else zones['300+W']++;
    });

    if (charts.powerDistribution) charts.powerDistribution.destroy();

    charts.powerDistribution = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(zones),
            datasets: [{
                data: Object.values(zones),
                backgroundColor: [
                    '#3498db',
                    '#2ecc71',
                    '#f39c12',
                    '#e74c3c',
                    '#9b59b6',
                    '#34495e'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });
}

function createPaceChart() {
    const ctx = document.getElementById('paceChart');

    const activities = [...activitiesData.activities]
        .filter(a => a.type === 'Run' && a.average_speed > 0)
        .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

    if (activities.length === 0) {
        ctx.parentElement.style.display = 'none';
        return;
    }

    const labels = activities.map(a => formatDate(a.start_date));
    const paces = activities.map(a => 1000 / a.average_speed / 60); // min/km

    if (charts.pace) charts.pace.destroy();

    charts.pace = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Pace (min/km)',
                data: paces,
                borderColor: '#e74c3c',
                backgroundColor: 'rgba(231, 76, 60, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    reverse: true, // Lower is better for pace
                    beginAtZero: false
                }
            }
        }
    });
}

function createHeartRateChart() {
    const ctx = document.getElementById('heartRateChart');

    const activities = [...activitiesData.activities]
        .filter(a => a.type === 'Run' && a.has_heartrate && a.average_heartrate)
        .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

    if (activities.length === 0) {
        ctx.parentElement.style.display = 'none';
        return;
    }

    const labels = activities.map(a => formatDate(a.start_date));
    const avgHR = activities.map(a => a.average_heartrate);
    const maxHR = activities.map(a => a.max_heartrate);

    if (charts.heartRate) charts.heartRate.destroy();

    charts.heartRate = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Average HR (bpm)',
                data: avgHR,
                borderColor: '#e74c3c',
                backgroundColor: 'rgba(231, 76, 60, 0.1)',
                tension: 0.4
            }, {
                label: 'Max HR (bpm)',
                data: maxHR,
                borderColor: '#c0392b',
                backgroundColor: 'rgba(192, 57, 43, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: false
                }
            }
        }
    });
}

// Update statistics section
function updateStatistics() {
    updateCyclingStats();
    updateRunningStats();
}

function updateCyclingStats() {
    const cyclingActivities = activitiesData.activities.filter(a =>
        a.type === 'Ride' || a.type === 'VirtualRide'
    );

    if (cyclingActivities.length === 0) {
        document.getElementById('cyclingStats').innerHTML = '<p>No cycling activities found</p>';
        return;
    }

    const totalDistance = cyclingActivities.reduce((sum, a) => sum + a.distance, 0);
    const totalTime = cyclingActivities.reduce((sum, a) => sum + a.moving_time, 0);
    const totalElevation = cyclingActivities.reduce((sum, a) => sum + a.total_elevation_gain, 0);

    const activitiesWithPower = cyclingActivities.filter(a => a.device_watts && a.average_watts);
    const avgPower = activitiesWithPower.length > 0
        ? activitiesWithPower.reduce((sum, a) => sum + a.average_watts, 0) / activitiesWithPower.length
        : 0;

    const html = `
        <div class="stat-item">
            <span class="stat-label">Total Activities</span>
            <span class="stat-value">${cyclingActivities.length}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Total Distance</span>
            <span class="stat-value">${formatDistance(totalDistance)}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Total Time</span>
            <span class="stat-value">${formatTime(totalTime)}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Total Elevation</span>
            <span class="stat-value">${Math.round(totalElevation)}m</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Avg Distance per Ride</span>
            <span class="stat-value">${formatDistance(totalDistance / cyclingActivities.length)}</span>
        </div>
        ${avgPower > 0 ? `
        <div class="stat-item">
            <span class="stat-label">Avg Power</span>
            <span class="stat-value">${Math.round(avgPower)}W</span>
        </div>
        ` : ''}
    `;

    document.getElementById('cyclingStats').innerHTML = html;
}

function updateRunningStats() {
    const runningActivities = activitiesData.activities.filter(a => a.type === 'Run');

    if (runningActivities.length === 0) {
        document.getElementById('runningStats').innerHTML = '<p>No running activities found</p>';
        return;
    }

    const totalDistance = runningActivities.reduce((sum, a) => sum + a.distance, 0);
    const totalTime = runningActivities.reduce((sum, a) => sum + a.moving_time, 0);
    const totalElevation = runningActivities.reduce((sum, a) => sum + a.total_elevation_gain, 0);

    const avgSpeed = totalDistance / totalTime;
    const avgPace = 1000 / avgSpeed / 60;

    const activitiesWithHR = runningActivities.filter(a => a.has_heartrate && a.average_heartrate);
    const avgHR = activitiesWithHR.length > 0
        ? activitiesWithHR.reduce((sum, a) => sum + a.average_heartrate, 0) / activitiesWithHR.length
        : 0;

    const html = `
        <div class="stat-item">
            <span class="stat-label">Total Activities</span>
            <span class="stat-value">${runningActivities.length}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Total Distance</span>
            <span class="stat-value">${formatDistance(totalDistance)}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Total Time</span>
            <span class="stat-value">${formatTime(totalTime)}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Total Elevation</span>
            <span class="stat-value">${Math.round(totalElevation)}m</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Avg Distance per Run</span>
            <span class="stat-value">${formatDistance(totalDistance / runningActivities.length)}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Avg Pace</span>
            <span class="stat-value">${avgPace.toFixed(2)} min/km</span>
        </div>
        ${avgHR > 0 ? `
        <div class="stat-item">
            <span class="stat-label">Avg Heart Rate</span>
            <span class="stat-value">${Math.round(avgHR)} bpm</span>
        </div>
        ` : ''}
    `;

    document.getElementById('runningStats').innerHTML = html;
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    loadData();

    // Tab buttons
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');

            currentFilter = e.target.dataset.type;

            // Show/hide specific charts
            if (currentFilter === 'Ride' || currentFilter === 'VirtualRide') {
                document.getElementById('cyclingCharts').style.display = 'grid';
                document.getElementById('runningCharts').style.display = 'none';
            } else if (currentFilter === 'Run') {
                document.getElementById('cyclingCharts').style.display = 'none';
                document.getElementById('runningCharts').style.display = 'grid';
            } else {
                document.getElementById('cyclingCharts').style.display = 'none';
                document.getElementById('runningCharts').style.display = 'none';
            }

            populateTable(activitiesData.activities);
            createDistanceChart();
            createWeeklyVolumeChart();
        });
    });

    // Search input
    document.getElementById('searchInput').addEventListener('input', () => {
        populateTable(activitiesData.activities);
    });

    // Sort select
    document.getElementById('sortSelect').addEventListener('change', () => {
        populateTable(activitiesData.activities);
    });
});
