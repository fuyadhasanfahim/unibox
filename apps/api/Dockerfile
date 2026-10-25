# Built from the repo root: docker build -f apps/api/Dockerfile .
FROM node:24-slim
RUN npm i -g pnpm@11.25.0
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile --filter @repo/api...
RUN pnpm --filter @repo/shared build && pnpm --filter @repo/api build
ENV NODE_ENV=production
CMD ["node", "apps/api/dist/main.js"]
