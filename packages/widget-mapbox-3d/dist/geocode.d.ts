/**
 * Forward-geocode a US address string to [lng, lat] via the Mapbox Geocoding API.
 */
export declare function forwardGeocode(address: string, accessToken: string): Promise<{
    center: [number, number];
    zoom: number;
} | null>;
