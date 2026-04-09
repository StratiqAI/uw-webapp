/**
 * Forward-geocode a US address string to [lng, lat] via the Mapbox Geocoding API.
 */
export async function forwardGeocode(address, accessToken) {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?country=us&limit=1&access_token=${accessToken}`;
    const res = await fetch(url);
    if (!res.ok)
        return null;
    const data = await res.json();
    const feature = data.features?.[0];
    if (!feature)
        return null;
    return {
        center: feature.center,
        zoom: 16
    };
}
