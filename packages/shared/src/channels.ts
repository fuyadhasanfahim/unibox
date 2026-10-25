import { z } from "zod";

// Mirrors the CHECK constraints in the channels migration; change both together.
export const CHANNEL_TYPES = ["whatsapp", "messenger", "instagram"] as const;
export const channelTypeSchema = z.enum(CHANNEL_TYPES);
export type ChannelType = z.infer<typeof channelTypeSchema>;

export const CONNECTION_STATUSES = ["pending", "active", "needs_reauth", "disabled", "error"] as const;
export const connectionStatusSchema = z.enum(CONNECTION_STATUSES);
export type ConnectionStatus = z.infer<typeof connectionStatusSchema>;

export const MESSAGE_DIRECTIONS = ["inbound", "outbound"] as const;
export const MESSAGE_STATUSES = ["received", "queued", "sending", "sent", "delivered", "read", "failed"] as const;
export type MessageDirection = (typeof MESSAGE_DIRECTIONS)[number];
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];
