# Stripe Webhook Setup Guide

This guide explains how to set up Stripe webhooks for both development and production environments.

## 🔧 Configuration Overview

### Environment-Based URLs
- **Development**: `http://localhost:8000/api/v1/stripe/webhooks/stripe`
- **Production**: `https://your-domain.com/api/v1/stripe/webhooks/stripe`

### Required Environment Variables
```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_... (or sk_live_... for production)
STRIPE_PUBLISHABLE_KEY=pk_test_... (or pk_live_... for production)
STRIPE_WEBHOOK_SECRET=whsec_... (obtained after creating webhook)

# Optional: Override webhook URL
STRIPE_WEBHOOK_URL=https://your-domain.com/api/v1/stripe/webhooks/stripe
```

## ⚠️ Important: Localhost Limitation

**Stripe webhooks CANNOT reach localhost URLs from the internet!**

- ✅ **Production**: Webhooks work with public IPs/domains (e.g., `http://37.220.31.46:8000`)
- ❌ **Development**: Webhooks cannot reach `http://localhost:8000`

### Development Solutions:
1. **Manual webhook trigger** - Use the "Activate Subscription" button on success page
2. **Stripe CLI forwarding** - Forward webhooks to localhost
3. **ngrok tunneling** - Create public tunnel to localhost

## 🚀 Setup Methods

### Method 1: Automated Setup Script

Run the webhook setup utility:

```bash
cd backend
python setup_stripe_webhooks.py
```

This script will:
- Show current webhook configuration
- List existing webhooks
- Create new webhook endpoints
- Provide the webhook secret for your environment

### Method 2: Manual Setup via Stripe Dashboard

