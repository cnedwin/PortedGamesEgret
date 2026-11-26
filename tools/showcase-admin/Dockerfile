FROM node:24-alpine
WORKDIR /app
RUN apk add --no-cache su-exec && mkdir -p /data
COPY --chown=node:node index.mjs server.mjs catalog.mjs webp.mjs github-auth.mjs github-publish.mjs ./
COPY --chown=node:node public ./public
ENV NODE_ENV=production SHOWCASE_ADMIN_MODE=github SHOWCASE_ADMIN_DATA=/data/state PORT=8080
EXPOSE 8080
CMD ["sh", "-c", "mkdir -p /data/state && chown node:node /data/state && chmod 700 /data/state && exec su-exec node:node node index.mjs"]
