// Supabase client initialization
const supabaseUrl = 'https://kigcecwfxlonrdxjwsza.supabase.co';
const supabaseKey = document.querySelector('meta[name="supabase-anon-key"]')?.getAttribute('content') || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZ2NlY3dmeGxvbnJkeGp3c3phIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk3OTE3MjAsImV4cCI6MjAyNTM2NzcyMH0.kw2nw7VW3QXTzWM7ynmm7Q2k7W4e5JKgf2i-k9K0Sns';
// We'll initialize supabase later to avoid circular references

// Try to get the API key from different sources
let supabaseAnonKey;
let supabase = null;

// Function to initialize Supabase client
async function initSupabase() {
    try {
        console.log('Initializing Supabase client');
        
        // Try fetching the API key from our server endpoint first
        try {
            console.log('Fetching API key from server...');
            const response = await fetch('/api/config');
            if (response.ok) {
                const config = await response.json();
                if (config.supabaseKey) {
                    supabaseAnonKey = config.supabaseKey;
                    console.log('Successfully fetched API key from server');
                } else {
                    console.warn('API key not found in server response');
                }
            } else {
                console.warn('Failed to fetch API key from server:', response.status);
            }
        } catch (error) {
            console.warn('Error fetching API key from server:', error);
        }
        
        // If still no API key, try other methods
        if (!supabaseAnonKey) {
            // Try to get from meta tag
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
        
        // Initialize Supabase client
        if (supabaseAnonKey) {
            console.log(`Using API key (first 5 chars): ${supabaseAnonKey.substring(0, 5)}...`);
            return window.supabase.createClient(supabaseUrl, supabaseAnonKey);
        } else {
            throw new Error('No API key available');
        }
    } catch (error) {
        console.error('Failed to initialize Supabase client:', error);
        return null;
    }
}

// DOM Elements
let loginForm, signupForm, personaButtons, personaSelected = null;

// Make personaSelected globally accessible for script.js
window.personaSelected = null;

// Track initialization status
let isInitialized = false;

// Initialize Supabase and Auth system
async function initialize() {
    // Initialize Supabase
    supabase = await initSupabase();
    
    if (!supabase) {
        console.error('Failed to initialize Supabase client. Auth functionality will not work.');
        // Show error message to user
        const errorMessage = document.createElement('div');
        errorMessage.style.position = 'fixed';
        errorMessage.style.top = '10px';
        errorMessage.style.left = '50%';
        errorMessage.style.transform = 'translateX(-50%)';
        errorMessage.style.padding = '10px 20px';
        errorMessage.style.backgroundColor = '#f44336';
        errorMessage.style.color = 'white';
        errorMessage.style.borderRadius = '4px';
        errorMessage.style.zIndex = '9999';
        errorMessage.textContent = 'Authentication system is currently unavailable. Please try again later.';
        document.body.appendChild(errorMessage);
        
        // Remove after 5 seconds
        setTimeout(() => {
            errorMessage.remove();
        }, 5000);
        
        return;
    }
    
    // Initialize auth system
    initAuth();
}

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
        
        // Check for existing persona selection from script.js
        if (window.selectedPersonaGlobal) {
            personaSelected = window.selectedPersonaGlobal;
            console.log('Auth: Using persona from script.js:', personaSelected);
        } else if (sessionStorage.getItem('selectedPersona')) {
            try {
                personaSelected = JSON.parse(sessionStorage.getItem('selectedPersona'));
                console.log('Auth: Using persona from sessionStorage:', personaSelected);
            } catch (e) {
                console.error('Error parsing persona from sessionStorage:', e);
            }
        } else if (localStorage.getItem('temp_selectedPersona')) {
            try {
                personaSelected = JSON.parse(localStorage.getItem('temp_selectedPersona'));
                console.log('Auth: Using persona from localStorage:', personaSelected);
            } catch (e) {
                console.error('Error parsing persona from localStorage:', e);
            }
        }
        
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
    
    // First check if a persona is already selected in script.js
    if (window.selectedPersonaGlobal) {
        console.log('Auth: Found existing persona selection in window.selectedPersonaGlobal:', window.selectedPersonaGlobal);
        personaSelected = window.selectedPersonaGlobal;
        window.personaSelected = personaSelected; // Sync with global
    }
    
    // Listen for changes to the selectedPersona in script.js
    const checkForPersonaUpdates = setInterval(() => {
        if (window.selectedPersonaGlobal && (!personaSelected || personaSelected.name !== window.selectedPersonaGlobal.name)) {
            console.log('Auth: Syncing persona selection from script.js:', window.selectedPersonaGlobal);
            personaSelected = window.selectedPersonaGlobal;
            window.personaSelected = personaSelected; // Sync with global
        }
    }, 1000);
    
    // Get all persona buttons on the homepage
    personaButtons = document.querySelectorAll('.persona-button');
    
    if (personaButtons && personaButtons.length > 0) {
        personaButtons.forEach(button => {
            button.addEventListener('click', function() {
                const persona = button.closest('.persona');
                if (!persona) return;
                
                const personaNameEl = persona.querySelector('h3');
                const personaStyle = persona.getAttribute('data-style');
                const personaDetailedStyle = persona.querySelector('.persona-style') ? 
                    persona.querySelector('.persona-style').value : '';
                
                if (!personaNameEl || !personaStyle) return;
                
                const personaName = personaNameEl.textContent;
                
                // Store the selected persona
                personaSelected = {
                    name: personaName,
                    style: personaStyle,
                    detailedStyle: personaDetailedStyle
                };
                
                // Sync with global variables
                window.personaSelected = personaSelected;
                window.selectedPersonaGlobal = personaSelected;
                
                // Update hidden input with selected persona
                const selectedPersonaInput = document.getElementById('selected-persona');
                if (selectedPersonaInput) {
                    selectedPersonaInput.value = personaName;
                }
                
                console.log('Auth: Selected persona:', personaSelected);
            });
        });
    } else {
        console.warn('No persona buttons found on homepage');
    }
}

