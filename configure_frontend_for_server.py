#!/usr/bin/env python3
"""
Configure Frontend for Remote Server

This script creates the frontend configuration for the remote server.
"""

import os

def create_frontend_env():
    """Create frontend .env file for the server"""
    frontend_env_content = '''# Frontend Environment Configuration for Remote Server
# Server IP: 37.220.31.46

# Backend API URL
VITE_API_URL=http://37.220.31.46:8000

# Application Info
VITE_APP_NAME=Eaglehurst Platform
VITE_APP_VERSION=1.0.0

# Environment
VITE_NODE_ENV=production
'''
    
    try:
        frontend_dir = "/Users/adityabajpai/Documents/eaglehurst/eaglehurst-project/frontend"
        env_file = os.path.join(frontend_dir, ".env.server")
        
        with open(env_file, 'w') as f:
            f.write(frontend_env_content)
        
        print(f"✅ Created frontend .env.server file")
        print(f"📍 Location: {env_file}")
        
        return True
        
    except Exception as e:
        print(f"❌ Failed to create frontend .env.server: {e}")
        return False

def create_frontend_start_script():
    """Create frontend start script"""
    script_content = '''#!/bin/bash
# Frontend Start Script for Remote Server 37.220.31.46

echo "🚀 Starting Eaglehurst Frontend on 37.220.31.46:5173"

# Copy server environment file
cp .env.server .env

# Install dependencies
npm install

# Start the frontend server
echo "✅ Starting frontend server..."
npm run dev -- --host 0.0.0.0 --port 5173

echo "🎉 Frontend running at http://37.220.31.46:5173"
'''
    
    try:
        frontend_dir = "/Users/adityabajpai/Documents/eaglehurst/eaglehurst-project/frontend"
        script_file = os.path.join(frontend_dir, "start_frontend_server.sh")
        
        with open(script_file, 'w') as f:
            f.write(script_content)
        
        os.chmod(script_file, 0o755)  # Make executable
        
        print(f"✅ Created frontend start script")
        print(f"📍 Location: {script_file}")
        
        return True
        
    except Exception as e:
        print(f"❌ Failed to create frontend start script: {e}")
        return False

def main():
    print("🔧 Configuring Frontend for Remote Server 37.220.31.46")
    print("="*60)
    
    success = True
    
    if not create_frontend_env():
        success = False
    
    if not create_frontend_start_script():
        success = False
    
    if success:
        print("\n🎉 Frontend Configuration Complete!")
        print("="*60)
        print("✅ Frontend configured for server 37.220.31.46")
        print("✅ API endpoint set to http://37.220.31.46:8000")
        print("✅ Start script created")
        print("\n📋 Files created:")
        print("  - frontend/.env.server")
        print("  - frontend/start_frontend_server.sh")
        print("\n🚀 On your server, run:")
        print("  cd frontend && ./start_frontend_server.sh")
    else:
        print("\n❌ Configuration failed!")
    
    return success

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
