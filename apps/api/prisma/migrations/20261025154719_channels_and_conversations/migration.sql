-- CreateTable
CREATE TABLE "ChannelAccount" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "externalAccountId" TEXT NOT NULL,
    "displayName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "encryptedAccessToken" BYTEA,
    "tokenKeyVersion" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "grantedScopes" TEXT[],
    "metadata" JSONB,
    "connectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannelAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "displayName" TEXT,
    "email" TEXT,
    "phoneE164" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactIdentity" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "channelAccountId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "externalUserId" TEXT NOT NULL,
    "providerProfile" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "channelAccountId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "externalConversationId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "lastInboundAt" TIMESTAMP(3),
    "lastMessageAt" TIMESTAMP(3),
    "lastMessagePreview" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "channelAccountId" TEXT NOT NULL,
    "externalMessageId" TEXT,
    "direction" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "messageType" TEXT NOT NULL,
    "text" TEXT,
    "senderExternalId" TEXT,
    "sentByUserId" TEXT,
    "providerTimestamp" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "channelAccountId" TEXT,
    "externalEventKey" TEXT NOT NULL,
    "payloadDigest" TEXT NOT NULL,
    "payload" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "lastErrorCode" TEXT,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChannelAccount_tenantId_type_status_idx" ON "ChannelAccount"("tenantId", "type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelAccount_type_externalAccountId_key" ON "ChannelAccount"("type", "externalAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelAccount_tenantId_id_key" ON "ChannelAccount"("tenantId", "id");

-- CreateIndex
CREATE INDEX "Contact_tenantId_displayName_idx" ON "Contact"("tenantId", "displayName");

-- CreateIndex
CREATE INDEX "Contact_tenantId_email_idx" ON "Contact"("tenantId", "email");

-- CreateIndex
CREATE INDEX "Contact_tenantId_phoneE164_idx" ON "Contact"("tenantId", "phoneE164");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_tenantId_id_key" ON "Contact"("tenantId", "id");

-- CreateIndex
CREATE INDEX "ContactIdentity_tenantId_contactId_idx" ON "ContactIdentity"("tenantId", "contactId");

-- CreateIndex
CREATE UNIQUE INDEX "ContactIdentity_channelAccountId_externalUserId_key" ON "ContactIdentity"("channelAccountId", "externalUserId");

-- CreateIndex
CREATE INDEX "Conversation_tenantId_status_lastMessageAt_idx" ON "Conversation"("tenantId", "status", "lastMessageAt" DESC);

-- CreateIndex
CREATE INDEX "Conversation_tenantId_contactId_idx" ON "Conversation"("tenantId", "contactId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_channelAccountId_externalConversationId_key" ON "Conversation"("channelAccountId", "externalConversationId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_tenantId_id_key" ON "Conversation"("tenantId", "id");

-- CreateIndex
CREATE INDEX "Message_tenantId_conversationId_createdAt_idx" ON "Message"("tenantId", "conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_tenantId_status_createdAt_idx" ON "Message"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Message_channelAccountId_externalMessageId_key" ON "Message"("channelAccountId", "externalMessageId");

-- CreateIndex
CREATE INDEX "WebhookEvent_status_receivedAt_idx" ON "WebhookEvent"("status", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_provider_externalEventKey_key" ON "WebhookEvent"("provider", "externalEventKey");

-- CreateIndex
CREATE UNIQUE INDEX "OutboxEvent_dedupeKey_key" ON "OutboxEvent"("dedupeKey");

-- CreateIndex
CREATE INDEX "OutboxEvent_status_nextAttemptAt_idx" ON "OutboxEvent"("status", "nextAttemptAt");

-- AddForeignKey
ALTER TABLE "ChannelAccount" ADD CONSTRAINT "ChannelAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactIdentity" ADD CONSTRAINT "ContactIdentity_tenantId_channelAccountId_fkey" FOREIGN KEY ("tenantId", "channelAccountId") REFERENCES "ChannelAccount"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactIdentity" ADD CONSTRAINT "ContactIdentity_tenantId_contactId_fkey" FOREIGN KEY ("tenantId", "contactId") REFERENCES "Contact"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_tenantId_channelAccountId_fkey" FOREIGN KEY ("tenantId", "channelAccountId") REFERENCES "ChannelAccount"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_tenantId_contactId_fkey" FOREIGN KEY ("tenantId", "contactId") REFERENCES "Contact"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_tenantId_conversationId_fkey" FOREIGN KEY ("tenantId", "conversationId") REFERENCES "Conversation"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_tenantId_channelAccountId_fkey" FOREIGN KEY ("tenantId", "channelAccountId") REFERENCES "ChannelAccount"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_channelAccountId_fkey" FOREIGN KEY ("channelAccountId") REFERENCES "ChannelAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Allowed values (Prisma has no CHECK support; Zod validates the same lists in packages/shared).
ALTER TABLE "ChannelAccount"
  ADD CONSTRAINT "ChannelAccount_type_check" CHECK ("type" IN ('whatsapp', 'messenger', 'instagram')),
  ADD CONSTRAINT "ChannelAccount_status_check" CHECK ("status" IN ('pending', 'active', 'needs_reauth', 'disabled', 'error')),
  -- An active account must have a token to send with.
  ADD CONSTRAINT "ChannelAccount_active_has_token_check" CHECK ("status" <> 'active' OR "encryptedAccessToken" IS NOT NULL);

ALTER TABLE "Conversation"
  ADD CONSTRAINT "Conversation_status_check" CHECK ("status" IN ('open', 'closed')),
  ADD CONSTRAINT "Conversation_unreadCount_check" CHECK ("unreadCount" >= 0);

ALTER TABLE "Message"
  ADD CONSTRAINT "Message_direction_check" CHECK ("direction" IN ('inbound', 'outbound')),
  ADD CONSTRAINT "Message_status_check" CHECK ("status" IN ('received', 'queued', 'sending', 'sent', 'delivered', 'read', 'failed'));

ALTER TABLE "WebhookEvent"
  ADD CONSTRAINT "WebhookEvent_status_check" CHECK ("status" IN ('pending', 'processing', 'succeeded', 'failed', 'dead_letter'));

ALTER TABLE "OutboxEvent"
  ADD CONSTRAINT "OutboxEvent_status_check" CHECK ("status" IN ('pending', 'processing', 'succeeded', 'failed', 'dead_letter'));
