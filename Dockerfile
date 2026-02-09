# Stage 1: Build
FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./

# Use install instead of ci to allow npm to resolve native binaries for musl
RUN npm install --include=optional

COPY . .

RUN npm run prepare
RUN npm run build

# Stage 2: Run
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./

# Install only production deps
RUN npm install --omit=dev --include=optional

COPY --from=builder /app/build ./build

EXPOSE 3000

CMD ["npm", "run", "start"]