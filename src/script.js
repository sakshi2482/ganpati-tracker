// Global variables
let map;
let markers = {};
let mandalsData = [];
let updateInterval;
let isUpdating = true;
let currentTheme = 'light';
let isAuthenticated = false;
let routes = {};
let alerts = [];
let notifications = [];

// Pune coordinates
const PUNE_CENTER = [18.5204, 73.8567];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Load saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        currentTheme = savedTheme;
        if (currentTheme === 'dark') {
            document.body.setAttribute('data-theme', 'dark');
            document.getElementById('theme-toggle').querySelector('i').className = 'fas fa-sun';
        }
    }
    
    // Check authentication
    checkAuthentication();
    
    initializeMap();
    generateMandalsData();
    initializeSidebar();
    setupEventListeners();
    setupAuthentication();
    startRealTimeUpdates();
    updateLastUpdateTime();
});

// Initialize Leaflet map
function initializeMap() {
    map = L.map('map').setView(PUNE_CENTER, 13);
    
    // Store base layers for theme switching
    map._baseLayers = {
        Street: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18
        }),
        Satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '© Esri',
            maxZoom: 18
        })
    };
    
    // Add initial tiles based on current theme
    if (currentTheme === 'dark') {
        const darkTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '© OpenStreetMap contributors, © CARTO',
            maxZoom: 18
        });
        darkTiles.addTo(map);
        map._baseLayers.Street = darkTiles;
    } else {
        map._baseLayers.Street.addTo(map);
    }
    
    // Layer control
    L.control.layers(map._baseLayers).addTo(map);
}

