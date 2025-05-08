import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import Head from 'next/head';

export default function Login() {
  const { user, loading, login } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    phone: '',
    password: '',
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect to account page if already logged in
  useEffect(() => {
    if (!loading && user) {
      router.push('/account');
    }
  }, [user, loading, router]);

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

    // Validate form data
    if (!formData.phone || !formData.password) {
      setFormError('Phone number and password are required');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const result = await login(formData.phone, formData.password);

      if (!result.success) {
        setFormError(result.error);
      }
      // If successful, useEffect will redirect to account page
    } catch (error) {
      setFormError(error.message || 'An error occurred during login');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <Head>
        <title>Login - Tease | AI Adult Companion Service</title>
      </Head>

      <header className="login-header">
        <Link href="/">
          <div className="logo">tease</div>
        </Link>
      </header>

      <main className="login-container">
        <div className="login-card">
          <h1>Log In</h1>
          
          {formError && (
            <div className="form-error">
              <i className="fas fa-exclamation-circle"></i> {formError}
            </div>
          )}
          
          <form className="login-form" onSubmit={handleSubmit}>
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
              <label htmlFor="password">Password</label>
              <input 
                type="password" 
                id="password" 
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleInputChange}
              />
            </div>
            
            <button 
              type="submit"
              className="login-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Logging in...' : 'Log In'}
            </button>
          </form>
          
          <div className="login-footer">
            <p>Don't have an account? <Link href="/" className="signup-link">Sign up</Link></p>
          </div>
        </div>
      </main>

      <style jsx>{`
        .login-page {
          min-height: 100vh;
          background: radial-gradient(circle at center, var(--primary-dark) 0%, var(--darker) 70%);
          color: var(--light);
        }
        
        .login-header {
          display: flex;
          justify-content: center;
          padding: 2rem 0;
        }
        
        .login-container {
          max-width: 500px;
          margin: 2rem auto;
          padding: 0 2rem;
        }
        
        .login-card {
          background-color: rgba(10, 10, 10, 0.7);
          border-radius: 12px;
          border: 1px solid rgba(128, 0, 32, 0.3);
          padding: 2.5rem;
        }
        
        .login-card h1 {
          margin-bottom: 2rem;
          text-align: center;
        }
        
        .form-error {
          background-color: rgba(220, 53, 69, 0.2);
          border: 1px solid rgba(220, 53, 69, 0.5);
          color: #dc3545;
          padding: 1rem;
          border-radius: 4px;
          margin-bottom: 1.5rem;
          text-align: center;
        }
        
        .login-form {
          margin-bottom: 1.5rem;
        }
        
        .form-group {
          margin-bottom: 1.5rem;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 600;
        }
        
        .form-group input {
          width: 100%;
          padding: 1rem;
          border: 1px solid rgba(128, 0, 32, 0.3);
          border-radius: 8px;
          background-color: rgba(10, 10, 10, 0.5);
          color: var(--light);
          font-size: 1rem;
          transition: all 0.3s ease;
        }
        
        .form-group input:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 2px rgba(128, 0, 32, 0.2);
        }
        
        .phone-input {
          position: relative;
        }
        
        .phone-input:before {
          content: "+";
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--light-gray);
          font-size: 1rem;
        }
        
        .phone-input input {
          padding-left: 25px;
        }
        
        .login-button {
          background-color: var(--primary);
          color: var(--light);
          border: none;
          padding: 1rem;
          border-radius: 50px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          width: 100%;
          font-size: 1.1rem;
        }
        
        .login-button:hover {
          background-color: var(--primary-light);
          transform: translateY(-2px);
        }
        
        .login-button:disabled {
          background-color: var(--gray);
          cursor: not-allowed;
          transform: none;
        }
        
        .login-footer {
          text-align: center;
          margin-top: 2rem;
        }
        
        .signup-link {
          color: var(--primary);
          font-weight: 600;
          text-decoration: none;
        }
        
        .signup-link:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
} 