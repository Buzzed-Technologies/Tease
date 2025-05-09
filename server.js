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
    const { customerId, priceId, userId, userPhone, successUrl, cancelUrl } = req.body;
    
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
        userPhone: userPhone
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
    const { subscriptionId } = req.body;
    
    const subscription = await stripe.subscriptions.cancel(subscriptionId);
    
    res.json({ status: subscription.status });
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

// Webhook handler for Stripe events
app.post('/api/webhook', bodyParser.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  let event;

  try {
    // Use the raw body for signature verification
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      // Fulfill the order
      await handleSuccessfulSubscription(session);
      break;
    case 'customer.subscription.deleted':
      const subscription = event.data.object;
      await handleCanceledSubscription(subscription);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.status(200).json({received: true});
});

// Endpoint to verify a checkout session
app.post('/api/verify-session', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }
    
    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    // Check if the payment was successful
    if (session.payment_status === 'paid' && session.status === 'complete') {
      // Get the subscription and customer details
      const subscriptionId = session.subscription;
      const customerId = session.customer;
      const userId = session.metadata?.userId;
      
      // Update subscription status in the database if not already done by webhook
      if (userId) {
        const { data, error } = await supabase
          .from('profiles')
          .select('subscription_status')
          .eq('id', userId)
          .single();
        
        if (!error && !data.subscription_status) {
          // If status is not yet updated (webhook might be delayed), update it now
          await supabase
            .from('profiles')
            .update({ 
              subscription_status: true,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId);
        }
      }
      
      return res.json({
        success: true,
        sessionId,
        subscriptionId,
        customerId
      });
    } else {
      return res.json({
        success: false,
        message: 'Payment not completed'
      });
    }
  } catch (error) {
    console.error('Error verifying session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to handle successful subscription
async function handleSuccessfulSubscription(session) {
  try {
    // Get customer and subscription details
    const subscriptionId = session.subscription;
    const customerId = session.customer;
    const userId = session.metadata?.userId;
    const userPhone = session.metadata?.userPhone;
    
    if (!userPhone) {
      console.error('No user phone in session metadata');
      return;
    }
    
    // Get subscription details to determine plan
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const priceId = subscription.items.data[0].price.id;
    let plan = 'monthly';
    
    if (priceId === 'price_1RMiTFB71e12H8w7mfD9dfc9') {
      plan = 'yearly';
    } else if (priceId === 'price_1RMiSnB71e12H8w7iJ73uN0u') {
      plan = 'quarterly';
    }
    
    // Update user in database
    const { error } = await supabase
      .from('sex_mode')
      .update({
        is_subscribed: true,
        subscription_plan: plan,
        subscription_start: new Date().toISOString(),
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId
      })
      .eq('phone', userPhone);
    
    if (error) {
      console.error('Error updating user subscription:', error);
    }
  } catch (error) {
    console.error('Error handling successful subscription:', error);
  }
}

// Helper function to handle subscription cancellation
async function handleCanceledSubscription(subscription) {
  try {
    console.log('Processing canceled subscription:', subscription.id);
    
    // First do a broader query to see if the subscription exists in any form
    const { data: allSubs, error: searchError } = await supabase
      .from('sex_mode')
      .select('phone, stripe_subscription_id');
    
    if (searchError) {
      console.error('Error querying all subscriptions:', searchError);
    } else {
      console.log('All subscriptions in database:', allSubs.map(s => 
        ({ phone: s.phone, subId: s.stripe_subscription_id })));
      
      // Check if any subscription IDs contain the target ID (case insensitive)
      const matchingSubs = allSubs.filter(s => 
        s.stripe_subscription_id && 
        s.stripe_subscription_id.toLowerCase() === subscription.id.toLowerCase());
      
      if (matchingSubs.length > 0) {
        console.log('Found matching subscriptions with different casing or format:', matchingSubs);
      }
    }
    
    // Try exact match first
    const { data, error } = await supabase
      .from('sex_mode')
      .select('phone')
      .eq('stripe_subscription_id', subscription.id);
    
    if (error) {
      console.error('Error finding user with subscription (exact match):', error);
      return;
    }
    
    if (!data || data.length === 0) {
      console.log(`No user found with subscription ID: ${subscription.id}`);
      
      // Try with case-insensitive match as fallback
      const { data: iLikeData, error: iLikeError } = await supabase
        .from('sex_mode')
        .select('phone')
        .ilike('stripe_subscription_id', subscription.id);
      
      if (iLikeError) {
        console.error('Error finding user with case-insensitive match:', iLikeError);
        return;
      }
      
      if (!iLikeData || iLikeData.length === 0) {
        console.log('No match found even with case-insensitive search');
        return;
      }
      
      console.log('Found match with case-insensitive search:', iLikeData);
      const userPhone = iLikeData[0].phone;
      updateSubscriptionStatus(userPhone);
    } else {
      const userPhone = data[0].phone;
      console.log(`Found user with phone: ${userPhone}, updating subscription status`);
      updateSubscriptionStatus(userPhone);
    }
  } catch (error) {
    console.error('Error handling canceled subscription:', error);
  }
}

// Helper function to update subscription status
async function updateSubscriptionStatus(userPhone) {
  const { error: updateError } = await supabase
    .from('sex_mode')
    .update({
      is_subscribed: false,
      subscription_end: new Date().toISOString(),
      subscription_status: 'canceled'
    })
    .eq('phone', userPhone);
  
  if (updateError) {
    console.error('Error updating user subscription status:', updateError);
  } else {
    console.log(`Successfully updated subscription status for user ${userPhone}`);
  }
}

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

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Supabase key available: ${!!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`);
  if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.log(`Key starts with: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 5)}...`);
  }
});