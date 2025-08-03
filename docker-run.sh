#!/bin/bash

# Gamification Platform Docker Management Script

echo "🐳 Gamification Platform Docker Manager"
echo "======================================"

case "$1" in
  "start")
    echo "🚀 Starting all services..."
    docker-compose up -d
    echo "✅ Services started! Access at:"
    echo "   Frontend: http://localhost:3000"
    echo "   Backend:  http://localhost:8000"
    echo "   Database: localhost:5432"
    ;;
  "stop")
    echo "🛑 Stopping all services..."
    docker-compose down
    echo "✅ Services stopped!"
    ;;
  "restart")
    echo "🔄 Restarting all services..."
    docker-compose down
    docker-compose up -d
    echo "✅ Services restarted!"
    ;;
  "logs")
    echo "📋 Showing logs..."
    docker-compose logs -f
    ;;
  "build")
    echo "🔨 Building all services..."
    docker-compose build --no-cache
    echo "✅ Build completed!"
    ;;
  "clean")
    echo "🧹 Cleaning up Docker resources..."
    docker-compose down -v
    docker system prune -f
    echo "✅ Cleanup completed!"
    ;;
  "status")
    echo "📊 Service status:"
    docker-compose ps
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|logs|build|clean|status}"
    echo ""
    echo "Commands:"
    echo "  start   - Start all services"
    echo "  stop    - Stop all services"
    echo "  restart - Restart all services"
    echo "  logs    - Show service logs"
    echo "  build   - Build all services"
    echo "  clean   - Clean up Docker resources"
    echo "  status  - Show service status"
    ;;
esac 