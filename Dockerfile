FROM node:20-slim

WORKDIR /app

# OpenSSL required by Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy root and subproject package files so postinstall (install:all) can run
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/

RUN npm install

# Copy the rest of the repo and build (includes prisma generate via build:server)
COPY . .
RUN npm run build

EXPOSE 3000

# Run migrations then start the app; if DATABASE_URL is unreachable at build time
# migrations will run at container start instead
CMD ["sh", "-c", "cd server && npx prisma migrate deploy && cd .. && npm start"]
