# SupportGenie - Complete Deployment Guide

## 🚀 Overview

SupportGenie is an AI-powered customer support platform that provides automated chat responses, knowledge base management, and analytics. This guide covers both local development and production deployment.

## 📋 Prerequisites

- **Docker & Docker Compose**: For containerized deployment
- **OpenAI API Key**: For AI functionality
- **Domain Name**: For production deployment (optional)
- **SSL Certificate**: For HTTPS (production)

## 🏗️ Project Structure

```
supportgenie/
├── backend/
│   ├── server.py          # FastAPI backend
│   ├── requirements.txt   # Python dependencies
│   ├── Dockerfile        # Backend container
│   └── .env              # Backend environment variables
├── frontend/
│   ├── src/
│   │   ├── App.js        # Main React application
│   │   └── components/   # UI components
│   ├── Dockerfile        # Frontend container
│   ├── package.json      # Node.js dependencies
│   └── .env              # Frontend environment variables
├── docker-compose.yml    # Multi-container orchestration
├── nginx.conf           # Reverse proxy configuration
├── setup.sh             # Automated setup script
└── README.md            # This file
```

## 🔧 Local Development Setup

### Step 1: Clone and Prepare Files

1. **Create your project directory:**
```bash
mkdir supportgenie
cd supportgenie
```

2. **Create the backend files:**
   - Copy the updated `server.py` to `backend/server.py`
   - Copy the updated `requirements.txt` to `backend/requirements.txt`
   - Create `backend/.env` with your configuration

3. **Create the frontend files:**
   - Copy the updated `App.js` to `frontend/src/App.js`
   - Copy your existing UI components to `frontend/src/components/`
   - Copy `package.json` to `frontend/package.json`
   - Create `frontend/.env` with your configuration

4. **Create Docker and configuration files:**
   - Copy all Docker and nginx configuration files

### Step 2: Environment Configuration

Create your environment files:

**Backend `.env`:**
```env
MONGO_URL="mongodb://admin:supportgenie123@mongodb:27017/supportgenie_database?authSource=admin"
DB_NAME="supportgenie_database"
CORS_ORIGINS="*"
OPENAI_API_KEY="your_openai_api_key_here"
```

**Frontend `.env`:**
```env
REACT_APP_BACKEND_URL=http://localhost:8000
```

**Root `.env` (for Docker Compose):**
```env
OPENAI_API_KEY=your_openai_api_key_here
```

### Step 3: Quick Start

```bash
# Make setup script executable
chmod +x setup.sh

# Run full setup
./setup.sh setup

# Or manually:
docker-compose up --build -d
```

### Step 4: Access Your Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Documentation:** http://localhost:8000/docs
- **MongoDB:** localhost:27017

## 🌍 Production Deployment

### Option 1: VPS/Cloud Server Deployment

1. **Server Setup:**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

2. **Deploy Application:**
```bash
# Clone your repository
git clone https://your-repo/supportgenie.git
cd supportgenie

# Set up environment variables
cp .env.example .env
nano .env  # Add your OpenAI API key

# Deploy
./setup.sh setup
```

3. **Configure Domain (Optional):**
```bash
# Update nginx.conf with your domain
sed -i 's/localhost/your-domain.com/g' nginx.conf

# Restart nginx
docker-compose restart nginx
```

### Option 2: Docker Swarm Deployment

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml supportgenie
```

### Option 3: Kubernetes Deployment

```yaml
# supportgenie-k8s.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: supportgenie-backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: supportgenie-backend
  template:
    metadata:
      labels:
        app: supportgenie-backend
    spec:
      containers:
      - name: backend
        image: your-registry/supportgenie-backend:latest
        ports:
        - containerPort: 8000
        env:
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: supportgenie-secrets
              key: openai-api-key
---
apiVersion: v1
kind: Service
metadata:
  name: supportgenie-backend-service
spec:
  selector:
    app: supportgenie-backend
  ports:
  - protocol: TCP
    port: 8000
    targetPort: 8000
  type: LoadBalancer
```

## 🔒 Security Configuration

### SSL/HTTPS Setup

1. **Get SSL Certificate (Let's Encrypt):**
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

2. **Update nginx configuration:**
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # Your existing location blocks...
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

### Environment Security

```bash
# Secure file permissions
chmod 600 .env backend/.env frontend/.env

# Use Docker secrets (production)
echo "your_openai_api_key" | docker secret create openai_api_key -
```

## 📊 Monitoring and Maintenance

### Health Monitoring

```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs -f

# Monitor resources
docker stats
```

### Backup Strategy

```bash
# Backup MongoDB
docker exec supportgenie-mongo mongodump --out /backup

# Backup configuration
tar -czf supportgenie-backup-$(date +%Y%m%d).tar.gz \
  docker-compose.yml nginx.conf backend/.env frontend/.env
```

### Updates

```bash
# Pull latest images
docker-compose pull

# Update with zero downtime
docker-compose up -d --no-deps backend
docker-compose up -d --no-deps frontend
```

## 🔧 Troubleshooting

### Common Issues

1. **MongoDB Connection Issues:**
```bash
# Check MongoDB logs
docker-compose logs mongodb

# Reset MongoDB
docker-compose down -v
docker-compose up -d mongodb
```

2. **OpenAI API Issues:**
```bash
# Test API key
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     https://api.openai.com/v1/models

# Check backend logs
docker-compose logs backend
```

3. **Port Conflicts:**
```bash
# Check what's using ports
sudo netstat -tulpn | grep :3000
sudo netstat -tulpn | grep :8000

# Stop conflicting services
sudo systemctl stop apache2  # if using port 80
```

### Performance Optimization

1. **Database Optimization:**
```javascript
// Create indexes for better performance
db.chat_messages.createIndex({ "session_id": 1, "timestamp": 1 })
db.knowledge_base.createIndex({ "filename": 1 })
```

2. **Application Scaling:**
```yaml
# In docker-compose.yml
services:
  backend:
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
```

## 🚨 Production Checklist

- [ ] Environment variables secured
- [ ] SSL certificate installed
- [ ] Database backups configured
- [ ] Monitoring setup
- [ ] Log rotation configured
- [ ] Firewall configured
- [ ] Domain DNS configured
- [ ] API rate limiting enabled
- [ ] Error tracking setup
- [ ] Performance monitoring active

## 🆘 Support

For issues and support:

1. Check the logs: `docker-compose logs`
2. Verify configuration files
3. Test individual services
4. Check network connectivity
5. Validate API keys and credentials

## 📝 Customization

### Branding
- Update `frontend/src/App.js` to change company branding
- Modify colors in CSS files
- Replace logo and favicon

### Features
- Add new AI models in `backend/server.py`
- Extend knowledge base formats
- Add new analytics metrics
- Implement user authentication

### Integrations
- WhatsApp Business API
- Slack Bot integration  
- Email support
- CRM connections

---

**SupportGenie v1.0** - AI-Powered Customer Support Platform
