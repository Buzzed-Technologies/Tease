// Stripe subscription management
// The public key will be injected from environment variables
let STRIPE_PUBLIC_KEY = '';
let stripe, elements, cardElement;

// Product and price IDs
const PRODUCT_ID = 'prod_SHH0ETnX7ueUOc';
const PRICE_IDS = {
    yearly: 'price_1RMiTFB71e12H8w7mfD9dfc9',
    quarterly: 'price_1RMiSnB71e12H8w7iJ73uN0u',
    monthly: 'price_1RMiSBB71e12H8w7sPZau77s'
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
    
    // Initialize Stripe elements
    stripe = Stripe(STRIPE_PUBLIC_KEY);
    elements = stripe.elements();
    
    // Create card element
    cardElement = elements.create('card', {
        style: {
            base: {
                color: '#ffffff',
                fontFamily: '"Montserrat", sans-serif',
                fontSmoothing: 'antialiased',
                fontSize: '16px',
                '::placeholder': {
                    color: '#aab7c4'
                }
            },
            invalid: {
                color: '#fa755a',
                iconColor: '#fa755a'
            }
        }
    });
    
    // Mount card element
    const cardContainer = document.getElementById('card-element');
    if (cardContainer) {
        cardElement.mount('#card-element');
    }
    
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
        // Create payment method
        const { paymentMethod, error } = await stripe.createPaymentMethod({
            type: 'card',
            card: cardElement
        });
        
        if (error) {
            throw new Error(error.message);
        }
        
        // Create Stripe customer
        statusEl.textContent = 'Creating customer...';
        const customerResponse = await fetch('/api/create-customer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: user.email || '',
                name: user.name || '',
                phone: user.phone || '',
                paymentMethodId: paymentMethod.id
            })
        });
        
        if (!customerResponse.ok) {
            const errorData = await customerResponse.json();
            throw new Error(errorData.error || 'Error creating customer');
        }
        
        const { customerId } = await customerResponse.json();
        
        // Create subscription
        statusEl.textContent = 'Setting up subscription...';
        const subscriptionResponse = await fetch('/api/create-subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customerId,
                priceId
            })
        });
        
        if (!subscriptionResponse.ok) {
            const errorData = await subscriptionResponse.json();
            throw new Error(errorData.error || 'Error creating subscription');
        }
        
        const { subscriptionId, clientSecret, status } = await subscriptionResponse.json();
        
        // If payment requires authentication, confirm it
        if (status === 'incomplete' && clientSecret) {
            statusEl.textContent = 'Confirming payment...';
            const { error: confirmError } = await stripe.confirmCardPayment(clientSecret);
            
            if (confirmError) {
                throw new Error(confirmError.message);
            }
        }
        
        // Update user subscription status in Supabase
        statusEl.textContent = 'Updating account...';
        const { error: updateError } = await supabase
            .from('sex_mode')
            .update({ 
                is_subscribed: true,
                subscription_plan: selectedPlan,
                subscription_start: new Date().toISOString(),
                stripe_customer_id: customerId,
                stripe_subscription_id: subscriptionId
            })
            .eq('phone', user.phone);
        
        if (updateError) {
            throw new Error(updateError.message);
        }
        
        // Update user in local storage
        user.isSubscribed = true;
        user.stripeCustomerId = customerId;
        user.stripeSubscriptionId = subscriptionId;
        localStorage.setItem('tease_user', JSON.stringify(user));
        
        // Show confirmation
        showSubscriptionConfirmation();
    } catch (error) {
        console.error('Subscription error:', error);
        statusEl.textContent = error.message;
        statusEl.classList.add('error');
        
        // Re-enable button
        subscribeBtn.disabled = false;
        subscribeBtn.textContent = 'Subscribe';
    }
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

// Cancel subscription
async function cancelSubscription() {
    const user = getCurrentUser();
    if (!user || !user.isSubscribed || !user.stripeSubscriptionId) {
        return;
    }
    
    const confirmCancel = confirm('Are you sure you want to cancel your subscription? You will lose access to premium features.');
    
    if (confirmCancel) {
        try {
            // Cancel subscription in Stripe
            const cancelResponse = await fetch('/api/cancel-subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subscriptionId: user.stripeSubscriptionId
                })
            });
            
            if (!cancelResponse.ok) {
                const errorData = await cancelResponse.json();
                throw new Error(errorData.error || 'Error canceling subscription');
            }
            
            // Update user subscription status in Supabase
            const { error } = await supabase
                .from('sex_mode')
                .update({ 
                    is_subscribed: false,
                    subscription_end: new Date().toISOString()
                })
                .eq('phone', user.phone);
            
            if (error) {
                throw new Error(error.message);
            }
            
            // Update user in local storage
            user.isSubscribed = false;
            localStorage.setItem('tease_user', JSON.stringify(user));
            
            // Update UI
            alert('Your subscription has been canceled.');
            window.location.reload();
        } catch (error) {
            console.error('Error canceling subscription:', error);
            alert('There was an error canceling your subscription. Please try again.');
        }
    }
}

// Handle subscription management in dashboard
function initSubscriptionManagement() {
    const user = getCurrentUser();
    if (!user) {
        return;
    }
    
    // Setup cancel subscription button
    const cancelBtn = document.getElementById('cancel-subscription');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', cancelSubscription);
    }
}

// Initialize the appropriate function based on the current page
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('/subscription')) {
        initSubscription();
    } else if (window.location.pathname.includes('/dashboard')) {
        initSubscriptionManagement();
    }
}); 