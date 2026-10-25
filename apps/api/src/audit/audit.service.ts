import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

export type AuditEntry = {
  tenantId?: string | null;
  actorUserId: string;
  action: string; // e.g. "member.role_changed"
  resourceType: string; // e.g. "member"
  resourceId?: string;
  requestId?: string;
  // Safe, non-secret facts only: ids, roles, statuses. Never tokens, passwords or message text.
  metadata?: Prisma.InputJsonValue;
};

// Any client that can insert an audit row: the base client, a transaction, or a tenant-scoped tx.
type AuditWriter = { auditLog: { create(args: { data: Prisma.AuditLogUncheckedCreateInput }): PromiseLike<unknown> } };

// Append-only (a DB trigger rejects UPDATE/DELETE). Pass the transaction client so the audit row
// commits or rolls back together with the change it describes.
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditEntry, db: AuditWriter = this.prisma): Promise<void> {
    await db.auditLog.create({
      data: {
        id: randomUUID(),
        tenantId: entry.tenantId ?? null,
        actorUserId: entry.actorUserId,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId ?? null,
        requestId: entry.requestId ?? null,
        metadata: entry.metadata,
      },
    });
  }
}
