-- CreateTable
CREATE TABLE "RateLimit" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "lastRequest" BIGINT NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "requestId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RateLimit_key_key" ON "RateLimit"("key");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");

-- ---------------------------------------------------------------------------
-- Hand-written (reviewed): data migration, value constraints, append-only audit.
-- ---------------------------------------------------------------------------

-- Tenant roles are now owner | admin | manager | agent. Better Auth's default "member" becomes "agent".
UPDATE "Member" SET "role" = 'agent' WHERE "role" = 'member';
UPDATE "Invitation" SET "role" = 'agent' WHERE "role" = 'member' OR "role" IS NULL;

-- Reject impossible values at the database, not only in application code.
ALTER TABLE "Member" ADD CONSTRAINT "Member_role_check"
  CHECK ("role" IN ('owner', 'admin', 'manager', 'agent'));
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_role_check"
  CHECK ("role" IN ('owner', 'admin', 'manager', 'agent'));
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_status_check"
  CHECK ("status" IN ('pending', 'accepted', 'rejected', 'canceled'));
ALTER TABLE "User" ADD CONSTRAINT "User_role_check"
  CHECK ("role" IN ('user', 'super_admin'));
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_status_check"
  CHECK ("status" IN ('pending', 'active', 'suspended', 'closed'));

-- Audit rows can be inserted, never changed or removed (even by buggy app code).
CREATE FUNCTION audit_log_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog is append-only (% blocked)', TG_OP;
END;
$$;

CREATE TRIGGER "AuditLog_append_only"
  BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION audit_log_append_only();