// Generate 100 mandals data with time slots and routes
function generateMandalsData() {
    const mandalNames = [
        "Kasba Ganpati", "Tambdi Jogeshwari", "Guruji Talim", "Tulshibaug Ganpati", 
        "Kesariwada Ganpati", "Narayan Peth", "Shaniwar Peth", "Raviwar Peth", 
        "Budhwar Peth", "Guruwar Peth", "Shukrawar Peth", "Somwar Peth", 
        "Dagdusheth Halwai", "Manikarnika", "Lakshmi Road", "FC Road", 
        "JM Road", "Koregaon Park", "Kalyani Nagar", "Viman Nagar",
        "Kharadi", "Wadgaon Sheri", "Yerwada", "Khadki", "Dapodi", 
        "Bhosari", "Pimpri", "Chinchwad", "Akurdi", "Nigdi", "Talegaon",
        "Lonavala", "Khandala", "Mahabaleshwar", "Panchgani", "Matheran",
        "Alibaug", "Murud", "Shrivardhan", "Diveagar", "Ganpatipule",
        "Ratnagiri", "Sindhudurg", "Kolhapur", "Sangli", "Satara", 
        "Solapur", "Ahmednagar", "Nashik", "Aurangabad", "Jalgaon",
        "Dhule", "Nandurbar", "Buldhana", "Akola", "Amravati", 
        "Wardha", "Nagpur", "Chandrapur", "Gadchiroli", "Bhandara",
        "Gondia", "Yavatmal", "Washim", "Hingoli", "Parbhani", 
        "Nanded", "Latur", "Osmanabad", "Beed", "Jalna", 
        "Aurangabad Rural", "Pune Rural", "Raigad", "Thane", 
        "Palghar", "Mumbai", "Mumbai Suburban", "Thane Rural", 
        "Nashik Rural", "Ahmednagar Rural", "Solapur Rural", 
        "Satara Rural", "Sangli Rural", "Kolhapur Rural", 
        "Ratnagiri Rural", "Sindhudurg Rural", "Gadchiroli Rural",
        "Chandrapur Rural", "Nagpur Rural", "Wardha Rural", 
        "Amravati Rural", "Akola Rural", "Buldhana Rural", 
        "Nandurbar Rural", "Dhule Rural", "Jalgaon Rural", 
        "Aurangabad Rural", "Nashik Rural", "Pune Rural", 
        "Thane Rural", "Palghar Rural", "Raigad Rural"
    ];
    
    mandalsData = [];
    
    for (let i = 1; i <= 100; i++) {
        // Generate start and end points around Pune
        const startLat = PUNE_CENTER[0] + (Math.random() - 0.5) * 0.05;
        const startLng = PUNE_CENTER[1] + (Math.random() - 0.5) * 0.05;
        const endLat = PUNE_CENTER[0] + (Math.random() - 0.5) * 0.05;
        const endLng = PUNE_CENTER[1] + (Math.random() - 0.5) * 0.05;
        
        // Generate time slots (spread throughout the day)
        const startHour = Math.floor(Math.random() * 24);
        const startMinute = Math.floor(Math.random() * 60);
        const duration = Math.floor(Math.random() * 2) + 1; // 1-2 hours
        
        const startTime = `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
        const endHour = (startHour + duration) % 24;
        const endTime = `${endHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
        
        mandalsData.push({
            id: i,
            name: mandalNames[i - 1] || `Mandal ${i}`,
            lat: startLat,
            lng: startLng,
            status: 'online',
            lastUpdate: new Date(),
            speed: Math.random() * 10 + 5, // 5-15 km/h
            from: { lat: startLat, lng: startLng },
            to: { lat: endLat, lng: endLng },
            slot: { start: startTime, end: endTime },
            route: null, // Will be created when needed
            alertTriggered: false
        });
    }
}

// Initialize sidebar with mandals list
function initializeSidebar() {
    const mandalsList = document.getElementById('mandals-list');
    mandalsList.innerHTML = '';
    
    mandalsData.forEach(mandal => {
        const mandalItem = createMandalListItem(mandal);
        mandalsList.appendChild(mandalItem);
    });
}

// Create mandal list item
function createMandalListItem(mandal) {
    const item = document.createElement('div');
    item.className = 'mandal-item';
    item.dataset.id = mandal.id;
    
    // Check if mandal has been assigned
    const isAssigned = mandal.slot && mandal.slot.start && mandal.slot.end;
    const assignmentStatus = isAssigned ? 
        `<div class="assignment-status assigned">✓ Assigned</div>` : 
        `<div class="assignment-status unassigned">⨯ Unassigned</div>`;
    
    item.innerHTML = `
        <div class="mandal-info">
            <div class="mandal-name">${mandal.name}</div>
            <div class="mandal-id">ID: ${mandal.id}</div>
            ${assignmentStatus}
        </div>
        <div class="mandal-status"></div>
    `;
    
    item.addEventListener('click', () => {
        focusOnMandal(mandal.id);
    });
    
    return item;
}

// Focus on specific mandal
function focusOnMandal(mandalId) {
    const mandal = mandalsData.find(m => m.id === mandalId);
    if (!mandal) return;
    
    // Update active state in sidebar
    document.querySelectorAll('.mandal-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-id="${mandalId}"]`).classList.add('active');
    
    // Center map on mandal
    map.setView([mandal.lat, mandal.lng], 15);
    
    // Open popup for the marker
    if (markers[mandalId]) {
        markers[mandalId].openPopup();
    }
}

// Setup event listeners
function setupEventListeners() {
    // Theme toggle
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    
    // Search functionality
    document.getElementById('search-input').addEventListener('input', handleSearch);
    
    // Map controls
    document.getElementById('center-map').addEventListener('click', centerOnPune);
    document.getElementById('toggle-updates').addEventListener('click', toggleUpdates);
}

// Authentication functions
function setupAuthentication() {
    const loginModal = document.getElementById('login-modal');
    const loginForm = document.getElementById('login-form');
    const closeBtn = document.querySelector('.close');
    const logoutBtn = document.getElementById('logout-btn');
    
    // Show login modal if not authenticated
    if (!isAuthenticated) {
        loginModal.style.display = 'block';
    }
    
    // Close modal
    closeBtn.addEventListener('click', () => {
        loginModal.style.display = 'none';
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === loginModal) {
            loginModal.style.display = 'none';
        }
    });
    
    // Login form submission
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        // Simple authentication (demo purposes)
        if (email === 'admin@ganpati.com' && password === 'admin123') {
            login(email);
        } else {
            showAlert('Invalid credentials', 'danger');
        }
    });
    
    // Logout
    logoutBtn.addEventListener('click', logout);
    
    // Clear notifications
    const clearNotificationsBtn = document.getElementById('clear-notifications');
    if (clearNotificationsBtn) {
        clearNotificationsBtn.addEventListener('click', clearNotifications);
    }
    
    // Assignment modal
    const assignRouteBtn = document.getElementById('assign-route-btn');
    const assignmentModal = document.getElementById('assignment-modal');
    const closeAssignmentBtn = document.getElementById('close-assignment');
    const assignmentForm = document.getElementById('assignment-form');
    const previewRouteBtn = document.getElementById('preview-route');
    
    if (assignRouteBtn) {
        assignRouteBtn.addEventListener('click', () => {
            assignmentModal.style.display = 'block';
            populateMandalSelect();
        });
    }
    
    if (closeAssignmentBtn) {
        closeAssignmentBtn.addEventListener('click', () => {
            assignmentModal.style.display = 'none';
        });
    }
    
    if (assignmentForm) {
        assignmentForm.addEventListener('submit', handleAssignmentSubmit);
    }
    
    if (previewRouteBtn) {
        previewRouteBtn.addEventListener('click', previewRoute);
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === assignmentModal) {
            assignmentModal.style.display = 'none';
        }
    });
}

