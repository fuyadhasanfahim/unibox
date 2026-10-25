import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

// Tenant-owned models and the column that scopes them. Add every new tenant table here.
const TENANT_MODELS: Record<string, string> = {
  Member: 'organizationId',
  Invitation: 'organizationId',
};

const SCOPED_READS_AND_BULK_WRITES = new Set([
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
  'updateMany',
  'deleteMany',
]);
// Unique-key operations cannot take an extra tenant predicate, so they are refused on tenant
// models: use findFirst / updateMany / deleteMany, which are scoped automatically.
const UNSCOPABLE = new Set(['findUnique', 'findUniqueOrThrow', 'update', 'delete', 'upsert']);

export class CrossTenantWriteError extends Error {}

/**
 * Prisma client bound to one tenant. Every read and bulk write on a tenant model gets
 * `AND tenantColumn = tenantId`; every create is forced into the tenant. A missing `where`
 * can therefore never leak or touch another tenant's rows (cross-tenant IDOR, T-01).
 */
@Injectable()
export class TenantPrismaService {
  constructor(private readonly prisma: PrismaService) {}

  forTenant(tenantId: string) {
    if (!tenantId) throw new Error('forTenant() requires a tenant id');

    return this.prisma.$extends({
      name: 'tenant-scope',
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            const column = model ? TENANT_MODELS[model] : undefined;
            if (!column) return query(args);

            if (UNSCOPABLE.has(operation)) {
              throw new Error(`${model}.${operation} is not allowed on tenant models; use a scoped variant`);
            }

            const a = (args ?? {}) as Record<string, unknown>;
            if (SCOPED_READS_AND_BULK_WRITES.has(operation)) {
              a.where = a.where ? { AND: [a.where, { [column]: tenantId }] } : { [column]: tenantId };
              if (operation === 'updateMany') assertNoTenantChange(a.data, column, tenantId);
            } else if (operation === 'create') {
              a.data = forceTenant(a.data, column, tenantId);
            } else if (operation === 'createMany' || operation === 'createManyAndReturn') {
              const data = a.data;
              a.data = Array.isArray(data) ? data.map((d) => forceTenant(d, column, tenantId)) : forceTenant(data, column, tenantId);
            } else {
              throw new Error(`${model}.${operation} is not supported by the tenant-scoped client`);
            }
            return query(a as typeof args);
          },
        },
      },
    });
  }
}

export type TenantDb = ReturnType<TenantPrismaService['forTenant']>;

function forceTenant(data: unknown, column: string, tenantId: string) {
  const row = (data ?? {}) as Record<string, unknown>;
  if (row[column] !== undefined && row[column] !== tenantId) {
    throw new CrossTenantWriteError(`Refusing to write ${column}=${JSON.stringify(row[column])} from tenant ${tenantId}`);
  }
  return { ...row, [column]: tenantId };
}

function assertNoTenantChange(data: unknown, column: string, tenantId: string) {
  const value = (data as Record<string, unknown> | undefined)?.[column];
  if (value !== undefined && value !== tenantId) {
    throw new CrossTenantWriteError(`Refusing to move rows to ${column}=${JSON.stringify(value)}`);
  }
}
