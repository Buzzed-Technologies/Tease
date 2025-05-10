const express = require('express');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = 'https://kigcecwfxlonrdxjwsza.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize middleware
// Parse JSON for all routes EXCEPT the webhook
app.use((req, res, next) => {
  if (req.originalUrl === '/api/webhook') {
    next();
  } else {
    bodyParser.json()(req, res, next);
  }
});

// Special middleware for the Stripe webhook
app.post('/api/webhook', 
  express.raw({type: 'application/json'}), 
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          const session = event.data.object;
          await handleSuccessfulCheckout(session);
          break;
        case 'customer.subscription.created':
          const subscription = event.data.object;
          await handleSubscriptionCreated(subscription);
          break;
        case 'customer.subscription.updated':
          const updatedSubscription = event.data.object;
          await handleSubscriptionUpdated(updatedSubscription);
          break;
        case 'customer.subscription.deleted':
          const deletedSubscription = event.data.object;
          await handleSubscriptionCanceled(deletedSubscription);
          break;
        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      res.status(200).json({received: true});
    } catch (error) {
      console.error(`Error handling webhook event ${event.type}:`, error);
      res.status(500).json({error: error.message});
    }
  }
);

// Add this debug endpoint to help troubleshoot environment variable issues
app.get('/api/config', (req, res) => {
  // Send Supabase config to client with detailed info
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  console.log('Config API endpoint called');
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY available:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.log('Key starts with:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 10) + '...');
  }
  
  console.log('STRIPE_SECRET_KEY available:', !!process.env.STRIPE_SECRET_KEY);
  console.log('STRIPE_PUBLIC_KEY available:', !!process.env.STRIPE_PUBLIC_KEY);
  console.log('STRIPE_WEBHOOK_SECRET available:', !!process.env.STRIPE_WEBHOOK_SECRET);
  
  res.json({
    supabaseUrl: 'https://kigcecwfxlonrdxjwsza.supabase.co',
    supabaseKey: supabaseKey,
    stripePublicKey: process.env.STRIPE_PUBLIC_KEY || '',
    env: process.env.NODE_ENV,
    keysAvailable: {
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
      STRIPE_PUBLIC_KEY: !!process.env.STRIPE_PUBLIC_KEY,
      STRIPE_WEBHOOK_SECRET: !!process.env.STRIPE_WEBHOOK_SECRET,
    },
    timestamp: new Date().toISOString()
  });
});

// Add Stripe test endpoint
app.get('/api/stripe-test', async (req, res) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ 
        error: 'Stripe secret key not found',
        configured: false
      });
    }
    
    // Try to make a simple API call to check if the key is valid
    const products = await stripe.products.list({ limit: 1 });
    
    res.json({
      configured: true,
      stripeVersion: stripe.VERSION,
      testMode: process.env.STRIPE_SECRET_KEY.startsWith('sk_test_'),
      productsCount: products.data.length
    });
  } catch (error) {
    console.error('Stripe connection test failed:', error);
    res.status(500).json({ 
      error: error.message,
      configured: false,
      details: 'Stripe connection test failed'
    });
  }
});

