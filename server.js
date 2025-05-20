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
    console.log('POST /api/create-portal-session', req.body);
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY is missing in environment variables');
      return res.status(500).json({ error: 'Stripe secret key not configured on server.' });
    }
    const { customerId, returnUrl } = req.body || {};
    if (!customerId) {
      console.error('Missing customerId in request body:', req.body);
      return res.status(400).json({ error: 'customerId is required' });
    }
    // Create a billing portal session for managing subscriptions
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl || `${req.headers.origin || 'https://tease-kappa.vercel.app'}/dashboard.html`,
    });
    res.json({ url: portalSession.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(400).json({ error: error.message, details: error });
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
app.get('/invite/:model', async (req, res) => {
  try {
    const modelParam = req.params.model;
    let modelData = null;
    let imageUrl = '/images/threadpay-social-default.jpg';
    
    if (modelParam) {
      // Try to find model in database
      try {
        // First try exact name match
        let { data, error } = await supabase
          .from('models')
          .select('*')
          .eq('name', modelParam)
          .single();
        
        if (!data && error) {
          // Then try case-insensitive match
          ({ data, error } = await supabase
            .from('models')
            .select('*')
            .ilike('name', modelParam)
            .single());
        }
        
        if (!data && error) {
          // Finally try fuzzy matching with capitalization variations
          const formattedName = modelParam.charAt(0).toUpperCase() + modelParam.slice(1).toLowerCase();
          ({ data, error } = await supabase
            .from('models')
            .select('*')
            .ilike('name', `%${formattedName}%`)
            .single());
        }
        
        if (data) {
          modelData = data;
          
          // Determine the correct image URL
          if (modelData.pictures && modelData.pictures.length > 0) {
            const firstImage = modelData.pictures[0];
            if (firstImage.startsWith('http')) {
              imageUrl = firstImage;
            } else if (firstImage.includes('storage/v1')) {
              imageUrl = firstImage;
            } else {
              imageUrl = `${supabaseUrl}/storage/v1/object/public/model-images/${firstImage}`;
            }
          }
        }
      } catch (err) {
        console.error('Error fetching model data for social cards:', err);
      }
    }
    
    // Read the invite.html file
    fs.readFile(path.join(__dirname, 'public', 'invite.html'), 'utf8', (err, html) => {
      if (err) {
        console.error('Error reading invite.html:', err);
        return res.sendFile(path.join(__dirname, 'public', 'invite.html'));
      }
      
      // If we found model data, replace the meta tags
      if (modelData) {
        const pageTitle = `Join ${modelData.name} | ThreadPay`;
        const description = modelData.bio || `Subscribe to ${modelData.name} on ThreadPay`;
        const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
        
        // Replace meta tags with actual values
        html = html.replace('<meta property="og:title" content="Join ThreadPay | Secure Payment Platform">', 
                         `<meta property="og:title" content="${pageTitle}">`);
        html = html.replace('<meta property="og:description" content="Subscribe to access exclusive content">', 
                         `<meta property="og:description" content="${description}">`);
        html = html.replace('<meta property="og:image" content="/images/threadpay-social-default.jpg">', 
                         `<meta property="og:image" content="${imageUrl}">`);
        html = html.replace('<meta property="og:url" content="">', 
                         `<meta property="og:url" content="${fullUrl}">`);
                         
        // Replace Twitter card meta tags
        html = html.replace('<meta name="twitter:title" content="Join ThreadPay | Secure Payment Platform">', 
                         `<meta name="twitter:title" content="${pageTitle}">`);
        html = html.replace('<meta name="twitter:description" content="Subscribe to access exclusive content">', 
                         `<meta name="twitter:description" content="${description}">`);
        html = html.replace('<meta name="twitter:image" content="/images/threadpay-social-default.jpg">', 
                         `<meta name="twitter:image" content="${imageUrl}">`);
        
        // Also replace the page title
        html = html.replace('<title>Join ThreadPay | Secure Payment Platform</title>', 
                         `<title>${pageTitle}</title>`);
      }
      
      // Send the modified HTML
      res.send(html);
    });
  } catch (error) {
    console.error('Error processing invite page:', error);
    res.sendFile(path.join(__dirname, 'public', 'invite.html'));
  }
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

// Helper function to ensure profile exists - simplified
async function ensureProfileExists(userId, userName = null, userEmail = null) {
  console.log('Ensuring profile exists for user:', userId);
  
  try {
    // Check if profile already exists by id OR auth_id - using proper SQL syntax
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .or(`id.eq.${userId},auth_id.eq.${userId}`)
      .maybeSingle();
      
    if (profileError) {
      console.log('Error checking for profile:', profileError);
      throw profileError;
    }
    
    // If a profile was found
    if (profileData) {
      console.log('Profile found:', profileData.id);
      
      // If the profile exists but with a different ID than auth_id, update the references in local storage
      if (profileData.id !== userId && profileData.auth_id === userId) {
        console.log(`Profile found with different ID (${profileData.id}) but matching auth_id (${userId}).`);
        return profileData.id; // Return the actual profile ID to use for subscriptions
      }
      
      return profileData.id; // Return the actual profile ID, not just userId
    }
    
    // No profile found, create a new one
    console.log('Profile not found, creating new profile');
    
    // Create a profile with both id and auth_id to ensure consistent access
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        auth_id: userId,
        name: userName || 'User',
        telegram_username: `user_${userId.substring(0, 8)}_${Date.now()}`, // Make unique
        password_hash: 'placeholder',
        subscription_count: 0,
        has_active_subscription: false,
        subscription_status: false
      })
      .select()
      .single();
      
    if (insertError) {
      console.error('Error creating profile:', insertError);
      
      // As a fallback, check if a profile exists with this auth_id
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_id', userId)
        .maybeSingle();
        
      if (existingProfile && existingProfile.id) {
        console.log(`Found existing profile with ID ${existingProfile.id} for auth_id ${userId}`);
        return existingProfile.id;
      }
      
      throw insertError;
    }
    
    console.log('New profile created with ID:', newProfile.id);
    return newProfile.id;
  } catch (err) {
    console.error('Error in ensureProfileExists:', err);
    return userId; // Return the original userId as a fallback
  }
}

// Handle successful checkout - simplified
async function handleSuccessfulCheckout(session) {
  console.log('Processing successful checkout session:', session.id);
  console.log('Session metadata:', JSON.stringify(session.metadata));
  
  try {
    const { userId, modelId, packageId, userPhone } = session.metadata;
    
    if (!userId || !modelId) {
      console.error('Missing required metadata in checkout session:', session.metadata);
      return;
    }
    
    // 1. Create a profile for the user if it doesn't exist, and get the correct profile ID
    const profileId = await ensureProfileExists(userId);
    if (!profileId) {
      console.error('Failed to create or find profile for user:', userId);
      return;
    }
    
    console.log(`Using profile ID: ${profileId} for user: ${userId}`);
    
    // 2. Retrieve subscription details
    console.log('Retrieving subscription details for:', session.subscription);
    const subscription = await stripe.subscriptions.retrieve(session.subscription);
    console.log('Subscription status:', subscription.status);
    
    // 3. Create the subscription record directly
    try {
      const { error: insertError } = await supabase
        .from('user_model_subscriptions')
        .insert({
          user_id: profileId, // Use the correct profile ID
          model_id: modelId, // Ensure this is never null
          package_id: packageId,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: session.customer,
          status: subscription.status,
          subscription_plan: 'monthly',
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          is_active: true,
          cancel_at_period_end: subscription.cancel_at_period_end
        });
      
      if (insertError) {
        console.error('Error creating subscription record:', insertError);
        
        // If insert failed, check if it's because the subscription already exists
        if (insertError.code === '23505') { // Unique violation
          console.log('Subscription already exists, updating instead');
          
          // Update the existing subscription
          await supabase
            .from('user_model_subscriptions')
            .update({
              status: subscription.status,
              is_active: true,
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('stripe_subscription_id', subscription.id);
        }
      }
    } catch (e) {
      console.error('Exception during subscription creation:', e);
    }
    
    // 4. Directly update the profile's subscription status
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          subscription_count: 1,
          has_active_subscription: true,
          subscription_status: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', profileId); // Use correct profile ID
      
      if (profileError) {
        console.error('Error updating profile:', profileError);
      }
    } catch (e) {
      console.error('Exception during profile update:', e);
    }
    
    console.log('Subscription processed successfully');
  } catch (error) {
    console.error('Error handling successful checkout:', error);
  }
}

// Handle subscription created event
async function handleSubscriptionCreated(subscription) {
  console.log('Processing new subscription:', subscription.id);
  
  try {
    // For new subscriptions, the checkout.session.completed webhook should handle it
    // This is just a backup in case that webhook fails
    
    // Get the user ID for this subscription from metadata
    if (subscription.metadata && subscription.metadata.userId) {
      const userId = subscription.metadata.userId;
      console.log('Found userId directly in subscription metadata:', userId);
      
      // Ensure profile exists
      const profileExists = await ensureProfileExists(userId);
      if (!profileExists) {
        console.error('Failed to create profile for user:', userId);
      }
      
      // Update the subscription record
      const { error: updateError } = await supabase
        .from('user_model_subscriptions')
        .insert({
          user_id: userId,
          model_id: subscription.metadata.modelId || null,
          package_id: subscription.metadata.packageId || null,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: subscription.customer,
          status: subscription.status,
          subscription_plan: 'monthly',
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          is_active: subscription.status === 'active',
          cancel_at_period_end: subscription.cancel_at_period_end
        });
        
      if (updateError) {
        console.error('Error creating subscription record from metadata:', updateError);
      } else {
        // Update the subscription count in the profiles table
        const { error: countError } = await supabase.rpc('increment_subscription_count', { user_id: userId });
        
        if (countError) {
          console.error('Error updating subscription count:', countError);
          
          // Directly update profile as fallback
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              subscription_count: 1,
              has_active_subscription: true,
              subscription_status: true
            })
            .eq('id', userId);
            
          if (profileError) {
            console.error('Error directly updating profile subscription fields:', profileError);
          }
        }
      }
    } else {
      // If we don't have metadata, try to get the user from existing subscriptions
      const { data, error } = await supabase
        .from('user_model_subscriptions')
        .select('user_id, model_id, package_id')
        .eq('stripe_subscription_id', subscription.id)
        .single();
        
      if (error || !data) {
        console.error('Error finding user for subscription:', error || 'No subscription found');
        
        // Try to find from recent sessions
        try {
          // Retrieve recent checkout sessions for this customer
          const sessions = await stripe.checkout.sessions.list({
            customer: subscription.customer,
            limit: 5
          });
          
          // Look for a session that matches this subscription ID
          const matchingSession = sessions.data.find(session => 
            session.subscription === subscription.id
          );
          
          if (matchingSession && matchingSession.metadata && matchingSession.metadata.userId) {
            console.log('Found user from checkout session metadata:', matchingSession.metadata.userId);
            const userId = matchingSession.metadata.userId;
            
            // Ensure profile exists
            const profileExists = await ensureProfileExists(userId);
            if (!profileExists) {
              console.error('Failed to create profile for user:', userId);
            }
            
            // Create the subscription record
            const { error: insertError } = await supabase
              .from('user_model_subscriptions')
              .insert({
                user_id: userId,
                model_id: matchingSession.metadata.modelId || null,
                package_id: matchingSession.metadata.packageId || null,
                stripe_subscription_id: subscription.id,
                stripe_customer_id: subscription.customer,
                status: subscription.status,
                subscription_plan: 'monthly',
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                is_active: subscription.status === 'active',
                cancel_at_period_end: subscription.cancel_at_period_end
              });
              
            if (insertError) {
              console.error('Error creating subscription record from session:', insertError);
              return;
            }
            
            // Update the subscription count in the profiles table
            const { error: countError } = await supabase.rpc('increment_subscription_count', { user_id: userId });
            
            if (countError) {
              console.error('Error updating subscription count:', countError);
              
              // Directly update profile as fallback
              const { error: profileError } = await supabase
                .from('profiles')
                .update({
                  subscription_count: 1,
                  has_active_subscription: true,
                  subscription_status: true
                })
                .eq('id', userId);
                
              if (profileError) {
                console.error('Error directly updating profile subscription fields:', profileError);
              }
            }
          } else {
            console.error('Could not find user ID for subscription:', subscription.id);
            return;
          }
        } catch (stripeError) {
          console.error('Error retrieving sessions from Stripe:', stripeError);
          return;
        }
        
        return;
      }
      
      // Ensure profile exists
      const profileExists = await ensureProfileExists(data.user_id);
      if (!profileExists) {
        console.error('Failed to create profile for user:', data.user_id);
      }
      
      // Update the subscription record
      const { error: updateError } = await supabase
        .from('user_model_subscriptions')
        .update({
          status: subscription.status,
          is_active: subscription.status === 'active',
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('stripe_subscription_id', subscription.id);
        
      if (updateError) {
        console.error('Error updating subscription record:', updateError);
        return;
      }
      
      // Update the subscription count in the profiles table
      const { error: countError } = await supabase.rpc('increment_subscription_count', { user_id: data.user_id });
      
      if (countError) {
        console.error('Error updating subscription count:', countError);
        
        // Directly update profile as fallback
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            subscription_count: 1,
            has_active_subscription: true,
            subscription_status: true
          })
          .eq('id', data.user_id);
          
        if (profileError) {
          console.error('Error directly updating profile subscription fields:', profileError);
        }
      }
    }
  } catch (error) {
    console.error('Error handling subscription creation:', error);
  }
}

// Handle subscription updated event
async function handleSubscriptionUpdated(subscription) {
  console.log('Processing subscription update:', subscription.id);
  
  try {
    // Try to find the subscription in our database
    let { data, error: fetchError } = await supabase
      .from('user_model_subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', subscription.id)
      .single();
      
    let userId = null;
      
    // If we can't find the subscription record, check if we have metadata on the subscription
    if (fetchError || !data) {
      console.log('Subscription not found in database, trying to use metadata...');
      
      if (subscription.metadata && subscription.metadata.userId) {
        // We have the user ID in metadata, so we can use it directly
        console.log('Using userId from subscription metadata:', subscription.metadata.userId);
        userId = subscription.metadata.userId;
      } else {
        // Try retrieving the session that created this subscription
        try {
          // Retrieve recent checkout sessions for this customer
          const sessions = await stripe.checkout.sessions.list({
            customer: subscription.customer,
            limit: 5
          });
          
          // Look for a session that matches this subscription ID
          const matchingSession = sessions.data.find(session => 
            session.subscription === subscription.id
          );
          
          if (matchingSession && matchingSession.metadata && matchingSession.metadata.userId) {
            console.log('Found user from checkout session metadata:', matchingSession.metadata.userId);
            userId = matchingSession.metadata.userId;
          } else {
            console.error('Could not find user ID for subscription:', subscription.id);
            return;
          }
        } catch (stripeError) {
          console.error('Error retrieving sessions from Stripe:', stripeError);
          return;
        }
      }
      
      // Ensure profile exists
      const profileExists = await ensureProfileExists(userId);
      if (!profileExists) {
        console.error('Failed to create profile for user:', userId);
      }
    } else {
      userId = data.user_id;
    }
    
    // Create/update the subscription using our RPC function
    console.log('Updating subscription using RPC function...');
    const { error: createError } = await supabase.rpc('create_user_subscription', {
      p_user_id: userId,
      p_model_id: subscription.metadata?.modelId || null,
      p_package_id: subscription.metadata?.packageId || null,
      p_stripe_subscription_id: subscription.id,
      p_stripe_customer_id: subscription.customer,
      p_status: subscription.status,
      p_subscription_plan: 'monthly',
      p_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      p_is_active: subscription.status === 'active',
      p_cancel_at_period_end: subscription.cancel_at_period_end
    });
    
    if (createError) {
      console.error('Error updating subscription via RPC:', createError);
      
      // Fall back to direct update
      console.log('Falling back to direct update...');
      try {
        const { error } = await supabase
          .from('user_model_subscriptions')
          .update({
            status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            is_active: subscription.status === 'active',
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscription.id);
          
        if (error) {
          console.error('Error with direct update:', error);
        }
      } catch (e) {
        console.error('Exception during direct update:', e);
      }
    } else {
      console.log('Subscription updated successfully via RPC');
    }
    
    // Fix user subscription status
    if (userId) {
      console.log('Fixing subscription status for user:', userId);
      const { data: fixResult, error: fixError } = await supabase.rpc('fix_user_subscription_status', {
        p_user_id: userId
      });
      
      if (fixError) {
        console.error('Error fixing subscription status via RPC:', fixError);
        
        // If the subscription is no longer active, decrement the count
        if (subscription.status !== 'active') {
          const { error: updateError } = await supabase.rpc('decrement_subscription_count', { user_id: userId });
          
          if (updateError) {
            console.error('Error updating subscription count:', updateError);
          }
        } else {
          // Always update the profile subscription status for active subscriptions
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              subscription_count: 1,
              subscription_status: true,
              has_active_subscription: true
            })
            .eq('id', userId);
            
          if (profileError) {
            console.error('Error updating profile subscription status:', profileError);
          }
        }
      } else {
        console.log('Subscription status fixed successfully:', fixResult);
      }
      
      // Verify the profile was updated correctly
      const { data: verifyData, error: verifyError } = await supabase
        .from('profiles')
        .select('subscription_count, has_active_subscription, subscription_status')
        .eq('id', userId)
        .single();
        
      if (verifyError) {
        console.error('Error verifying profile update:', verifyError);
      } else {
        console.log('Profile subscription fields after update:', verifyData);
      }
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

// Debug endpoint to fix subscription status
app.post('/api/debug/fix-subscription', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Count active subscriptions for this user
    const { data: subscriptions, error: countError } = await supabase
      .from('user_model_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .eq('status', 'active');
      
    if (countError) {
      console.error('Error counting user subscriptions:', countError);
      return res.status(500).json({ error: 'Failed to count subscriptions' });
    }
    
    const subscriptionCount = subscriptions ? subscriptions.length : 0;
    const hasActiveSubscription = subscriptionCount > 0;
    
    // Update the profile directly
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        subscription_count: subscriptionCount,
        has_active_subscription: hasActiveSubscription,
        subscription_status: hasActiveSubscription
      })
      .eq('id', userId);
      
    if (updateError) {
      console.error('Error updating profile subscription status:', updateError);
      return res.status(500).json({ error: 'Failed to update profile' });
    }
    
    res.json({ 
      success: true, 
      userId,
      subscriptionCount,
      hasActiveSubscription
    });
  } catch (error) {
    console.error('Error fixing subscription status:', error);
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