function checkAuthentication() {
    const token = localStorage.getItem('auth_token');
    if (token) {
        isAuthenticated = true;
        showAuthenticatedUI();
    }
}

function login(email) {
    isAuthenticated = true;
    localStorage.setItem('auth_token', 'demo_token');
    localStorage.setItem('admin_email', email);
    
    document.getElementById('login-modal').style.display = 'none';
    showAuthenticatedUI();
    showAlert('Login successful!', 'success');
}

function logout() {
    isAuthenticated = false;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('admin_email');
    
    hideAuthenticatedUI();
    document.getElementById('login-modal').style.display = 'block';
    showAlert('Logged out successfully', 'warning');
}

function showAuthenticatedUI() {
    document.getElementById('admin-info').style.display = 'flex';
    document.querySelector('.admin-name').textContent = localStorage.getItem('admin_email') || 'Admin';
}

function hideAuthenticatedUI() {
    document.getElementById('admin-info').style.display = 'none';
}

function showAlert(message, type = 'info') {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    document.body.appendChild(alert);
    
    setTimeout(() => {
        alert.remove();
    }, 5000);
}

// Notification functions
function addNotification(title, message, type = 'info') {
    const notification = {
        id: Date.now(),
        title: title,
        message: message,
        type: type,
        time: new Date().toLocaleTimeString()
    };
    
    notifications.unshift(notification);
    
    // Keep only last 50 notifications
    if (notifications.length > 50) {
        notifications = notifications.slice(0, 50);
    }
    
    updateNotificationSidebar();
}

function updateNotificationSidebar() {
    const notificationsList = document.getElementById('notifications-list');
    if (!notificationsList) return;
    
    notificationsList.innerHTML = '';
    
    notifications.forEach(notification => {
        const notificationItem = document.createElement('div');
        notificationItem.className = `notification-item ${notification.type}`;
        
        notificationItem.innerHTML = `
            <div class="notification-header-info">
                <span class="notification-title">${notification.title}</span>
                <span class="notification-time">${notification.time}</span>
            </div>
            <div class="notification-message">${notification.message}</div>
        `;
        
        notificationsList.appendChild(notificationItem);
    });
}

function clearNotifications() {
    notifications = [];
    updateNotificationSidebar();
}

// Assignment functions
function populateMandalSelect() {
    const mandalSelect = document.getElementById('mandal-select');
    if (!mandalSelect) return;
    
    mandalSelect.innerHTML = '<option value="">Choose a mandal...</option>';
    
    mandalsData.forEach(mandal => {
        const option = document.createElement('option');
        option.value = mandal.id;
        option.textContent = `${mandal.name} (ID: ${mandal.id})`;
        mandalSelect.appendChild(option);
    });
}

