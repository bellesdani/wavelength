FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_SITE_URL=http://localhost:3001
ARG VITE_SOCKET_URL=
ENV VITE_SITE_URL=$VITE_SITE_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL

RUN npm run build
RUN npm run build:server
RUN npm prune --omit=dev

FROM node:22-alpine AS runner

ENV NODE_ENV=production
ENV PORT=3001
WORKDIR /app

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/build ./build

EXPOSE 3001

CMD ["node", "build/index.js"]
