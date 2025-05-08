document.addEventListener('DOMContentLoaded', () => {
    // Get all the elements we need
    const app = document.querySelector('.app-container');
    const snapContainer = document.querySelector('.snap-container');
    const screens = document.querySelectorAll('.screen');
    const scrollIndicator = document.querySelector('.scroll-indicator');
    const footer = document.querySelector('footer');
    
    // Detect if this is a mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Current section index
    let currentIndex = 0;
    let isScrolling = false;
    let touchStartY = 0;
    let touchEndY = 0;
    
    // Create a wrapper for the footer to use in scrolling
    const footerScreen = document.createElement('div');
    footerScreen.classList.add('screen', 'footer-screen');
    footerScreen.appendChild(footer);
    snapContainer.appendChild(footerScreen);
    
    // Get all sections including footer
    const allSections = document.querySelectorAll('.screen');
    const totalSections = allSections.length;
    
    // Disable default scrolling
    document.body.style.overflow = 'hidden';
    snapContainer.style.overflowY = 'hidden';
    
    // Initialize - show first screen
    allSections[0].classList.add('active');
    
    // Function to navigate to a section
    function goToSection(index) {
        if (isScrolling) return;
        
        // Boundary check
        if (index < 0) index = 0;
        if (index >= totalSections) index = totalSections - 1;
        
        isScrolling = true;
        currentIndex = index;
        
        // Remove active class from all sections
        allSections.forEach(section => {
            section.classList.remove('active');
        });
        
        // Add active class to current section
        allSections[index].classList.add('active');
        
        // Scroll to the section
        const sectionTop = index * window.innerHeight;
        snapContainer.style.transform = `translateY(-${sectionTop}px)`;
        
        // Update URL hash without scroll jump
        const id = allSections[index].getAttribute('id');
        if (id) {
            history.replaceState(null, null, `#${id}`);
        }
        
        // Allow scrolling again after animation
        setTimeout(() => {
            isScrolling = false;
        }, 700);
    }
    
    // Apply CSS for full-page sections and transitions
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        body {
            margin: 0;
            padding: 0;
            overflow: hidden;
        }
        
        .app-container {
            position: relative;
            width: 100%;
            height: 100vh;
            overflow: hidden;
        }
        
        .snap-container {
            position: relative;
            width: 100%;
            height: 100vh;
            transition: transform 700ms cubic-bezier(0.645, 0.045, 0.355, 1.000);
        }
        
        .screen {
            position: relative;
            width: 100%;
            height: 100vh;
            overflow: hidden;
        }
        
        .footer-screen {
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: var(--darker);
        }
        
        .footer-screen footer {
            position: relative;
            width: 100%;
            margin: 0;
        }
    `;
    document.head.appendChild(styleElement);
    
    // Mouse wheel event
    window.addEventListener('wheel', (e) => {
        e.preventDefault();
        
        if (isScrolling) return;
        
        // Determine scroll direction
        const direction = Math.sign(e.deltaY);
        
        if (direction > 0) {
            // Scroll down
            goToSection(currentIndex + 1);
        } else {
            // Scroll up
            goToSection(currentIndex - 1);
        }
    }, { passive: false });
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (isScrolling) return;
        
        if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
            e.preventDefault();
            goToSection(currentIndex + 1);
        } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
            e.preventDefault();
            goToSection(currentIndex - 1);
        }
    });
    
    // Touch events for mobile
    document.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
    }, { passive: true });
    
    document.addEventListener('touchend', (e) => {
        touchEndY = e.changedTouches[0].clientY;
        const difference = touchStartY - touchEndY;
        
        // Threshold for swipe detection
        const threshold = 50;
        
        if (Math.abs(difference) > threshold) {
            if (difference > 0) {
                // Swipe up - go down
                goToSection(currentIndex + 1);
            } else {
                // Swipe down - go up
                goToSection(currentIndex - 1);
            }
        }
    }, { passive: true });
    
    // Scroll to next section when scroll indicator is clicked
    if (scrollIndicator) {
        scrollIndicator.addEventListener('click', () => {
            goToSection(currentIndex + 1);
        });
    }
    
    // Handle CTA button clicks
    const ctaButtons = document.querySelectorAll('.cta-button');
    const ctaSection = document.getElementById('cta');
    
    ctaButtons.forEach(button => {
        if (!button.closest('#cta')) {  // Don't apply to buttons inside CTA section
            button.addEventListener('click', () => {
                // Find the index of the CTA section
                let ctaIndex = 0;
                allSections.forEach((section, index) => {
                    if (section.id === 'cta') {
                        ctaIndex = index;
                    }
                });
                goToSection(ctaIndex);
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
            
            // Find the index of the CTA section
            let ctaIndex = 0;
            allSections.forEach((section, index) => {
                if (section.id === 'cta') {
                    ctaIndex = index;
                }
            });
            
            // Navigate to signup section
            setTimeout(() => {
                goToSection(ctaIndex);
            }, 500);
        });
    });
    
    // "About Our Mission" link scrolls to mission section
    const missionLink = document.querySelector('.footer-links a:nth-child(4)');
    const missionSection = document.getElementById('mission');
    
    if (missionLink && missionSection) {
        missionLink.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Find the index of the mission section
            let missionIndex = 0;
            allSections.forEach((section, index) => {
                if (section.id === 'mission') {
                    missionIndex = index;
                }
            });
            
            goToSection(missionIndex);
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
                
                // Find the index of the personas section
                let personasIndex = 0;
                allSections.forEach((section, index) => {
                    if (section.id === 'personas') {
                        personasIndex = index;
                    }
                });
                
                goToSection(personasIndex);
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
                
                // Add animation classes to children
                const elements = entry.target.querySelectorAll('h1, h2, h3, p, .feature, .step, .form-group, .persona, .mission-item');
                elements.forEach((el, index) => {
                    el.style.transitionDelay = `${index * 0.1}s`;
                    el.classList.add('animate-in');
                });
            }
        });
    }, observerOptions);
    
    screens.forEach(screen => {
        sectionObserver.observe(screen);
        
        // Add initial animations class
        screen.classList.add('fade-in');
    });
}); 