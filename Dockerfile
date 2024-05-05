FROM node:20-alpine
LABEL name="greenbot"
WORKDIR /GreenBot
COPY ./package*.json ./
RUN npm ci --production
COPY ./ ./
RUN npm install pm2 -g
CMD ["pm2-runtime", "index.js", "--node-args='--es-module-specifier-resolution=node'"]
