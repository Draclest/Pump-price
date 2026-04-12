/** Build a native maps directions URL for the given destination. */
export function routeUrl(lat: number, lon: number): string {
  if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
    return `maps://maps.apple.com/?daddr=${lat},${lon}&dirflg=d`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=driving`;
}

export function openRoute(lat: number, lon: number): void {
  window.open(routeUrl(lat, lon), '_blank');
}
