# Build stage
FROM --platform=$BUILDPLATFORM node:20-alpine AS builder
WORKDIR /GreenBot
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM --platform=$TARGETPLATFORM node:20-alpine
LABEL name="greenbot"
WORKDIR /GreenBot
COPY package*.json ./
RUN npm ci --production
COPY --from=builder /GreenBot/dist ./dist
COPY ./db ./db
RUN npm install pm2 -g
CMD ["pm2-runtime", "dist/index.js"]