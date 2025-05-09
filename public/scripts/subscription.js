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

// Initialize subscription system
function initSubscription() {
    // Check if user is logged in
    const user = getCurrentUser();
    if (!user) {
        window.location.href = '/login.html';
        return;
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
                if (subBtn) {
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
    
    // Update message
    const messageEl = document.getElementById('confirmation-message');
    if (messageEl) {
        const user = getCurrentUser();
        if (user) {
            messageEl.textContent = `Thank you, ${user.name}! Your subscription is now active.`;
        }
    }
    
    // Setup continue button
    const continueBtn = document.getElementById('continue-to-chat');
    if (continueBtn) {
        continueBtn.addEventListener('click', () => {
            window.location.href = '/chat.html';
        });
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