#!/bin/bash

echo "🚀 Setting up Stripe Development Environment"
echo "============================================"

# Check if Stripe CLI is installed
if ! command -v stripe &> /dev/null; then
    echo "❌ Stripe CLI not found. Please install it first:"
    echo ""
    echo "macOS: brew install stripe/stripe-cli/stripe"
    echo "Windows: choco install stripe-cli"
    echo "Linux: Download from https://github.com/stripe/stripe-cli/releases"
    echo ""
    exit 1
fi

echo "✅ Stripe CLI found"

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
pip install stripe>=7.0.0
echo "✅ Backend dependencies installed"

# Go back to root
cd ..

echo ""
echo "🎯 Next Steps:"
echo "=============="
echo "1. Login to Stripe CLI:"
echo "   stripe login"
echo ""
echo "2. Start your backend server:"
echo "   cd backend && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
echo ""
echo "3. In a new terminal, forward webhooks:"
echo "   stripe listen --forward-to localhost:8000/api/v1/stripe/webhooks/stripe"
echo ""
echo "4. Copy the webhook signing secret (whsec_...) and set it:"
echo "   export STRIPE_WEBHOOK_SECRET='whsec_your_secret_here'"
echo ""
echo "5. Start your frontend:"
echo "   cd frontend && npm start"
echo ""
echo "6. Test with Stripe test cards:"
echo "   Success: 4242 4242 4242 4242"
echo "   Decline: 4000 0000 0000 0002"
echo ""
echo "🎉 Your Stripe integration is ready for testing!"
