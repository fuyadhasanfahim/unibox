# Built from the repo root: docker build -f apps/app/Dockerfile .
FROM node:24-slim
RUN npm i -g pnpm@11.25.0
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile --filter @repo/app...
# Inlined / baked in at build time: the public URL and the API rewrite target.
ARG API_URL
ARG NEXT_PUBLIC_APP_URL
ENV API_URL=$API_URL NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
RUN pnpm --filter @repo/shared build \
  && INTERNAL_PROXY_SECRET=build-only-placeholder-never-used-at-runtime pnpm --filter @repo/app exec next build
ENV NODE_ENV=production
CMD ["sh", "-c", "pnpm --filter @repo/app exec next start -H 0.0.0.0 -p ${PORT:-3000}"]
