/** Build a native maps directions URL for the given destination. */
export function routeUrl(address: string, lat: number, lon: number): string {
  // Use the text address so Google Maps routes to the correct building entrance
  // (coordinates alone can land on the wrong side of a railway, wall, etc.)
  const dest = encodeURIComponent(address);
  if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
    return `maps://maps.apple.com/?daddr=${dest}&dirflg=d`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;
}

export function openRoute(address: string, lat: number, lon: number): void {
  window.open(routeUrl(address, lat, lon), '_blank');
}
