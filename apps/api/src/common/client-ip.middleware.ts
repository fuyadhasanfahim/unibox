import { timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export const CLIENT_IP_HEADER = 'x-unibox-client-ip';
export const PROXY_SECRET_HEADER = 'x-unibox-proxy-secret';

function sameSecret(given: string | undefined, expected: Buffer): boolean {
  if (!given) return false;
  const buf = Buffer.from(given);
  return buf.length === expected.length && timingSafeEqual(buf, expected);
}

/**
 * The web proxy is the only caller that knows the real client IP. It sends it in
 * `x-unibox-client-ip` together with a shared secret. Without a valid secret the IP header
 * is dropped, so a client calling the API directly cannot pick its own rate-limit bucket.
 * Better Auth reads only this header (never the spoofable x-forwarded-for).
 */
export function clientIpMiddleware(secret: string) {
  const expected = Buffer.from(secret);
  return (req: Request, _res: Response, next: NextFunction) => {
    const given = req.headers[PROXY_SECRET_HEADER];
    if (!sameSecret(typeof given === 'string' ? given : undefined, expected)) {
      delete req.headers[CLIENT_IP_HEADER];
    }
    // The secret has done its job; keep it out of anything downstream (logs, handlers).
    delete req.headers[PROXY_SECRET_HEADER];
    next();
  };
}
