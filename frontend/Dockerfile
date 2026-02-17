# Build stage
FROM node:18-alpine as build

WORKDIR /app

# Install dependencies with legacy-peer-deps to avoid the MUI conflict we saw earlier
COPY frontend/package*.json ./
RUN npm install --legacy-peer-deps

# Copy frontend source
COPY frontend/ .

# Build-time environment variables
ARG VITE_API_BASE_URL
ARG VITE_BACKEND_BASE_URL
ARG VITE_WS_BASE_URL
ARG VITE_FRONTEND_URL

# Validate that critical environment variables are set
# In production, these MUST be provided as build args
RUN echo "🔍 Checking environment variables..." && \
    echo "VITE_BACKEND_BASE_URL = ${VITE_BACKEND_BASE_URL}" && \
    echo "VITE_API_BASE_URL = ${VITE_API_BASE_URL}" && \
    echo "VITE_WS_BASE_URL = ${VITE_WS_BASE_URL}" && \
    echo "VITE_FRONTEND_URL = ${VITE_FRONTEND_URL}" && \
    if [ -z "$VITE_BACKEND_BASE_URL" ]; then \
    echo "⚠️  WARNING: VITE_BACKEND_BASE_URL not set. Will use runtime fallback."; \
    fi

# Create .env file for Vite to pick up during build
# Clean up any existing env files first
RUN rm -f .env* && \
    echo "Creating .env.production file..." && \
    echo "VITE_API_BASE_URL=${VITE_API_BASE_URL}" > .env.production && \
    echo "VITE_BACKEND_BASE_URL=${VITE_BACKEND_BASE_URL}" >> .env.production && \
    echo "VITE_WS_BASE_URL=${VITE_WS_BASE_URL}" >> .env.production && \
    echo "VITE_FRONTEND_URL=${VITE_FRONTEND_URL}" >> .env.production && \
    echo "NODE_ENV=production" >> .env.production && \
    echo "📄 Contents of .env.production:" && \
    cat .env.production

# Set environment variables for the build process
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_BACKEND_BASE_URL=$VITE_BACKEND_BASE_URL
ENV VITE_WS_BASE_URL=$VITE_WS_BASE_URL
ENV VITE_FRONTEND_URL=$VITE_FRONTEND_URL
ENV NODE_ENV=production

# Run vite build
RUN echo "🏗️  Building frontend..." && \
    npx vite build --mode production && \
    echo "✅ Build complete!"

# Production stage
FROM nginx:stable-alpine

# Copy build artifacts from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx config
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
