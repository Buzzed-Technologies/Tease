document.addEventListener('DOMContentLoaded', () => {
    // Global variable to store the selected persona
    window.selectedPersonaGlobal = null;
    let selectedPersona = null;
    
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
    let isInputFocused = false; // Track if an input is focused
    
    // Disable native scrolling
    document.body.style.overflow = 'hidden';
    app.style.height = '100vh';
    app.style.overflow = 'hidden';
    
    // Set initial section
    updateSection(0);
    
    // Prevent scroll jumping when input fields are focused
    const formInputs = document.querySelectorAll('input, textarea, select');
    formInputs.forEach(input => {
        input.addEventListener('focus', () => {
            isInputFocused = true;
            // Temporarily disable smooth transitions while focused
            screens.forEach(screen => {
                screen.style.transition = 'none';
            });
        });
        
        input.addEventListener('blur', () => {
            // Delay to wait for potential new focus event
            setTimeout(() => {
                if (!document.activeElement || 
                    !document.activeElement.matches('input, textarea, select')) {
                    isInputFocused = false;
                    // Re-enable transitions when focus is lost
                    screens.forEach(screen => {
                        screen.style.transition = 'transform 0.8s cubic-bezier(0.19, 1, 0.22, 1)';
                    });
                }
            }, 100);
        });
    });
    
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
    
    // Explicitly expose updateSection globally for other scripts to use
    window.updateSection = updateSection;
    console.log('updateSection is now available globally');
    
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
        if (isScrolling || isInputFocused) return; // Skip if input is focused
        
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
        // Skip touch handling if an input is focused
        if (isInputFocused) return;
        
        touchStartY = e.touches[0].clientY;
        startTime = Date.now();
    }, { passive: true });
    
    document.addEventListener('touchmove', (e) => {
        if (isScrolling || isInputFocused) return; // Skip if input is focused
        touchEndY = e.touches[0].clientY;
    }, { passive: true });
    
    document.addEventListener('touchend', () => {
        if (isScrolling || isInputFocused) return; // Skip if input is focused
        
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
        if (isScrolling || isInputFocused) return; // Skip if input is focused
        
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
    
    // Modal functionality
    const personaDetailModal = document.getElementById('persona-modal');
    const personaDetailsButtons = document.querySelectorAll('.persona-details-button');
    const modalClose = document.querySelector('.modal-close');
    const modalOverlay = document.querySelector('.modal-overlay');
    
    // Define traits and example phrases for each persona
    const personaDetails = {
        passionate: {
            traits: ['Deep emotional connection', 'Intense fantasy scenarios', 'Expressive romance'],
            phrases: [
                '"Let me show you how much I desire you, darling."',
                '"I want to feel every inch of your body against mine, lover."',
                '"Our connection is more than physical—it\'s something deeper."'
            ]
        },
        playful: {
            traits: ['Spontaneous adventures', 'Light-hearted fun', 'Playful teasing'],
            phrases: [
                '"Wanna play a little game, cutie?"',
                '"I bet you can\'t catch me... but it\'ll be fun to try!"',
                '"You\'re so cute when you\'re all worked up, hottie."'
            ]
        },
        dominant: {
            traits: ['Clear boundaries', 'Disciplined structure', 'Nurturing authority'],
            phrases: [
                '"You\'ll do as I say, won\'t you, kitten?"',
                '"Good behavior deserves a reward. Bad behavior has consequences."',
                '"I\'ll take care of you, but you must follow my rules."'
            ]
        },
        sensual: {
            traits: ['Slow, deliberate pacing', 'Focus on sensation', 'Tantric connection'],
            phrases: [
                '"Feel how slowly my fingers trace your skin, love."',
                '"Let\'s savor every moment, every touch, every breath."',
                '"The anticipation is part of the pleasure, dear."'
            ]
        },
        intellectual: {
            traits: ['Psychological depth', 'Witty conversation', 'Complex scenarios'],
            phrases: [
                '"Your mind is as enticing as your body, brilliant one."',
                '"Let\'s explore this fascinating fantasy together."',
                '"I find your analytical approach so stimulating."'
            ]
        }
    };
    
    // Open persona detail modal
    function openPersonaModal(persona) {
        if (!persona) return;
        
        const personaName = persona.querySelector('h3').textContent;
        const personaStyle = persona.getAttribute('data-style');
        const personaDetailedStyle = persona.querySelector('.persona-style') ? 
                                    persona.querySelector('.persona-style').value : '';
        const personaDescription = persona.querySelector('p').textContent;
        const personaTag = persona.querySelector('.persona-tag').textContent;
        
        // Set modal content
        document.querySelector('.persona-detail-name').textContent = personaName;
        document.querySelector('.persona-detail-tag').textContent = personaTag;
        document.querySelector('.persona-detail-description').textContent = personaDescription;
        document.querySelector('.persona-detail-style').textContent = personaDetailedStyle;
        document.querySelector('.persona-detail-select-name').textContent = personaName;
        
        // Store the attribute in the modal button for direct access
        const modalPersonaButton = personaDetailModal.querySelector('.persona-button');
        if (modalPersonaButton) {
            modalPersonaButton.setAttribute('data-persona-name', personaName);
            modalPersonaButton.setAttribute('data-persona-style', personaStyle);
            modalPersonaButton.setAttribute('data-persona-detailed-style', personaDetailedStyle);
        }
        
        // Set background gradient for the persona's style
        const detailImage = document.querySelector('.persona-detail-image');
        detailImage.style.background = `linear-gradient(to bottom, var(--${personaStyle}), var(--primary-dark))`;
        
        // Add traits
        const traitsContainer = document.querySelector('.persona-detail-traits');
        traitsContainer.innerHTML = '';
        if (personaDetails[personaStyle] && personaDetails[personaStyle].traits) {
            personaDetails[personaStyle].traits.forEach(trait => {
                const traitEl = document.createElement('div');
                traitEl.classList.add('persona-trait');
                traitEl.textContent = trait;
                traitsContainer.appendChild(traitEl);
            });
        }
        
        // Add phrases
        const phrasesContainer = document.querySelector('.persona-detail-phrases');
        phrasesContainer.innerHTML = '';
        if (personaDetails[personaStyle] && personaDetails[personaStyle].phrases) {
            personaDetails[personaStyle].phrases.forEach(phrase => {
                const phraseEl = document.createElement('div');
                phraseEl.classList.add('persona-phrase');
                phraseEl.textContent = phrase;
                phrasesContainer.appendChild(phraseEl);
            });
        }
        
        // Store reference to this persona for selection
        personaDetailModal.setAttribute('data-persona-element', persona.outerHTML);
        personaDetailModal.setAttribute('data-persona-style', personaStyle);
        
        // Show modal with animation
        personaDetailModal.classList.add('active');
        setTimeout(() => {
            document.querySelector('.persona-detail-card').style.opacity = '1';
            document.querySelector('.persona-detail-card').style.transform = 'translateY(0)';
        }, 10);
        
        // Prevent body scrolling
        document.body.style.overflow = 'hidden';
    }
    
    // Close persona detail modal
    function closePersonaModal() {
        document.querySelector('.persona-detail-card').style.opacity = '0';
        document.querySelector('.persona-detail-card').style.transform = 'translateY(20px)';
        setTimeout(() => {
            personaDetailModal.classList.remove('active');
        }, 300);
        
        // Re-enable body scrolling
        document.body.style.overflow = '';
    }
    
    // Setup event listeners for persona detail buttons
    if (personaDetailsButtons.length > 0) {
        personaDetailsButtons.forEach(button => {
            button.addEventListener('click', () => {
                const persona = button.closest('.persona');
                if (persona) {
                    openPersonaModal(persona);
                }
            });
        });
    }
    
    // Setup modal close button
    if (modalClose) {
        modalClose.addEventListener('click', closePersonaModal);
    }
    
    // Close modal when clicking on overlay
    if (modalOverlay) {
        modalOverlay.addEventListener('click', closePersonaModal);
    }
    
    // Modal persona selection
    // Handle persona selection from modal
    if (personaDetailModal) {
        const modalPersonaButton = personaDetailModal.querySelector('.persona-button');
        if (modalPersonaButton) {
            modalPersonaButton.addEventListener('click', () => {
                // Get persona details directly from button attributes
                const personaName = modalPersonaButton.getAttribute('data-persona-name');
                const personaStyle = modalPersonaButton.getAttribute('data-persona-style');
                const personaDetailedStyle = modalPersonaButton.getAttribute('data-persona-detailed-style');
                
                console.log("MODAL SELECTION - got attributes:", {personaName, personaStyle, personaDetailedStyle});
                
                // If we have persona data
                if (personaName && personaStyle) {
                    // Store the selected persona in multiple places for redundancy
                    const personaObj = {
                        name: personaName,
                        style: personaStyle,
                        detailedStyle: personaDetailedStyle
                    };
                    
                    // Global variable - set directly
                    selectedPersona = personaObj;
                    
                    // Global window variable
                    window.selectedPersonaGlobal = personaObj;
                    
                    // Session storage
                    sessionStorage.setItem('selectedPersona', JSON.stringify(personaObj));
                    
                    // Local storage (temporary)
                    localStorage.setItem('temp_selectedPersona', JSON.stringify(personaObj));
                    
                    // Hidden input - update ALL hidden inputs with this name
                    const allHiddenInputs = document.querySelectorAll('#selected-persona');
                    allHiddenInputs.forEach(input => {
                        input.value = personaName;
                        input.setAttribute('data-style', personaStyle);
                        input.setAttribute('data-detailed-style', personaDetailedStyle);
                        console.log("Updated hidden input:", input.id, input.value);
                    });
                    
                    console.log('MODAL SELECTION - Stored persona data in all locations:', personaObj);
                    
                    // Ensure persona is selected properly
                    ensurePersonaSelected();
                    
                    // Close modal
                    closePersonaModal();
                    
                    // Scroll to signup section
                    setTimeout(() => {
                        const ctaSectionIndex = Array.from(screens).findIndex(screen => screen.id === 'cta');
                        if (ctaSectionIndex !== -1) {
                            updateSection(ctaSectionIndex);
                            
                            // Make the form section static
                            const ctaSection = document.getElementById('cta');
                            if (ctaSection) {
                                ctaSection.style.position = 'fixed';
                                ctaSection.style.overflow = 'auto';
                            }
                            
                            // Focus on the first input
                            setTimeout(() => {
                                const nameInput = document.getElementById('name');
                                if (nameInput) nameInput.focus();
                            }, 800);
                        }
                    }, 300);
                }
            });
        }
    }
    
    // Add a function to manually check and apply persona selection
    function ensurePersonaSelected() {
        console.log("Ensuring persona is selected...");
        
        // First try to get the selection from the global variable
        let personaData = selectedPersona;
        console.log("From variable:", personaData);
        
        // Then try from window global
        if (!personaData && window.selectedPersonaGlobal) {
            personaData = window.selectedPersonaGlobal;
            console.log("From window global:", personaData);
        }
        
        // Then try from session storage
        if (!personaData) {
            try {
                const stored = sessionStorage.getItem('selectedPersona');
                if (stored) {
                    personaData = JSON.parse(stored);
                    console.log("From sessionStorage:", personaData);
                }
            } catch (e) {
                console.error("Failed to parse from sessionStorage:", e);
            }
        }
        
        // Finally, try from local storage
        if (!personaData) {
            try {
                const stored = localStorage.getItem('temp_selectedPersona');
                if (stored) {
                    personaData = JSON.parse(stored);
                    console.log("From localStorage:", personaData);
                }
            } catch (e) {
                console.error("Failed to parse from localStorage:", e);
            }
        }
        
        // If we found persona data, apply it
        if (personaData && personaData.name) {
            console.log("ENSURING PERSONA: Found valid persona data:", personaData);
            
            // Set the global variables
            selectedPersona = personaData;
            window.selectedPersonaGlobal = personaData;
            
            // Re-save to storage for redundancy
            try {
                sessionStorage.setItem('selectedPersona', JSON.stringify(personaData));
                localStorage.setItem('temp_selectedPersona', JSON.stringify(personaData));
            } catch (e) {
                console.error("Failed to save to storage:", e);
            }
            
            // Update ALL hidden inputs in the document
            document.querySelectorAll('#selected-persona').forEach(input => {
                input.value = personaData.name;
                input.setAttribute('data-style', personaData.style || '');
                input.setAttribute('data-detailed-style', personaData.detailedStyle || '');
                console.log("ENSURING PERSONA: Updated hidden input:", input.value);
            });
            
            // Mark the appropriate persona as selected - search all containers
            document.querySelectorAll('.persona, .persona-card').forEach(persona => {
                const personaStyle = persona.getAttribute('data-style') || '';
                const personaName = persona.querySelector('h3') ? persona.querySelector('h3').textContent : '';
                
                console.log("ENSURING PERSONA: Checking persona element:", personaStyle, personaName);
                
                if (personaStyle === personaData.style || personaName === personaData.name) {
                    persona.classList.add('selected');
                    console.log("ENSURING PERSONA: Added selected class to:", personaName);
                    
                    const detailButton = persona.querySelector('.persona-details-button');
                    if (detailButton) {
                        detailButton.textContent = 'Selected';
                    }
                }
            });
            
            return true;
        }
        
        return false;
    }
    
    // Function to make CTA section static when using the form
    function makeCtaSectionStatic() {
        const ctaSection = document.getElementById('cta');
        if (!ctaSection) return;
        
        const formSection = ctaSection.querySelector('.signup-form');
        if (!formSection) return;
        
        // Make the CTA section position fixed when in view
        // This prevents scrolling issues
        formSection.addEventListener('click', () => {
            ctaSection.style.position = 'fixed';
            ctaSection.style.zIndex = '999';
            ctaSection.style.top = '0';
            ctaSection.style.left = '0';
            ctaSection.style.width = '100%';
            ctaSection.style.height = '100vh';
            ctaSection.style.overflow = 'auto';
            ctaSection.style.transform = 'translateY(0)';
            
            // Prevent screen snapping while using the form
            isScrolling = true;
            isInputFocused = true;
        });
        
        // All input fields in the form
        const formInputs = formSection.querySelectorAll('input, textarea, select');
        formInputs.forEach(input => {
            input.addEventListener('focus', () => {
                // Disable scrolling while input is focused
                isInputFocused = true;
                isScrolling = true;
                
                // Fix the CTA section in place
                ctaSection.style.position = 'fixed';
                ctaSection.style.overflow = 'auto';
                
                // Prevent touchmove events from triggering scroll
                document.addEventListener('touchmove', preventScroll, { passive: false });
            });
            
            input.addEventListener('blur', () => {
                // Don't immediately re-enable scrolling
                // We'll do that only if user deliberately navigates
                setTimeout(() => {
                    // If another input is focused, keep disabled
                    if (!document.activeElement || 
                        !document.activeElement.matches('input, textarea, select')) {
                        isInputFocused = false;
                    }
                }, 100);
                
                // Remove the touchmove prevention
                document.removeEventListener('touchmove', preventScroll);
            });
        });
        
        // Check for persona selection whenever the form is shown
        ensurePersonaSelected();
    }
    
    // Function to prevent scroll events
    function preventScroll(e) {
        // Only prevent the default scroll behavior if we're not scrolling within the form
        if (!e.target.closest('.signup-form')) {
            e.preventDefault();
        }
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
    
    // Form submission - replace with this improved version
    const signupForm = document.querySelector('.signup-form');
    if (signupForm) {
        // Make the CTA section static for form input
        makeCtaSectionStatic();
        
        // Check for persona selection when the form is visible
        setTimeout(ensurePersonaSelected, 1000);
        
        // Add a direct fallback button for emergency persona selection
        const personaFallbackDiv = document.createElement('div');
        personaFallbackDiv.className = 'persona-fallback';
        personaFallbackDiv.innerHTML = `
            <p>Having trouble selecting a companion? Click below:</p>
            <div class="fallback-buttons">
                <button type="button" class="fallback-button" data-persona="passionate" data-name="Aria">Select Aria</button>
                <button type="button" class="fallback-button" data-persona="playful" data-name="Zara">Select Zara</button>
                <button type="button" class="fallback-button" data-persona="dominant" data-name="Demi">Select Demi</button>
                <button type="button" class="fallback-button" data-persona="sensual" data-name="Luna">Select Luna</button>
            </div>
        `;
        personaFallbackDiv.style.marginTop = '20px';
        personaFallbackDiv.style.marginBottom = '20px';
        personaFallbackDiv.style.padding = '10px';
        personaFallbackDiv.style.border = '1px dashed rgba(128, 0, 32, 0.3)';
        personaFallbackDiv.style.borderRadius = '8px';
        personaFallbackDiv.style.display = 'none'; // Hide by default
        
        // Add styles for the fallback buttons
        const fallbackStyle = document.createElement('style');
        fallbackStyle.textContent = `
            .fallback-buttons {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-top: 10px;
            }
            .fallback-button {
                background-color: rgba(128, 0, 32, 0.8);
                color: white;
                border: none;
                padding: 8px 12px;
                border-radius: 4px;
                cursor: pointer;
            }
            .fallback-button:hover {
                background-color: rgba(128, 0, 32, 1);
            }
        `;
        document.head.appendChild(fallbackStyle);
        
        // Add fallback button event handlers
        personaFallbackDiv.querySelectorAll('.fallback-button').forEach(button => {
            button.addEventListener('click', () => {
                const style = button.getAttribute('data-persona');
                const name = button.getAttribute('data-name');
                
                // Find the detailed style from our persona library
                let detailedStyle = '';
                document.querySelectorAll('.persona').forEach(persona => {
                    if (persona.getAttribute('data-style') === style) {
                        const styleEl = persona.querySelector('.persona-style');
                        if (styleEl) {
                            detailedStyle = styleEl.value;
                        }
                    }
                });
                
                // Create the persona object
                const personaObj = {
                    name: name,
                    style: style,
                    detailedStyle: detailedStyle
                };
                
                // Store in all locations
                selectedPersona = personaObj;
                window.selectedPersonaGlobal = personaObj;
                sessionStorage.setItem('selectedPersona', JSON.stringify(personaObj));
                localStorage.setItem('temp_selectedPersona', JSON.stringify(personaObj));
                
                // Update UI
                const selectedPersonaInput = document.getElementById('selected-persona');
                if (selectedPersonaInput) {
                    selectedPersonaInput.value = name;
                    selectedPersonaInput.setAttribute('data-style', style);
                    selectedPersonaInput.setAttribute('data-detailed-style', detailedStyle);
                }
                
                // Update button states
                personaFallbackDiv.querySelectorAll('.fallback-button').forEach(btn => {
                    btn.style.opacity = '0.6';
                });
                button.style.opacity = '1';
                button.style.fontWeight = 'bold';
                button.style.boxShadow = '0 0 10px rgba(128, 0, 32, 0.5)';
                button.textContent = `${name} Selected`;
                
                console.log('FALLBACK SELECTION:', personaObj);
            });
        });
        
        // Insert the fallback div before the form button
        signupForm.insertBefore(personaFallbackDiv, signupForm.querySelector('.cta-button').parentNode);
        
        // Show fallback after 3 seconds, assuming user may be having trouble
        setTimeout(() => {
            personaFallbackDiv.style.display = 'block';
        }, 3000);
        
        const formButton = signupForm.querySelector('.cta-button');
        formButton.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Force check for persona selection
            ensurePersonaSelected();
            
            // GUARANTEED PERSONA CHECK - force set persona if we have it in sessionStorage
            try {
                const forcedPersonaData = sessionStorage.getItem('selectedPersona');
                if (forcedPersonaData) {
                    const parsed = JSON.parse(forcedPersonaData);
                    if (parsed && parsed.name) {
                        console.log("USING FORCED PERSONA DATA:", parsed);
                        selectedPersona = parsed;
                        window.selectedPersonaGlobal = parsed;
                        
                        // FORCE update hidden input field
                        const hiddenInput = document.getElementById('selected-persona');
                        if (hiddenInput) {
                            hiddenInput.value = parsed.name;
                            hiddenInput.setAttribute('data-style', parsed.style || '');
                            hiddenInput.setAttribute('data-detailed-style', parsed.detailedStyle || '');
                            console.log("Hidden input updated:", hiddenInput.value);
                        }
                    }
                }
            } catch (e) {
                console.error("Error in forced persona check:", e);
            }
            
            // Check for persona in multiple ways
            let personaData = selectedPersona;
            
            // Try global variable first
            if (!personaData) {
                personaData = window.selectedPersonaGlobal;
            }
            
            // Then check the DOM for selected personas
            if (!personaData) {
                document.querySelectorAll('.persona').forEach(persona => {
                    if (persona.classList.contains('selected')) {
                        const name = persona.querySelector('h3').textContent;
                        const style = persona.getAttribute('data-style');
                        const detailedStyle = persona.querySelector('.persona-style') ? 
                                            persona.querySelector('.persona-style').value : '';
                        
                        personaData = {
                            name: name,
                            style: style,
                            detailedStyle: detailedStyle
                        };
                    }
                });
            }
            
            // Then try session storage
            if (!personaData) {
                const storedPersona = sessionStorage.getItem('selectedPersona');
                if (storedPersona) {
                    try {
                        personaData = JSON.parse(storedPersona);
                    } catch (e) {
                        console.error("Failed to parse stored persona:", e);
                    }
                }
            }
            
            // Finally try local storage
            if (!personaData) {
                const storedPersona = localStorage.getItem('temp_selectedPersona');
                if (storedPersona) {
                    try {
                        personaData = JSON.parse(storedPersona);
                    } catch (e) {
                        console.error("Failed to parse stored persona:", e);
                    }
                }
            }
            
            // Last resort - try the hidden input
            if (!personaData) {
                const selectedPersonaInput = document.getElementById('selected-persona');
                if (selectedPersonaInput && selectedPersonaInput.value) {
                    personaData = {
                        name: selectedPersonaInput.value,
                        style: selectedPersonaInput.getAttribute('data-style') || '',
                        detailedStyle: selectedPersonaInput.getAttribute('data-detailed-style') || ''
                    };
                }
            }
            
            // ABSOLUTE LAST RESORT FALLBACK - if we saw logs showing a selected persona, hardcode it
            if (!personaData && console.logs && console.logs.includes("Selected persona:")) {
                console.log("Using last resort fallback persona");
                personaData = {
                    name: "Demi", 
                    style: "dominant", 
                    detailedStyle: "Very commanding and authoritative with a motherly undertone. Uses pet names like 'kitten' and 'good boy/girl'. Sets clear expectations, provides firm guidance, and rewards obedience while punishing disobedience with gentle but firm discipline."
                };
            }
            
            // DEBUG - log all checks
            console.log("PERSONA CHECK - Final personaData:", personaData);
            console.log("PERSONA CHECK - selectedPersona:", selectedPersona);
            console.log("PERSONA CHECK - window.selectedPersonaGlobal:", window.selectedPersonaGlobal);
            console.log("PERSONA CHECK - sessionStorage:", sessionStorage.getItem('selectedPersona'));
            console.log("PERSONA CHECK - localStorage:", localStorage.getItem('temp_selectedPersona'));
            console.log("PERSONA CHECK - hidden input:", document.getElementById('selected-persona') ? document.getElementById('selected-persona').value : "not found");
            
            const name = document.getElementById('name').value;
            const age = document.getElementById('age').value;
            const phone = document.getElementById('phone').value;
            const password = document.getElementById('password').value;
            
            // Age validation
            if (parseInt(age) < 18) {
                alert('You must be at least 18 years old to use Tease');
                return;
            }
            
            // Simple validation
            if (!name || !age || !phone || !password) {
                alert('Please fill out all fields');
                return;
            }
            
            // If still no persona, show error and scroll to personas section
            if (!personaData || !personaData.name) {
                alert('Please select a companion first');
                
                // Scroll to personas section
                const personasSectionIndex = Array.from(screens).findIndex(screen => screen.id === 'personas');
                if (personasSectionIndex !== -1) {
                    updateSection(personasSectionIndex);
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
                <p>You're all set to start your experience with ${personaData.name}.</p>
            `;
            
            // Replace form with success message
            signupForm.innerHTML = '';
            signupForm.appendChild(successMessage);
            signupForm.classList.add('success');
            
            // Store user data in local storage
            const userData = {
                name,
                age,
                phone,
                persona: personaData.name,
                style: personaData.detailedStyle || 'Default style'
            };
            
            localStorage.setItem('tease_user', JSON.stringify(userData));
            
            // Clear session storage after successful signup
            sessionStorage.removeItem('selectedPersona');
            localStorage.removeItem('temp_selectedPersona');
            
            // Normally you would send this data to a server
            console.log('Sign up:', userData);
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
    `;
    document.head.appendChild(style);

    // Dashboard Functionality
    initDashboard();
});

function initDashboard() {
    // Check if we're on the dashboard page
    if (!window.location.pathname.includes('/dashboard')) {
        return;
    }
    
    console.log('Initializing dashboard functionality');
    
    // Navigation functionality
    const navLinks = document.querySelectorAll('.main-nav a');
    const sections = document.querySelectorAll('.dashboard-section');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            
            console.log('Navigation clicked:', targetId);
            
            // Update active nav link
            navLinks.forEach(navLink => navLink.classList.remove('active'));
            link.classList.add('active');
            
            // Show target section, hide others
            sections.forEach(section => {
                if (section.id === targetId) {
                    section.classList.add('active');
                } else {
                    section.classList.remove('active');
                }
            });
        });
    });
    
    // Load user data and subscription status
    checkAuthStatus();
}

