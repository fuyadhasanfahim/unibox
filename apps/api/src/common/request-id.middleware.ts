import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';
const SAFE_ID = /^[A-Za-z0-9_-]{8,64}$/;

export type RequestWithId = Request & { id: string };

// Reuse a well-formed upstream id, otherwise mint one. Never trust arbitrary header content (log injection).
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const incoming = req.header(REQUEST_ID_HEADER);
  const id = incoming && SAFE_ID.test(incoming) ? incoming : randomUUID();
  (req as RequestWithId).id = id;
  res.setHeader(REQUEST_ID_HEADER, id);
  next();
}
