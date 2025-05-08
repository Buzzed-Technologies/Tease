// Supabase client initialization
const supabaseUrl = 'https://kigcecwfxlonrdxjwsza.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZ2NlY3dmeGxvbnJkeGp3c3phIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk3OTE3MjAsImV4cCI6MjAyNTM2NzcyMH0.kw2nw7VW3QXTzWM7ynmm7Q2k7W4e5JKgf2i-k9K0Sns';

// Create the client using the imported library
const supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

// DOM Elements
let loginForm, signupForm, personaButtons, personaSelected = null;

// Initialize the auth system
function initAuth() {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || !document) {
        return;
    }
    
    // Check if user is logged in
    const user = getCurrentUser();
    updateAuthUI(user);

    // Only run page-specific code if we're on that page
    const path = window.location.pathname;
    
    // Setup event listeners for login form - only on login page
    if (path.includes('/login')) {
        loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
        }
    }
    
    // Homepage and signup functionality
    if (path === '/' || path === '/index.html' || path.endsWith('/')) {
        // Setup event listeners for signup form
        setupSignupForm();
        
        // Setup persona selection from homepage
        setupPersonaSelection();
    }

    // Setup logout button - only on pages with dashboard features
    if (path.includes('/dashboard') || path.includes('/chat')) {
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }
    }
}

// Setup signup form handlers
function setupSignupForm() {
    // Look for signup form in the current page
    signupForm = document.getElementById('signup-form');
    
    if (signupForm) {
        // For homepage signup form
        const signupButton = document.getElementById('signup-button');
        if (signupButton) {
            signupButton.addEventListener('click', handleSignupFromHomepage);
        }
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
    // Safely get form elements, checking for existence first
    const nameEl = document.getElementById('name');
    const phoneEl = document.getElementById('phone');
    const passwordEl = document.getElementById('password'); 
    const confirmPasswordEl = document.getElementById('confirm-password');
    const statusEl = document.getElementById('signup-message');
    
    // Make sure all required elements exist
    if (!nameEl || !phoneEl || !passwordEl || !confirmPasswordEl || !statusEl) {
        console.error('Required signup form elements not found');
        return;
    }
    
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

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initAuth); 