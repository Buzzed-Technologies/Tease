document.addEventListener('DOMContentLoaded', () => {
    // TikTok-style Scrolling System
    const app = document.querySelector('.app-container');
    const screens = document.querySelectorAll('.screen');
    const footer = document.querySelector('footer');
    const scrollIndicator = document.querySelector('.scroll-indicator');
    
    let currentSection = 0;
    let isScrolling = false;
    let touchStartY = 0;
    let touchEndY = 0;
    let startTime = 0;
    
    // Disable native scrolling
    document.body.style.overflow = 'hidden';
    app.style.height = '100vh';
    app.style.overflow = 'hidden';
    
    // Set initial section
    updateSection(0);
    
    // Helper function to move to a specific section
    function updateSection(index) {
        if (index < 0) index = 0;
        if (index > screens.length) index = screens.length;
        
        currentSection = index;
        
        // Special case for footer
        if (index === screens.length) {
            // Show footer
            const lastScreenHeight = window.innerHeight;
            const footerHeight = footer.offsetHeight;
            
            screens.forEach((screen, i) => {
                if (i < screens.length - 1) {
                    // Hide all but the last screen
                    screen.style.transform = `translateY(-100%)`;
                    screen.classList.remove('active');
                } else {
                    // Position the last screen to show footer
                    screen.style.transform = `translateY(calc(-100% + ${lastScreenHeight - footerHeight}px))`;
                    screen.classList.add('active');
                }
            });
            
            footer.style.transform = 'translateY(0)';
            footer.style.visibility = 'visible';
            footer.style.opacity = '1';
            
            // Update URL hash
            history.replaceState(null, null, `#footer`);
            
            return;
        }
        
        // Normal section display
        screens.forEach((screen, i) => {
            if (i === index) {
                screen.style.transform = 'translateY(0)';
                screen.classList.add('active');
                
                // Add animation classes to children
                const elements = screen.querySelectorAll('h1, h2, h3, p, .feature, .step, .form-group, .persona, .mission-item');
                elements.forEach((el, index) => {
                    el.style.transition = `transform 0.8s ease ${index * 0.08}s, opacity 0.8s ease ${index * 0.08}s`;
                    el.classList.add('animate-in');
                });
                
                // Update URL hash
                const id = screen.getAttribute('id');
                if (id) {
                    history.replaceState(null, null, `#${id}`);
                }
            } else if (i < index) {
                // Screens above current
                screen.style.transform = 'translateY(-100%)';
                screen.classList.remove('active');
            } else {
                // Screens below current
                screen.style.transform = 'translateY(100%)';
                screen.classList.remove('active');
            }
        });
        
        // Hide footer when not on last section
        footer.style.transform = 'translateY(100%)';
        footer.style.visibility = 'hidden';
        footer.style.opacity = '0';
    }
    
    // Set up initial screen positions
    screens.forEach((screen, i) => {
        if (i !== 0) {
            screen.style.transform = 'translateY(100%)';
        }
        
        // Make sure screens are set to fixed positioning for smooth transitions
        screen.style.position = 'fixed';
        screen.style.top = '0';
        screen.style.left = '0';
        screen.style.width = '100%';
        screen.style.height = '100vh';
        screen.style.transition = 'transform 0.8s cubic-bezier(0.19, 1, 0.22, 1)';
        screen.style.zIndex = `${10 - i}`;
    });
    
    // Setup footer for the transition
    footer.style.position = 'fixed';
    footer.style.bottom = '0';
    footer.style.left = '0';
    footer.style.width = '100%';
    footer.style.transform = 'translateY(100%)';
    footer.style.transition = 'transform 0.8s cubic-bezier(0.19, 1, 0.22, 1), opacity 0.8s ease';
    footer.style.zIndex = '1';
    footer.style.visibility = 'hidden';
    
    // Handle wheel events for scrolling
    window.addEventListener('wheel', (e) => {
        if (isScrolling) return;
        
        // Determine scroll direction
        const direction = Math.sign(e.deltaY);
        
        if (direction !== 0) {
            isScrolling = true;
            
            const nextSection = currentSection + direction;
            if (nextSection >= 0 && nextSection <= screens.length) {
                updateSection(nextSection);
            }
            
            // Debounce scrolling
            setTimeout(() => {
                isScrolling = false;
            }, 800);
        }
    }, { passive: true });
    
    // Touch events for mobile
    document.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
        startTime = Date.now();
    }, { passive: true });
    
    document.addEventListener('touchmove', (e) => {
        if (isScrolling) return;
        touchEndY = e.touches[0].clientY;
    }, { passive: true });
    
    document.addEventListener('touchend', () => {
        if (isScrolling) return;
        
        const touchDiff = touchStartY - touchEndY;
        const timeDiff = Date.now() - startTime;
        
        // Detect swipe vs tap - velocity based
        if (Math.abs(touchDiff) > 50 || (Math.abs(touchDiff) > 20 && timeDiff < 200)) {
            isScrolling = true;
            
            // Determine direction (positive = down, negative = up)
            const direction = touchDiff > 0 ? 1 : -1;
            
            const nextSection = currentSection + direction;
            if (nextSection >= 0 && nextSection <= screens.length) {
                updateSection(nextSection);
            }
            
            // Debounce scrolling
            setTimeout(() => {
                isScrolling = false;
            }, 800);
        }
    }, { passive: true });
    
    // Keyboard navigation for accessibility
    document.addEventListener('keydown', (e) => {
        if (isScrolling) return;
        
        let direction = 0;
        
        if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === 'Space') {
            direction = 1;
            e.preventDefault();
        } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
            direction = -1;
            e.preventDefault();
        }
        
        if (direction !== 0) {
            isScrolling = true;
            
            const nextSection = currentSection + direction;
            if (nextSection >= 0 && nextSection <= screens.length) {
                updateSection(nextSection);
            }
            
            // Debounce scrolling
            setTimeout(() => {
                isScrolling = false;
            }, 800);
        }
    });
    
    // Scroll indicator click
    if (scrollIndicator) {
        scrollIndicator.addEventListener('click', () => {
            if (isScrolling) return;
            
            isScrolling = true;
            updateSection(currentSection + 1);
            
            // Debounce scrolling
            setTimeout(() => {
                isScrolling = false;
            }, 800);
        });
    }
    
    // Handle CTA button clicks
    const ctaButtons = document.querySelectorAll('.cta-button');
    const ctaSection = document.getElementById('cta');
    const ctaSectionIndex = Array.from(screens).findIndex(screen => screen.id === 'cta');
    
    ctaButtons.forEach(button => {
        if (!button.closest('#cta')) {  // Don't apply to buttons inside CTA section
            button.addEventListener('click', () => {
                if (isScrolling) return;
                
                isScrolling = true;
                updateSection(ctaSectionIndex);
                
                // Debounce scrolling
                setTimeout(() => {
                    isScrolling = false;
                }, 800);
            });
        }
    });
    
    // "About Our Mission" link scrolls to mission section
    const missionLink = document.querySelector('.footer-links a:nth-child(4)');
    const missionSectionIndex = Array.from(screens).findIndex(screen => screen.id === 'mission');
    
    if (missionLink && missionSectionIndex !== -1) {
        missionLink.addEventListener('click', (e) => {
            e.preventDefault();
            
            if (isScrolling) return;
            
            isScrolling = true;
            updateSection(missionSectionIndex);
            
            // Debounce scrolling
            setTimeout(() => {
                isScrolling = false;
            }, 800);
        });
    }
    
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
            
            // Scroll to signup section after a delay
            setTimeout(() => {
                if (isScrolling) return;
                
                isScrolling = true;
                updateSection(ctaSectionIndex);
                
                // Debounce scrolling
                setTimeout(() => {
                    isScrolling = false;
                }, 800);
            }, 500);
        });
    });
    
    // Horizontal scroll for personas
    const personasContainer = document.querySelector('.personas-scroll');
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
                
                // Scroll to personas section
                const personasSectionIndex = Array.from(screens).findIndex(screen => screen.id === 'personas');
                if (personasSectionIndex !== -1) {
                    isScrolling = true;
                    updateSection(personasSectionIndex);
                    
                    // Debounce scrolling
                    setTimeout(() => {
                        isScrolling = false;
                    }, 800);
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
    
    // Add CSS classes for animations
    const style = document.createElement('style');
    style.textContent = `
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
        
        /* Page dots navigation */
        .section-dots {
            position: fixed;
            right: 20px;
            top: 50%;
            transform: translateY(-50%);
            z-index: 100;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        
        .section-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background-color: rgba(255, 255, 255, 0.3);
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .section-dot.active {
            background-color: var(--primary);
            transform: scale(1.3);
        }
    `;
    document.head.appendChild(style);
    
    // Add section navigation dots
    const sectionsNav = document.createElement('div');
    sectionsNav.className = 'section-dots';
    
    // Create dots for each section plus footer
    for (let i = 0; i <= screens.length; i++) {
        const dot = document.createElement('div');
        dot.className = i === 0 ? 'section-dot active' : 'section-dot';
        
        // Add click event for navigation
        dot.addEventListener('click', () => {
            if (isScrolling) return;
            
            isScrolling = true;
            updateSection(i);
            
            // Debounce scrolling
            setTimeout(() => {
                isScrolling = false;
            }, 800);
        });
        
        sectionsNav.appendChild(dot);
    }
    
    document.body.appendChild(sectionsNav);
    
    // Update dots when section changes
    function updateDots() {
        const dots = document.querySelectorAll('.section-dot');
        
        dots.forEach((dot, i) => {
            if (i === currentSection) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }
    
    // Add dot updating to the section change
    const originalUpdateSection = updateSection;
    updateSection = function(index) {
        originalUpdateSection(index);
        updateDots();
    };
}); 