import { UAParser } from "ua-parser-js";

export type ParsedUA = { device_type: string; os: string; browser: string };

export function parseUserAgent(ua: string): ParsedUA {
  const parser = new UAParser(ua);
  const result = parser.getResult();

  const deviceType = result.device.type ?? "desktop";
  const os = result.os.name ?? "Unknown";
  const browser = result.browser.name ?? "Unknown";

  return { device_type: deviceType, os, browser };
}
