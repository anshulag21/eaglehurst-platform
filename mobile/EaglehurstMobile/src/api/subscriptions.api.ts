/**
 * Subscriptions API
 * Subscription and payment endpoints
 */

import apiClient from './client';
import { ApiResponse } from '../types';

export const subscriptionsAPI = {
  /**
   * Get available subscription plans
   */
  getPlans: async (): Promise<ApiResponse<any>> => {
    return apiClient.get('/subscriptions/plans');
  },

  /**
   * Create Stripe checkout session
   */
  createCheckoutSession: async (request: {
    plan_id: string;
    billing_cycle: 'monthly' | 'yearly';
  }): Promise<
    ApiResponse<{
      checkout_url: string;
      session_id: string;
    }>
  > => {
    return apiClient.post('/stripe/create-checkout-session', request);
  },

  /**
   * Get Stripe config
   */
  getStripeConfig: async (): Promise<
    ApiResponse<{
      publishable_key: string;
    }>
  > => {
    return apiClient.get('/stripe/config');
  },

  /**
   * Cancel subscription
   */
  cancelSubscription: async (): Promise<ApiResponse<any>> => {
    return apiClient.post('/stripe/cancel-subscription');
  },
};

export default subscriptionsAPI;

