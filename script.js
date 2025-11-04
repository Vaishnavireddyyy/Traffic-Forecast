// 🌧️ Replace with your OpenRouteService API key
const API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjI5NWRlYjQxOTM4MjQ1NGQ5ZmIwYmY3Mzk5MzJlMzI5IiwiaCI6Im11cm11cjY0In0=";

document.addEventListener("DOMContentLoaded", () => {
  const authContainer = document.getElementById("auth-container");
  const rainContainer = document.getElementById("rain-container");
  const locationContainer = document.getElementById("location-container");
  const pickupContainer = document.getElementById("pickup-container");
  const destinationContainer = document.getElementById("destination-container");
  const mapContainer = document.getElementById("map-container");

  // --- Auth toggle ---
  const formTitle = document.getElementById("formTitle");
  const authBtn = document.getElementById("authBtn");
  const toggleText = document.getElementById("toggleText");
  const toggleFormAnchorId = "toggleForm"; // id used inside toggleText
  let isLogin = true;

  // Extract toggle handler into a function to allow rebinding after innerHTML changes
  function toggleHandler(e) {
    if (e) e.preventDefault();
    isLogin = !isLogin;
    formTitle.innerText = isLogin ? "🔐 Login" : "📝 Register";
    authBtn.innerText = isLogin ? "Login" : "Register";
    toggleText.innerHTML = isLogin
      ? `Don't have an account? <a href="#" id="${toggleFormAnchorId}">Register</a>`
      : `Already have an account? <a href="#" id="${toggleFormAnchorId}">Login</a>`;
    // rebind the newly created anchor
    const newAnchor = document.getElementById(toggleFormAnchorId);
    if (newAnchor) newAnchor.addEventListener("click", toggleHandler);
  }

  // initial toggle text + binding
  toggleText.innerHTML = `Don't have an account? <a href="#" id="${toggleFormAnchorId}">Register</a>`;
  const initialToggle = document.getElementById(toggleFormAnchorId);
  if (initialToggle) initialToggle.addEventListener("click", toggleHandler);

  // --- Login/Register logic ---
  authBtn.addEventListener("click", () => {
    const user = document.getElementById("username").value.trim();
    const pass = document.getElementById("password").value.trim();
    if (!user || !pass) return alert("Please fill all fields.");

    if (isLogin) {
      const savedUser = localStorage.getItem("user");
      const savedPass = localStorage.getItem("pass");
      if (user === savedUser && pass === savedPass) {
        authContainer.style.display = "none";
        rainContainer.style.display = "block";
      } else {
        alert("Invalid credentials!");
      }
    } else {
      localStorage.setItem("user", user);
      localStorage.setItem("pass", pass);
      alert("Registered successfully!");
      isLogin = true;
      formTitle.innerText = "🔐 Login";
      authBtn.innerText = "Login";
      // update toggle text to login state and rebind
      toggleText.innerHTML = `Don't have an account? <a href="#" id="${toggleFormAnchorId}">Register</a>`;
      const newAnchor = document.getElementById(toggleFormAnchorId);
      if (newAnchor) newAnchor.addEventListener("click", toggleHandler);
    }
  });

  // --- Rain question ---
  document.getElementById("rainYes").onclick = () => {
    rainContainer.style.display = "none";
    locationContainer.style.display = "block";
  };
  document.getElementById("rainNo").onclick = () => alert("No rain detected ☀️");

  // --- Location: detect ---
  document.getElementById("detectLoc").onclick = () => {
    if (!navigator.geolocation) return alert("Geolocation is not supported in this browser.");
    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        localStorage.setItem("currentLoc", `${lat},${lon}`); // store as "lat,lon"
        locationContainer.style.display = "none";
        pickupContainer.style.display = "block";
      },
      () => alert("Unable to get location.")
    );
  };

  // --- Location: manual ---
  document.getElementById("manualLocBtn").onclick = async () => {
    const loc = document.getElementById("manualLoc").value;
    if (!loc) return alert("Enter a location!");
    const coords = await geocode(loc); // returns [lat, lon] or null
    if (!coords) return alert("Invalid location.");
    localStorage.setItem("currentLoc", `${coords[0]},${coords[1]}`);
    locationContainer.style.display = "none";
    pickupContainer.style.display = "block";
  };

  // --- Optional Pickup ---
  document.getElementById("pickupBtn").onclick = async () => {
    const loc = document.getElementById("pickupLoc").value;
    if (!loc) return alert("Enter a pickup or skip.");
    const coords = await geocode(loc);
    if (!coords) return alert("Invalid pickup location.");
    localStorage.setItem("pickupLoc", `${coords[0]},${coords[1]}`); // lat,lon
    pickupContainer.style.display = "none";
    destinationContainer.style.display = "block";
  };

  document.getElementById("skipPickup").onclick = () => {
    localStorage.removeItem("pickupLoc");
    pickupContainer.style.display = "none";
    destinationContainer.style.display = "block";
  };

  // --- Destination ---
  document.getElementById("destSubmit").onclick = async () => {
    const dest = document.getElementById("destinationInput").value;
    if (!dest) return alert("Enter destination!");
    const coords = await geocode(dest);
    if (!coords) return alert("Invalid destination.");
    localStorage.setItem("destLoc", `${coords[0]},${coords[1]}`);
    destinationContainer.style.display = "none";
    mapContainer.style.display = "block";
    showRoute();
  };
});

