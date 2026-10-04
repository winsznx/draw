# DRAW app server: the Node API plus the built React app on one port.
# The DAR comes from contracts/dist, so the image needs no Daml SDK.
FROM node:24-alpine AS web
WORKDIR /src/app/web
COPY app/web/package.json app/web/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY app/web/ ./
RUN npm run build

FROM node:24-alpine
RUN apk add --no-cache unzip
WORKDIR /draw
COPY contracts/daml/daml.yaml contracts/daml/daml.yaml
COPY contracts/dist contracts/dist
COPY scripts scripts
COPY app/server.mjs app/relay.mjs app/
COPY --from=web /src/app/web/dist app/web/dist
COPY docs docs
COPY claims.yaml ./
COPY evidence evidence
RUN mkdir -p app/state && chown -R node:node /draw
ENV NODE_ENV=production PORT=4173 DRAW_STATE_DIR=/draw/app/state
EXPOSE 4173
USER node
CMD ["node", "app/server.mjs"]
