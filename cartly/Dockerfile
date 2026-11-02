# Stage 1: build the React app
FROM node:22-alpine AS client
WORKDIR /client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
ENV VITE_API_URL=
RUN npm run build

# Stage 2: API + built React app in one image
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/ ./
COPY --from=client /client/dist /app/client/dist
RUN mkdir -p uploads && chown -R node:node /app/server/uploads
USER node
EXPOSE 4000
CMD ["node", "src/index.js"]
