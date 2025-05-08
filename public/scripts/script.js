document.addEventListener('DOMContentLoaded', () => {
    // Smooth scrolling for navigation
    const snapContainer = document.querySelector('.snap-container');
    const screens = document.querySelectorAll('.screen');
    const scrollIndicator = document.querySelector('.scroll-indicator');
    
    // Detect if this is a mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // COMPLETELY DISABLE SCROLLING
    // This prevents any unwanted scroll behavior
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    snapContainer.style.overflow = 'hidden';
    
    // Fix all screens in absolute position - prevents any native scrolling
    screens.forEach((screen, idx) => {
        screen.style.position = 'absolute';
        screen.style.top = '0';
        screen.style.left = '0';
        screen.style.width = '100%';
        screen.style.height = '100vh';
        screen.style.zIndex = idx === 0 ? '2' : '1'; // First screen on top
        screen.style.opacity = idx === 0 ? '1' : '0'; // Only first screen visible
        screen.style.pointerEvents = idx === 0 ? 'auto' : 'none';
    });
    
    // Track the current screen index explicitly
    let currentScreenIndex = 0;
    
    // Get screen IDs for debugging
    const screenIds = Array.from(screens).map(screen => screen.id);
    console.log('Screen order:', screenIds);
    
    // Flag to track if first transition has happened
    let hasTransitionedOnce = false;
    
    // Intersection Observer to update URL only
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.8
    };
    
    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && entry.intersectionRatio > 0.8) {
                // Update URL hash without scroll jump
                const id = entry.target.getAttribute('id');
                if (id) {
                    history.replaceState(null, null, `#${id}`);
                }
            }
        });
    }, observerOptions);
    
    screens.forEach(screen => {
        sectionObserver.observe(screen);
        
        // Add initial animations class
        screen.classList.add('fade-in');
        
        // Add animation classes to children
        const elements = screen.querySelectorAll('h1, h2, h3, p, .feature, .step, .form-group, .persona, .mission-item');
        elements.forEach((el, index) => {
            el.style.transitionDelay = `${index * 0.1}s`;
            el.classList.add('animate-in');
        });
    });
    
    // First screen particle animation
    const animatedBg = document.querySelector('.animated-bg');
    if (animatedBg) {
        const addParticle = () => {
            const particle = document.createElement('div');
            particle.classList.add('particle');
            
            // Random position, size and animation duration
            const size = Math.random() * 5 + 2;
            const posX = Math.random() * 100;
            const posY = Math.random() * 100;
            const duration = Math.random() * 10 + 10;
            const delay = Math.random() * 5;
            
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.left = `${posX}%`;
            particle.style.top = `${posY}%`;
            particle.style.animationDuration = `${duration}s`;
            particle.style.animationDelay = `${delay}s`;
            
            animatedBg.appendChild(particle);
            
            // Remove particle after animation completes
            setTimeout(() => {
                if (particle && particle.parentNode) {
                    particle.parentNode.removeChild(particle);
                }
            }, (duration + delay) * 1000);
        };
        
        // Create initial particles
        for (let i = 0; i < 15; i++) {
            addParticle();
        }
        
        // Add new particles periodically
        setInterval(addParticle, 3000);
    }
    
    // Scroll to next section when scroll indicator is clicked
    if (scrollIndicator) {
        scrollIndicator.addEventListener('click', () => {
            goToSection(1); // Go to features section
        });
    }
    
    // Handle CTA button clicks
    const ctaButtons = document.querySelectorAll('.cta-button');
    const ctaSection = document.getElementById('cta');
    
    ctaButtons.forEach(button => {
        if (!button.closest('#cta')) {  // Don't apply to buttons inside CTA section
            button.addEventListener('click', () => {
                const index = Array.from(screens).findIndex(screen => screen.id === 'cta');
                if (index !== -1) {
                    goToSection(index);
                }
            });
        }
    });
    
    // Persona selection
    const personaButtons = document.querySelectorAll('.persona-button');
    let selectedPersona = null;
    
    personaButtons.forEach(button => {
        button.addEventListener('click', () => {
            const persona = button.closest('.persona');
            const personaName = persona.querySelector('h3').textContent;
            const personaStyle = persona.getAttribute('data-style');
            
            // Store the selected persona
            selectedPersona = {
                name: personaName,
                style: personaStyle
            };
            
            // Remove selected class from all personas
            document.querySelectorAll('.persona').forEach(p => {
                p.classList.remove('selected');
            });
            
            // Add selected class to this persona
            persona.classList.add('selected');
            
            // Update button text
            button.textContent = 'Selected';
            
            // Scroll to signup section
            setTimeout(() => {
                const index = Array.from(screens).findIndex(screen => screen.id === 'cta');
                if (index !== -1) {
                    goToSection(index);
                }
            }, 500);
        });
    });
    
    // "About Our Mission" link scrolls to mission section
    const missionLink = document.querySelector('.footer-links a:nth-child(4)');
    const missionSection = document.getElementById('mission');
    
    if (missionLink && missionSection) {
        missionLink.addEventListener('click', (e) => {
            e.preventDefault();
            const index = Array.from(screens).findIndex(screen => screen.id === 'mission');
            if (index !== -1) {
                goToSection(index);
            }
        });
    }
    
    // Horizontal scroll for personas
    const personasContainer = document.querySelector('.personas-scroll');
    const personasSection = document.getElementById('personas');
    
    if (personasContainer) {
        // Add drag scroll functionality
        let isDown = false;
        let startX;
        let scrollLeft;
        
        personasContainer.addEventListener('mousedown', (e) => {
            isDown = true;
            personasContainer.classList.add('active');
            startX = e.pageX - personasContainer.offsetLeft;
            scrollLeft = personasContainer.scrollLeft;
        });
        
        personasContainer.addEventListener('mouseleave', () => {
            isDown = false;
            personasContainer.classList.remove('active');
        });
        
        personasContainer.addEventListener('mouseup', () => {
            isDown = false;
            personasContainer.classList.remove('active');
        });
        
        personasContainer.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - personasContainer.offsetLeft;
            const walk = (x - startX) * 2; // Scroll speed
            personasContainer.scrollLeft = scrollLeft - walk;
        });
        
        // Allow horizontal scrolling in personas section
        personasContainer.addEventListener('wheel', (e) => {
            if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
                e.stopPropagation();
                personasContainer.scrollLeft += e.deltaX;
            }
        }, { passive: false });
        
        // Show/hide scroll hint based on scroll position
        const scrollHint = document.querySelector('.scroll-hint');
        
        if (scrollHint) {
            personasContainer.addEventListener('scroll', () => {
                const maxScrollLeft = personasContainer.scrollWidth - personasContainer.clientWidth;
                if (personasContainer.scrollLeft > maxScrollLeft - 100) {
                    scrollHint.style.opacity = '0';
                } else {
                    scrollHint.style.opacity = '0.7';
                }
            });
        }
    }
    
    // Phone number input validation and formatting
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', (e) => {
            // Allow only digits
            let value = e.target.value.replace(/\D/g, '');
            
            // Format number with spaces
            if (value.length > 3 && value.length <= 6) {
                value = value.slice(0, 3) + ' ' + value.slice(3);
            } else if (value.length > 6) {
                value = value.slice(0, 3) + ' ' + value.slice(3, 6) + ' ' + value.slice(6, 10);
            }
            
            // Limit to 10 digits plus formatting
            if (value.length > 12) {
                value = value.substring(0, 12);
            }
            
            e.target.value = value;
        });
    }
    
    // Form submission
    const signupForm = document.querySelector('.signup-form');
    if (signupForm) {
        const formButton = signupForm.querySelector('.cta-button');
        formButton.addEventListener('click', (e) => {
            e.preventDefault();
            const name = document.getElementById('name').value;
            const phone = document.getElementById('phone').value;
            const password = document.getElementById('password').value;
            
            // Simple validation
            if (!name || !phone || !password) {
                alert('Please fill out all fields');
                return;
            }
            
            // If no persona was selected, show message
            if (!selectedPersona) {
                alert('Please select a companion first');
                const index = Array.from(screens).findIndex(screen => screen.id === 'personas');
                if (index !== -1) {
                    goToSection(index);
                }
                return;
            }
            
            // Success animation
            formButton.textContent = 'Account Created!';
            formButton.style.backgroundColor = '#28a745';
            formButton.disabled = true;
            
            // Create success message
            const successMessage = document.createElement('div');
            successMessage.classList.add('success-message');
            successMessage.innerHTML = `
                <div class="success-icon"><i class="fas fa-check-circle"></i></div>
                <h3>Welcome to Tease!</h3>
                <p>You're all set to start your experience with ${selectedPersona.name}.</p>
            `;
            
            // Replace form with success message
            signupForm.innerHTML = '';
            signupForm.appendChild(successMessage);
            signupForm.classList.add('success');
            
            // Normally you would send this data to a server
            console.log('Sign up:', { name, phone, persona: selectedPersona });
        });
    }
    
    // Transition in progress flag
    let isTransitioning = false;
    // Track last action time to prevent double-firing
    let lastActionTime = 0;
    // Debounce duration in milliseconds
    const DEBOUNCE_TIME = 500;

    // Direct navigation to section by index - completely replaces scrolling
    function goToSection(targetIndex) {
        // Debounce all navigation to prevent double-firing
        const now = Date.now();
        if (now - lastActionTime < DEBOUNCE_TIME) {
            console.log("Debouncing navigation - too soon");
            return;
        }
        lastActionTime = now;
        
        // Prevent transitions while one is in progress
        if (isTransitioning) {
            console.log("Navigation blocked - transition in progress");
            return;
        }
        
        // Validate target index
        if (targetIndex < 0) targetIndex = 0;
        if (targetIndex >= screens.length) targetIndex = screens.length - 1;
        
        // CRITICAL FIX: Always force sequential navigation
        if (targetIndex > currentScreenIndex) {
            // Moving forward - only allow one step at a time
            if (targetIndex > currentScreenIndex + 1) {
                targetIndex = currentScreenIndex + 1;
            }
        } else if (targetIndex < currentScreenIndex) {
            // Moving backward - only allow one step at a time
            if (targetIndex < currentScreenIndex - 1) {
                targetIndex = currentScreenIndex - 1;
            }
        }
        
        // Nothing to do if trying to go to current section
        if (targetIndex === currentScreenIndex) return;
        
        // Start transition
        isTransitioning = true;
        
        // Log for debugging
        console.log(`Navigating from ${currentScreenIndex} (${screens[currentScreenIndex].id}) to ${targetIndex} (${screens[targetIndex].id})`);
        
        // Determine transition direction
        const isMovingDown = targetIndex > currentScreenIndex;
        
        // Set initial positions for animation
        screens[targetIndex].style.zIndex = '2';
        screens[currentScreenIndex].style.zIndex = '1';
        
        if (isMovingDown) {
            // Moving down - slide up from bottom
            screens[targetIndex].style.transform = 'translateY(100%)';
        } else {
            // Moving up - slide down from top
            screens[targetIndex].style.transform = 'translateY(-100%)';
        }
        
        // Make target visible but don't transition yet
        screens[targetIndex].style.opacity = '1';
        screens[targetIndex].style.pointerEvents = 'auto';
        
        // Force reflow to ensure CSS changes are applied before transition
        void screens[targetIndex].offsetWidth;
        
        // Add transition for smooth animation
        screens[targetIndex].style.transition = 'transform 0.5s ease-out';
        screens[currentScreenIndex].style.transition = 'transform 0.5s ease-out';
        
        // Start animation
        screens[targetIndex].style.transform = 'translateY(0)';
        
        if (isMovingDown) {
            screens[currentScreenIndex].style.transform = 'translateY(-100%)';
        } else {
            screens[currentScreenIndex].style.transform = 'translateY(100%)';
        }
        
        // Set active class for animations
        screens[currentScreenIndex].classList.remove('active');
        screens[targetIndex].classList.add('active');
        
        // Update URL
        const id = screens[targetIndex].id;
        if (id) {
            history.replaceState(null, null, `#${id}`);
        }
        
        // Wait for transition to complete
        setTimeout(() => {
            // Hide previous screen
            screens[currentScreenIndex].style.opacity = '0';
            screens[currentScreenIndex].style.pointerEvents = 'none';
            
            // Update current index
            currentScreenIndex = targetIndex;
            
            // Reset transition to prevent unwanted effects
            screens.forEach(screen => {
                screen.style.transition = '';
            });
            
            // End transition
            isTransitioning = false;
            
            // Track first transition
            if (!hasTransitionedOnce) {
                hasTransitionedOnce = true;
            }
        }, 500);
    }
    
    // Variables for improved event handling
    let lastWheelTime = 0;
    let wheelTimeout = null;
    const WHEEL_DEBOUNCE_TIME = 100;
    
    // Handle keyboard navigation with debounce
    document.addEventListener('keydown', (e) => {
        // Skip if transition is already in progress
        if (isTransitioning) return;
        
        if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
            e.preventDefault();
            goToSection(currentScreenIndex + 1);
        } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
            e.preventDefault();
            goToSection(currentScreenIndex - 1);
        }
    });
    
    // Handle wheel events for navigation with improved debounce
    // Use single event handler to prevent multiple event triggers
    window.addEventListener('wheel', (e) => {
        e.preventDefault();
        
        // Skip if already in personas section
        if (e.target.closest('.personas-scroll')) return;
        
        // Skip if transition is in progress
        if (isTransitioning) return;
        
        // Debounce wheel events
        const now = Date.now();
        if (now - lastWheelTime < WHEEL_DEBOUNCE_TIME) return;
        lastWheelTime = now;
        
        // Clear any pending timeout
        if (wheelTimeout) clearTimeout(wheelTimeout);
        
        // Set a timeout to prevent rapid-fire events
        wheelTimeout = setTimeout(() => {
            // Determine scroll direction
            const direction = Math.sign(e.deltaY);
            
            // Navigate based on direction
            if (direction > 0) {
                goToSection(currentScreenIndex + 1);
            } else if (direction < 0) {
                goToSection(currentScreenIndex - 1);
            }
        }, 50);
    }, { passive: false });
    
    // Touch event variables
    let touchStartY = 0;
    let touchStartX = 0;
    let isTouchActive = false;
    let touchDebounceTimer = null;
    
    // Handle touch events for mobile with debounce
    window.addEventListener('touchstart', (e) => {
        // Skip if in personas scroll area
        if (e.target.closest('.personas-scroll')) return;
        
        // Record starting touch position
        touchStartY = e.touches[0].clientY;
        touchStartX = e.touches[0].clientX;
        isTouchActive = true;
    }, { passive: true });
    
    window.addEventListener('touchmove', (e) => {
        // Skip if in personas scroll area or not active
        if (!isTouchActive || e.target.closest('.personas-scroll')) return;
        
        // Prevent native scrolling behavior
        e.preventDefault();
    }, { passive: false });
    
    window.addEventListener('touchend', (e) => {
        // Skip if touch wasn't active or in personas scroll area
        if (!isTouchActive || e.target.closest('.personas-scroll')) {
            isTouchActive = false;
            return;
        }
        
        // Skip if transition is in progress
        if (isTransitioning) {
            isTouchActive = false;
            return;
        }
        
        // Clear any existing debounce timer
        if (touchDebounceTimer) clearTimeout(touchDebounceTimer);
        
        // Set debounce timer
        touchDebounceTimer = setTimeout(() => {
            const touchEndY = e.changedTouches[0].clientY;
            const touchEndX = e.changedTouches[0].clientX;
            
            const touchDiffY = touchStartY - touchEndY;
            const touchDiffX = touchStartX - touchEndX;
            
            // Only respond to primarily vertical swipes
            if (Math.abs(touchDiffY) > Math.abs(touchDiffX) && Math.abs(touchDiffY) > 50) {
                if (touchDiffY > 0) {
                    goToSection(currentScreenIndex + 1);
                } else {
                    goToSection(currentScreenIndex - 1);
                }
            }
            
            isTouchActive = false;
        }, 50);
    }, { passive: true });
    
    // Cleanup touch state on touch cancel
    window.addEventListener('touchcancel', () => {
        isTouchActive = false;
        if (touchDebounceTimer) clearTimeout(touchDebounceTimer);
    }, { passive: true });
    
    // Add CSS classes for animations
    const style = document.createElement('style');
    style.textContent = `
        .fade-in {
            opacity: 0;
            transition: opacity 0.5s ease;
        }
        
        .fade-in.active {
            opacity: 1;
        }
        
        .animate-in {
            opacity: 0;
            transform: translateY(20px);
            transition: opacity 0.5s ease, transform 0.5s ease;
        }
        
        .active .animate-in {
            opacity: 1;
            transform: translateY(0);
        }
        
        .particle {
            position: absolute;
            background-color: rgba(128, 0, 32, 0.3);
            border-radius: 50%;
            opacity: 0;
            animation: float linear forwards;
        }
        
        @keyframes float {
            0% {
                opacity: 0;
                transform: translateY(0) rotate(0deg);
            }
            10% {
                opacity: 0.5;
            }
            90% {
                opacity: 0.5;
            }
            100% {
                opacity: 0;
                transform: translateY(-100px) rotate(360deg);
            }
        }
        
        .persona.selected {
            transform: translateY(-10px);
            box-shadow: 0 15px 30px rgba(128, 0, 32, 0.5);
            border: 1px solid var(--primary);
        }
        
        .persona.selected .persona-button {
            background-color: var(--primary);
            color: var(--light);
        }
        
        .success-message {
            text-align: center;
            padding: 2rem 0;
        }
        
        .success-icon {
            font-size: 4rem;
            color: #28a745;
            margin-bottom: 1rem;
        }
        
        .success-message h3 {
            margin-bottom: 1rem;
        }
    `;
    document.head.appendChild(style);
    
    // If URL has a hash, go to that section
    if (window.location.hash) {
        const targetId = window.location.hash.substring(1);
        const targetIndex = Array.from(screens).findIndex(screen => screen.id === targetId);
        if (targetIndex !== -1) {
            setTimeout(() => {
                goToSection(targetIndex);
            }, 500);
        }
    }
}); 