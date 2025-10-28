#!/bin/bash

echo "🚀 Setting up Astra Platform..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Copy environment files if they don't exist
if [ ! -f backend/.env ]; then
    echo "📝 Creating backend .env file..."
    cp backend/.env.example backend/.env
fi

if [ ! -f frontend/.env ]; then
    echo "📝 Creating frontend .env file..."
    cp frontend/.env.example frontend/.env
fi

# Start Docker services
echo "🐳 Starting Docker services..."
docker-compose up -d postgres redis

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install

# Generate Prisma client and run migrations
echo "🗄️  Setting up database..."
npm run prisma:generate
npm run prisma:migrate

# Go back to root
cd ..

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

echo "✅ Setup complete!"
echo ""
echo "To start the development environment:"
echo "  npm run backend    # Start backend on port 3001"
echo "  npm run frontend   # Start frontend on port 3000"
echo ""
echo "Or use Docker Compose:"
echo "  docker-compose up  # Start all services"
