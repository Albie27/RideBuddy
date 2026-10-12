// ===============================================
// RideBuddy: a map of bike parks
// ===============================================

// Names and icons we show for the features
const FEATURES = {
  lift: "Lift",
  jumps: "Jumps",
  flow: "Flow trails",
  pumptrack: "Pump track"
};

const COUNTRIES = { all: "All", CH: "Switzerland", AT: "Austria", DE: "Germany", IT: "Italy" };

// Link to the "Suggest a park" form (for example a Google Form). Paste it here.
const SUGGEST_LINK = "";

// What the user has chosen right now
let parks = [];                 // all parks from parks.json
let country = "all";            // chosen country
let wanted = new Set();         // chosen features, e.g. "lift"
let query = "";                 // text in the search field
let myPosition = null;          // the user's position, if they press "Near me"
let selected = null;            // the park that is open in the card
let markers = [];               // pins on the map

// ---------- 1. Make the map ----------
// On the phone the list covers the bottom half, so we start a bit more to the south
const isPhone = window.innerWidth <= 760;
const map = L.map("map", { zoomControl: !isPhone }).setView(isPhone ? [45.4, 10.2] : [47.1, 10.5], isPhone ? 6 : 7);

L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}", {
  attribution: "Tiles © Esri",
  maxZoom: 18
}).addTo(map);

// ---------- 2. Load the parks ----------
fetch("parks.json")
  .then(answer => answer.json())
  .then(data => {
    parks = data;
    makeChips();
    render();
  })
  .catch(() => {
    document.getElementById("list").innerHTML =
      '<li class="empty">Could not load parks.json. Open the website through GitHub Pages or Live Server.</li>';
  });

// ---------- 3. Filter buttons ----------
function makeChips() {
  const countryBox = document.getElementById("countries");
  for (const code in COUNTRIES) {
    const chip = document.createElement("button");
    chip.className = "chip" + (code === country ? " on" : "");
    chip.textContent = COUNTRIES[code];
    chip.onclick = () => {
      country = code;
      countryBox.querySelectorAll(".chip").forEach(c => c.classList.remove("on"));
      chip.classList.add("on");
      render();
    };
    countryBox.appendChild(chip);
  }

  const featureBox = document.getElementById("features");
  for (const key in FEATURES) {
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.innerHTML = `<svg><use href="#i-${key}"/></svg>${FEATURES[key]}`;
    chip.onclick = () => {
      // click once = on, click again = off
      if (wanted.has(key)) wanted.delete(key); else wanted.add(key);
      chip.classList.toggle("on");
      render();
    };
    featureBox.appendChild(chip);
  }
}

document.getElementById("search").addEventListener("input", e => {
  query = e.target.value.toLowerCase().trim();
  render();
});

// ---------- 4. Which parks match the filters? ----------
function matchingParks() {
  let result = parks.filter(p => {
    const countryOk = country === "all" || p.country === country;
    const featuresOk = [...wanted].every(f => p.features.includes(f));
    const searchOk = query === "" ||
      p.name.toLowerCase().includes(query) || p.town.toLowerCase().includes(query);
    return countryOk && featuresOk && searchOk;
  });

  // If we know where the user is, sort the nearest park first
  if (myPosition) {
    result.forEach(p => p.km = distanceKm(myPosition, [p.lat, p.lng]));
    result.sort((a, b) => a.km - b.km);
  }
  return result;
}

// ---------- 5. Draw the list and the pins ----------
function render() {
  const list = matchingParks();

  // Text above the list
  const word = list.length === 1 ? "bike park" : "bike parks";
  document.getElementById("count").textContent = `${list.length} ${word}`;

  // The list
  const ul = document.getElementById("list");
  ul.innerHTML = "";
  if (list.length === 0) ul.innerHTML = '<li class="empty">No park found. Try fewer filters.</li>';

  list.forEach(p => {
    const li = document.createElement("li");
    li.className = "park" + (p === selected ? " selected" : "");
    li.innerHTML = `
      <h3>${p.name}</h3>
      <div class="where">${p.town}, ${p.country}</div>
      <div class="icons">${p.features.map(f => `<span class="icon" title="${FEATURES[f]}"><svg><use href="#i-${f}"/></svg></span>`).join("")}</div>
      ${p.km !== undefined ? `<div class="km">${Math.round(p.km)} km</div>` : ""}`;
    li.onclick = () => openPark(p);
    ul.appendChild(li);
  });

  // The pins: remove the old ones, add new ones
  markers.forEach(m => m.remove());
  markers = list.map(p => {
    const big = p === selected;
    const icon = L.divIcon({
      className: "",
      html: `<div class="pin${big ? " selected" : ""}"></div>`,
      iconSize: big ? [42, 42] : [28, 28],
      iconAnchor: big ? [21, 42] : [14, 28]
    });
    return L.marker([p.lat, p.lng], { icon, title: p.name, zIndexOffset: big ? 1000 : 0 })
      .on("click", () => openPark(p))
      .addTo(map);
  });
}

// ---------- 6. Open one park ----------
function openPark(p) {
  selected = p;
  const season = p.season ? `Open ${p.season}` : "Season: see website";
  const distance = p.km !== undefined ? `, ${Math.round(p.km)} km away` : "";
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;

  document.getElementById("cardContent").innerHTML = `
    <span class="season">${season}</span>
    <h2>${p.name}</h2>
    <div class="where">${p.town}, ${COUNTRIES[p.country]}${distance}</div>
    <div class="featgrid">
      ${Object.keys(FEATURES).map(f => `
        <div class="${p.features.includes(f) ? "" : "no"}">
          <span class="icon"><svg><use href="#i-${f}"/></svg></span>${FEATURES[f]}
        </div>`).join("")}
    </div>
    <div class="actions">
      ${p.website ? `<a class="btn main" href="${p.website}" target="_blank" rel="noopener">Open website</a>` : ""}
      <a class="btn" href="${directions}" target="_blank" rel="noopener">Directions</a>
    </div>`;

  document.getElementById("card").hidden = false;
  // Move the map to the park. On the phone we move it a bit up, so the card does not cover it.
  const zoom = Math.max(map.getZoom(), 9);
  let target = L.latLng(p.lat, p.lng);
  if (isPhone) {
    target = map.unproject(map.project(target, zoom).add([0, window.innerHeight * 0.25]), zoom);
  }
  map.flyTo(target, zoom, { duration: 0.8 });
  render();
}

document.getElementById("close").onclick = () => {
  selected = null;
  document.getElementById("card").hidden = true;
  render();
};

// ---------- 7. Near me ----------
document.getElementById("near").onclick = () => {
  if (!navigator.geolocation) return alert("Your browser cannot share the location.");
  navigator.geolocation.getCurrentPosition(pos => {
    myPosition = [pos.coords.latitude, pos.coords.longitude];
    L.marker(myPosition, { icon: L.divIcon({ className: "", html: '<div class="me"></div>', iconSize: [18, 18] }) }).addTo(map);
    map.setView(myPosition, 8);
    render();
  }, () => alert("Location was not shared, so we cannot sort by distance."));
};

// Distance between two points on Earth in km (Haversine formula)
function distanceKm(a, b) {
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

// ---------- 8. Suggest a park ----------
document.getElementById("suggest").onclick = e => {
  if (SUGGEST_LINK) { e.target.href = SUGGEST_LINK; e.target.target = "_blank"; }
  else { e.preventDefault(); alert("The form is coming soon."); }
};
