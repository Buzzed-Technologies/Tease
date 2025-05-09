// Supabase client initialization
const supabaseUrl = 'https://kigcecwfxlonrdxjwsza.supabase.co';

// Try to get the API key from different sources
let supabaseAnonKey;

// Function to initialize Supabase client
function initSupabase() {
    try {
        // Create the client using the imported library
        console.log('Initializing Supabase client');
        return window.supabase.createClient(supabaseUrl, supabaseAnonKey);
    } catch (error) {
        console.error('Failed to initialize Supabase client:', error);
        return null;
    }
}

// Check for API key in various sources
if (typeof window !== 'undefined') {
    // Try to get from window.__env__ (sometimes used for client-side env vars)
    if (window.__env__ && window.__env__.SUPABASE_ANON_KEY) {
        supabaseAnonKey = window.__env__.SUPABASE_ANON_KEY;
        console.log('Using Supabase key from window.__env__');
    } 
    // Try to get from a meta tag
    else {
        const metaKey = document.querySelector('meta[name="supabase-anon-key"]');
        if (metaKey) {
            supabaseAnonKey = metaKey.getAttribute('content');
            console.log('Using Supabase key from meta tag');
        }
        // Use the hardcoded key as last resort
        else {
            supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZ2NlY3dmeGxvbnJkeGp3c3phIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk3OTE3MjAsImV4cCI6MjAyNTM2NzcyMH0.kw2nw7VW3QXTzWM7ynmm7Q2k7W4e5JKgf2i-k9K0Sns';
            console.log('Using hardcoded Supabase key');
        }
    }
}

// Initialize the Supabase client
const supabase = initSupabase();

// DOM Elements
let loginForm, signupForm, personaButtons, personaSelected = null;

// Track initialization status
let isInitialized = false;

// Initialize the auth system
function initAuth() {
    // Prevent double initialization
    if (isInitialized) {
        console.log('Auth system already initialized, skipping');
        return;
    }
    
    try {
        console.log('Initializing auth system...');
        
        // Check if we're in a browser environment
        if (typeof window === 'undefined' || !document) {
            console.warn('Not in browser environment, skipping auth initialization');
            return;
        }
        
        // Check if user is logged in
        const user = getCurrentUser();
        console.log('Current user:', user ? 'Logged in as ' + user.name : 'Not logged in');
        
        // Update UI based on auth state
        updateAuthUI(user);
        
        // Only run page-specific code if we're on that page
        const path = window.location.pathname;
        console.log('Current path:', path);
        
        // Setup event listeners for login form - only on login page
        if (path.includes('/login')) {
            console.log('Setting up login form handlers');
            loginForm = document.getElementById('login-form');
            if (loginForm) {
                loginForm.addEventListener('submit', handleLogin);
                console.log('Login form handler attached');
            } else {
                console.warn('Login form not found');
            }
        }
        
        // Homepage and signup functionality
        if (path === '/' || path === '/index.html' || path.endsWith('/')) {
            console.log('Setting up homepage functionality');
            
            // Setup event listeners for signup form
            setupSignupForm();
            
            // Setup persona selection from homepage
            setupPersonaSelection();
        }
        
        // Setup logout button - only on pages with dashboard features
        if (path.includes('/dashboard') || path.includes('/chat')) {
            console.log('Setting up dashboard functionality');
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', handleLogout);
                console.log('Logout button handler attached');
            } else {
                console.warn('Logout button not found');
            }
        }
        
        // Mark as initialized
        isInitialized = true;
        console.log('Auth system initialization complete');
        
    } catch (error) {
        console.error('Error initializing auth system:', error);
    }
}