function handleAssignmentSubmit(e) {
    e.preventDefault();
    
    const mandalId = parseInt(document.getElementById('mandal-select').value);
    const startTime = document.getElementById('start-time').value;
    const endTime = document.getElementById('end-time').value;
    const startLat = parseFloat(document.getElementById('start-lat').value);
    const startLng = parseFloat(document.getElementById('start-lng').value);
    const endLat = parseFloat(document.getElementById('end-lat').value);
    const endLng = parseFloat(document.getElementById('end-lng').value);
    
    if (!mandalId || !startTime || !endTime || !startLat || !startLng || !endLat || !endLng) {
        showAlert('Please fill in all fields', 'danger');
        return;
    }
    
    // Find the mandal
    const mandal = mandalsData.find(m => m.id === mandalId);
    if (!mandal) {
        showAlert('Mandal not found', 'danger');
        return;
    }
    
    // Update mandal data
    mandal.from = { lat: startLat, lng: startLng };
    mandal.to = { lat: endLat, lng: endLng };
    mandal.slot = { start: startTime, end: endTime };
    mandal.lat = startLat;
    mandal.lng = startLng;
    mandal.alertTriggered = false;
    
    // Update marker position
    if (markers[mandal.id]) {
        markers[mandal.id].setLatLng([startLat, startLng]);
    }
    
    // Redraw route
    drawRoute(mandal);
    
    // Update popup
    updateMarkerPopup(mandal);
    
    // Show success message
    showAlert(`Route assigned to ${mandal.name}`, 'success');
    addNotification(`Route assigned`, `Time slot and route assigned to ${mandal.name}`, 'success');
    
    // Close modal
    document.getElementById('assignment-modal').style.display = 'none';
    
    // Reset form
    e.target.reset();
}

function previewRoute() {
    const startLat = parseFloat(document.getElementById('start-lat').value);
    const startLng = parseFloat(document.getElementById('start-lng').value);
    const endLat = parseFloat(document.getElementById('end-lat').value);
    const endLng = parseFloat(document.getElementById('end-lng').value);
    
    if (!startLat || !startLng || !endLat || !endLng) {
        showAlert('Please enter start and end coordinates', 'warning');
        return;
    }
    
    // Create temporary route for preview
    const previewRoute = L.polyline([
        [startLat, startLng],
        [endLat, endLng]
    ], {
        color: '#3b82f6',
        weight: 4,
        opacity: 0.8,
        dashArray: '10, 10'
    }).addTo(map);
    
    // Fit map to show the route
    map.fitBounds(previewRoute.getBounds());
    
    // Remove preview route after 3 seconds
    setTimeout(() => {
        map.removeLayer(previewRoute);
    }, 3000);
    
    showAlert('Route preview shown (will disappear in 3 seconds)', 'info');
}

// Toggle theme
function toggleTheme() {
    const body = document.body;
    const themeToggle = document.getElementById('theme-toggle');
    const icon = themeToggle.querySelector('i');
    
    if (currentTheme === 'light') {
        body.setAttribute('data-theme', 'dark');
        currentTheme = 'dark';
        icon.className = 'fas fa-sun';
    } else {
        body.removeAttribute('data-theme');
        currentTheme = 'light';
        icon.className = 'fas fa-moon';
    }
    
    // Update map theme
    updateMapTheme();
    
    // Save theme preference to localStorage
    localStorage.setItem('theme', currentTheme);
}