// --- Helper: Geocode ---
// Returns [lat, lon] or null
async function geocode(place) {
  try {
    const url = `https://api.openrouteservice.org/geocode/search?api_key=${API_KEY}&text=${encodeURIComponent(place)}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error("Geocode error status:", res.status);
      return null;
    }
    const data = await res.json();
    if (data.features && data.features[0] && data.features[0].geometry && Array.isArray(data.features[0].geometry.coordinates)) {
      // ORS returns [lon, lat] so we map to [lat, lon]
      const [lon, lat] = data.features[0].geometry.coordinates;
      return [lat, lon];
    }
    return null;
  } catch (err) {
    console.error("Geocode error:", err);
    return null;
  }
}

// --- Helper: Route ---
// start and end should be [lat, lon]
// returns { geojson, duration } or null
async function getRoute(start, end) {
  try {
    const url = "https://api.openrouteservice.org/v2/directions/driving-car/geojson";
    // ORS expects coordinates as [lon, lat]
    const body = {
      coordinates: [
        [start[1], start[0]],
        [end[1], end[0]]
      ]
    };
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      console.error("Route error status:", res.status);
      const text = await res.text();
      console.error("Route error body:", text);
      return null;
    }
    const data = await res.json();
    if (data.features && data.features[0]) {
      return {
        geojson: data,
        duration: data.features[0].properties.summary.duration // in seconds
      };
    }
    return null;
  } catch (err) {
    console.error("Route error:", err);
    return null;
  }
}

// --- Show map & routes ---
async function showRoute() {
  // Remove previous map if exists (Leaflet)
  if (window._leaflet_map_instance) {
    try {
      window._leaflet_map_instance.remove();
    } catch (e) {
      console.warn("Failed to remove previous map instance:", e);
    }
    window._leaflet_map_instance = null;
  }

  // default center (Bengaluru) until we get bounds
  const map = L.map("map").setView([12.9716, 77.5946], 13);
  window._leaflet_map_instance = map;

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors"
  }).addTo(map);

  // parse stored locations (expected format "lat,lon")
  function parseLoc(key) {
    const s = localStorage.getItem(key);
    if (!s) return null;
    const parts = s.split(",").map(Number);
    if (parts.length !== 2 || parts.some(isNaN)) return null;
    return parts; // [lat, lon]
  }

  const current = parseLoc("currentLoc");
  const dest = parseLoc("destLoc");
  const pickup = parseLoc("pickupLoc"); // may be null

  if (!current || !dest) {
    alert("Missing current or destination coordinates.");
    return;
  }

  let totalDuration = 0;
  const bounds = [];
  bounds.push([current[0], current[1]]);

  if (pickup) {
    const route1 = await getRoute(current, pickup);
    const route2 = await getRoute(pickup, dest);

    if (route1 && route2) {
      L.geoJSON(route1.geojson).addTo(map).setStyle ? L.geoJSON(route1.geojson).setStyle({}) : null;
      L.geoJSON(route2.geojson).addTo(map).setStyle ? L.geoJSON(route2.geojson).setStyle({}) : null;

      // Show durations
      document.getElementById("time1").innerText = `🚗 Start → Pickup: ${(route1.duration / 60).toFixed(1)} mins`;
      document.getElementById("time2").innerText = `🎯 Pickup → Destination: ${(route2.duration / 60).toFixed(1)} mins`;
      totalDuration = route1.duration + route2.duration;

      bounds.push([pickup[0], pickup[1]]);
      bounds.push([dest[0], dest[1]]);
    } else {
      alert("Could not fetch route for one of the legs.");
      // attempt to draw what we have
      if (route1 && route1.geojson) L.geoJSON(route1.geojson).addTo(map);
      if (route2 && route2.geojson) L.geoJSON(route2.geojson).addTo(map);
      bounds.push([dest[0], dest[1]]);
    }
  } else {
    const route = await getRoute(current, dest);
    if (route) {
      L.geoJSON(route.geojson).addTo(map);
      document.getElementById("time1").innerText = `🚗 Start → Destination: ${(route.duration / 60).toFixed(1)} mins`;
      totalDuration = route.duration;
      bounds.push([dest[0], dest[1]]);
    } else {
      alert("Could not fetch route.");
      bounds.push([dest[0], dest[1]]);
    }
  }

  // total duration display (if container exists)
  const totalElem = document.getElementById("totalTime");
  if (totalElem && totalDuration > 0) {
    totalElem.innerText = `⏱️ Total: ${(totalDuration / 60).toFixed(1)} mins`;
  }

  // fit the map to bounds
  try {
    map.fitBounds(bounds, { padding: [50, 50] });
  } catch (e) {
    console.warn("fitBounds failed:", e);
    map.setView([current[0], current[1]], 13);
  }

  // add markers for clarity
  L.marker([current[0], current[1]]).addTo(map).bindPopup("Start").openPopup();
  if (pickup) L.marker([pickup[0], pickup[1]]).addTo(map).bindPopup("Pickup");
  L.marker([dest[0], dest[1]]).addTo(map).bindPopup("Destination");
}
