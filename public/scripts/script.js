document.addEventListener('DOMContentLoaded', () => {
    // Smooth scrolling for navigation
    const snapContainer = document.querySelector('.snap-container');
    const screens = document.querySelectorAll('.screen');
    const scrollIndicator = document.querySelector('.scroll-indicator');
    
    // Detect if this is a mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Force initial scroll to top to ensure we start at the first screen
    window.scrollTo({top: 0, behavior: 'instant'});
    document.body.style.overflow = 'hidden';
    setTimeout(() => {
        document.body.style.overflow = '';
    }, 100);
    
    // Track the current screen index explicitly
    let currentScreenIndex = 0;
    
    // Intersection Observer for each section with more precise detection
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: [0.2, 0.5, 0.8] // Multiple thresholds for better detection
    };
    
    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
                const prevActive = document.querySelector('.screen.active');
                if (prevActive) {
                    prevActive.classList.remove('active');
                }
                
                entry.target.classList.add('active');
                
                // Update URL hash without scroll jump
                const id = entry.target.getAttribute('id');
                if (id) {
                    history.replaceState(null, null, `#${id}`);
                }
                
                // Find the index of the current screen
                const index = Array.from(screens).indexOf(entry.target);
                if (index !== -1) {
                    currentScreenIndex = index;
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
            navigateToScreen(1); // Always go to second screen
        });
    }
    
    // Handle CTA button clicks
    const ctaButtons = document.querySelectorAll('.cta-button');
    const ctaSection = document.getElementById('cta');
    
    ctaButtons.forEach(button => {
        if (!button.closest('#cta')) {  // Don't apply to buttons inside CTA section
            button.addEventListener('click', () => {
                ctaSection.scrollIntoView({ behavior: 'smooth' });
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
                ctaSection.scrollIntoView({ behavior: 'smooth' });
            }, 500);
        });
    });
    
    // "About Our Mission" link scrolls to mission section
    const missionLink = document.querySelector('.footer-links a:nth-child(4)');
    const missionSection = document.getElementById('mission');
    
    if (missionLink && missionSection) {
        missionLink.addEventListener('click', (e) => {
            e.preventDefault();
            missionSection.scrollIntoView({ behavior: 'smooth' });
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
        
        // Prevent vertical scrolling from interfering with horizontal scrolling
        personasContainer.addEventListener('wheel', (e) => {
            if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
                // User is scrolling horizontally, let it pass through
                return;
            }
            
            // If personas are being scrolled horizontally, don't allow vertical scrolling
            if (personasContainer.scrollWidth > personasContainer.clientWidth) {
                if (e.deltaY !== 0) {
                    e.stopPropagation();
                }
            }
        }, { passive: true });
        
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
                document.getElementById('personas').scrollIntoView({ behavior: 'smooth' });
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
    
    // Improved scrolling with better control - more responsive for desktop
    let isScrolling = false;
    let scrollTimeout;
    let lastWheelTime = 0;
    let initialScrollTriggered = false;

    // Function to navigate to a specific screen - redesigned for reliability
    function navigateToScreen(targetIndex) {
        if (isScrolling) return;
        
        // Validate target index
        if (targetIndex < 0) targetIndex = 0;
        if (targetIndex >= screens.length) targetIndex = screens.length - 1;
        
        // Ensure we're not already on this screen
        if (targetIndex === currentScreenIndex && targetIndex !== 0) return;
        
        // Don't allow skipping screens (when scrolling, only move one at a time)
        if (initialScrollTriggered && Math.abs(targetIndex - currentScreenIndex) > 1) {
            targetIndex = currentScreenIndex + (targetIndex > currentScreenIndex ? 1 : -1);
        }
        
        isScrolling = true;
        console.log(`Navigating from section ${currentScreenIndex} to ${targetIndex}`);
        
        // Handle scrolling differently for desktop vs mobile
        if (!isMobile) {
            // For desktop: Use direct scrolling for immediate feedback
            screens[targetIndex].scrollIntoView({behavior: 'auto'});
            
            // Set as current immediately 
            currentScreenIndex = targetIndex;
            
            // Reset scroll state quickly on desktop
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                isScrolling = false;
                initialScrollTriggered = true;
            }, 200);
        } else {
            // For mobile: Keep smooth scrolling
            screens[targetIndex].scrollIntoView({behavior: 'smooth'});
            
            // Update current index
            currentScreenIndex = targetIndex;
            
            // Reset scroll state after animation completes
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                isScrolling = false;
                initialScrollTriggered = true;
            }, 800);
        }
    }
    
    // More reliable wheel event handler with proper section tracking
    snapContainer.addEventListener('wheel', (e) => {
        // Don't block scrolling in the personas container
        if (e.target.closest('.personas-scroll')) {
            return;
        }
        
        // Prevent default to control scrolling
        e.preventDefault();
        
        // Skip if already scrolling
        if (isScrolling) return;
        
        // Simple debounce
        const now = Date.now();
        if (now - lastWheelTime < 100) return; // 100ms debounce for more reliability
        lastWheelTime = now;
        
        // Get scroll direction
        const direction = Math.sign(e.deltaY);
        
        // Calculate target index - always move exactly one section
        const targetIndex = currentScreenIndex + direction;
        
        // Navigate to the next section only
        navigateToScreen(targetIndex);
    }, { passive: false });
    
    // Improved touch events for mobile
    let touchStartY = 0;
    let touchEndY = 0;
    
    snapContainer.addEventListener('touchstart', (e) => {
        // Ignore touches in the personas container
        if (e.target.closest('.personas-scroll')) return;
        
        touchStartY = e.touches[0].clientY;
    }, { passive: true });
    
    snapContainer.addEventListener('touchend', (e) => {
        // Ignore touches in the personas container
        if (e.target.closest('.personas-scroll')) return;
        
        touchEndY = e.changedTouches[0].clientY;
        
        // Calculate the distance swiped
        const touchDiff = touchStartY - touchEndY;
        
        // Skip if already in a scrolling animation
        if (isScrolling) return;
        
        // Determine direction and navigate (with a reasonable threshold)
        if (Math.abs(touchDiff) > 50) {
            const direction = touchDiff > 0 ? 1 : -1;
            navigateToScreen(currentScreenIndex + direction);
        }
    }, { passive: true });
    
    // Add keyboard navigation for accessibility
    document.addEventListener('keydown', (e) => {
        if (isScrolling) return;
        
        if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
            e.preventDefault();
            navigateToScreen(currentScreenIndex + 1);
        } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
            e.preventDefault();
            navigateToScreen(currentScreenIndex - 1);
        }
    });
    
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
    
    // Make first screen active on load and ensure we're at the top
    if (screens.length > 0) {
        screens[0].classList.add('active');
        
        // Multiple safeguards to ensure we start at the top
        setTimeout(() => {
            window.scrollTo({top: 0, behavior: 'instant'});
            currentScreenIndex = 0;
        }, 100);
    }
    
    // If URL has a hash, scroll to that section
    if (window.location.hash) {
        const targetId = window.location.hash.substring(1);
        const targetSection = document.getElementById(targetId);
        if (targetSection) {
            setTimeout(() => {
                const index = Array.from(screens).indexOf(targetSection);
                if (index !== -1) {
                    navigateToScreen(index);
                }
            }, 500);
        }
    }
}); 