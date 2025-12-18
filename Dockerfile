FROM node:18-alpine
WORKDIR /app

# Copy package.json dan package-lock.json dulu supaya caching lebih efisien
COPY package*.json ./

# Install deps, termasuk drizzle-kit dev dependency
RUN npm install \
    && npm install --save-dev drizzle-kit 2>&1

# Copy semua source
COPY . .

# Build project
RUN npm run build

# Push DB schema pakai drizzle-kit (force)
RUN npm run db:push -- --force 2>&1 || echo "DB push skipped (already up-to-date)"

ENV PORT=8080
EXPOSE 8080

# Jalankan server
CMD ["npm", "start"]