// Handle search
function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase();
    const mandalItems = document.querySelectorAll('.mandal-item');
    
    mandalItems.forEach(item => {
        const mandalName = item.querySelector('.mandal-name').textContent.toLowerCase();
        const mandalId = item.querySelector('.mandal-id').textContent.toLowerCase();
        
        if (mandalName.includes(searchTerm) || mandalId.includes(searchTerm)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

// Center map on Pune
function centerOnPune() {
    map.setView(PUNE_CENTER, 13);
}

// Toggle real-time updates
function toggleUpdates() {
    const toggleBtn = document.getElementById('toggle-updates');
    const icon = toggleBtn.querySelector('i');
    
    if (isUpdating) {
        clearInterval(updateInterval);
        isUpdating = false;
        toggleBtn.classList.remove('active');
        icon.className = 'fas fa-pause';
    } else {
        startRealTimeUpdates();
        isUpdating = true;
        toggleBtn.classList.add('active');
        icon.className = 'fas fa-play';
    }
}

// Start real-time updates
function startRealTimeUpdates() {
    updateInterval = setInterval(() => {
        updateMandalsPositions();
        updateLastUpdateTime();
    }, 5000); // Update every 5 seconds
}

// Update mandals positions
function updateMandalsPositions() {
    mandalsData.forEach(mandal => {
        // Simulate movement towards destination
        const progress = Math.random() * 0.1; // Random progress towards destination
        mandal.lat += (mandal.to.lat - mandal.lat) * progress;
        mandal.lng += (mandal.to.lng - mandal.lng) * progress;
        mandal.lastUpdate = new Date();
        
        // Update marker position
        if (markers[mandal.id]) {
            markers[mandal.id].setLatLng([mandal.lat, mandal.lng]);
        } else {
            // Create new marker if it doesn't exist
            createMarker(mandal);
        }
        
        // Update popup content
        updateMarkerPopup(mandal);
        
        // Update route color based on current status
        drawRoute(mandal);
        
        // Check for route violations
        checkRouteViolations(mandal);
    });
}

// Check for route violations
function checkRouteViolations(mandal) {
    if (!isAuthenticated) return;
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const startTime = parseInt(mandal.slot.start.split(':')[0]) * 60 + parseInt(mandal.slot.start.split(':')[1]);
    const endTime = parseInt(mandal.slot.end.split(':')[0]) * 60 + parseInt(mandal.slot.end.split(':')[1]);
    
    // Check if current time is within slot
    if (currentTime >= startTime && currentTime <= endTime) {
        // Check if mandal has reached destination
        const distanceToDestination = calculateDistance(
            mandal.lat, mandal.lng,
            mandal.to.lat, mandal.to.lng
        );
        
        if (distanceToDestination > 0.001 && !mandal.alertTriggered) {
            // Calculate progress and time progress
            const totalDistance = calculateDistance(
                mandal.from.lat, mandal.from.lng,
                mandal.to.lat, mandal.to.lng
            );
            const progress = totalDistance > 0 ? (totalDistance - distanceToDestination) / totalDistance : 0;
            const timeProgress = (currentTime - startTime) / (endTime - startTime);
            
            if (progress < timeProgress * 0.8) {
                // Significantly behind schedule
                mandal.alertTriggered = true;
                addNotification(`${mandal.name} is significantly delayed`, `${mandal.name} is behind schedule and may miss time slot (${mandal.slot.start}-${mandal.slot.end})`, 'danger');
                showAlert(`${mandal.name} is significantly behind schedule`, 'danger');
            } else if (progress < timeProgress) {
                // Slightly behind schedule
                if (!mandal.alertTriggered) {
                    mandal.alertTriggered = true;
                    addNotification(`${mandal.name} is delayed`, `${mandal.name} is slightly behind schedule (${mandal.slot.start}-${mandal.slot.end})`, 'warning');
                }
            } else {
                // On track
                if (!mandal.alertTriggered) {
                    mandal.alertTriggered = true;
                    addNotification(`${mandal.name} is on track`, `${mandal.name} is progressing well within time slot (${mandal.slot.start}-${mandal.slot.end})`, 'success');
                }
            }
        } else if (distanceToDestination <= 0.001 && !mandal.alertTriggered) {
            // Mandal has reached destination on time
            mandal.alertTriggered = true;
            addNotification(`${mandal.name} completed route`, `${mandal.name} has successfully reached destination on time`, 'success');
        }
    } else if (currentTime > endTime && !mandal.alertTriggered) {
        // Time slot has passed
        mandal.alertTriggered = true;
        addNotification(`${mandal.name} missed time slot`, `${mandal.name} missed their assigned time slot (${mandal.slot.start}-${mandal.slot.end})`, 'danger');
        showAlert(`${mandal.name} missed their time slot (${mandal.slot.start}-${mandal.slot.end})`, 'danger');
    }
    
    // Update route color
    drawRoute(mandal);
}

// Calculate distance between two points
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Create marker for mandal
function createMarker(mandal) {
    // Create location point icon
    const locationIcon = L.divIcon({
        className: 'location-marker',
        html: '<i class="fas fa-map-marker-alt" style="color: #ef4444; font-size: 24px; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);"></i>',
        iconSize: [24, 24],
        iconAnchor: [12, 24]
    });
    
    const marker = L.marker([mandal.lat, mandal.lng], {
        title: mandal.name,
        icon: locationIcon
    }).addTo(map);
    
    // Create popup content
    const popupContent = createPopupContent(mandal);
    marker.bindPopup(popupContent);
    
    // Add click event
    marker.on('click', () => {
        focusOnMandal(mandal.id);
    });
    
    markers[mandal.id] = marker;
}

// Create popup content
function createPopupContent(mandal) {
    const div = document.createElement('div');
    div.className = 'mandal-popup';
    
    const status = mandal.status === 'online' ? '🟢 Online' : '🔴 Offline';
    const lastUpdate = mandal.lastUpdate.toLocaleTimeString();
    
    // Calculate distance to destination
    const distanceToDestination = calculateDistance(
        mandal.lat, mandal.lng,
        mandal.to.lat, mandal.to.lng
    );
    
    div.innerHTML = `
        <h4>${mandal.name}</h4>
        <p><strong>ID:</strong> ${mandal.id}</p>
        <p><strong>Status:</strong> ${status}</p>
        <p><strong>Time Slot:</strong> ${mandal.slot.start} - ${mandal.slot.end}</p>
        <p><strong>Start:</strong> (${mandal.from.lat.toFixed(4)}, ${mandal.from.lng.toFixed(4)})</p>
        <p><strong>End:</strong> (${mandal.to.lat.toFixed(4)}, ${mandal.to.lng.toFixed(4)})</p>
        <p><strong>Speed:</strong> ${mandal.speed.toFixed(1)} km/h</p>
        <p><strong>Distance to Destination:</strong> ${distanceToDestination.toFixed(2)} km</p>
        <p><strong>Last Update:</strong> ${lastUpdate}</p>
    `;
    
    return div;
}

// Update marker popup
function updateMarkerPopup(mandal) {
    if (markers[mandal.id]) {
        const popupContent = createPopupContent(mandal);
        markers[mandal.id].getPopup().setContent(popupContent);
    }
}

// Update last update time
function updateLastUpdateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    document.getElementById('last-update-time').textContent = timeString;
}

// Initialize markers on page load
function initializeMarkers() {
    mandalsData.forEach(mandal => {
        createMarker(mandal);
        drawRoute(mandal);
    });
}

// Draw route for a mandal
function drawRoute(mandal) {
    if (routes[mandal.id]) {
        map.removeLayer(routes[mandal.id]);
    }
    
    const routeCoords = [
        [mandal.from.lat, mandal.from.lng],
        [mandal.to.lat, mandal.to.lng]
    ];
    
    // Determine route color based on status
    const routeColor = getRouteColor(mandal);
    
    routes[mandal.id] = L.polyline(routeCoords, {
        color: routeColor,
        weight: 3,
        opacity: 0.8,
        dashArray: '5, 10'
    }).addTo(map);
}

// Get route color based on mandal status
function getRouteColor(mandal) {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const startTime = parseInt(mandal.slot.start.split(':')[0]) * 60 + parseInt(mandal.slot.start.split(':')[1]);
    const endTime = parseInt(mandal.slot.end.split(':')[0]) * 60 + parseInt(mandal.slot.end.split(':')[1]);
    
    // Calculate distance to destination
    const distanceToDestination = calculateDistance(
        mandal.lat, mandal.lng,
        mandal.to.lat, mandal.to.lng
    );
    
    // Check if current time is within slot
    if (currentTime >= startTime && currentTime <= endTime) {
        // Within time slot
        if (distanceToDestination <= 0.001) {
            return '#10b981'; // Green - Reached destination on time
        } else {
            // Calculate progress percentage
            const totalDistance = calculateDistance(
                mandal.from.lat, mandal.from.lng,
                mandal.to.lat, mandal.to.lng
            );
            const progress = totalDistance > 0 ? (totalDistance - distanceToDestination) / totalDistance : 0;
            
            // Check if behind schedule
            const timeProgress = (currentTime - startTime) / (endTime - startTime);
            
            if (progress < timeProgress * 0.8) {
                return '#ef4444'; // Red - Significantly behind schedule
            } else if (progress < timeProgress) {
                return '#f59e0b'; // Orange - Slightly behind schedule
            } else {
                return '#3b82f6'; // Blue - On track
            }
        }
    } else if (currentTime > endTime) {
        // Time slot has passed
        if (distanceToDestination <= 0.001) {
            return '#10b981'; // Green - Completed (even if late)
        } else {
            return '#ef4444'; // Red - Missed time slot
        }
    } else {
        // Not started yet
        return '#6b7280'; // Gray - Not started
    }
}

// Call initialization after a short delay to ensure DOM is ready
setTimeout(() => {
    initializeMarkers();
}, 100);

// Add some additional features

// Color code markers by zone
function getMarkerColor(zone) {
    const colors = {
        1: '#2563eb', // Blue
        2: '#10b981', // Green
        3: '#f59e0b', // Yellow
        4: '#ef4444', // Red
        5: '#8b5cf6'  // Purple
    };
    return colors[zone] || '#2563eb';
}

// Theme management functions
function updateMapTheme() {
    if (currentTheme === 'dark') {
        // Switch to dark map tiles
        map.removeLayer(map._baseLayers.Street);
        map.removeLayer(map._baseLayers.Satellite);
        
        // Add dark map tiles
        const darkTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '© OpenStreetMap contributors, © CARTO',
            maxZoom: 18
        });
        darkTiles.addTo(map);
        
        // Update layer control
        if (map._baseLayers) {
            map._baseLayers.Street = darkTiles;
            map._baseLayers.Satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: '© Esri',
                maxZoom: 18
            });
        }
    } else {
        // Switch to light map tiles
        map.removeLayer(map._baseLayers.Street);
        map.removeLayer(map._baseLayers.Satellite);
        
        // Add light map tiles
        const lightTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18
        });
        lightTiles.addTo(map);
        
        // Update layer control
        if (map._baseLayers) {
            map._baseLayers.Street = lightTiles;
            map._baseLayers.Satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: '© Esri',
                maxZoom: 18
            });
        }
    }
}

// Add keyboard shortcuts
document.addEventListener('keydown', function(event) {
    switch(event.key) {
        case 'Escape':
            centerOnPune();
            break;
        case ' ':
            event.preventDefault();
            toggleUpdates();
            break;
        case 't':
            toggleTheme();
            break;
    }
});

// Add performance optimization for mobile
function optimizeForMobile() {
    if (window.innerWidth <= 768) {
        // Reduce update frequency on mobile
        if (updateInterval) {
            clearInterval(updateInterval);
            updateInterval = setInterval(() => {
                updateMandalsPositions();
                updateLastUpdateTime();
            }, 10000); // 10 seconds on mobile
        }
    }
}

// Call optimization on resize
window.addEventListener('resize', optimizeForMobile);

// Add error handling
window.addEventListener('error', function(event) {
    console.error('Application error:', event.error);
    // You could add user notification here
});

// Add service worker for offline support (optional)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(registration => {
            console.log('SW registered: ', registration);
        })
        .catch(registrationError => {
            console.log('SW registration failed: ', registrationError);
        });
} 