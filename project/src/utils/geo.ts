interface NominatimResult {
  address?: {
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    country?: string;
    country_code?: string;
  };
  error?: string;
}

const geoCache = new Map<string, { city: string | null; country: string | null }>();

export async function getCityCountryFromCoords(lat: number, lon: number): Promise<{ city: string | null; country: string | null }> {
  const cacheKey = `${lat.toFixed(5)},${lon.toFixed(5)}`;
  if (geoCache.has(cacheKey)) {
    return geoCache.get(cacheKey)!;
  }

  await new Promise(resolve => setTimeout(resolve, 500));

  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=pt-BR,en`);
    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.statusText}`);
    }
    const data: NominatimResult = await response.json();

    if (data.error) {
      console.warn("Nominatim reverse geocode error:", data.error);
      return { city: null, country: null };
    }

    const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || null;
    const country = data.address?.country || null;

    const result = { city, country };
    geoCache.set(cacheKey, result);
    return result;

  } catch (error) {
    console.error("Failed to fetch from Nominatim:", error);
    return { city: null, country: null };
  }
}
