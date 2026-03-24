import geoip from "geoip-lite";

export function resolveLocation(ip: string): { country: string; city: string } {
  const geo = geoip.lookup(ip);
  return {
    country: geo?.country ?? "Unknown",
    city: geo?.city ?? "Unknown",
  };
}
