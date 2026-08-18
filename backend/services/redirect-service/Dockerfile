FROM node:20-alpine AS build
WORKDIR /repo

COPY package.json package-lock.json ./
COPY tsconfig.base.json ./
COPY services/redirect-service/package.json services/redirect-service/package.json
RUN npm ci

COPY services/redirect-service services/redirect-service
RUN npm run build -w services/redirect-service

FROM node:20-alpine
WORKDIR /repo
ENV NODE_ENV=production

COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/package.json ./
COPY --from=build /repo/services/redirect-service ./services/redirect-service

EXPOSE 4000
CMD ["node", "services/redirect-service/dist/main.js"]