1. **Go to Stripe Dashboard**
   - Visit [https://dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)
   - Click "Add endpoint"

2. **Configure Endpoint**
   - **Endpoint URL**: 
     - Dev: `http://localhost:8000/api/v1/stripe/webhooks/stripe`
     - Prod: `https://your-domain.com/api/v1/stripe/webhooks/stripe`
   - **Description**: `Eaglehurst Platform Webhook`

3. **Select Events**
   Add these events:
   ```
   customer.subscription.created
   customer.subscription.updated
   customer.subscription.deleted
   invoice.payment_succeeded
   invoice.payment_failed
   checkout.session.completed
   ```

4. **Get Webhook Secret**
   - After creating, click on the webhook
   - Copy the "Signing secret" (starts with `whsec_`)
   - Add to your environment variables

### Method 3: Development Solutions

#### Option A: Manual Webhook Trigger (Recommended for Development)
After successful payment, use the **"Activate Subscription"** button on the success page:
- Manually processes the Stripe session
- Updates subscription status in database
- No webhook URL needed

#### Option B: Stripe CLI (Development Only)
```bash
# Install Stripe CLI
# https://stripe.com/docs/stripe-cli

# Login to your Stripe account
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:8000/api/v1/stripe/webhooks/stripe

# The CLI will show you the webhook secret to use
```

#### Option C: ngrok Tunnel (Alternative)
```bash
# Install ngrok: https://ngrok.com/
# Create tunnel to localhost
ngrok http 8000

# Use the ngrok URL for webhook (e.g., https://abc123.ngrok.io/api/v1/stripe/webhooks/stripe)
```

## 🔑 Environment Configuration

### Development (.env)
```bash
# Backend URL
API_URL=http://localhost:8000

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_51SNayKFzSZuyQKLY8UzIHbMNcTf3ZgpaJkpDt4LnDmGzS2EkRXBfe0SJajHbRY0KexddS9LzCCheUCCyZlRkfYsx00xY6bFt7c
STRIPE_PUBLISHABLE_KEY=pk_test_51SNayKFzSZuyQKLYsDI32LWsXIjqe2vGmkkjSZw8gVXW2nIT1yPf168iWeS4Sb42VUaCLjNEytOuvvKPPulq2Gf400DIyDFmZF
STRIPE_WEBHOOK_SECRET=whsec_your_development_webhook_secret

# Optional: Override URLs
STRIPE_WEBHOOK_URL=http://localhost:8000/api/v1/stripe/webhooks/stripe
```

### Production (.env)
```bash
# Backend URL (your production IP/domain)
API_URL=http://37.220.31.46:8000

# Stripe Configuration (use live keys for production)
STRIPE_SECRET_KEY=sk_test_51SNayKFzSZuyQKLY8UzIHbMNcTf3ZgpaJkpDt4LnDmGzS2EkRXBfe0SJajHbRY0KexddS9LzCCheUCCyZlRkfYsx00xY6bFt7c
STRIPE_PUBLISHABLE_KEY=pk_test_51SNayKFzSZuyQKLYsDI32LWsXIjqe2vGmkkjSZw8gVXW2nIT1yPf168iWeS4Sb42VUaCLjNEytOuvvKPPulq2Gf400DIyDFmZF
STRIPE_WEBHOOK_SECRET=whsec_your_production_webhook_secret

# Production webhook URL (your server IP)
STRIPE_WEBHOOK_URL=http://37.220.31.46:8000/api/v1/stripe/webhooks/stripe

# Frontend URL (your production frontend)
FRONTEND_URL=http://37.220.31.46:3000
```

## 🧪 Testing Webhooks

### 1. Test Webhook Endpoint
```bash
# Test if your webhook endpoint is accessible
curl -X POST http://localhost:8000/api/v1/stripe/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"type": "test"}'
```

### 2. Test with Stripe CLI
```bash
# Send test events
stripe trigger customer.subscription.created
stripe trigger invoice.payment_succeeded
```

### 3. Monitor Webhook Logs
Check your backend logs for webhook processing:
```bash
# In your backend directory
tail -f logs/app.log
```

## 🔍 Troubleshooting

### Common Issues

1. **Webhook URL not accessible**
   - Ensure your backend server is running
   - Check firewall settings for production
   - Verify the URL is publicly accessible

2. **Signature verification failed**
   - Check `STRIPE_WEBHOOK_SECRET` is correct
   - Ensure the secret matches the webhook endpoint

3. **Events not being processed**
   - Check webhook endpoint is configured with correct events
   - Verify webhook is enabled in Stripe dashboard
   - Check backend logs for errors

### Debug Commands

```bash
# Check current webhook configuration
python -c "from app.core.stripe_config import WEBHOOK_ENDPOINT; print(f'Webhook URL: {WEBHOOK_ENDPOINT}')"

# List all webhooks
python setup_stripe_webhooks.py

# Test webhook endpoint
curl -X GET http://localhost:8000/api/v1/stripe/webhooks/stripe
```

## 📋 Webhook Events Handled

Our webhook endpoint handles these events:

| Event | Description | Action |
|-------|-------------|--------|
| `customer.subscription.created` | New subscription created | Create user subscription record |
| `customer.subscription.updated` | Subscription modified | Update subscription status/details |
| `customer.subscription.deleted` | Subscription cancelled | Mark subscription as cancelled |
| `invoice.payment_succeeded` | Payment successful | Update payment status |
| `invoice.payment_failed` | Payment failed | Handle failed payment |
| `checkout.session.completed` | Checkout completed | Process successful checkout |

## 🔄 Webhook Flow

1. **User completes checkout** → Stripe processes payment
2. **Stripe sends webhook** → POST to your webhook endpoint
3. **Backend processes event** → Updates subscription status
4. **Frontend refreshes** → User sees updated status
5. **Banner disappears** → Subscription banner hides

## 🚀 Production Deployment

When deploying to production:

1. **Update environment variables** with production values
2. **Create production webhook** in Stripe dashboard
3. **Test webhook endpoint** is publicly accessible
4. **Monitor webhook logs** for any issues
5. **Update DNS/SSL** if needed for webhook URL

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review backend logs for webhook processing errors
3. Verify Stripe dashboard shows successful webhook deliveries
4. Test webhook endpoint accessibility
