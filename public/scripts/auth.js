// Supabase client initialization
const supabaseUrl = 'https://kigcecwfxlonrdxjwsza.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZ2NlY3dmeGxvbnJkeGp3c3phIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk3OTE3MjAsImV4cCI6MjAyNTM2NzcyMH0.kw2nw7VW3QXTzWM7ynmm7Q2k7W4e5JKgf2i-k9K0Sns';
const supabase = supabase.createClient(supabaseUrl, supabaseAnonKey);

// DOM Elements
let loginForm, signupForm, personaSelector, personaSelected = null;

// Initialize the auth system
function initAuth() {
    // Check if user is logged in
    const user = getCurrentUser();
    updateAuthUI(user);

    // Setup event listeners for login and signup forms
    loginForm = document.getElementById('login-form');
    signupForm = document.getElementById('signup-form');
    personaSelector = document.querySelector('.persona-selection');

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }

    // Setup persona selection
    if (personaSelector) {
        const personas = personaSelector.querySelectorAll('.persona-card');
        personas.forEach(persona => {
            persona.addEventListener('click', () => {
                personaSelected = persona.dataset.persona;
                personas.forEach(p => p.classList.remove('selected'));
                persona.classList.add('selected');
                
                // Enable continue button
                const continueBtn = document.getElementById('persona-continue');
                if (continueBtn) {
                    continueBtn.disabled = false;
                }
            });
        });

        // Continue button
        const continueBtn = document.getElementById('persona-continue');
        if (continueBtn) {
            continueBtn.addEventListener('click', () => {
                if (personaSelected) {
                    // Show the signup form
                    document.querySelector('.onboarding-step.step-1').classList.add('hidden');
                    document.querySelector('.onboarding-step.step-2').classList.remove('hidden');
                    
                    // Set selected persona in hidden input
                    document.getElementById('selected-persona').value = personaSelected;
                }
            });
        }
    }

    // Setup logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

// Get current user from local storage
function getCurrentUser() {
    const userData = localStorage.getItem('tease_user');
    return userData ? JSON.parse(userData) : null;
}

// Update UI based on authentication state
function updateAuthUI(user) {
    const authLinks = document.querySelectorAll('.auth-link');
    const userLinks = document.querySelectorAll('.user-link');
    
    if (user) {
        // User is logged in
        authLinks.forEach(link => link.classList.add('hidden'));
        userLinks.forEach(link => link.classList.remove('hidden'));
        
        // Update user name display
        const userNameEls = document.querySelectorAll('.user-name');
        userNameEls.forEach(el => {
            el.textContent = user.name;
        });
        
        // If on dashboard, load user data
        if (window.location.pathname.includes('/dashboard')) {
            loadUserDashboard(user);
        }
        
        // If on chat page, initialize chat with the user's persona
        if (window.location.pathname.includes('/chat')) {
            initializeChat(user.persona);
        }
    } else {
        // User is not logged in
        authLinks.forEach(link => link.classList.remove('hidden'));
        userLinks.forEach(link => link.classList.add('hidden'));
        
        // Redirect from protected pages
        if (
            window.location.pathname.includes('/dashboard') || 
            window.location.pathname.includes('/chat')
        ) {
            window.location.href = '/login.html';
        }
    }
}

// Handle login form submission
async function handleLogin(e) {
    e.preventDefault();
    
    const phone = document.getElementById('login-phone').value;
    const password = document.getElementById('login-password').value;
    const statusEl = document.getElementById('login-status');
    
    try {
        statusEl.textContent = 'Logging in...';
        statusEl.classList.remove('error');
        
        // Query the sex_mode table for user with this phone & password
        const { data, error } = await supabase
            .from('sex_mode')
            .select('*')
            .eq('phone', phone)
            .single();
            
        if (error) throw error;
        
        if (!data) {
            throw new Error('User not found');
        }
        
        // Verify password (in production, use secure auth methods)
        if (data.password !== password) {
            throw new Error('Incorrect password');
        }
        
        // Store user in local storage
        localStorage.setItem('tease_user', JSON.stringify({
            id: data.id,
            phone: data.phone,
            name: data.name,
            persona: data.persona,
            isSubscribed: data.is_subscribed
        }));
        
        // Redirect based on subscription status
        if (data.is_subscribed) {
            window.location.href = '/dashboard.html';
        } else {
            window.location.href = '/subscription.html';
        }
    } catch (error) {
        console.error('Login error:', error);
        statusEl.textContent = error.message;
        statusEl.classList.add('error');
    }
}

// Handle signup form submission
async function handleSignup(e) {
    e.preventDefault();
    
    const name = document.getElementById('signup-name').value;
    const phone = document.getElementById('signup-phone').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;
    const persona = document.getElementById('selected-persona').value;
    const statusEl = document.getElementById('signup-status');
    
    try {
        // Validation
        if (!name || !phone || !password || !confirmPassword || !persona) {
            throw new Error('All fields are required');
        }
        
        if (password !== confirmPassword) {
            throw new Error('Passwords do not match');
        }
        
        statusEl.textContent = 'Creating account...';
        statusEl.classList.remove('error');
        
        // Check if user already exists
        const { data: existingUser } = await supabase
            .from('sex_mode')
            .select('phone')
            .eq('phone', phone)
            .single();
            
        if (existingUser) {
            throw new Error('An account with this phone number already exists');
        }
        
        // Insert new user
        const { data, error } = await supabase
            .from('sex_mode')
            .insert([
                { 
                    phone, 
                    name, 
                    password, 
                    persona,
                    is_subscribed: false,
                    created_at: new Date()
                }
            ])
            .select()
            .single();
            
        if (error) throw error;
        
        // Store user in local storage
        localStorage.setItem('tease_user', JSON.stringify({
            id: data.id,
            phone: data.phone,
            name: data.name,
            persona: data.persona,
            isSubscribed: false
        }));
        
        // Proceed to subscription page
        window.location.href = '/subscription.html';
    } catch (error) {
        console.error('Signup error:', error);
        statusEl.textContent = error.message;
        statusEl.classList.add('error');
    }
}

// Handle logout
function handleLogout() {
    localStorage.removeItem('tease_user');
    window.location.href = '/index.html';
}

// Load user dashboard data
async function loadUserDashboard(user) {
    try {
        // Fetch latest user data
        const { data, error } = await supabase
            .from('sex_mode')
            .select('*')
            .eq('phone', user.phone)
            .single();
            
        if (error) throw error;
        
        // Update subscription status display
        const subscriptionStatus = document.getElementById('subscription-status');
        if (subscriptionStatus) {
            if (data.is_subscribed) {
                subscriptionStatus.textContent = 'Active';
                subscriptionStatus.classList.add('active');
            } else {
                subscriptionStatus.textContent = 'Inactive';
                subscriptionStatus.classList.remove('active');
            }
        }
        
        // Update user info
        const userPhoneEl = document.getElementById('user-phone');
        if (userPhoneEl) {
            userPhoneEl.textContent = data.phone;
        }
        
        // Update selected persona
        const userPersonaEl = document.getElementById('user-persona');
        if (userPersonaEl) {
            userPersonaEl.textContent = data.persona.charAt(0).toUpperCase() + data.persona.slice(1);
        }
        
        // Update account creation date
        const createdAtEl = document.getElementById('account-created');
        if (createdAtEl && data.created_at) {
            const createdDate = new Date(data.created_at);
            createdAtEl.textContent = createdDate.toLocaleDateString();
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initAuth); 