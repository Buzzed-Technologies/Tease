document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const app = document.querySelector('.app-container');
    const screens = document.querySelectorAll('.screen');
    const footer = document.querySelector('footer');
    const scrollIndicator = document.querySelector('.scroll-indicator');
    
    // Add footer to sections for unified scrolling
    const sections = [...screens];
    if (footer) sections.push(footer);
    
    // Detect if this is a mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Apply smooth transitions only on mobile devices
    if (isMobile) {
        screens.forEach(screen => {
            screen.classList.add('smooth-transition');
        });
    }
    
    // Current section index and scrolling state
    let currentIndex = 0;
    let isScrolling = false;
    
    // Disable native scrolling
    document.body.style.overflow = 'hidden';
    app.style.height = '100vh';
    app.style.overflow = 'hidden';
    
    // Initialize - show first section
    updateActiveSection();
    
    // Intersection Observer for section visibility
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
    
    sections.forEach(section => {
        sectionObserver.observe(section);
        
        // Add initial animations class
        section.classList.add('fade-in');
        
        // Add animation classes to children
        const elements = section.querySelectorAll('h1, h2, h3, p, .feature, .step, .form-group, .persona, .mission-item');
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
    
    // Custom scroll function
    function scrollToSection(index) {
        if (isScrolling || index < 0 || index >= sections.length) return;
        
        isScrolling = true;
        currentIndex = index;
        
        // Remove active class from all sections
        sections.forEach(section => {
            section.classList.remove('active');
        });
        
        // Add active class to current section
        sections[index].classList.add('active');
        
        // Update URL hash for screen sections
        if (index < screens.length) {
            const id = sections[index].getAttribute('id');
            if (id) {
                history.replaceState(null, null, `#${id}`);
            }
        }
        
        // Scroll the section into view
        sections[index].scrollIntoView({ behavior: 'smooth' });
        
        // Update any UI elements based on current position
        updateActiveSection();
        
        // Reset scrolling state after animation completes
        setTimeout(() => {
            isScrolling = false;
        }, 800);
    }
    
    // Update active section and UI elements
    function updateActiveSection() {
        // Hide scroll indicator on last screen
        if (scrollIndicator) {
            scrollIndicator.style.opacity = (currentIndex >= screens.length - 1) ? '0' : '1';
        }
        
        // Add visible class to all sections
        sections.forEach((section, index) => {
            if (index === currentIndex) {
                section.classList.add('active', 'visible');
            } else {
                section.classList.remove('active', 'visible');
                if (Math.abs(index - currentIndex) > 1) {
                    section.classList.remove('visible');
                }
            }
        });
    }
    
    // Scroll wheel event handler
    document.addEventListener('wheel', (e) => {
        e.preventDefault();
        
        if (isScrolling) return;
        
        const direction = Math.sign(e.deltaY);
        const newIndex = currentIndex + direction;
        
        if (newIndex >= 0 && newIndex < sections.length) {
            scrollToSection(newIndex);
        }
    }, { passive: false });
    
    // Touch events for mobile
    let touchStartY = 0;
    let touchEndY = 0;
    let touchStartTime = 0;
    
    document.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
    }, { passive: true });
    
    document.addEventListener('touchmove', (e) => {
        touchEndY = e.touches[0].clientY;
    }, { passive: true });
    
    document.addEventListener('touchend', () => {
        const touchDiff = touchStartY - touchEndY;
        const touchTime = Date.now() - touchStartTime;
        const velocity = Math.abs(touchDiff) / touchTime;
        
        // Adaptive threshold based on velocity
        const swipeThreshold = velocity > 0.5 ? 30 : 60;
        
        if (Math.abs(touchDiff) > swipeThreshold && !isScrolling) {
            const direction = touchDiff > 0 ? 1 : -1;
            const newIndex = currentIndex + direction;
            
            if (newIndex >= 0 && newIndex < sections.length) {
                scrollToSection(newIndex);
            }
        }
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (isScrolling) return;
        
        if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
            e.preventDefault();
            const newIndex = currentIndex + 1;
            if (newIndex < sections.length) {
                scrollToSection(newIndex);
            }
        } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
            e.preventDefault();
            const newIndex = currentIndex - 1;
            if (newIndex >= 0) {
                scrollToSection(newIndex);
            }
        } else if (e.key === 'Home') {
            e.preventDefault();
            scrollToSection(0);
        } else if (e.key === 'End') {
            e.preventDefault();
            scrollToSection(sections.length - 1);
        }
    });
    
    // Scroll indicator click
    if (scrollIndicator) {
        scrollIndicator.addEventListener('click', () => {
            scrollToSection(currentIndex + 1);
        });
    }
    
    // Handle CTA button clicks
    const ctaButtons = document.querySelectorAll('.cta-button');
    const ctaSection = document.getElementById('cta');
    
    if (ctaSection) {
        const ctaIndex = [...sections].findIndex(section => section.id === 'cta');
        
        ctaButtons.forEach(button => {
            if (!button.closest('#cta')) {  // Don't apply to buttons inside CTA section
                button.addEventListener('click', () => {
                    scrollToSection(ctaIndex);
                });
            }
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
            
            // Scroll to signup section
            if (ctaSection) {
                const ctaIndex = [...sections].findIndex(section => section.id === 'cta');
                setTimeout(() => {
                    scrollToSection(ctaIndex);
                }, 500);
            }
        });
    });
    
    // "About Our Mission" link scrolls to mission section
    const missionLink = document.querySelector('.footer-links a:nth-child(4)');
    const missionSection = document.getElementById('mission');
    
    if (missionLink && missionSection) {
        missionLink.addEventListener('click', (e) => {
            e.preventDefault();
            const missionIndex = [...sections].findIndex(section => section.id === 'mission');
            scrollToSection(missionIndex);
        });
    }
    
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
                const personaIndex = [...sections].findIndex(section => section.id === 'personas');
                scrollToSection(personaIndex);
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

        /* Custom scroll styles */
        .app-container {
            position: relative;
            height: 100vh;
            overflow: hidden;
        }

        main.snap-container {
            height: 100%;
            overflow: hidden;
            position: relative;
        }

        .screen, footer {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100vh;
            visibility: hidden;
            opacity: 0;
            transition: opacity 0.8s ease, visibility 0.8s;
        }

        .screen.visible, .screen.active,
        footer.visible, footer.active {
            visibility: visible;
            opacity: 1;
        }
    `;
    document.head.appendChild(style);
    
    // Initial activation
    sections[0].classList.add('active', 'visible');
}); 