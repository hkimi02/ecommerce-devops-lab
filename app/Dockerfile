FROM node:20-alpine

# PM2 process manager (required by the lab spec)
RUN npm install -g pm2

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --omit=dev

COPY server.js ./

EXPOSE 3000

# pm2-runtime keeps the container in the foreground and supervises the process
CMD ["pm2-runtime", "start", "server.js", "--name", "ecommerce-app"]
