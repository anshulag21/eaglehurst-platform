import { ApiResponse } from '../types';
import { API_BASE_URL, TOKEN_STORAGE_KEY } from '../constants';

export interface CreateCheckoutSessionRequest {
  plan_id: string;
  billing_cycle: 'monthly' | 'yearly';
}

export interface CheckoutSessionResponse {
  checkout_url: string;
  session_id: string;
  plan_name: string;
  billing_cycle: string;
}

export interface StripeConfig {
  publishable_key: string;
}

class StripeService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  async createCheckoutSession(
    request: CreateCheckoutSessionRequest
  ): Promise<ApiResponse<CheckoutSessionResponse>> {
    try {
      const response = await fetch(`${API_BASE_URL}/stripe/create-checkout-session`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: response.status.toString(),
            message: data.detail || 'Failed to create checkout session',
          },
        };
      }

      return {
        success: true,
        data: data.data,
      };
    } catch (error) {
      console.error('Error creating checkout session:', error);
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Network error occurred',
        },
      };
    }
  }

  async getStripeConfig(): Promise<ApiResponse<StripeConfig>> {
    try {
      const response = await fetch(`${API_BASE_URL}/stripe/config`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: response.status.toString(),
            message: data.detail || 'Failed to get Stripe config',
          },
        };
      }

      return {
        success: true,
        data: data.data,
      };
    } catch (error) {
      console.error('Error getting Stripe config:', error);
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Network error occurred',
        },
      };
    }
  }

  async cancelSubscription(): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${API_BASE_URL}/stripe/cancel-subscription`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: response.status.toString(),
            message: data.detail || 'Failed to cancel subscription',
          },
        };
      }

      return {
        success: true,
        data: data.data,
      };
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Network error occurred',
        },
      };
    }
  }

  // Redirect to Stripe Checkout
  redirectToCheckout(checkoutUrl: string): void {
    window.location.href = checkoutUrl;
  }
}

export const stripeService = new StripeService();