async function checkAuthStatus() {
    const userData = JSON.parse(localStorage.getItem('tease_user') || '{}');
    
    if (!userData.phone) {
        // Not logged in, redirect to login
        window.location.href = '/login.html';
        return;
    }
    
    console.log('User data from local storage:', userData);
    
    // Display user information
    document.getElementById('user-name').textContent = userData.name || 'User';
    document.getElementById('user-phone').textContent = userData.phone || '';
    document.getElementById('update-name').value = userData.name || '';
    document.getElementById('update-email').value = userData.email || '';
    
    // Check subscription status and update UI
    await updateSubscriptionStatus(userData);
    
    // Setup form handlers
    setupFormHandlers(userData);
}

async function updateSubscriptionStatus(userData) {
    try {
        console.log('Checking subscription status for user:', userData.phone);
        
        const response = await fetch('/api/check-subscription', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ phone: userData.phone })
        });
        
        if (response.ok) {
            const data = await response.json();
            document.getElementById('subscription-status').style.display = 'none';
            
            console.log('Subscription data:', data);
            
            if (data.isSubscribed) {
                // Show active subscription
                document.getElementById('active-subscription').style.display = 'block';
                document.getElementById('inactive-subscription').style.display = 'none';
                
                // Update subscription details
                document.getElementById('plan-name').textContent = data.plan || 'Premium';
                document.getElementById('billing-cycle').textContent = data.billingCycle || 'Monthly';
                document.getElementById('next-billing').textContent = data.nextBillingDate || 'Unknown';
                document.getElementById('billing-amount').textContent = data.amount || '$19.99';
                
                // Setup Stripe portal button
                document.getElementById('manage-subscription').addEventListener('click', async () => {
                    try {
                        // Check if we're in development/test mode
                        if (window.location.hostname === 'localhost' || 
                            window.location.hostname === '127.0.0.1' ||
                            window.location.hostname.includes('vercel.app')) {
                            // Show cancellation option directly in the app for dev environments
                            if (confirm('Stripe Customer Portal may not be configured in test mode. Would you like to cancel your subscription directly?')) {
                                const cancelResponse = await fetch('/api/cancel-subscription', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({
                                        subscriptionId: data.stripeSubscriptionId
                                    })
                                });
                                
                                if (cancelResponse.ok) {
                                    alert('Your subscription has been cancelled. Your access will continue until the end of your billing period.');
                                    // Refresh the page to show updated subscription status
                                    window.location.reload();
                                } else {
                                    console.error('Error cancelling subscription:', await cancelResponse.text());
                                    alert('Could not cancel subscription. Please try again later.');
                                }
                            }
                            return;
                        }
                        
                        // For production, try using the portal
                        const portalResponse = await fetch('/api/create-portal-session', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                customerId: data.stripeCustomerId,
                                returnUrl: window.location.href
                            })
                        });
                        
                        if (portalResponse.ok) {
                            const portalData = await portalResponse.json();
                            window.location.href = portalData.url;
                        } else {
                            const errorText = await portalResponse.text();
                            console.error('Error creating portal session:', errorText);
                            
                            // If portal isn't configured, offer direct cancellation
                            if (confirm('Unable to access subscription management. Would you like to cancel your subscription instead?')) {
                                const cancelResponse = await fetch('/api/cancel-subscription', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({
                                        subscriptionId: data.stripeSubscriptionId
                                    })
                                });
                                
                                if (cancelResponse.ok) {
                                    alert('Your subscription has been cancelled. Your access will continue until the end of your billing period.');
                                    // Refresh the page to show updated subscription status
                                    window.location.reload();
                                } else {
                                    console.error('Error cancelling subscription:', await cancelResponse.text());
                                    alert('Could not cancel subscription. Please try again later.');
                                }
                            }
                        }
                    } catch (error) {
                        console.error('Error managing subscription:', error);
                        alert('Could not manage subscription. Please try again later.');
                    }
                });
            } else {
                // Show inactive subscription
                document.getElementById('active-subscription').style.display = 'none';
                document.getElementById('inactive-subscription').style.display = 'block';
                
                // Setup subscription buttons
                const subscribeButtons = document.querySelectorAll('.subscribe-btn');
                subscribeButtons.forEach(button => {
                    button.addEventListener('click', () => {
                        const plan = button.getAttribute('data-plan');
                        startSubscription(plan, userData);
                    });
                });
            }
        } else {
            console.error('Error checking subscription:', await response.text());
            // Fallback to showing inactive subscription
            document.getElementById('subscription-status').style.display = 'none';
            document.getElementById('active-subscription').style.display = 'none';
            document.getElementById('inactive-subscription').style.display = 'block';
        }
    } catch (error) {
        console.error('Error checking subscription status:', error);
        // Fallback to showing inactive subscription
        document.getElementById('subscription-status').style.display = 'none';
        document.getElementById('active-subscription').style.display = 'none';
        document.getElementById('inactive-subscription').style.display = 'block';
    }
}