// Setup signup form handlers
function setupSignupForm() {
    // Only run on the homepage to avoid errors on other pages
    const path = window.location.pathname;
    if (path !== '/' && path !== '/index.html' && !path.endsWith('/')) {
        return;
    }
    
    // Look for signup form in the current page
    signupForm = document.getElementById('signup-form');
    
    if (signupForm) {
        // For homepage signup form
        const signupButton = document.getElementById('signup-button');
        if (signupButton) {
            // Remove existing listeners to prevent duplicates by cloning the button
            const newButton = signupButton.cloneNode(true);
            signupButton.parentNode.replaceChild(newButton, signupButton);
            
            // Add click event listener to the new button
            newButton.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Check if all required elements exist first
                const nameEl = document.getElementById('name');
                const phoneEl = document.getElementById('phone');
                const passwordEl = document.getElementById('password'); 
                const confirmPasswordEl = document.getElementById('confirm-password');
                const statusEl = document.getElementById('signup-message');
                
                if (!nameEl || !phoneEl || !passwordEl || !confirmPasswordEl || !statusEl) {
                    console.error('Required signup form elements not found - aborting signup');
                    return;
                }
                
                // Now we can be sure all elements exist when calling handleSignupFromHomepage
                handleSignupFromHomepage();
            });
        } else {
            console.warn('Signup button not found');
        }
    } else {
        console.warn('Signup form not found');
    }
}

// Setup persona selection from homepage
function setupPersonaSelection() {
    // Only run on the homepage to avoid errors on other pages
    if (window.location.pathname !== '/' && 
        window.location.pathname !== '/index.html' && 
        !window.location.pathname.endsWith('/')) {
        return;
    }
    
    // Get all persona buttons on the homepage
    personaButtons = document.querySelectorAll('.persona-button');
    
    if (personaButtons && personaButtons.length > 0) {
        personaButtons.forEach(button => {
            button.addEventListener('click', function() {
                const persona = button.closest('.persona');
                if (!persona) return;
                
                const personaNameEl = persona.querySelector('h3');
                const personaStyle = persona.getAttribute('data-style');
                
                if (!personaNameEl || !personaStyle) return;
                
                const personaName = personaNameEl.textContent;
                
                // Store the selected persona
                personaSelected = {
                    name: personaName,
                    style: personaStyle
                };
                
                // Update hidden input with selected persona
                const selectedPersonaInput = document.getElementById('selected-persona');
                if (selectedPersonaInput) {
                    selectedPersonaInput.value = personaStyle;
                }
                
                // Remove selected class from all personas
                document.querySelectorAll('.persona').forEach(p => {
                    p.classList.remove('selected');
                });
                
                // Add selected class to this persona
                persona.classList.add('selected');
                
                // Update button text
                button.textContent = 'Selected';
                
                // Scroll to signup section after a delay
                const screens = document.querySelectorAll('.screen');
                if (screens && screens.length) {
                    const ctaSectionIndex = Array.from(screens).findIndex(screen => screen.id === 'cta');
                    if (ctaSectionIndex !== -1) {
                        setTimeout(() => {
                            window.dispatchEvent(new CustomEvent('scrollToSection', { 
                                detail: { sectionIndex: ctaSectionIndex } 
                            }));
                        }, 500);
                    }
                }
            });
        });
    }
}

// Get current user from local storage
function getCurrentUser() {
    const userData = localStorage.getItem('tease_user');
    return userData ? JSON.parse(userData) : null;
}

// Update UI based on authentication state
function updateAuthUI(user) {
    // Safely get auth-related elements
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
        
        // Get current page path
        const path = window.location.pathname;
        
        // If on dashboard, load user data
        if (path.includes('/dashboard')) {
            loadUserDashboard(user);
        }
        
        // If on chat page, initialize chat with the user's persona
        if (path.includes('/chat')) {
            if (typeof initializeChat === 'function') {
                initializeChat(user.persona);
            }
        }
        
        // If on homepage and logged in, maybe show a welcome back message
        if (path === '/' || path === '/index.html' || path.endsWith('/')) {
            const signupForm = document.getElementById('signup-form');
            const successMessage = document.getElementById('signup-success');
            
            if (signupForm && successMessage) {
                signupForm.style.display = 'none';
                successMessage.style.display = 'block';
                
                const successMessageEl = document.getElementById('success-message');
                if (successMessageEl) {
                    successMessageEl.textContent = `Welcome back, ${user.name}!`;
                }
                
                // Change button text for logged in users
                const continueButton = document.getElementById('continue-button');
                if (continueButton) {
                    continueButton.textContent = 'Go to Your Dashboard';
                    
                    // Remove any existing event listeners with clone and replace
                    const newButton = continueButton.cloneNode(true);
                    continueButton.parentNode.replaceChild(newButton, continueButton);
                    
                    newButton.addEventListener('click', () => {
                        window.location.href = '/dashboard.html';
                    });
                }
            }
        }
    } else {
        // User is not logged in
        authLinks.forEach(link => link.classList.remove('hidden'));
        userLinks.forEach(link => link.classList.add('hidden'));
        
        // Redirect from protected pages
        const path = window.location.pathname;
        if (
            path.includes('/dashboard') || 
            path.includes('/chat')
        ) {
            window.location.href = '/login.html';
        }
    }
}

