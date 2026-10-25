import { z } from "zod";

// Shared auth contract: the API validates with these, the web forms validate with the same rules.

export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 128;

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters`)
  .max(PASSWORD_MAX, `Use at most ${PASSWORD_MAX} characters`);

export const emailSchema = z.email("Enter a valid email address").max(254).transform((v) => v.trim().toLowerCase());

export const nameSchema = z.string().trim().min(1, "Enter your name").max(80, "Keep it under 80 characters");

// High-entropy token from the invite email (base64url). Bounded so junk input is rejected early.
export const invitationTokenSchema = z
  .string()
  .min(32, "Invalid invitation link")
  .max(128, "Invalid invitation link")
  .regex(/^[A-Za-z0-9_-]+$/, "Invalid invitation link");

export const signInSchema = z.strictObject({
  email: emailSchema,
  password: z.string().min(1, "Enter your password").max(PASSWORD_MAX),
});

export const acceptInvitationSchema = z.strictObject({
  token: invitationTokenSchema,
  name: nameSchema,
  password: passwordSchema,
});

export const invitationLookupQuerySchema = z.strictObject({
  token: invitationTokenSchema,
});

export const invitationPreviewSchema = z.object({
  email: z.string(),
  organizationName: z.string(),
  role: z.string(),
  inviterName: z.string(),
  expiresAt: z.string(),
});

export const forgotPasswordSchema = z.strictObject({ email: emailSchema });

export const resetPasswordSchema = z.strictObject({
  token: z.string().min(1, "This reset link is invalid"),
  password: passwordSchema,
});

export type SignInInput = z.infer<typeof signInSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
export type InvitationPreview = z.infer<typeof invitationPreviewSchema>;