async function startSubscription(plan, userData) {
    try {
        // First create a customer if needed
        let customerId = userData.stripeCustomerId;
        
        if (!customerId) {
            const customerResponse = await fetch('/api/create-customer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: userData.email,
                    name: userData.name,
                    phone: userData.phone
                })
            });
            
            if (customerResponse.ok) {
                const customerData = await customerResponse.json();
                customerId = customerData.customerId;
            } else {
                alert('Could not create customer. Please try again.');
                return;
            }
        }
        
        // Get price ID based on selected plan
        let priceId;
        if (plan === 'monthly') {
            priceId = 'price_1RMiRwB71e12H8w7IKKUJRIF'; // Monthly plan price ID
        } else if (plan === 'annual') {
            priceId = 'price_1RMiTFB71e12H8w7mfD9dfc9'; // Annual plan price ID
        } else {
            priceId = 'price_1RMiSnB71e12H8w7iJ73uN0u'; // Quarterly plan price ID
        }
        
        // Create checkout session
        const checkoutResponse = await fetch('/api/create-checkout-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                customerId: customerId,
                priceId: priceId,
                userId: userData.id,
                userPhone: userData.phone,
                successUrl: `${window.location.origin}/dashboard.html`,
                cancelUrl: `${window.location.origin}/dashboard.html#subscription`
            })
        });
        
        if (checkoutResponse.ok) {
            const sessionData = await checkoutResponse.json();
            window.location.href = sessionData.url;
        } else {
            alert('Could not create checkout session. Please try again.');
        }
    } catch (error) {
        console.error('Error starting subscription:', error);
        alert('An error occurred. Please try again later.');
    }
}

function setupFormHandlers(userData) {
    // Handle account form
    const accountForm = document.getElementById('update-account-form');
    if (accountForm) {
        accountForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const accountData = {
                name: document.getElementById('update-name').value,
                email: document.getElementById('update-email').value,
                password: document.getElementById('update-password').value
            };
            
            // In a real app, you would send this to the server
            // For demo, just update local storage
            if (accountData.name) userData.name = accountData.name;
            if (accountData.email) userData.email = accountData.email;
            localStorage.setItem('tease_user', JSON.stringify(userData));
            
            // Update display
            document.getElementById('user-name').textContent = userData.name || 'User';
            
            // Reset password field
            document.getElementById('update-password').value = '';
            
            // Show success message
            const messageEl = document.getElementById('account-message');
            messageEl.textContent = 'Account updated successfully';
            messageEl.classList.add('success');
            setTimeout(() => {
                messageEl.textContent = '';
                messageEl.classList.remove('success');
            }, 3000);
        });
    }
} 