import './style.css'
import * as geolib from 'geolib'

const appElem = document.querySelector('#app');
const baseUrl = import.meta.env.BASE_URL;

// Emit status messages.
function info(msg) {
    appElem.innerHTML = msg;
}

// Render coordinate string in a format suitable for a Google maps query string.
function coordStr(loc) {
    return `${loc.lat},${loc.lon}`;
}

// Enrich a pub location with the distance from the origin.
function addDistance(pub, origin) {
    const distance = geolib.getDistance(origin, pub.location);
    pub.distance = distance;
    return pub;
}

function renderPub(elem, pub, origin) {
    const newElem = document.createElement("div");
    const distanceStr = (pub.distance / 1000).toFixed(1);

    const mapUrl = new URL("https://www.google.com/maps/dir/")
    mapUrl.searchParams.append("api", 1);
    mapUrl.searchParams.append("origin", coordStr(origin));
    mapUrl.searchParams.append("destination", coordStr(pub.location));
    mapUrl.searchParams.append("travelmode", "walking");

    newElem.innerHTML = `
        <a href="${mapUrl}">${pub.name} (${distanceStr}km)</a>
    `;
    elem.appendChild(newElem);
}

function renderResponse(pubs, origin, maxDistance) {
    appElem.innerHTML = "";
    const enrichedPubs = pubs
        .map((p) => addDistance(p, origin))
        .sort((a, b) => a.distance - b.distance)
        .filter((p) => p.distance <= maxDistance);
    enrichedPubs.forEach((pub) => renderPub(appElem, pub, origin));
}

// Round coords down to the precision required for our partitioning scheme.
function toPartitionKey(position) {
    const lat = geolib.getLatitude(position);
    const lon = geolib.getLongitude(position);

    return {
        "lat": Math.floor(lat * 100) / 100,
        "lon": Math.floor(lon * 100) / 100,
    };
}

// Name of the parition used in our partitioning scheme.
function formatPartitionKey(key) {
    return `${key.lat.toFixed(2)}x${key.lon.toFixed(2)}`;
}

// Find a bounding box of 1000 meters around the origin.
// For each partition within the bounding box, find pubs by
// downloading a JSON file for that partition.
function findPubs(position) {
    const origin = {
        lat: position.coords.latitude,
        lon: position.coords.longitude
    };
    info(`Finding pubs near (${origin.lat}, ${origin.lon})`);

    const distance = 1000; // m
    const boundingBox = geolib.getBoundsOfDistance(origin, distance);

    const southWest = toPartitionKey(boundingBox[0]);
    const northEast = toPartitionKey(boundingBox[1]);

    const promises = [];
    for (let i = southWest["lat"]; i <= northEast["lat"]; i += 0.01) {
        for (let j = southWest["lon"]; j <= northEast["lon"]; j += 0.01) {
            const key = {lat: i, lon: j};
            const url = `${baseUrl}/partitions/${formatPartitionKey(key)}.json`;
            const promise = fetch(url)
                .then((response) => {
                    if (response.ok) {
                        return response;
                    } else {
                        throw Error("404");
                    }
                })
                .then((response) => response.json())
                .catch(error => console.log(error));
            promises.push(promise);
        }
    }

    Promise.all(promises)
        // Filter out failed requests.
        .then((promises) => promises.filter(Boolean))
        // Flatten and render reponse.
        .then((promises) => renderResponse(promises.flat(), origin, distance));
}

// Called when geolocation fails.
function renderError(error) {
    switch (error.code) {
        case GeolocationPositionError.PERMISSION_DENIED:
            info("Location permission denied");
            break;
        case GeolocationPositionError.POSITION_UNAVAILABLE:
            info("Unable to find location.");
            break;
        case GeolocationPositionError.TIMEOUT:
            info("Timed out when getting location");
            break;
        default:
            info(error.message);
            break;
    }
}

// Entry function that gets location and finds pubs.
function getLocation() {
    if (!navigator.geolocation) {
        info("Geolocation not supported.");
        return;
    }
    info("Getting location.");
    navigator.geolocation.getCurrentPosition(
        findPubs,
        renderError
    );
}

getLocation();
