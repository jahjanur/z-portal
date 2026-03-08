FROM node:20-alpine

WORKDIR /app

# Copy root and subproject package files so postinstall (install:all) can run
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/

RUN npm install

# Copy the rest of the repo and build
COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
