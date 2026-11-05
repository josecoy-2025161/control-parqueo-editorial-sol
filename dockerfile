# ---------- Build ----------
FROM node:24-slim AS build
RUN corepack enable
WORKDIR /app

COPY frontend/package.json frontend/pnpm-lock.yaml frontend/pnpm-workspace.yaml frontend/
RUN cd frontend && pnpm install --frozen-lockfile

COPY backend/package.json backend/pnpm-lock.yaml backend/pnpm-workspace.yaml backend/
RUN cd backend && pnpm install --frozen-lockfile

COPY frontend frontend
COPY backend backend
RUN cd frontend && pnpm build \
 && cd ../backend && pnpm build && pnpm prune --prod

# ---------- Runtime ----------
FROM node:24-slim
ENV NODE_ENV=production TZ=America/Guatemala
WORKDIR /app
COPY --from=build /app/backend/package.json backend/
COPY --from=build /app/backend/node_modules backend/node_modules
COPY --from=build /app/backend/dist backend/dist
COPY --from=build /app/frontend/dist/frontend/browser public
WORKDIR /app/backend
CMD ["node", "dist/index.js"]