// Stripe subscription management
// The public key will be injected from environment variables
let STRIPE_PUBLIC_KEY = '';
let stripe;

// Product and price IDs
const PRODUCT_ID = 'prod_SHHPNACUSKUDnA';
const PRICE_IDS = {
    yearly: 'price_1RMiqJB71e12H8w7PDbXswUW',
    quarterly: 'price_1RMiqJB71e12H8w7TJGQqdzJ',
    monthly: 'price_1RMiqJB71e12H8w7o8ejsbK7'
};

// Plan price mapping
const PLAN_PRICES = {
    yearly: {
        monthly: '$16.67',
        total: '$199.99'
    },
    quarterly: {
        monthly: '$18.66',
        total: '$55.99'
    },
    monthly: {
        monthly: '$19.99',
        total: '$19.99'
    }
};

// Initialize Supabase client
const supabaseUrl = 'https://kigcecwfxlonrdxjwsza.supabase.co';
const supabaseKey = document.querySelector('meta[name="supabase-anon-key"]')?.getAttribute('content') || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZ2NlY3dmeGxvbnJkeGp3c3phIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk3OTE3MjAsImV4cCI6MjAyNTM2NzcyMH0.kw2nw7VW3QXTzWM7ynmm7Q2k7W4e5JKgf2i-k9K0Sns';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Initialize subscription system
function initSubscription() {
    // Check if user is logged in
    const user = getCurrentUser();
    if (!user) {
        window.location.href = '/login.html';
        return;
    }
    
    // Check if user is newly signed up
    const isNewUser = user.created_at && 
                     (new Date() - new Date(user.created_at) < 1000 * 60 * 30); // 30 minutes
    
    // Customize the page for new users
    if (isNewUser && user.persona) {
        const headerTitle = document.querySelector('.subscription-header h1');
        const headerDesc = document.querySelector('.subscription-description');
        
        if (headerTitle) {
            headerTitle.innerHTML = `Complete Your <span style="color: var(--primary);">Experience</span>`;
        }
        
        if (headerDesc) {
            headerDesc.innerHTML = `Welcome ${user.name || 'there'}! You're just one step away from experiencing ${user.persona} and unlocking the full potential of Tease.`;
        }
        
        // Also update button text
        const subscribeButton = document.getElementById('subscribe-button');
        if (subscribeButton) {
            subscribeButton.textContent = 'Start Your Adventure';
        }
    }
    
    // Update subscription status if already subscribed
    if (user.isSubscribed) {
        showSubscriptionConfirmation();
        return;
    }
    
    // Get Stripe public key from meta tag
    const metaTag = document.querySelector('meta[name="stripe-public-key"]');
    if (metaTag) {
        STRIPE_PUBLIC_KEY = metaTag.getAttribute('content');
    }
    
    // Initialize Stripe 
    stripe = Stripe(STRIPE_PUBLIC_KEY);
    
    // Handle form submission
    const subscriptionForm = document.getElementById('subscription-form');
    if (subscriptionForm) {
        subscriptionForm.addEventListener('submit', handleSubscription);
    }
    
    // Handle plan selection
    const planButtons = document.querySelectorAll('.plan-option');
    if (planButtons.length) {
        planButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove selected class from all plans
                planButtons.forEach(b => b.classList.remove('selected'));
                
                // Add selected class to clicked plan
                btn.classList.add('selected');
                
                // Update hidden plan input
                document.getElementById('selected-plan').value = btn.dataset.plan;
                
                // Update subscription button text with price
                const subBtn = document.getElementById('subscribe-button');
                if (subBtn && !isNewUser) {
                    const planPrice = btn.querySelector('.plan-price').textContent;
                    subBtn.textContent = `Subscribe for ${planPrice}`;
                }
            });
        });
        
        // Select the first plan by default
        planButtons[0].click();
    }
    
    // Check for successful redirect from Stripe
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    
    if (sessionId) {
        handleSuccessfulPayment(sessionId);
    }
}

// Get current user from local storage
function getCurrentUser() {
    const userData = localStorage.getItem('tease_user');
    return userData ? JSON.parse(userData) : null;
}