// Stripe API endpoints
app.post('/api/create-customer', async (req, res) => {
  try {
    const { email, name, phone } = req.body;
    
    // Create a customer in Stripe without payment method
    const customer = await stripe.customers.create({
      email,
      name,
      phone
    });
    
    res.json({ customerId: customer.id });
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { 
      customerId, 
      priceId, 
      userId, 
      userPhone, 
      packageId,
      modelId,
      successUrl, 
      cancelUrl 
    } = req.body;
    
    // Create a Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl || `${req.headers.origin}/dashboard.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${req.headers.origin}/subscription.html`,
      metadata: {
        userId: userId,
        userPhone: userPhone,
        packageId: packageId,
        modelId: modelId
      }
    });
    
    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/create-portal-session', async (req, res) => {
  try {
    const { customerId, returnUrl } = req.body;
    
    // Create a billing portal session for managing subscriptions
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl || `${req.headers.origin}/dashboard.html`,
    });
    
    res.json({ url: portalSession.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/cancel-subscription', async (req, res) => {
  try {
    const { subscriptionId, userId } = req.body;
    
    if (!subscriptionId) {
      return res.status(400).json({ error: 'Subscription ID is required' });
    }
    
    // First get the subscription from the database
    const { data, error } = await supabase
      .from('user_model_subscriptions')
      .select('stripe_subscription_id')
      .eq('id', subscriptionId)
      .eq('user_id', userId)
      .single();
      
    if (error) {
      console.error('Error finding subscription:', error);
      return res.status(404).json({ error: 'Subscription not found' });
    }
    
    const stripeSubId = data.stripe_subscription_id;
    
    // Cancel the subscription at period end in Stripe
    const subscription = await stripe.subscriptions.update(stripeSubId, {
      cancel_at_period_end: true
    });
    
    // Update the subscription in our database
    const { error: updateError } = await supabase
      .from('user_model_subscriptions')
      .update({
        cancel_at_period_end: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriptionId);
      
    if (updateError) {
      console.error('Error updating subscription:', updateError);
      return res.status(500).json({ error: 'Failed to update subscription' });
    }
    
    res.json({ 
      status: subscription.status,
      cancel_at_period_end: subscription.cancel_at_period_end
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/check-subscription', async (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    
    // Get user from database
    const { data, error } = await supabase
      .from('sex_mode')
      .select('*')
      .eq('phone', phone)
      .single();
    
    if (error) {
      console.error('Error finding user:', error);
      return res.status(400).json({ error: 'User not found' });
    }
    
    if (!data.is_subscribed || !data.stripe_subscription_id) {
      return res.json({ 
        isSubscribed: false 
      });
    }
    
    // Get subscription details from Stripe
    try {
      const subscription = await stripe.subscriptions.retrieve(data.stripe_subscription_id);
      
      // Get product details for this subscription
      const priceId = subscription.items.data[0].price.id;
      const price = await stripe.prices.retrieve(priceId);
      
      // Format billing cycle
      let billingCycle = 'Monthly';
      if (data.subscription_plan === 'yearly') {
        billingCycle = 'Annual';
      } else if (data.subscription_plan === 'quarterly') {
        billingCycle = 'Quarterly';
      }
      
      // Format amount
      const amount = `$${(price.unit_amount / 100).toFixed(2)}`;
      
      // Format next billing date
      const nextBillingDate = new Date(subscription.current_period_end * 1000).toLocaleDateString();
      
      return res.json({
        isSubscribed: true,
        plan: data.subscription_plan.charAt(0).toUpperCase() + data.subscription_plan.slice(1),
        billingCycle,
        nextBillingDate,
        amount,
        stripeCustomerId: data.stripe_customer_id,
        stripeSubscriptionId: data.stripe_subscription_id,
        status: subscription.status
      });
    } catch (stripeError) {
      console.error('Error retrieving subscription from Stripe:', stripeError);
      
      // Even if we can't get details from Stripe, we still know the user is subscribed
      return res.json({
        isSubscribed: true,
        plan: data.subscription_plan.charAt(0).toUpperCase() + data.subscription_plan.slice(1),
        billingCycle: 'Unknown',
        nextBillingDate: 'Unknown',
        amount: 'Unknown',
        stripeCustomerId: data.stripe_customer_id,
        stripeSubscriptionId: data.stripe_subscription_id
      });
    }
  } catch (error) {
    console.error('Error checking subscription:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get session details for client-side validation
app.get('/api/stripe-session', async (req, res) => {
  try {
    const { session_id } = req.query;
    
    if (!session_id) {
      return res.status(400).json({ error: 'Session ID is required' });
    }
    
    // Retrieve the session
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['subscription']
    });
    
    // Return relevant data
    res.json({
      customer_id: session.customer,
      subscription_id: session.subscription?.id,
      status: session.status,
      metadata: session.metadata
    });
  } catch (error) {
    console.error('Error retrieving session:', error);
    res.status(400).json({ error: error.message });
  }
});

// Middleware to inject environment variables into HTML files
app.use((req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(body) {
    // Only process HTML responses
    if (typeof body === 'string' && this.getHeader('content-type')?.includes('text/html')) {
      // Replace placeholders with environment variables
      body = body.replace(/%NEXT_PUBLIC_SUPABASE_ANON_KEY%/g, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
      body = body.replace(/%SUPABASE_ANON_KEY%/g, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''); // Backward compatibility
      body = body.replace(/%STRIPE_PUBLIC_KEY%/g, process.env.STRIPE_PUBLIC_KEY || '');
      
      // Log for debugging
      console.log(`Injected env vars into ${req.path}`);
    }
    
    return originalSend.call(this, body);
  };
  
  next();
});

// Serve static files from public directory
app.use(express.static('public', {
  extensions: ['html'],
  setHeaders: (res, filePath) => {
    if (path.extname(filePath) === '.html') {
      res.setHeader('Content-Type', 'text/html');
    }
  }
}));

// Handle invite links with model parameter
app.get('/invite/:model', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'invite.html'));
});

// Handle root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle all other routes by serving the appropriate HTML file if it exists
app.get('/:page', (req, res) => {
  const page = req.params.page;
  const filePath = path.join(__dirname, 'public', `${page}.html`);
  
  // Check if file exists, otherwise serve a 404 page
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
  }
});

// Handle successful checkout
async function handleSuccessfulCheckout(session) {
  console.log('Processing successful checkout session:', session.id);
  
  try {
    const { userId, modelId, packageId } = session.metadata;
    
    if (!userId || !modelId) {
      console.error('Missing required metadata in checkout session');
      return;
    }
    
    // Retrieve subscription details
    const subscription = await stripe.subscriptions.retrieve(session.subscription);
    
    // Create or update user_model_subscriptions record
    const { data, error } = await supabase
      .from('user_model_subscriptions')
      .insert([{
        user_id: userId,
        model_id: modelId,
        package_id: packageId || null,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: session.customer,
        status: subscription.status,
        subscription_plan: 'monthly',
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        is_active: true,
        cancel_at_period_end: subscription.cancel_at_period_end
      }]);
      
    if (error) {
      console.error('Error inserting subscription record:', error);
      return;
    }
    
    // Update the subscription count in the profiles table
    const { error: updateError } = await supabase.rpc('increment_subscription_count', { user_id: userId });
    
    if (updateError) {
      console.error('Error updating subscription count:', updateError);
    }
    
    console.log('Subscription record created successfully');
  } catch (error) {
    console.error('Error handling successful checkout:', error);
  }
}

// Handle subscription created event
async function handleSubscriptionCreated(subscription) {
  console.log('Processing new subscription:', subscription.id);
  
  // For new subscriptions, the checkout.session.completed webhook should handle it
  // This is just a backup in case that webhook fails
}

// Handle subscription updated event
async function handleSubscriptionUpdated(subscription) {
  console.log('Processing subscription update:', subscription.id);
  
  try {
    // Update the subscription record
    const { error } = await supabase
      .from('user_model_subscriptions')
      .update({
        status: subscription.status,
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id);
      
    if (error) {
      console.error('Error updating subscription record:', error);
    }
  } catch (error) {
    console.error('Error handling subscription update:', error);
  }
}

// Handle subscription canceled event
async function handleSubscriptionCanceled(subscription) {
  console.log('Processing subscription cancellation:', subscription.id);
  
  try {
    // Update the subscription record to inactive
    const { error } = await supabase
      .from('user_model_subscriptions')
      .update({
        status: subscription.status,
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id);
      
    if (error) {
      console.error('Error updating canceled subscription record:', error);
      return;
    }
    
    // Get the user ID for this subscription
    const { data, error: fetchError } = await supabase
      .from('user_model_subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', subscription.id)
      .single();
      
    if (fetchError) {
      console.error('Error fetching user for subscription:', fetchError);
      return;
    }
    
    if (data && data.user_id) {
      // Decrement the subscription count
      const { error: updateError } = await supabase.rpc('decrement_subscription_count', { user_id: data.user_id });
      
      if (updateError) {
        console.error('Error updating subscription count:', updateError);
      }
    }
  } catch (error) {
    console.error('Error handling subscription cancellation:', error);
  }
}

// Get user subscriptions
app.get('/api/user-subscriptions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Get all active subscriptions for the user
    const { data, error } = await supabase
      .from('user_model_subscriptions')
      .select(`
        *,
        models:model_id (*),
        packages:package_id (*)
      `)
      .eq('user_id', userId)
      .eq('is_active', true);
      
    if (error) {
      console.error('Error fetching user subscriptions:', error);
      return res.status(500).json({ error: 'Failed to fetch subscriptions' });
    }
    
    res.json({ subscriptions: data || [] });
  } catch (error) {
    console.error('Error fetching user subscriptions:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get model details with packages
app.get('/api/model/:modelId', async (req, res) => {
  try {
    const { modelId } = req.params;
    
    if (!modelId) {
      return res.status(400).json({ error: 'Model ID is required' });
    }
    
    // Get model details
    const { data: model, error: modelError } = await supabase
      .from('models')
      .select('*')
      .eq('id', modelId)
      .single();
      
    if (modelError) {
      console.error('Error fetching model:', modelError);
      return res.status(404).json({ error: 'Model not found' });
    }
    
    // Get packages for this model
    const { data: packages, error: packagesError } = await supabase
      .from('packages')
      .select('*')
      .eq('model_id', modelId)
      .order('price', { ascending: true });
      
    if (packagesError) {
      console.error('Error fetching packages:', packagesError);
      return res.status(500).json({ error: 'Failed to fetch packages' });
    }
    
    res.json({ 
      model,
      packages: packages || []
    });
  } catch (error) {
    console.error('Error fetching model details:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get all available models
app.get('/api/models', async (req, res) => {
  try {
    // Get all active models
    const { data, error } = await supabase
      .from('models')
      .select('*')
      .eq('active', true);
      
    if (error) {
      console.error('Error fetching models:', error);
      return res.status(500).json({ error: 'Failed to fetch models' });
    }
    
    res.json({ models: data || [] });
  } catch (error) {
    console.error('Error fetching models:', error);
    res.status(400).json({ error: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Supabase key available: ${!!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`);
  if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.log(`Key starts with: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 5)}...`);
  }
});