interface AddressLike {
  street?: string | null;
  house_number?: string | null;
  postal_code?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export function buildMapsRouteUrl(addr: AddressLike | null | undefined): string | null {
  if (!addr) return null;
  if (addr.latitude != null && addr.longitude != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${addr.latitude},${addr.longitude}`;
  }
  const query = `${addr.street ?? ""} ${addr.house_number ?? ""}, ${addr.postal_code ?? ""} ${addr.city ?? ""}`.trim();
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