// Handle subscription form submission
async function handleSubscription(e) {
    e.preventDefault();
    
    const user = getCurrentUser();
    if (!user) {
        window.location.href = '/login.html';
        return;
    }
    
    const subscribeBtn = document.getElementById('subscribe-button');
    const statusEl = document.getElementById('payment-status');
    const selectedPlan = document.getElementById('selected-plan').value;
    const priceId = PRICE_IDS[selectedPlan];
    
    if (!priceId) {
        statusEl.textContent = 'Invalid plan selected. Please try again.';
        statusEl.classList.add('error');
        return;
    }
    
    // Disable button and show processing state
    subscribeBtn.disabled = true;
    subscribeBtn.textContent = 'Processing...';
    statusEl.textContent = '';
    statusEl.classList.remove('error');
    
    try {
        // Create Stripe customer
        statusEl.textContent = 'Creating customer...';
        const customerResponse = await fetch('/api/create-customer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: user.email || '',
                name: user.name || '',
                phone: user.phone || ''
            })
        });
        
        if (!customerResponse.ok) {
            const errorData = await customerResponse.json();
            throw new Error(errorData.error || 'Error creating customer');
        }
        
        const { customerId } = await customerResponse.json();
        
        // Store customer ID in user data
        user.stripeCustomerId = customerId;
        localStorage.setItem('tease_user', JSON.stringify(user));
        
        // Create Stripe checkout session
        statusEl.textContent = 'Redirecting to payment...';
        const checkoutResponse = await fetch('/api/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customerId,
                priceId,
                userId: user.id,
                userPhone: user.phone,
                successUrl: `${window.location.origin}/subscription-success.html`,
                cancelUrl: `${window.location.origin}/subscription.html`
            })
        });
        
        if (!checkoutResponse.ok) {
            const errorData = await checkoutResponse.json();
            throw new Error(errorData.error || 'Error creating checkout session');
        }
        
        const { url } = await checkoutResponse.json();
        
        // Redirect to Stripe Checkout
        window.location.href = url;
        
    } catch (error) {
        console.error('Subscription error:', error);
        statusEl.textContent = error.message;
        statusEl.classList.add('error');
        
        // Re-enable button
        subscribeBtn.disabled = false;
        subscribeBtn.textContent = 'Subscribe';
    }
}

// Handle successful payment after redirect
async function handleSuccessfulPayment(sessionId) {
    // Update UI to show confirmation
    showSubscriptionConfirmation();
    
    // In a real implementation, this would be handled by the webhook
    // This is just for the UI feedback
}

// Show subscription confirmation
function showSubscriptionConfirmation() {
    const subscriptionForm = document.getElementById('subscription-form');
    const confirmationEl = document.getElementById('subscription-confirmation');
    
    if (subscriptionForm) {
        subscriptionForm.classList.add('hidden');
    }
    
    if (confirmationEl) {
        confirmationEl.classList.remove('hidden');
    }
    
    // Get current user
    const user = getCurrentUser();
    
    // Check if user is newly signed up
    const isNewUser = user && user.created_at && 
                     (new Date() - new Date(user.created_at) < 1000 * 60 * 30); // 30 minutes
    
    // Update message
    const messageEl = document.getElementById('confirmation-message');
    if (messageEl && user) {
        if (isNewUser) {
            // Custom message for new users
            messageEl.textContent = `Welcome to Tease, ${user.name}!`;
        } else {
            // Standard message for returning users
            messageEl.textContent = `Thank you, ${user.name}! Your subscription is now active.`;
        }
    }
    
    // Update description for new users
    if (isNewUser && user && user.persona) {
        const descriptionEl = document.querySelector('.confirmation-description');
        if (descriptionEl) {
            descriptionEl.textContent = `Your subscription is active and you're all set to start your experience with ${user.persona}. Get ready for an intimate adventure tailored to your desires.`;
        }
    }
    
    // Setup continue button
    const continueBtn = document.getElementById('continue-to-chat');
    if (continueBtn) {
        // For new users, take them directly to chat with their selected persona
        if (isNewUser && user && user.persona) {
            continueBtn.textContent = `Start Chatting with ${user.persona}`;
            continueBtn.addEventListener('click', () => {
                window.location.href = '/chat.html';
            });
        } else {
            continueBtn.addEventListener('click', () => {
                window.location.href = '/chat.html';
            });
        }
    }
}