// Get current user from local storage
function getCurrentUser() {
    const userData = localStorage.getItem('threadpay_user');
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
        
        // Check if user has a subscription
        const hasSubscription = user.isSubscribed || false;
        
        // Redirect non-subscribed users to subscription page unless they're already there
        if (!hasSubscription && 
            !path.includes('/subscription') && 
            !path.includes('/chat') &&
            !path === '/' && 
            !path === '/index.html' && 
            !path.endsWith('/')) {
            console.log('User not subscribed, redirecting to subscription page');
            window.location.href = '/subscription.html';
            return;
        }
        
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
                        // If user is not subscribed, direct them to subscription page
                        if (!hasSubscription) {
                            window.location.href = '/subscription.html';
                        } else {
                            window.location.href = '/dashboard.html';
                        }
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
            path.includes('/chat') ||
            path.includes('/subscription-success')
        ) {
            window.location.href = '/login.html';
        }
    }
}

// Handle login form submission
async function handleLogin(telegramUsername, password) {
  try {
    // Strip @ from telegram username if included
    telegramUsername = telegramUsername.replace('@', '');
    
    // Hash the password
    const passwordHash = await hashPassword(password);

    // Query the database for the user
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('telegram_username', telegramUsername)
      .eq('password_hash', passwordHash)
      .single();

    if (error) {
      throw error;
    }

    if (data) {
      // Store user data in local storage
      const userData = {
        id: data.id,
        name: data.name,
        telegram_username: data.telegram_username,
        subscription_status: data.subscription_status,
        model_id: data.model_id
      };
      
      localStorage.setItem('threadpay_user', JSON.stringify(userData));
      
      // Redirect based on subscription status
      if (data.subscription_status) {
        // If subscribed, go to dashboard
        window.location.href = '/dashboard.html';
      } else {
        // If not subscribed, go to subscription page
        window.location.href = '/subscription.html';
      }
      
      return { success: true };
    } else {
      return { 
        success: false, 
        message: 'Invalid Telegram username or password'
      };
    }
  } catch (error) {
    console.error('Login error:', error);
    return { 
      success: false, 
      message: 'An error occurred during login'
    };
  }
}

