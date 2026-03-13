FROM node:20-slim

WORKDIR /app

# OpenSSL required by Prisma (avoids "Prisma failed to detect the libssl/openssl version" warning)
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

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
