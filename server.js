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
  // Send Supabase config to client
  res.json({
    supabaseUrl: 'https://kigcecwfxlonrdxjwsza.supabase.co',
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    env: process.env.NODE_ENV,
    keysAvailable: {
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      STRIPE_PUBLIC_KEY: !!process.env.STRIPE_PUBLIC_KEY,
      // Don't include actual keys in response
    }
  });
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
      success_url: successUrl || `${req.headers.origin}/subscription-success.html?session_id={CHECKOUT_SESSION_ID}`,
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
    
    // Find user with this subscription ID
    const { data, error } = await supabase
      .from('sex_mode')
      .select('phone')
      .eq('stripe_subscription_id', subscription.id);
    
    if (error) {
      console.error('Error finding user with subscription:', error);
      return;
    }
    
    if (!data || data.length === 0) {
      console.log(`No user found with subscription ID: ${subscription.id}`);
      return;
    }
    
    const userPhone = data[0].phone;
    console.log(`Found user with phone: ${userPhone}, updating subscription status`);
    
    // Update user subscription status
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
  } catch (error) {
    console.error('Error handling canceled subscription:', error);
  }
}

// Middleware to inject environment variables into HTML files
app.use((req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(body) {
    // Only process HTML responses
    if (typeof body === 'string' && this.getHeader('content-type')?.includes('text/html')) {
      // Replace placeholders with environment variables
      body = body.replace(/%SUPABASE_ANON_KEY%/g, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
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

// Handle HTML page requests
app.get('/:page', (req, res) => {
  const page = req.params.page;
  const htmlFile = path.join(__dirname, 'public', `${page}.html`);
  
  // Check if file exists
  if (fs.existsSync(htmlFile)) {
    let htmlContent = fs.readFileSync(htmlFile, 'utf8');
    
    // Replace placeholders with environment variables
    htmlContent = htmlContent.replace(/%SUPABASE_ANON_KEY%/g, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
    htmlContent = htmlContent.replace(/%STRIPE_PUBLIC_KEY%/g, process.env.STRIPE_PUBLIC_KEY || '');
    
    res.send(htmlContent);
  } else {
    // Fallback to index.html for non-existent pages (SPA behavior)
    res.redirect('/');
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