// Handle signup from homepage
async function handleSignupFromHomepage() {
    try {
        // Get form elements
        const name = document.getElementById('name').value.trim();
        const age = document.getElementById('age') ? parseInt(document.getElementById('age').value) : 0;
        const phone = document.getElementById('phone').value.trim().replace(/\s/g, '');
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const statusEl = document.getElementById('signup-message');
        
        // Reset any previous messages
        statusEl.textContent = '';
        statusEl.className = 'form-message';
        
        // Basic validation
        if (!name || !phone || !password) {
            statusEl.textContent = 'Please fill in all required fields.';
            statusEl.className = 'form-message error';
            return;
        }
        
        // Age validation
        if (!age || age < 18) {
            statusEl.textContent = 'You must be at least 18 years old to use ThreadPay.';
            statusEl.className = 'form-message error';
            return;
        }
        
        // Password validation
        if (password !== confirmPassword) {
            statusEl.textContent = 'Passwords do not match.';
            statusEl.className = 'form-message error';
            return;
        }
        
        if (password.length < 6) {
            statusEl.textContent = 'Password must be at least 6 characters long.';
            statusEl.className = 'form-message error';
            return;
        }
        
        // Get the persona from multiple possible sources
        let selectedPersonaData = personaSelected;
        
        // If personaSelected is null, try getting it from script.js global
        if (!selectedPersonaData && window.selectedPersonaGlobal) {
            selectedPersonaData = window.selectedPersonaGlobal;
            console.log('Auth: Using persona from window.selectedPersonaGlobal:', selectedPersonaData);
        }
        
        // Try from session storage
        if (!selectedPersonaData) {
            try {
                const storedPersona = sessionStorage.getItem('selectedPersona');
                if (storedPersona) {
                    selectedPersonaData = JSON.parse(storedPersona);
                    console.log('Auth: Using persona from sessionStorage:', selectedPersonaData);
                }
            } catch (e) {
                console.error('Error parsing persona from sessionStorage:', e);
            }
        }
        
        // Try from local storage
        if (!selectedPersonaData) {
            try {
                const storedPersona = localStorage.getItem('temp_selectedPersona');
                if (storedPersona) {
                    selectedPersonaData = JSON.parse(storedPersona);
                    console.log('Auth: Using persona from localStorage:', selectedPersonaData);
                }
            } catch (e) {
                console.error('Error parsing persona from localStorage:', e);
            }
        }
        
        // Check if there's a selected persona in the hidden form input
        if (!selectedPersonaData) {
            const selectedPersonaInput = document.getElementById('selected-persona');
            if (selectedPersonaInput && selectedPersonaInput.value) {
                console.log('Auth: Using persona from hidden input field:', selectedPersonaInput.value);
                selectedPersonaData = {
                    name: selectedPersonaInput.value,
                    style: selectedPersonaInput.getAttribute('data-style') || '',
                    detailedStyle: selectedPersonaInput.getAttribute('data-detailed-style') || ''
                };
            }
        }
        
        // Check if a persona was selected after all our checks
        if (!selectedPersonaData || !selectedPersonaData.name) {
            console.error('No persona selected. Current state:', {
                personaSelected,
                windowGlobal: window.selectedPersonaGlobal,
                windowPersonaSelected: window.personaSelected,
                sessionStorage: sessionStorage.getItem('selectedPersona'),
                localStorage: localStorage.getItem('temp_selectedPersona'),
                hiddenInput: document.getElementById('selected-persona')?.value
            });
            
            statusEl.textContent = 'Please select a companion persona first.';
            statusEl.className = 'form-message error';
            
            // Scroll to personas section if possible
            if (typeof updateSection === 'function') {
                const screens = document.querySelectorAll('.screen');
                const personasSectionIndex = Array.from(screens).findIndex(screen => screen.id === 'personas');
                if (personasSectionIndex !== -1) {
                    updateSection(personasSectionIndex);
                }
            }
            return;
        }
        
        // Store the valid persona in personaSelected for later use
        personaSelected = selectedPersonaData;
        window.personaSelected = personaSelected; // Sync with global variable
        
        // Show loading state
        statusEl.textContent = 'Creating your account...';
        statusEl.className = 'form-message';
        
        // Check if supabase client is available
        if (!supabase) {
            statusEl.textContent = 'Authentication service is currently unavailable. Please try again later.';
            statusEl.className = 'form-message error';
            return;
        }
        
        // First check if user already exists
        const { data: existingUser, error: checkError } = await supabase
            .from('sex_mode')
            .select('phone')
            .eq('phone', phone)
            .single();
        
        if (existingUser) {
            statusEl.textContent = 'An account with this phone number already exists. Please log in.';
            statusEl.className = 'form-message error';
            return;
        }
        
        // Sign up the user in the database
        const { data, error } = await supabase
            .from('sex_mode')
            .insert([
                { 
                    name: name,
                    phone: phone,
                    age: age,
                    password_hash: await hashPassword(password),
                    persona: personaSelected.name,
                    style: personaSelected.detailedStyle || '',
                    created_at: new Date().toISOString()
                }
            ])
            .select();
        
        if (error) {
            console.error('Signup error:', error);
            statusEl.textContent = 'Error creating account. Please try again later.';
            statusEl.className = 'form-message error';
            return;
        }
        
        console.log('User created successfully:', data);
        
        // Store user in local storage
        const user = {
            id: data[0].id,
            name: name,
            phone: phone,
            age: age,
            persona: personaSelected.name,
            style: personaSelected.detailedStyle || '',
            created_at: data[0].created_at
        };
        
        localStorage.setItem('threadpay_user', JSON.stringify(user));
        
        // Show success UI
        const signupSuccess = document.getElementById('signup-success');
        const signupForm = document.getElementById('signup-form');
        const successMessage = document.getElementById('success-message');
        
        if (signupSuccess && signupForm && successMessage) {
            signupForm.style.display = 'none';
            signupSuccess.style.display = 'block';
            successMessage.textContent = `You're all set to start your experience with ${personaSelected.name}.`;
            
            // Set up continue button to redirect to subscription page
            const continueButton = document.getElementById('continue-button');
            if (continueButton) {
                continueButton.addEventListener('click', function() {
                    window.location.href = '/subscription.html';
                });
            }
        } else {
            // Fallback if DOM elements not found
            window.location.href = '/subscription.html';
        }
        
    } catch (error) {
        console.error('Error in signup process:', error);
        const statusEl = document.getElementById('signup-message');
        if (statusEl) {
            statusEl.textContent = 'An unexpected error occurred. Please try again later.';
            statusEl.className = 'form-message error';
        }
    }
}

// Handle logout
function handleLogout() {
    localStorage.removeItem('threadpay_user');
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
    
    // Initialize Supabase and auth system
    initialize();
});

// Simple password hashing function for client-side
// In a production environment, you should hash on the server side for security
async function hashPassword(password) {
    try {
        // Convert the password string to an array buffer
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        
        // Hash the data using SHA-256
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        
        // Convert the hash to a hexadecimal string
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        return hashHex;
    } catch (error) {
        console.error('Error hashing password:', error);
        // Fallback for browsers that don't support crypto.subtle
        return password; // Not secure, but prevents errors
    }
}

// Export functions for use in other scripts
window.threadPayAuth = {
  handleLogin,
  handleSignupFromHomepage,
  handleLogout,
  loadUserDashboard
}; 