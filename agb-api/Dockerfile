# NestJS 11 needs Node 20+ (c-api's Dockerfile.server still used node:18).
FROM node:20-alpine AS build
WORKDIR /app
# mongodb-memory-server is a dev dependency; don't download mongod here.
ENV MONGOMS_DISABLE_POSTINSTALL=1
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:20-alpine
ENV NODE_ENV=production \
    APP_ENV=prod \
    SERVER_HOST=0.0.0.0 \
    SERVER_PORT=3004
WORKDIR /app
COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
RUN mkdir -p logs && chown node:node logs
USER node
EXPOSE 3004
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${SERVER_PORT}/api/health" > /dev/null || exit 1
CMD ["node", "dist/main"]
