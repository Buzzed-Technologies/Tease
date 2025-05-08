import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import Head from 'next/head';

export default function Home() {
  const { user, loading, register } = useAuth();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState(0);
  const [selectedPersona, setSelectedPersona] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect to account page if already logged in
  useEffect(() => {
    if (!loading && user) {
      router.push('/account');
    }
  }, [user, loading, router]);

  // Handle persona selection
  const handlePersonaSelect = (personaName, personaStyle) => {
    setSelectedPersona({
      name: personaName,
      style: personaStyle
    });
    
    // Scroll to signup section after a delay
    setTimeout(() => {
      const ctaSectionIndex = document.querySelectorAll('.screen').length - 1;
      if (typeof window !== 'undefined') {
        window.scrollTo({
          top: window.innerHeight * ctaSectionIndex,
          behavior: 'smooth'
        });
      }
    }, 500);
  };

  // Handle input change
  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData({
      ...formData,
      [id]: value
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    
    if (!selectedPersona) {
      setFormError('Please select a companion first');
      return;
    }

    // Validate form data
    if (!formData.name || !formData.phone || !formData.password) {
      setFormError('All fields are required');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const result = await register(
        formData.name,
        formData.phone,
        formData.password,
        selectedPersona.name
      );

      if (result.success) {
        setFormSuccess('Account created successfully! Redirecting to your account...');
        // Redirect happens automatically via useEffect when user state is updated
      } else {
        setFormError(result.error);
      }
    } catch (error) {
      setFormError(error.message || 'An error occurred during registration');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="app-container">
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Tease | AI Adult Companion Service</title>
        
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
        <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon" />
        
        <meta property="og:title" content="Tease | AI Adult Companion Service" />
        <meta property="og:description" content="Experience intimate encounters with AI designed to satisfy your desires in a safe, private space." />
        <meta property="og:image" content="/images/Group 69.png" />
        <meta property="og:url" content="https://tease.vercel.app" />
        <meta property="og:type" content="website" />
        
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Tease | AI Adult Companion Service" />
        <meta name="twitter:description" content="Experience intimate encounters with AI designed to satisfy your desires in a safe, private space." />
        <meta name="twitter:image" content="/images/Group 69.png" />
        
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Montserrat:wght@300;400;600&display=swap" rel="stylesheet" />
      </Head>

      <main className="snap-container">
        <section className="screen" id="intro">
          <div className="animated-bg"></div>
          <div className="content">
            <div className="logo-container">
              <div className="logo">tease</div>
              <div className="tagline">ai adult companion</div>
            </div>
            <h1>Your Virtual <span className="highlight">Adult</span><br />Companion</h1>
            <p className="intro-text">AI-powered intimate experiences<br />in a safe, private environment.</p>
            <div className="cta-wrapper">
              <button className="cta-button" onClick={() => {
                const personasSectionIndex = Array.from(document.querySelectorAll('.screen')).findIndex(screen => screen.id === 'personas');
                if (typeof window !== 'undefined') {
                  window.scrollTo({
                    top: window.innerHeight * personasSectionIndex,
                    behavior: 'smooth'
                  });
                }
              }}>Experience Tease</button>
              <div className="cta-hint">Your privacy is our promise</div>
            </div>
            <div className="pulse-circle"></div>
          </div>
          <div className="scroll-indicator">
            <i className="fas fa-chevron-down"></i>
            <span>Swipe Up</span>
          </div>
        </section>

        {/* Features Section */}
        {/* ... existing features section code ... */}

        {/* Experience Section */}
        {/* ... existing experience section code ... */}

        {/* Mission Section */}
        {/* ... existing mission section code ... */}

        <section className="screen" id="personas">
          <div className="content">
            <h2>Choose Your <span className="highlight">Companion</span></h2>
            <p>Explore different AI personalities, each with unique styles and approaches to adult interaction.</p>
            
            <div className="personas-container">
              <div className="personas-scroll">
                <div className={`persona ${selectedPersona?.name === 'Aria' ? 'selected' : ''}`} data-style="passionate">
                  <div className="persona-image"></div>
                  <div className="persona-content">
                    <h3>Aria</h3>
                    <span className="persona-tag">The Passionate</span>
                    <p>Intense, seductive, and emotionally expressive. Aria creates immersive experiences through intimate fantasy fulfillment.</p>
                    <button 
                      className="persona-button"
                      onClick={() => handlePersonaSelect('Aria', 'passionate')}
                    >
                      {selectedPersona?.name === 'Aria' ? 'Selected' : 'Select Aria'}
                    </button>
                  </div>
                </div>
                
                <div className={`persona ${selectedPersona?.name === 'Zara' ? 'selected' : ''}`} data-style="playful">
                  <div className="persona-image"></div>
                  <div className="persona-content">
                    <h3>Zara</h3>
                    <span className="persona-tag">The Playful</span>
                    <p>Adventurous, flirtatious, and spontaneous. Zara brings excitement and exploration to every encounter.</p>
                    <button 
                      className="persona-button"
                      onClick={() => handlePersonaSelect('Zara', 'playful')}
                    >
                      {selectedPersona?.name === 'Zara' ? 'Selected' : 'Select Zara'}
                    </button>
                  </div>
                </div>
                
                <div className={`persona ${selectedPersona?.name === 'Demi' ? 'selected' : ''}`} data-style="dominant">
                  <div className="persona-image"></div>
                  <div className="persona-content">
                    <h3>Demi</h3>
                    <span className="persona-tag">The Dominant</span>
                    <p>Confident, assertive, and commanding. Demi provides structure, discipline, and control in your interactions.</p>
                    <button 
                      className="persona-button"
                      onClick={() => handlePersonaSelect('Demi', 'dominant')}
                    >
                      {selectedPersona?.name === 'Demi' ? 'Selected' : 'Select Demi'}
                    </button>
                  </div>
                </div>
                
                <div className={`persona ${selectedPersona?.name === 'Luna' ? 'selected' : ''}`} data-style="sensual">
                  <div className="persona-image"></div>
                  <div className="persona-content">
                    <h3>Luna</h3>
                    <span className="persona-tag">The Sensual</span>
                    <p>Intuitive, seductive, and attentive. Luna focuses on building tension and creating intense sensory experiences.</p>
                    <button 
                      className="persona-button"
                      onClick={() => handlePersonaSelect('Luna', 'sensual')}
                    >
                      {selectedPersona?.name === 'Luna' ? 'Selected' : 'Select Luna'}
                    </button>
                  </div>
                </div>
                
                <div className={`persona ${selectedPersona?.name === 'Thea' ? 'selected' : ''}`} data-style="intellectual">
                  <div className="persona-image"></div>
                  <div className="persona-content">
                    <h3>Thea</h3>
                    <span className="persona-tag">The Intellectual</span>
                    <p>Thoughtful, witty, and articulate. Thea connects through mental stimulation alongside physical exploration.</p>
                    <button 
                      className="persona-button"
                      onClick={() => handlePersonaSelect('Thea', 'intellectual')}
                    >
                      {selectedPersona?.name === 'Thea' ? 'Selected' : 'Select Thea'}
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="scroll-hint">
                <i className="fas fa-arrow-right"></i>
                <span>Swipe to explore</span>
              </div>
            </div>
          </div>
        </section>

        <section className="screen" id="cta">
          <div className="content">
            <h2>Create Your <span className="highlight">Account</span></h2>
            <p>Take the first step toward exploring your desires without contributing to exploitation.</p>
            
            {formError && (
              <div className="form-error">
                <i className="fas fa-exclamation-circle"></i> {formError}
              </div>
            )}
            
            {formSuccess && (
              <div className="form-success">
                <i className="fas fa-check-circle"></i> {formSuccess}
              </div>
            )}
            
            <form className="signup-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name">Your Name</label>
                <input 
                  type="text" 
                  id="name" 
                  placeholder="Enter your name"
                  value={formData.name}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="phone">Phone Number</label>
                <div className="phone-input">
                  <input 
                    type="tel" 
                    id="phone" 
                    placeholder="Enter your phone number" 
                    pattern="[0-9]*" 
                    inputMode="numeric"
                    value={formData.phone}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="password">Create Password</label>
                <input 
                  type="password" 
                  id="password" 
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleInputChange}
                />
              </div>
              
              {selectedPersona && (
                <div className="selected-persona">
                  <i className="fas fa-check-circle"></i> {selectedPersona.name} selected as your companion
                </div>
              )}
              
              <button 
                type="submit"
                className="cta-button large"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating Account...' : 'Start Your Experience'}
              </button>
            </form>
          </div>
        </section>
      </main>

      <footer>
        <div className="footer-content">
          <div className="logo">tease</div>
          <div className="footer-links">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Contact</a>
            <a href="#mission">About Our Mission</a>
          </div>
          <div className="social-links">
            <a href="#"><i className="fab fa-instagram"></i></a>
            <a href="#"><i className="fab fa-tiktok"></i></a>
            <a href="#"><i className="fab fa-twitter"></i></a>
          </div>
          <div className="copyright">
            &copy; 2025 Tease AI. All rights reserved.
          </div>
        </div>
      </footer>

      <style jsx>{`
        .form-error {
          background-color: rgba(220, 53, 69, 0.2);
          border: 1px solid rgba(220, 53, 69, 0.5);
          color: #dc3545;
          padding: 1rem;
          border-radius: 4px;
          margin-bottom: 1.5rem;
          text-align: center;
        }
        
        .form-success {
          background-color: rgba(40, 167, 69, 0.2);
          border: 1px solid rgba(40, 167, 69, 0.5);
          color: #28a745;
          padding: 1rem;
          border-radius: 4px;
          margin-bottom: 1.5rem;
          text-align: center;
        }
        
        .selected-persona {
          background-color: rgba(128, 0, 32, 0.2);
          border: 1px solid rgba(128, 0, 32, 0.3);
          padding: 0.8rem 1rem;
          border-radius: 4px;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .selected-persona i {
          color: var(--primary);
        }
      `}</style>
    </div>
  );
} 