// Redirect to Stripe customer portal to manage subscription
async function manageSubscription() {
    const user = getCurrentUser();
    if (!user || !user.stripeCustomerId) {
        return;
    }
    
    try {
        const response = await fetch('/api/create-portal-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customerId: user.stripeCustomerId,
                returnUrl: `${window.location.origin}/dashboard.html`
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error creating portal session');
        }
        
        const { url } = await response.json();
        
        // Redirect to Stripe Customer Portal
        window.location.href = url;
    } catch (error) {
        console.error('Error accessing customer portal:', error);
        alert('There was an error accessing the subscription management portal. Please try again.');
    }
}

// Handle subscription management in dashboard
function initSubscriptionManagement() {
    const user = getCurrentUser();
    if (!user) {
        return;
    }
    
    // Setup manage subscription button
    const manageBtn = document.getElementById('manage-subscription');
    if (manageBtn) {
        manageBtn.addEventListener('click', manageSubscription);
    }
}

// Initialize the appropriate function based on the current page
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('/subscription')) {
        initSubscription();
    } else if (window.location.pathname.includes('/dashboard')) {
        initSubscriptionManagement();
    } else if (window.location.pathname.includes('/subscription-success')) {
        showSubscriptionConfirmation();
    }
});

// Subscription handler
document.addEventListener('DOMContentLoaded', function() {
    // Get user data
    const userData = JSON.parse(localStorage.getItem('tease_user') || '{}');
    const isNewUser = userData.created_at && 
                      (new Date() - new Date(userData.created_at) < 1000 * 60 * 30); // 30 minutes
    
    console.log('User data:', userData);
    console.log('Is new user:', isNewUser);
    
    // Check if user data exists
    if (!userData.id) {
        console.error('No user data found, redirecting to login');
        window.location.href = '/login.html';
        return;
    }
    
    // Handle form submission
    const paymentForm = document.getElementById('payment-form');
    if (paymentForm) {
        paymentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const selectedPlan = document.getElementById('selected-plan').value;
            const paymentStatus = document.getElementById('payment-status');
            
            // Set loading state
            const subscribeButton = document.getElementById('subscribe-button');
            const originalButtonText = subscribeButton.textContent;
            subscribeButton.textContent = 'Processing...';
            subscribeButton.disabled = true;
            
            // In a real app, this would create a Stripe checkout session
            // For this demo, we'll just simulate a successful payment
            setTimeout(() => {
                try {
                    console.log('Processing subscription to plan:', selectedPlan);
                    
                    // Update user data with subscription info
                    userData.isSubscribed = true;
                    userData.subscriptionPlan = selectedPlan;
                    userData.subscriptionDate = new Date().toISOString();
                    
                    // Save updated user data
                    localStorage.setItem('tease_user', JSON.stringify(userData));
                    
                    // Show success state or redirect
                    window.location.href = '/subscription-success.html';
                    
                } catch (error) {
                    console.error('Error processing subscription:', error);
                    
                    // Reset button
                    subscribeButton.textContent = originalButtonText;
                    subscribeButton.disabled = false;
                    
                    // Show error
                    if (paymentStatus) {
                        paymentStatus.textContent = 'There was an error processing your payment. Please try again.';
                        paymentStatus.classList.add('error');
                    }
                }
            }, 2000);
        });
    }
    
    // Handle subscription success page
    if (window.location.pathname.includes('/subscription-success')) {
        // Show appropriate success message
        if (isNewUser) {
            const confirmationMessage = document.querySelector('.confirmation-message');
            if (confirmationMessage) {
                confirmationMessage.textContent = "Welcome to Tease!";
            }
            
            const confirmationDescription = document.querySelector('.confirmation-description');
            if (confirmationDescription) {
                confirmationDescription.textContent = 
                    `Your subscription is active and you're all set to start your experience with ${userData.persona || 'your AI companion'}.`;
            }
        }
        
        // Set up continue button
        const continueButton = document.getElementById('continue-to-dashboard');
        if (continueButton) {
            continueButton.addEventListener('click', function() {
                window.location.href = '/dashboard.html';
            });
        }
    }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initSubscription();
});

// Check if user is logged in
function checkLoggedIn() {
  const userData = getCurrentUser();
  if (!userData.id) {
    // Redirect to login if user is not logged in
    window.location.href = '/login.html';
    return false;
  }
  return true;
}

