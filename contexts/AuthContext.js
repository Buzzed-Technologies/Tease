import React, { createContext, useState, useContext, useEffect } from 'react';

// Create the auth context
const AuthContext = createContext();

export function AuthProvider({ children }) {
  // User state
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize auth state by checking for stored user data
  useEffect(() => {
    async function loadUserFromStorage() {
      try {
        const storedUser = localStorage.getItem('teaseUser');
        
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Error loading user from storage:', error);
      } finally {
        setLoading(false);
      }
    }

    loadUserFromStorage();
  }, []);

  // Register a new user
  const register = async (name, phone, password, persona) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, phone, password, persona }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Registration failed');
      }

      // Automatically log in after registration
      await login(phone, password);
      
      return { success: true };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Login a user
  const login = async (phone, password) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, password }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Login failed');
      }

      const userData = data.user;
      
      // Store user in state and localStorage
      setUser(userData);
      localStorage.setItem('teaseUser', JSON.stringify(userData));
      
      return { success: true, user: userData };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Logout the user
  const logout = () => {
    setUser(null);
    localStorage.removeItem('teaseUser');
  };

  // Create checkout session for subscription
  const createSubscriptionCheckout = async () => {
    if (!user) {
      setError('You must be logged in to subscribe');
      return { success: false, error: 'You must be logged in to subscribe' };
    }

    try {
      const response = await fetch('/api/subscription/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: user.phone }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
      
      return { success: true };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    }
  };

  // Access customer portal for managing subscription
  const accessCustomerPortal = async () => {
    if (!user) {
      setError('You must be logged in to manage subscription');
      return { success: false, error: 'You must be logged in to manage subscription' };
    }

    try {
      const response = await fetch('/api/subscription/create-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: user.phone }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to access subscription portal');
      }

      // Redirect to Customer Portal
      window.location.href = data.url;
      
      return { success: true };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    }
  };

  // Update user in state and storage when subscription status changes
  const updateUserSubscription = async () => {
    if (!user) return;

    try {
      const response = await fetch(`/api/user/profile?phone=${user.phone}`);
      const data = await response.json();

      if (data.success) {
        const updatedUser = data.user;
        setUser(updatedUser);
        localStorage.setItem('teaseUser', JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error('Error updating user subscription status:', error);
    }
  };

  // Value object with all the auth context data and functions
  const value = {
    user,
    loading,
    error,
    register,
    login,
    logout,
    createSubscriptionCheckout,
    accessCustomerPortal,
    updateUserSubscription,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 