import { defineConfig } from 'prisma/config';

// Prisma CLI does not read .env itself. Load the repo-root file shared with docker-compose.
try {
  process.loadEnvFile(new URL('../../.env', import.meta.url));
} catch {
  // No file: rely on real environment variables (CI/prod).
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: process.env.DATABASE_URL ?? '' },
});