// Check subscription status
async function checkSubscriptionStatus() {
  const userData = getCurrentUser();
  
  if (!userData.id) {
    return { subscribed: false };
  }
  
  try {
    // Get the latest subscription data from the database
    const { data, error } = await supabase
      .from('profiles')
      .select('subscription_status, stripe_customer_id')
      .eq('id', userData.id)
      .single();
    
    if (error) throw error;
    
    // Update local storage with latest status
    userData.subscription_status = data.subscription_status;
    localStorage.setItem('tease_user', JSON.stringify(userData));
    
    return { 
      subscribed: data.subscription_status,
      stripeCustomerId: data.stripe_customer_id
    };
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return { subscribed: false };
  }
}

// Get packages for a specific model
async function getPackagesForModel(modelId) {
  try {
    // Get the model
    const { data: model, error: modelError } = await supabase
      .from('models')
      .select('*')
      .eq('id', modelId)
      .single();
    
    if (modelError) throw modelError;
    
    // Get packages for this model
    const { data: packages, error: packagesError } = await supabase
      .from('packages')
      .select('*')
      .eq('model_id', modelId);
    
    if (packagesError) throw packagesError;
    
    return { model, packages };
  } catch (error) {
    console.error('Error getting packages:', error);
    return { model: null, packages: [] };
  }
}

// Start Stripe checkout session
async function startCheckout(packageId) {
  const userData = getCurrentUser();
  
  if (!userData.id) {
    return { success: false, message: 'User not logged in' };
  }
  
  try {
    // In a real app, this would call a serverless function or API endpoint
    // to create a Stripe Checkout session
    
    // For this example, we're simulating the API call
    
    // First, get the package details
    const { data: packageData, error: packageError } = await supabase
      .from('packages')
      .select('*')
      .eq('id', packageId)
      .single();
    
    if (packageError) throw packageError;
    
    // Normally this would be handled by a server endpoint that creates
    // a Stripe Checkout session and returns the session ID
    
    // Simulate the redirect to Stripe checkout
    // In a real app, this would be:
    // window.location.href = session.url;
    
    // For demo purposes, let's simulate a successful subscription
    simulateSuccessfulSubscription(userData.id, packageData);
    
    return { 
      success: true, 
      message: 'Redirecting to checkout...',
      package: packageData
    };
  } catch (error) {
    console.error('Error starting checkout:', error);
    return { success: false, message: 'Failed to start checkout process' };
  }
}

// Simulate a successful subscription (demo purposes only)
// In a real app, this would be handled by a Stripe webhook
async function simulateSuccessfulSubscription(userId, packageData) {
  try {
    // Generate a fake Stripe customer ID
    const stripeCustomerId = 'cus_' + Math.random().toString(36).substring(2, 15);
    
    // Update the user's profile
    const { error } = await supabase
      .from('profiles')
      .update({ 
        subscription_status: true,
        stripe_customer_id: stripeCustomerId
      })
      .eq('id', userId);
    
    if (error) throw error;
    
    // Update local storage
    const userData = getCurrentUser();
    userData.subscription_status = true;
    localStorage.setItem('tease_user', JSON.stringify(userData));
    
    // Simulate checkout completion after a delay
    setTimeout(() => {
      // Show success message
      alert(`Successfully subscribed to ${packageData.name} for ${packageData.price}!`);
      
      // Redirect to dashboard
      window.location.href = '/dashboard.html';
    }, 3000);
    
  } catch (error) {
    console.error('Error simulating subscription:', error);
  }
}

// Manage existing subscription
async function manageSubscription() {
  const { subscribed, stripeCustomerId } = await checkSubscriptionStatus();
  
  if (!subscribed || !stripeCustomerId) {
    return { success: false, message: 'No active subscription found' };
  }
  
  try {
    // In a real app, this would create a Stripe Customer Portal session
    // and redirect the user to it
    
    // For this example, we're simulating the portal link
    
    // Simulate redirect to Stripe portal
    alert('In a real app, this would redirect to the Stripe Customer Portal where you can manage your subscription.');
    
    return { success: true };
  } catch (error) {
    console.error('Error managing subscription:', error);
    return { success: false, message: 'Failed to open subscription management' };
  }
}

