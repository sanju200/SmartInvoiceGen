#!/bin/sh

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Check if migrations directory exists and has files
if [ -d "/app/prisma/migrations" ] && [ "$(ls -A /app/prisma/migrations)" ]; then
  echo "Migrations found, running migrations..."
  npx prisma migrate deploy
else
  echo "No migrations found, pushing schema..."
  npx prisma db push
fi

# Seed the database
npx prisma db seed

# Start the application
npm run dev