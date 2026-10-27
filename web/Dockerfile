# ---- Build stage: produce the static Vite bundle ----
FROM node:20-slim AS build
WORKDIR /app
# VITE_API_BASE is baked into the bundle at build time; pass it as a build-arg.
ARG VITE_API_BASE=http://localhost:3001
ENV VITE_API_BASE=$VITE_API_BASE
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Runtime stage: serve the static dist/ via nginx ----
FROM nginx:alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