// Cancel subscription
async function cancelSubscription() {
  const userData = getCurrentUser();
  
  if (!userData.id) {
    return { success: false, message: 'User not logged in' };
  }
  
  try {
    // In a real app, this would call a serverless function or API endpoint
    // to cancel the subscription in Stripe
    
    // For this example, we're just updating the database directly
    
    // Update the user's profile
    const { error } = await supabase
      .from('profiles')
      .update({ 
        subscription_status: false
      })
      .eq('id', userData.id);
    
    if (error) throw error;
    
    // Update local storage
    userData.subscription_status = false;
    localStorage.setItem('tease_user', JSON.stringify(userData));
    
    return { success: true, message: 'Subscription canceled successfully' };
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return { success: false, message: 'Failed to cancel subscription' };
  }
}

// Initialize subscription page
function initSubscriptionPage() {
  if (!checkLoggedIn()) return;
  
  const packageContainer = document.getElementById('package-container');
  const loadingElement = document.getElementById('loading-message');
  const modelNameElement = document.getElementById('model-name');
  const modelImageElement = document.getElementById('model-image');
  const modelBioElement = document.getElementById('model-bio');
  
  // Check if user is already subscribed
  checkSubscriptionStatus().then(({ subscribed }) => {
    if (subscribed) {
      // If already subscribed, redirect to dashboard
      window.location.href = '/dashboard.html';
      return;
    }
    
    const userData = getCurrentUser();
    
    if (!userData.model_id) {
      loadingElement.textContent = 'Error: No model selected. Please restart signup.';
      return;
    }
    
    // Load packages for the user's model
    getPackagesForModel(userData.model_id).then(({ model, packages }) => {
      if (!model || !packages.length) {
        loadingElement.textContent = 'No subscription packages found for this model.';
        return;
      }
      
      // Update model information
      if (modelNameElement) modelNameElement.textContent = model.name;
      if (modelBioElement) modelBioElement.textContent = model.bio || '';
      
      if (modelImageElement && model.pictures && model.pictures.length > 0) {
        modelImageElement.src = `/images/models/${model.pictures[0]}`;
        modelImageElement.alt = `${model.name} - AI Companion`;
      }
      
      // Hide loading message
      loadingElement.style.display = 'none';
      
      // Display packages
      packageContainer.innerHTML = '';
      
      packages.forEach(pkg => {
        const packageCard = document.createElement('div');
        packageCard.className = 'package-card';
        
        // Determine if this is the recommended package
        const isRecommended = pkg.name.toLowerCase().includes('premium');
        
        packageCard.innerHTML = `
          ${isRecommended ? '<div class="recommended-badge">RECOMMENDED</div>' : ''}
          <h3 class="package-name">${pkg.name}</h3>
          <div class="package-price">$${parseFloat(pkg.price).toFixed(2)}<span>/month</span></div>
          <div class="package-description">${pkg.description || 'Access to exclusive content and chats'}</div>
          <button class="subscribe-button" data-package-id="${pkg.id}">Subscribe Now</button>
        `;
        
        packageContainer.appendChild(packageCard);
      });
      
      // Add event listeners to subscribe buttons
      const subscribeButtons = document.querySelectorAll('.subscribe-button');
      subscribeButtons.forEach(button => {
        button.addEventListener('click', async function() {
          // Disable all buttons
          subscribeButtons.forEach(btn => {
            btn.disabled = true;
            btn.textContent = 'Processing...';
          });
          
          // Get package ID
          const packageId = this.getAttribute('data-package-id');
          
          // Start checkout
          const result = await startCheckout(packageId);
          
          if (!result.success) {
            alert(result.message);
            
            // Re-enable buttons
            subscribeButtons.forEach(btn => {
              btn.disabled = false;
              btn.textContent = 'Subscribe Now';
            });
          }
        });
      });
    });
  });
}

// Initialize dashboard subscription section
function initDashboardSubscription() {
  const manageSubscriptionButton = document.getElementById('manage-subscription');
  
  if (manageSubscriptionButton) {
    manageSubscriptionButton.addEventListener('click', async function() {
      this.disabled = true;
      this.textContent = 'Loading...';
      
      const result = await manageSubscription();
      
      if (!result.success) {
        alert(result.message);
      }
      
      this.disabled = false;
      this.textContent = 'Manage Subscription';
    });
  }
}

// Export functions for use in other scripts
window.teaseSubscription = {
  checkSubscriptionStatus,
  getPackagesForModel,
  startCheckout,
  manageSubscription,
  cancelSubscription,
  initSubscriptionPage,
  initDashboardSubscription
}; 