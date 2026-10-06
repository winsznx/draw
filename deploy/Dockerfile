# DRAW API server. The web app is deployed separately to Cloudflare (web/)
# and proxies to this. The DAR comes from contracts/dist, so the image needs
# no Daml SDK.
FROM node:24-alpine
RUN apk add --no-cache unzip
WORKDIR /draw
COPY contracts/daml/daml.yaml contracts/daml/daml.yaml
COPY contracts/dist contracts/dist
COPY scripts scripts
COPY app/*.mjs app/
COPY docs docs
COPY claims.yaml ./
COPY evidence evidence
RUN mkdir -p app/state && chown -R node:node /draw
ENV NODE_ENV=production PORT=4173 DRAW_STATE_DIR=/draw/app/state
EXPOSE 4173
USER node
CMD ["node", "app/server.mjs"]
