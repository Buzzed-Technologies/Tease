const express = require('express');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const bodyParser = require('body-parser');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON request body
app.use(bodyParser.json());

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
    const { email, paymentMethodId, name, phone } = req.body;
    
    // Create a customer in Stripe
    const customer = await stripe.customers.create({
      email,
      payment_method: paymentMethodId,
      name,
      phone,
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });
    
    res.json({ customerId: customer.id });
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/create-subscription', async (req, res) => {
  try {
    const { customerId, priceId } = req.body;
    
    // Create the subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      expand: ['latest_invoice.payment_intent'],
    });
    
    res.json({
      subscriptionId: subscription.id,
      clientSecret: subscription.latest_invoice.payment_intent.client_secret,
      status: subscription.status,
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
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