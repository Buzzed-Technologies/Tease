import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';

export default function Account() {
  const { user, loading, logout, createSubscriptionCheckout, accessCustomerPortal, updateUserSubscription } = useAuth();
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  // Handle subscription status messages from URL parameters
  useEffect(() => {
    if (router.query.subscription === 'success') {
      setMessage('Subscription successful! Thank you for subscribing.');
      setMessageType('success');
      updateUserSubscription();
    } else if (router.query.subscription === 'cancel') {
      setMessage('Subscription checkout was canceled.');
      setMessageType('error');
    }
  }, [router.query, updateUserSubscription]);

  // Redirect to home if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  // Handle subscription button click
  const handleSubscribe = async () => {
    if (user?.is_subscribed) {
      // Manage existing subscription
      const result = await accessCustomerPortal();
      if (!result.success) {
        setMessage(result.error);
        setMessageType('error');
      }
    } else {
      // Create new subscription
      const result = await createSubscriptionCheckout();
      if (!result.success) {
        setMessage(result.error);
        setMessageType('error');
      }
    }
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  if (!user) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="account-page">
      <header className="account-header">
        <Link href="/">
          <div className="logo">tease</div>
        </Link>
        <nav className="account-nav">
          <button className="nav-button" onClick={handleLogout}>Log out</button>
        </nav>
      </header>

      <main className="account-container">
        <div className="account-card">
          <h1>My Account</h1>
          
          {message && (
            <div className={`message ${messageType}`}>
              {message}
            </div>
          )}
          
          <div className="account-section">
            <h2>Profile Information</h2>
            <div className="profile-details">
              <div className="detail-row">
                <span className="detail-label">Name:</span>
                <span className="detail-value">{user.name}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Phone:</span>
                <span className="detail-value">{user.phone}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Persona:</span>
                <span className="detail-value">{user.persona}</span>
              </div>
            </div>
          </div>
          
          <div className="account-section">
            <h2>Subscription Status</h2>
            <div className="subscription-details">
              <div className="detail-row">
                <span className="detail-label">Status:</span>
                <span className={`detail-value status ${user.is_subscribed ? 'active' : 'inactive'}`}>
                  {user.is_subscribed ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              {user.is_subscribed && user.subscription_end_date && (
                <div className="detail-row">
                  <span className="detail-label">Next billing date:</span>
                  <span className="detail-value">
                    {new Date(user.subscription_end_date).toLocaleDateString()}
                  </span>
                </div>
              )}
              
              <button 
                className={`subscription-button ${user.is_subscribed ? 'manage' : 'subscribe'}`}
                onClick={handleSubscribe}
              >
                {user.is_subscribed ? 'Manage Subscription' : 'Subscribe Now'}
              </button>
            </div>
          </div>
          
          <div className="account-actions">
            <Link href="/" className="back-button">
              Back to Home
            </Link>
          </div>
        </div>
      </main>
      
      <style jsx>{`
        .account-page {
          min-height: 100vh;
          background: radial-gradient(circle at center, var(--primary-dark) 0%, var(--darker) 70%);
          color: var(--light);
        }
        
        .account-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem 10%;
          border-bottom: 1px solid rgba(128, 0, 32, 0.3);
        }
        
        .account-nav {
          display: flex;
          gap: 1rem;
        }
        
        .nav-button {
          background-color: transparent;
          color: var(--light);
          border: 1px solid var(--primary);
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .nav-button:hover {
          background-color: var(--primary);
        }
        
        .account-container {
          max-width: 800px;
          margin: 3rem auto;
          padding: 0 2rem;
        }
        
        .account-card {
          background-color: rgba(10, 10, 10, 0.7);
          border-radius: 12px;
          border: 1px solid rgba(128, 0, 32, 0.3);
          padding: 2.5rem;
        }
        
        .account-card h1 {
          margin-bottom: 2rem;
          text-align: center;
        }
        
        .message {
          padding: 1rem;
          border-radius: 4px;
          margin-bottom: 2rem;
          text-align: center;
        }
        
        .message.success {
          background-color: rgba(40, 167, 69, 0.2);
          border: 1px solid rgba(40, 167, 69, 0.5);
        }
        
        .message.error {
          background-color: rgba(220, 53, 69, 0.2);
          border: 1px solid rgba(220, 53, 69, 0.5);
        }
        
        .account-section {
          margin-bottom: 2.5rem;
        }
        
        .account-section h2 {
          font-size: 1.5rem;
          margin-bottom: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid rgba(128, 0, 32, 0.3);
        }
        
        .detail-row {
          display: flex;
          margin-bottom: 1rem;
        }
        
        .detail-label {
          width: 150px;
          font-weight: 600;
        }
        
        .detail-value {
          flex: 1;
        }
        
        .detail-value.status {
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          display: inline-block;
        }
        
        .detail-value.status.active {
          background-color: rgba(40, 167, 69, 0.2);
          color: #28a745;
        }
        
        .detail-value.status.inactive {
          background-color: rgba(220, 53, 69, 0.2);
          color: #dc3545;
        }
        
        .subscription-button {
          background-color: var(--primary);
          color: var(--light);
          border: none;
          padding: 0.8rem 1.5rem;
          border-radius: 50px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-top: 1rem;
          width: 100%;
          max-width: 300px;
          display: block;
        }
        
        .subscription-button:hover {
          background-color: var(--primary-light);
          transform: translateY(-2px);
        }
        
        .subscription-button.manage {
          background-color: var(--gray);
        }
        
        .subscription-button.manage:hover {
          background-color: var(--light-gray);
        }
        
        .account-actions {
          display: flex;
          justify-content: center;
          margin-top: 2rem;
        }
        
        .back-button {
          color: var(--light);
          text-decoration: none;
          padding: 0.8rem 1.5rem;
          border: 1px solid var(--light);
          border-radius: 50px;
          transition: all 0.3s ease;
        }
        
        .back-button:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }
        
        .loading-screen {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          background: radial-gradient(circle at center, var(--primary-dark) 0%, var(--darker) 70%);
          color: var(--light);
          font-size: 1.5rem;
        }
      `}</style>
    </div>
  );
} 