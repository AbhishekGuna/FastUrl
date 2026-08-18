FROM node:20-alpine AS build
WORKDIR /repo

COPY package.json package-lock.json ./
COPY tsconfig.base.json ./
COPY services/url-management-service/package.json services/url-management-service/package.json
RUN npm ci

COPY services/url-management-service services/url-management-service
RUN npm run build -w services/url-management-service

FROM node:20-alpine
WORKDIR /repo
ENV NODE_ENV=production

COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/package.json ./
COPY --from=build /repo/services/url-management-service ./services/url-management-service

EXPOSE 3000
CMD ["node", "services/url-management-service/dist/main.js"]
