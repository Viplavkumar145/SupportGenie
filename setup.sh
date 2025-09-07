#!/bin/bash

# SupportGenie Setup Script
echo "🤖 Setting up SupportGenie - AI Customer Support Platform"
echo "=========================================================="

# Check if required tools are installed
check_requirements() {
    echo "📋 Checking requirements..."
    
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker is not installed. Please install Docker first."
        echo "   Visit: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo "❌ Docker Compose is not installed. Please install Docker Compose first."
        echo "   Visit: https://docs.docker.com/compose/install/"
        exit 1
    fi
    
    echo "✅ Requirements check passed!"
}

# Create necessary directories and files
setup_directories() {
    echo "📁 Setting up project structure..."
    
    # Create backend directory structure
    mkdir -p backend
    
    # Create frontend directory structure  
    mkdir -p frontend/{src,public}
    
    # Create SSL directory for certificates
    mkdir -p ssl
    
    # Create MongoDB initialization script
    cat > mongo-init.js << 'EOF'
db = db.getSiblingDB('supportgenie_database');
db.createUser({
  user: 'supportgenie',
  pwd: 'supportgenie123',
  roles: [
    {
      role: 'readWrite',
      db: 'supportgenie_database'
    }
  ]
});
EOF
    
    echo "✅ Directory structure created!"
}

# Environment setup
setup_environment() {
    echo "🔧 Setting up environment variables..."
    
    # Check if OpenAI API key is provided
    if [ -z "$OPENAI_API_KEY" ]; then
        echo "⚠️  OpenAI API Key not found in environment variables."
        read -p "Please enter your OpenAI API Key: " OPENAI_API_KEY
        
        if [ -z "$OPENAI_API_KEY" ]; then
            echo "❌ OpenAI API Key is required. Exiting..."
            exit 1
        fi
    fi
    
    # Create .env file for Docker Compose
    cat > .env << EOF
OPENAI_API_KEY=$OPENAI_API_KEY
EOF
    
    # Create backend .env
    cat > backend/.env << EOF
MONGO_URL="mongodb://admin:supportgenie123@mongodb:27017/supportgenie_database?authSource=admin"
DB_NAME="supportgenie_database"
CORS_ORIGINS="*"
OPENAI_API_KEY="$OPENAI_API_KEY"
EOF
    
    # Create frontend .env
    cat > frontend/.env << EOF
REACT_APP_BACKEND_URL=http://localhost:8000
EOF
    
    echo "✅ Environment variables configured!"
}

# Build and start services
start_services() {
    echo "🚀 Building and starting services..."
    
    # Build and start with Docker Compose
    docker-compose up --build -d
    
    echo "⏳ Waiting for services to be ready..."
    sleep 10
    
    # Check if services are running
    if docker-compose ps | grep -q "Up"; then
        echo "✅ Services are running!"
        echo ""
        echo "🎉 SupportGenie is ready!"
        echo "📱 Frontend: http://localhost:3000"
        echo "🔌 Backend API: http://localhost:8000"
        echo "🗄️  MongoDB: localhost:27017"
        echo ""
        echo "📚 Next steps:"
        echo "1. Open http://localhost:3000 in your browser"
        echo "2. Upload knowledge base documents in the Knowledge tab"
        echo "3. Test your AI in the Chat tab"
        echo "4. Monitor performance in Analytics tab"
    else
        echo "❌ Some services failed to start. Check logs with:"
        echo "   docker-compose logs"
    fi
}

# Health check
health_check() {
    echo "🔍 Running health check..."
    
    # Check backend health
    if curl -f -s http://localhost:8000/api/health > /dev/null; then
        echo "✅ Backend is healthy"
    else
        echo "⚠️  Backend health check failed"
    fi
    
    # Check frontend
    if curl -f -s http://localhost:3000 > /dev/null; then
        echo "✅ Frontend is accessible"
    else
        echo "⚠️  Frontend is not accessible"
    fi
}

# Stop services
stop_services() {
    echo "🛑 Stopping SupportGenie services..."
    docker-compose down
    echo "✅ Services stopped!"
}

# Show logs
show_logs() {
    echo "📋 Showing service logs..."
    docker-compose logs -f
}

# Main menu
main_menu() {
    echo ""
    echo "🤖 SupportGenie Management"
    echo "========================="
    echo "1. Full Setup (First time)"
    echo "2. Start Services"
    echo "3. Stop Services"
    echo "4. Restart Services"
    echo "5. Show Logs"
    echo "6. Health Check"
    echo "7. Clean Installation"
    echo "8. Exit"
    echo ""
    read -p "Choose an option (1-8): " choice
    
    case $choice in
        1)
            check_requirements
            setup_directories
            setup_environment
            start_services
            health_check
            ;;
        2)
            docker-compose up -d
            echo "✅ Services started!"
            ;;
        3)
            stop_services
            ;;
        4)
            docker-compose restart
            echo "✅ Services restarted!"
            ;;
        5)
            show_logs
            ;;
        6)
            health_check
            ;;
        7)
            echo "🧹 Cleaning installation..."
            docker-compose down -v --remove-orphans
            docker system prune -f
            echo "✅ Clean completed!"
            ;;
        8)
            echo "👋 Goodbye!"
            exit 0
            ;;
        *)
            echo "❌ Invalid option. Please choose 1-8."
            main_menu
            ;;
    esac
}

# Run main menu if no arguments provided
if [ $# -eq 0 ]; then
    main_menu
else
    case $1 in
        setup)
            check_requirements
            setup_directories
            setup_environment
            start_services
            health_check
            ;;
        start)
            docker-compose up -d
            ;;
        stop)
            stop_services
            ;;
        logs)
            show_logs
            ;;
        health)
            health_check
            ;;
        clean)
            docker-compose down -v --remove-orphans
            docker system prune -f
            ;;
        *)
            echo "Usage: $0 [setup|start|stop|logs|health|clean]"
            exit 1
            ;;
    esac
fi
