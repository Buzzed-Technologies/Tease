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
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Initialize subscription system
function initSubscription() {
    console.log('Initializing subscription system...');
    
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
    }
    
    // Update subscription status if already subscribed
    if (user.isSubscribed || user.subscription_status) {
        console.log('User is already subscribed, redirecting to dashboard');
        window.location.href = '/dashboard.html';
        return;
    }
    
    // Get Stripe public key from meta tag
    const metaTag = document.querySelector('meta[name="stripe-public-key"]');
    if (metaTag) {
        STRIPE_PUBLIC_KEY = metaTag.getAttribute('content');
        if (!STRIPE_PUBLIC_KEY || STRIPE_PUBLIC_KEY.includes('%STRIPE_PUBLIC_KEY%')) {
            console.log('Using default Stripe key from subscription.js');
            // Fallback to a hardcoded key
            STRIPE_PUBLIC_KEY = 'pk_test_51Qah6MB71e12H8w7K3mN0Lr2QGdIIINvDjq5ivnX8w1nqtT4bdlcZ2kcEkD3QPUOSeaUBNFYU9MrwHijB2Sw771u00HZSFE7JE';
        }
    } else {
        console.log('No meta tag for Stripe key, using default');
        STRIPE_PUBLIC_KEY = 'pk_test_51Qah6MB71e12H8w7K3mN0Lr2QGdIIINvDjq5ivnX8w1nqtT4bdlcZ2kcEkD3QPUOSeaUBNFYU9MrwHijB2Sw771u00HZSFE7JE';
    }
    
    console.log('Initializing Stripe with key starting with:', STRIPE_PUBLIC_KEY.substring(0, 10) + '...');
    
    // Initialize Stripe only if it's not already initialized
    if (!window.Stripe) {
        console.error('Stripe library not loaded!');
    } else if (!stripe) {
        stripe = window.Stripe(STRIPE_PUBLIC_KEY);
        console.log('Stripe initialized');
    }
    
    // Check for successful redirect from Stripe
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    
    if (sessionId) {
        console.log('Session ID found in URL, handling successful payment');
        handleSuccessfulPayment(sessionId);
    }
    
    // Add direct click handler to any subscription buttons
    document.querySelectorAll('.package-button').forEach(button => {
        button.addEventListener('click', function(e) {
            console.log('Button clicked via event listener in subscription.js');
            const packageId = this.getAttribute('data-package-id');
            const priceId = this.getAttribute('data-price-id');
            handleSubscriptionRequest(e, packageId, priceId);
        });
    });
}

// Get current user from local storage
function getCurrentUser() {
    const userData = localStorage.getItem('tease_user');
    return userData ? JSON.parse(userData) : null;
}

