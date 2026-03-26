const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "PrenotazioneTel/1.0 (booking system)";

export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Geocode an address using OpenStreetMap Nominatim.
 * Returns null if the address cannot be found or if the request fails.
 * countrycodes=it restricts results to Italy.
 */
export async function geocodeAddress(address: string): Promise<Coordinates | null> {
  if (!address || !address.trim()) return null;

  try {
    const params = new URLSearchParams({
      q: address,
      countrycodes: "it",
      format: "json",
      limit: "1",
      addressdetails: "0",
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${NOMINATIM_URL}?${params}`, {
      headers: { "User-Agent": USER_AGENT, "Accept-Language": "it" },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) return null;

    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!data.length) return null;

    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
    };
  } catch {
    return null;
  }
}
