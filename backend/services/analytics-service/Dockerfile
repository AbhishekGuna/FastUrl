FROM node:20-alpine AS build
WORKDIR /repo

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
COPY tsconfig.base.json ./
COPY services/analytics-service/package.json services/analytics-service/package.json
RUN npm ci

COPY services/analytics-service services/analytics-service
RUN npm run build -w services/analytics-service

FROM node:20-alpine
WORKDIR /repo
ENV NODE_ENV=production

COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/package.json ./
COPY --from=build /repo/services/analytics-service ./services/analytics-service

EXPOSE 4001
CMD ["node", "services/analytics-service/dist/main.js"]