// Handle login form submission
async function handleLogin(e) {
    e.preventDefault();
    
    const phone = document.getElementById('phone').value;
    const password = document.getElementById('password').value;
    const statusEl = document.getElementById('login-message');
    
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

// Handle signup from homepage
async function handleSignupFromHomepage() {
    // These elements should now be guaranteed to exist because of the check in the click handler
    const nameEl = document.getElementById('name');
    const phoneEl = document.getElementById('phone');
    const passwordEl = document.getElementById('password'); 
    const confirmPasswordEl = document.getElementById('confirm-password');
    const statusEl = document.getElementById('signup-message');
    
    const name = nameEl.value;
    const phone = phoneEl.value;
    const password = passwordEl.value;
    const confirmPassword = confirmPasswordEl.value;
    
    try {
        // Get selected persona
        let persona = '';
        const selectedPersonaEl = document.getElementById('selected-persona');
        
        if (selectedPersonaEl) {
            persona = selectedPersonaEl.value;
        }
        
        // If no persona was explicitly selected, use the first one that's marked as selected
        if (!persona) {
            const selectedPersonaEl = document.querySelector('.persona.selected');
            if (selectedPersonaEl) {
                persona = selectedPersonaEl.getAttribute('data-style');
            } else {
                throw new Error('Please select a companion first');
            }
        }
        
        // Validation
        if (!name || !phone || !password || !confirmPassword) {
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
        
        // Show success message
        const signupForm = document.getElementById('signup-form');
        const successMessage = document.getElementById('signup-success');
        
        if (signupForm && successMessage) {
            signupForm.style.display = 'none';
            successMessage.style.display = 'block';
            
            // Set selected persona name in success message
            const successMessageEl = document.getElementById('success-message');
            if (successMessageEl) {
                // Find persona name - safely handling if element doesn't exist
                let personaName = persona; // Default to the style as name
                const personaEl = document.querySelector(`.persona[data-style="${persona}"] h3`);
                if (personaEl) {
                    personaName = personaEl.textContent;
                }
                
                successMessageEl.textContent = 
                    `You're all set to start your experience with ${personaName}.`;
            }
                
            // Setup continue button
            const continueButton = document.getElementById('continue-button');
            if (continueButton) {
                continueButton.addEventListener('click', () => {
                    window.location.href = '/subscription.html';
                });
            }
        } else {
            // If we can't find the success message elements, just redirect
            window.location.href = '/subscription.html';
        }
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

// Add an event listener to the script.js file for scrolling to sections
window.addEventListener('scrollToSection', function(e) {
    if (typeof e.detail.sectionIndex !== 'undefined' && window.updateSection) {
        window.updateSection(e.detail.sectionIndex);
    }
});

// Wait until DOM is fully loaded and ready
function onDocumentReady(callback) {
    // Check if document is already loaded
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        // Call on next available tick
        setTimeout(callback, 1);
    } else {
        document.addEventListener('DOMContentLoaded', callback);
    }
}

// Debug function to log element existence
function debugElement(id) {
    const el = document.getElementById(id);
    console.log(`Element ${id} exists: ${!!el}`);
    if (el) {
        console.log(`Element type: ${el.tagName}, visible: ${el.style.display !== 'none'}`);
    }
}

// Initialize when DOM is loaded - with more robust handling
onDocumentReady(function() {
    console.log('Auth.js: Document ready, initializing auth system');
    
    // Debug important elements
    if (window.location.pathname === '/' || window.location.pathname === '/index.html' || window.location.pathname.endsWith('/')) {
        debugElement('signup-form');
        debugElement('signup-button');
        debugElement('name');
        debugElement('phone');
        debugElement('password');
        debugElement('confirm-password');
        debugElement('signup-message');
    }
    
    // Initialize auth system
    initAuth();
}); 