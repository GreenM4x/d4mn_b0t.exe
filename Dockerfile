# FROM node:16-alpine as build
# WORKDIR /GreenBot
# COPY ./package*.json ./
# RUN npm install
# COPY ./ ./
# RUN npm run build


FROM node:16-alpine
LABEL name="dank"
WORKDIR /GreenBot
COPY ./package*.json ./
RUN npm ci --production
COPY ./ ./
RUN npm install pm2 -g
CMD ["pm2-runtime", "src/index.js", "--node-args='--es-module-specifier-resolution=node'"]
