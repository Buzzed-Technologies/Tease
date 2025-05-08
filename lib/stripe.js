import Stripe from 'stripe';
import supabase from './supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const SUBSCRIPTION_PRICE_ID = process.env.STRIPE_PRICE_ID;

/**
 * Create a Stripe customer for a user
 * @param {string} phone - User's phone number
 * @param {string} name - User's name
 * @param {string} email - User's email (optional)
 * @returns {Promise<{success: boolean, customerId?: string, error?: string}>}
 */
export async function createStripeCustomer(phone, name, email = null) {
  try {
    // First check if user already has a Stripe customer ID
    const { data: user } = await supabase
      .from('sex_mode')
      .select('stripe_customer_id')
      .eq('phone', phone)
      .single();

    if (user?.stripe_customer_id) {
      return { success: true, customerId: user.stripe_customer_id };
    }

    // Create new customer in Stripe
    const customer = await stripe.customers.create({
      name,
      phone,
      email,
      metadata: {
        phone
      }
    });

    // Update user record with Stripe customer ID
    const { error } = await supabase
      .from('sex_mode')
      .update({ stripe_customer_id: customer.id })
      .eq('phone', phone);

    if (error) throw error;

    return { success: true, customerId: customer.id };
  } catch (error) {
    console.error('Create Stripe customer error:', error);
    return { success: false, error: error.message || 'Failed to create Stripe customer' };
  }
}

/**
 * Create a checkout session for subscription
 * @param {string} phone - User's phone number
 * @param {string} successUrl - URL to redirect after successful payment
 * @param {string} cancelUrl - URL to redirect if user cancels
 * @returns {Promise<{success: boolean, sessionId?: string, url?: string, error?: string}>}
 */
export async function createCheckoutSession(phone, successUrl, cancelUrl) {
  try {
    // Get user info
    const { data: user } = await supabase
      .from('sex_mode')
      .select('name, stripe_customer_id')
      .eq('phone', phone)
      .single();

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Create or get Stripe customer
    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customerResult = await createStripeCustomer(phone, user.name);
      if (!customerResult.success) throw new Error(customerResult.error);
      customerId = customerResult.customerId;
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: SUBSCRIPTION_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        phone
      },
    });

    return { 
      success: true, 
      sessionId: session.id, 
      url: session.url 
    };
  } catch (error) {
    console.error('Create checkout session error:', error);
    return { success: false, error: error.message || 'Failed to create checkout session' };
  }
}

/**
 * Create a customer portal session for managing subscription
 * @param {string} phone - User's phone number
 * @param {string} returnUrl - URL to return to after managing subscription
 * @returns {Promise<{success: boolean, url?: string, error?: string}>}
 */
export async function createCustomerPortalSession(phone, returnUrl) {
  try {
    // Get user's Stripe customer ID
    const { data: user } = await supabase
      .from('sex_mode')
      .select('stripe_customer_id')
      .eq('phone', phone)
      .single();

    if (!user?.stripe_customer_id) {
      return { success: false, error: 'No subscription found' };
    }

    // Create customer portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: returnUrl,
    });

    return { success: true, url: session.url };
  } catch (error) {
    console.error('Create customer portal session error:', error);
    return { success: false, error: error.message || 'Failed to access subscription management' };
  }
}

/**
 * Update user subscription status in database
 * @param {string} subscriptionId - Stripe subscription ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateSubscriptionStatus(subscriptionId) {
  try {
    // Get subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    // Get customer ID from subscription
    const customerId = subscription.customer;
    
    // Get user with this customer ID
    const { data: users, error: userError } = await supabase
      .from('sex_mode')
      .select('phone')
      .eq('stripe_customer_id', customerId);
    
    if (userError || !users || users.length === 0) {
      console.error('User for subscription not found:', customerId);
      return { success: false, error: 'User not found' };
    }
    
    const phone = users[0].phone;
    
    // Update subscription info in database
    const { error } = await supabase
      .from('sex_mode')
      .update({
        is_subscribed: subscription.status === 'active',
        subscription_status: subscription.status,
        stripe_subscription_id: subscription.id,
        subscription_end_date: new Date(subscription.current_period_end * 1000),
      })
      .eq('phone', phone);
    
    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error('Update subscription status error:', error);
    return { success: false, error: error.message || 'Failed to update subscription status' };
  }
} 