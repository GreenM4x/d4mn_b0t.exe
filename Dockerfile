# Build stage
FROM --platform=$BUILDPLATFORM node:20-alpine AS builder
WORKDIR /d4mn_bot.exe
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM --platform=$TARGETPLATFORM node:20-alpine
LABEL name="d4mn_bot.exe"
WORKDIR /d4mn_bot.exe
COPY package*.json ./
RUN npm ci --production
COPY --from=builder /d4mn_bot.exe/dist ./
COPY ./db ./db
RUN npm install pm2 -g
CMD ["pm2-runtime", "index.js"]