// Handle subscription request
async function handleSubscriptionRequest(event, packageId, priceId) {
    console.log('Handling subscription request:', { packageId, priceId });
    
    if (!packageId || !priceId) {
        console.error('Missing package or price ID');
        alert('Invalid subscription selection. Please try again.');
        return;
    }
    
    const user = getCurrentUser();
    if (!user) {
        console.error('No user data found');
        window.location.href = '/login.html';
        return;
    }
    
    // Find the button element
    let button;
    if (event && event.target) {
        button = event.target.closest('.package-button');
    }
    if (!button && packageId) {
        button = document.querySelector(`.package-button[data-package-id="${packageId}"]`);
    }
    
    // Disable all buttons to prevent double submissions
    document.querySelectorAll('.package-button').forEach(btn => {
        btn.disabled = true;
        btn.classList.add('processing');
        btn.textContent = 'Processing...';
    });
    
    try {
        // Create or update customer in Stripe
        console.log('Creating/updating Stripe customer for user:', user.id);
        
        const customerData = {
            name: user.name || 'Tease User',
            email: user.email || `${user.telegram}@example.com`, // Using telegram as placeholder email if needed
            phone: user.telegram || user.phone // Using telegram as contactable info
        };
        
        const createCustomerResponse = await fetch('/api/create-customer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(customerData)
        });
        
        if (!createCustomerResponse.ok) {
            const errorData = await createCustomerResponse.json();
            throw new Error(errorData.error || 'Error creating Stripe customer');
        }
        
        const { customerId } = await createCustomerResponse.json();
        console.log('Customer ID:', customerId);
        
        // Update user with customer ID
        user.stripe_customer_id = customerId;
        localStorage.setItem('tease_user', JSON.stringify(user));
        
        // Create checkout session
        console.log('Creating checkout session with:', { priceId, customerId });
        
        const sessionData = {
            priceId,
            customerId,
            userId: user.id,
            userPhone: user.telegram || user.phone,
            successUrl: `${window.location.origin}/subscription-success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancelUrl: window.location.origin + '/subscription.html'
        };
        
        const checkoutResponse = await fetch('/api/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sessionData)
        });
        
        if (!checkoutResponse.ok) {
            const errorData = await checkoutResponse.json();
            throw new Error(errorData.error || 'Error creating checkout session');
        }
        
        const session = await checkoutResponse.json();
        console.log('Checkout session created:', session);
        
        // Redirect to Stripe checkout
        if (session.url) {
            console.log('Redirecting to Stripe checkout URL:', session.url);
            window.location.href = session.url;
        } else if (session.sessionId) {
            console.log('Redirecting via Stripe.js with session ID:', session.sessionId);
            if (stripe) {
                await stripe.redirectToCheckout({ sessionId: session.sessionId });
            } else {
                throw new Error('Stripe is not initialized');
            }
        } else {
            throw new Error('No checkout URL or session ID returned from server');
        }
        
    } catch (error) {
        console.error('Subscription error:', error);
        alert(error.message || 'An error occurred while processing your subscription. Please try again.');
        
        // Re-enable all buttons
        document.querySelectorAll('.package-button').forEach(btn => {
            btn.disabled = false;
            btn.classList.remove('processing');
            btn.textContent = 'Subscribe Now';
        });
    }
}

// Handle successful payment after redirect
async function handleSuccessfulPayment(sessionId) {
    console.log('Processing successful payment with session ID:', sessionId);
    
    // Get user data
    const user = getCurrentUser();
    if (!user) {
        console.error('No user data found');
        window.location.href = '/login.html';
        return;
    }
    
    try {
        // Verify the session with the server
        const verifyResponse = await fetch('/api/verify-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
        });
        
        if (!verifyResponse.ok) {
            const errorData = await verifyResponse.json();
            throw new Error(errorData.error || 'Error verifying session');
        }
        
        console.log('Session verified successfully');
        
        // Update user data in local storage
        user.subscribed = true;
        user.subscription_status = true;
        user.subscriptionDate = new Date().toISOString();
        localStorage.setItem('tease_user', JSON.stringify(user));
        
        // Update user data in database
        await supabase
            .from('profiles')
            .update({ 
                subscription_status: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id);
        
        // Redirect to success page if not already there
        if (!window.location.pathname.includes('subscription-success')) {
            window.location.href = '/subscription-success.html';
        }
        
    } catch (error) {
        console.error('Error processing payment verification:', error);
        alert(`There was an issue verifying your payment. If you were charged, please contact support with this reference: ${sessionId}`);
    }
}

// Show subscription confirmation
function showSubscriptionConfirmation() {
    // Get current user
    const user = getCurrentUser();
    
    // Check if user is newly signed up
    const isNewUser = user && user.created_at && 
                     (new Date() - new Date(user.created_at) < 1000 * 60 * 30); // 30 minutes
    
    // Update message for new users if on success page
    if (window.location.pathname.includes('subscription-success') && isNewUser && user && user.persona) {
        document.querySelectorAll('.package-button').forEach(btn => {
            btn.disabled = false;
            btn.classList.remove('processing');
            btn.textContent = 'Subscribe Now';
        });
        
        const confirmationMessage = document.querySelector('.confirmation-message');
        if (confirmationMessage) {
            confirmationMessage.textContent = "Welcome to Tease!";
        }
        
        const confirmationDescription = document.querySelector('.confirmation-description');
        if (confirmationDescription) {
            confirmationDescription.textContent = 
                `Your subscription is active and you're all set to start your experience with ${user.persona}. Get ready for an intimate adventure tailored to your desires.`;
        }
        
        // Set up continue button to go directly to chat
        const continueButton = document.getElementById('continue-to-dashboard');
        if (continueButton) {
            continueButton.textContent = `Start Chatting with ${user.persona}`;
            continueButton.addEventListener('click', function() {
                window.location.href = '/chat.html';
            });
        }
    }
}

// Export functions 
window.teaseSubscription = {
    init: initSubscription,
    handleRequest: handleSubscriptionRequest
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing subscription handler');
    initSubscription();
}); 