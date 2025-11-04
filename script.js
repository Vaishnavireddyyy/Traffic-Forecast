const API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjI5NWRlYjQxOTM4MjQ1NGQ5ZmIwYmY3Mzk5MzJlMzI5IiwiaCI6Im11cm11cjY0In0=";

document.addEventListener("DOMContentLoaded", () => {
  const authContainer = document.getElementById("auth-container");
  const rainContainer = document.getElementById("rain-container");
  const locationContainer = document.getElementById("location-container");
  const pickupContainer = document.getElementById("pickup-container");
  const destinationContainer = document.getElementById("destination-container");
  const mapContainer = document.getElementById("map-container");

  const formTitle = document.getElementById("formTitle");
  const authBtn = document.getElementById("authBtn");
  const toggleText = document.getElementById("toggleText");
  const toggleForm = document.getElementById("toggleForm");
  let isLogin = true;

  toggleForm.addEventListener("click", () => {
    isLogin = !isLogin;
    formTitle.innerText = isLogin ? "🔐 Login" : "📝 Register";
    authBtn.innerText = isLogin ? "Login" : "Register";
    toggleText.innerHTML = isLogin
      ? `Don't have an account? <a href="#" id="toggleForm">Register</a>`
      : `Already have an account? <a href="#" id="toggleForm">Login</a>`;
  });

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
      } else alert("Invalid credentials!");
    } else {
      localStorage.setItem("user", user);
      localStorage.setItem("pass", pass);
      alert("Registered successfully!");
      isLogin = true;
      formTitle.innerText = "🔐 Login";
      authBtn.innerText = "Login";
    }
  });

  document.getElementById("rainYes").onclick = () => {
    rainContainer.style.display = "none";
    locationContainer.style.display = "block";
  };
  document.getElementById("rainNo").onclick = () => alert("No rain detected ☀️");

  document.getElementById("detectLoc").onclick = () => {
    navigator.geolocation.getCurrentPosition(pos => {
      localStorage.setItem("currentLoc", `${pos.coords.latitude},${pos.coords.longitude}`);
      locationContainer.style.display = "none";
      pickupContainer.style.display = "block";
    }, () => alert("Unable to get location."));
  };

  document.getElementById("manualLocBtn").onclick = async () => {
    const loc = document.getElementById("manualLoc").value;
    if (!loc) return alert("Enter a location!");
    const coords = await geocode(loc);
    if (!coords) return alert("Invalid location.");
    localStorage.setItem("currentLoc", `${coords[1]},${coords[0]}`);
    locationContainer.style.display = "none";
    pickupContainer.style.display = "block";
  };

  document.getElementById("pickupBtn").onclick = async () => {
    const loc = document.getElementById("pickupLoc").value;
    if (!loc) return alert("Enter a pickup or skip.");
    const coords = await geocode(loc);
    if (!coords) return alert("Invalid pickup location.");
    localStorage.setItem("pickupLoc", `${coords[1]},${coords[0]}`);
    pickupContainer.style.display = "none";
    destinationContainer.style.display = "block";
  };

  document.getElementById("skipPickup").onclick = () => {
    localStorage.removeItem("pickupLoc");
    pickupContainer.style.display = "none";
    destinationContainer.style.display = "block";
  };

  document.getElementById("destSubmit").onclick = async () => {
    const dest = document.getElementById("destinationInput").value;
    if (!dest) return alert("Enter destination!");
    const coords = await geocode(dest);
    if (!coords) return alert("Invalid destination.");
    localStorage.setItem("destLoc", `${coords[1]},${coords[0]}`);

    destinationContainer.style.display = "none";
    mapContainer.style.display = "block";
    showRoute();
  };
});

async function geocode(place) {
  const url = `https://api.openrouteservice.org/geocode/search?api_key=${API_KEY}&text=${encodeURIComponent(place)}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.features && data.features[0]) return data.features[0].geometry.coordinates;
  return null;
}

async function getRoute(start, end) {
  const url = "https://api.openrouteservice.org/v2/directions/driving-car/geojson";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ coordinates: [[start[1], start[0]], [end[1], end[0]]] })
  });
  const data = await res.json();
  if (data.features && data.features[0]) {
    return {
      geojson: data,
      duration: data.features[0].properties.summary.duration
    };
  }
  return null;
}

async function showRoute() {
  const map = L.map("map").setView([12.9716, 77.5946], 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap"
  }).addTo(map);

  const current = localStorage.getItem("currentLoc").split(",").map(Number);
  const dest = localStorage.getItem("destLoc").split(",").map(Number);
  const pickup = localStorage.getItem("pickupLoc")
    ? localStorage.getItem("pickupLoc").split(",").map(Number)
    : null;

  if (pickup) {
    const route1 = await getRoute(current, pickup);
    const route2 = await getRoute(pickup, dest);

    if (route1 && route2) {
      L.geoJSON(route1.geojson, { color: "blue" }).addTo(map);
      L.geoJSON(route2.geojson, { color: "green" }).addTo(map);

      document.getElementById("time1").innerText = `🚗 Start → Pickup: ${convertTime(route1.duration)}`;
      document.getElementById("time2").innerText = `🎯 Pickup → Destination: ${convertTime(route2.duration)}`;
    }
  } else {
    const route = await getRoute(current, dest);
    if (route) {
      L.geoJSON(route.geojson, { color: "green" }).addTo(map);
      document.getElementById("time1").innerText = `🚗 Start → Destination: ${convertTime(route.duration)}`;
    }
  }

  map.fitBounds([
    [current[0], current[1]],
    ...(pickup ? [[pickup[0], pickup[1]]] : []),
    [dest[0], dest[1]]
  ]);
}

function convertTime(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs} hr ${mins} min`;
  return `${mins} min`;
}
