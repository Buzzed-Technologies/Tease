document.addEventListener('DOMContentLoaded', () => {
    // Smooth scrolling for navigation
    const snapContainer = document.querySelector('.snap-container');
    const screens = document.querySelectorAll('.screen');
    const scrollIndicator = document.querySelector('.scroll-indicator');
    
    // Detect if this is a mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Apply smooth transitions only on mobile devices
    if (isMobile) {
        screens.forEach(screen => {
            screen.classList.add('smooth-transition');
        });
    }
    
    // Intersection Observer for each section
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.3
    };
    
    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                
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
            const currentScreen = document.querySelector('.screen.active');
            const nextScreen = currentScreen.nextElementSibling;
            if (nextScreen && nextScreen.classList.contains('screen')) {
                nextScreen.scrollIntoView({ behavior: 'smooth' });
            }
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
    let isHorizontalScrolling = false; // Flag to track horizontal scrolling
    
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
            // After horizontal scrolling, set a short timeout before allowing vertical scrolls again
            if (isHorizontalScrolling) {
                setTimeout(() => {
                    isHorizontalScrolling = false;
                }, 100);
            }
        });
        
        personasContainer.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - personasContainer.offsetLeft;
            const walk = (x - startX) * 2; // Scroll speed
            
            // Only set horizontal scrolling flag if actual scrolling happens
            if (Math.abs(walk) > 5) {
                isHorizontalScrolling = true;
            }
            
            personasContainer.scrollLeft = scrollLeft - walk;
        });
        
        // Touch handlers specifically for the personas container
        let touchStartX;
        let touchStartY;
        
        personasContainer.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            startX = touchStartX;
            scrollLeft = personasContainer.scrollLeft;
        }, { passive: true });
        
        personasContainer.addEventListener('touchmove', (e) => {
            if (!touchStartX || !touchStartY) return;
            
            const touchX = e.touches[0].clientX;
            const touchY = e.touches[0].clientY;
            
            // Calculate horizontal and vertical distance
            const diffX = touchStartX - touchX;
            const diffY = touchStartY - touchY;
            
            // If horizontal movement is greater than vertical, it's a horizontal swipe
            if (Math.abs(diffX) > Math.abs(diffY)) {
                // This is a horizontal swipe, prevent default to avoid vertical scroll
                e.preventDefault();
                isHorizontalScrolling = true;
                
                // Update horizontal scroll
                personasContainer.scrollLeft = scrollLeft + diffX;
            }
        }, { passive: false });
        
        personasContainer.addEventListener('touchend', () => {
            // After horizontal scrolling, set a short timeout before allowing vertical scrolls again
            if (isHorizontalScrolling) {
                setTimeout(() => {
                    isHorizontalScrolling = false;
                }, 300);
            }
            
            touchStartX = null;
            touchStartY = null;
        });
        
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
    
    // Enhanced scrolling - more responsive with less effort
    let lastScrollTime = 0;
    let scrollTimeout;
    let isScrolling = false;
    let currentScreenIndex = 0;
    let lastDirection = 0;
    let scrollAccumulator = 0;
    
    // Function to navigate to a specific screen
    function navigateToScreen(index) {
        if (index < 0) index = 0;
        if (index >= screens.length) index = screens.length - 1;
        
        currentScreenIndex = index;
        screens[index].scrollIntoView({ behavior: 'smooth' });
    }
    
    // Handle wheel events for more responsive scrolling
    snapContainer.addEventListener('wheel', (e) => {
        // Skip if we're in the middle of a horizontal scroll in the personas section
        if (isHorizontalScrolling) {
            e.preventDefault();
            return;
        }
        
        // Always prevent default to ensure controlled scrolling
        e.preventDefault();
        
        // Skip if already in a scrolling animation
        if (isScrolling) return;
        
        // Find the current visible screen
        let visibleScreenIndex = getCurrentVisibleScreenIndex();
        
        // Check if we're at the last screen before footer
        const isLastScreen = visibleScreenIndex === screens.length - 1;
        const hasFooterInView = isElementInViewport(document.querySelector('footer'));
        
        // If we're at the last screen and footer is in view, don't override scrolling
        if (isLastScreen && hasFooterInView && e.deltaY > 0) {
            return;
        }
        
        // Determine scroll direction
        const direction = Math.sign(e.deltaY);
        
        // Detect if this is likely a trackpad gesture (smaller, precise movements)
        const isTrackPad = Math.abs(e.deltaY) < 40;
        
        // Different handling for trackpad vs mouse wheel
        if (isTrackPad) {
            // Accumulate small trackpad movements but with smaller threshold
            scrollAccumulator += e.deltaY;
            
            // Higher threshold to make desktop scrolling more controlled
            const threshold = 40; // Increased from 20 to make desktop scrolling less sensitive
            
            // Check if we've accumulated enough movement
            if (Math.abs(scrollAccumulator) > threshold) {
                const scrollDirection = Math.sign(scrollAccumulator);
                // Reset accumulator after using it
                scrollAccumulator = 0;
                
                // Immediate response for trackpad once threshold is met
                handleScrollInstant(scrollDirection);
            }
        } else {
            // For mouse wheel, increase threshold to make scrolling less sensitive
            // Only trigger if the wheel event is significant
            if (Math.abs(e.deltaY) > 50) {
                handleScrollInstant(direction);
            }
        }
    }, { passive: false });
    
    // Helper function to check if an element is in viewport
    function isElementInViewport(el) {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }
    
    // Get current visible screen index helper function
    function getCurrentVisibleScreenIndex() {
        let visibleScreenIndex = 0;
        screens.forEach((screen, index) => {
            const rect = screen.getBoundingClientRect();
            if (rect.top <= window.innerHeight / 2 && rect.bottom >= window.innerHeight / 2) {
                visibleScreenIndex = index;
            }
        });
        return visibleScreenIndex;
    }
    
    // Unified scroll handler function - INSTANT VERSION
    function handleScrollInstant(direction) {
        // Skip if we're in the middle of a horizontal scroll in the personas section
        if (isHorizontalScrolling) return;
        
        // Find currently visible screen
        let visibleScreenIndex = getCurrentVisibleScreenIndex();
        
        // Prevent scrolling if we're already at the boundary
        if (direction > 0 && visibleScreenIndex === screens.length - 1) return;
        if (direction < 0 && visibleScreenIndex === 0) return;
        
        // Set scrolling state
        isScrolling = true;
        
        // Calculate target screen
        const targetIndex = visibleScreenIndex + direction;
        currentScreenIndex = targetIndex;
        
        // For desktop, use smooth scrolling with better positioning
        if (!isMobile) {
            // Instead of instant jump, use smooth scroll with proper positioning
            const targetY = screens[targetIndex].offsetTop;
            window.scrollTo({
                top: targetY,
                behavior: 'smooth'
            });
            
            // Longer reset to prevent multiple scrolls on desktop
            setTimeout(() => {
                isScrolling = false;
                scrollAccumulator = 0; // Reset accumulator
            }, 800); // Increased from 50ms to 800ms to make desktop scrolling more controlled
        } else {
            // For mobile devices, use smooth scrolling
            screens[targetIndex].scrollIntoView({ behavior: 'smooth' });
            
            // Longer reset for animation to complete
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                isScrolling = false;
                scrollAccumulator = 0; // Reset accumulator
            }, 500);
        }
    }
    
    // Touch events for mobile with enhanced sensitivity
    let touchStartY = 0;
    let touchEndY = 0;
    let touchStartTime = 0;
    
    snapContainer.addEventListener('touchstart', (e) => {
        // Skip if we're in the middle of a horizontal scroll
        if (isHorizontalScrolling) return;
        
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
    }, { passive: true });
    
    snapContainer.addEventListener('touchmove', (e) => {
        // Skip if we're in the middle of a horizontal scroll
        if (isHorizontalScrolling) return;
        
        // Store current position while moving
        touchEndY = e.touches[0].clientY;
    }, { passive: true });
    
    snapContainer.addEventListener('touchend', () => {
        // Skip if we're in the middle of a horizontal scroll
        if (isHorizontalScrolling) return;
        
        // Calculate the distance swiped
        const touchDiff = touchStartY - touchEndY;
        
        // Calculate swipe velocity (distance/time)
        const touchTime = Date.now() - touchStartTime;
        const velocity = Math.abs(touchDiff) / touchTime;
        
        // Adaptive threshold based on velocity - faster swipes need less distance
        let swipeThreshold = 25; // Increased from 10 to make it less sensitive
        
        // For quick flicks, reduce the threshold
        if (velocity > 0.5) {
            swipeThreshold = 15; // Increased from 5 to make it less sensitive
        }
        
        if (Math.abs(touchDiff) > swipeThreshold && !isScrolling) {
            const direction = touchDiff > 0 ? 1 : -1;
            // For mobile, we'll keep smoother scrolling
            handleScrollMobile(direction);
        }
    });
    
    // Unified scroll handler for mobile (smoother)
    function handleScrollMobile(direction) {
        // Skip if we're in the middle of a horizontal scroll
        if (isHorizontalScrolling) return;
        
        // Find currently visible screen
        let visibleScreenIndex = getCurrentVisibleScreenIndex();
        
        // Prevent scrolling if we're already at the boundary
        if (direction > 0 && visibleScreenIndex === screens.length - 1) return;
        if (direction < 0 && visibleScreenIndex === 0) return;
        
        // Set scrolling state
        isScrolling = true;
        
        // Calculate target index
        const targetIndex = visibleScreenIndex + direction;
        currentScreenIndex = targetIndex;
        
        // For mobile, always use smooth scrolling
        screens[targetIndex].scrollIntoView({ behavior: 'smooth' });
        
        // Reset scrolling state after animation completes
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            isScrolling = false;
            scrollAccumulator = 0;
        }, 500);
    }
    
    // Add keyboard navigation for accessibility
    document.addEventListener('keydown', (e) => {
        if (!isScrolling) {
            if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
                e.preventDefault();
                // Use the instant scroll for keyboard too
                handleScrollInstant(1);
            } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
                e.preventDefault();
                handleScrollInstant(-1);
            }
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
    
    // Make first screen active on load
    if (screens.length > 0) {
        screens[0].classList.add('active');
        currentScreenIndex = 0;
    }
}); 