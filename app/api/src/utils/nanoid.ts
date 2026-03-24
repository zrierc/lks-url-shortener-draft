import { nanoid } from "nanoid";

/**
 * Generates a 6-character short code using nanoid.
 * Characters: URL-safe alphabet (A-Za-z0-9_-)
 */
export function generateCode(): string {
  return nanoid(6);
}
