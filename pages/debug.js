import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function Debug() {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function checkSupabase() {
      try {
        setLoading(true);
        const response = await fetch('/api/check-supabase');
        const data = await response.json();
        setResult(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    checkSupabase();
  }, []);

  const handleTestConnection = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/check-supabase');
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="debug-container">
      <Head>
        <title>Tease - Debug</title>
      </Head>

      <header>
        <h1>Supabase Connection Debugger</h1>
        <Link href="/">
          <span className="home-link">Back to Home</span>
        </Link>
      </header>

      <main>
        <div className="debug-card">
          <h2>Supabase Connection Status</h2>
          
          {loading ? (
            <div className="loading">Testing connection...</div>
          ) : error ? (
            <div className="error">
              <h3>Error</h3>
              <p>{error}</p>
            </div>
          ) : (
            <div className="result">
              <h3>Status: {result?.success ? 'Connected' : 'Failed'}</h3>
              
              <div className="env-vars">
                <h4>Environment Variables</h4>
                <p>NEXT_PUBLIC_SUPABASE_URL: {result?.envVars?.supabaseUrlDefined ? 'Defined' : 'Missing'}</p>
                <p>NEXT_PUBLIC_SUPABASE_ANON_KEY: {result?.envVars?.supabaseKeyDefined ? 'Defined' : 'Missing'}</p>
              </div>
              
              {result?.error && (
                <div className="error-details">
                  <h4>Error Details</h4>
                  <p>{result.error}</p>
                  <pre>{JSON.stringify(result.details, null, 2)}</pre>
                </div>
              )}
              
              {result?.tables && (
                <div className="tables">
                  <h4>Database Tables</h4>
                  {typeof result.tables === 'string' ? (
                    <p>{result.tables}</p>
                  ) : (
                    <pre>{JSON.stringify(result.tables, null, 2)}</pre>
                  )}
                </div>
              )}
              
              <div className="response">
                <h4>Full Response</h4>
                <pre>{JSON.stringify(result, null, 2)}</pre>
              </div>
            </div>
          )}
          
          <button onClick={handleTestConnection} disabled={loading}>
            {loading ? 'Testing...' : 'Test Connection Again'}
          </button>
        </div>
      </main>

      <style jsx>{`
        .debug-container {
          min-height: 100vh;
          background: radial-gradient(circle at center, var(--primary-dark) 0%, var(--darker) 70%);
          color: var(--light);
          padding: 2rem;
        }
        
        header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }
        
        .home-link {
          color: var(--light);
          text-decoration: underline;
          cursor: pointer;
        }
        
        .debug-card {
          background-color: rgba(10, 10, 10, 0.7);
          border-radius: 12px;
          border: 1px solid rgba(128, 0, 32, 0.3);
          padding: 2rem;
          max-width: 900px;
          margin: 0 auto;
        }
        
        h2 {
          margin-bottom: 1.5rem;
          color: var(--primary);
        }
        
        .loading {
          text-align: center;
          padding: 2rem;
          font-style: italic;
        }
        
        .error {
          background-color: rgba(220, 53, 69, 0.2);
          border: 1px solid rgba(220, 53, 69, 0.5);
          padding: 1rem;
          border-radius: 4px;
          margin-bottom: 1.5rem;
        }
        
        .result h3 {
          margin-bottom: 1.5rem;
          color: var(--light);
        }
        
        .env-vars, .tables, .error-details, .response {
          margin-bottom: 1.5rem;
          background-color: rgba(0, 0, 0, 0.3);
          padding: 1rem;
          border-radius: 4px;
        }
        
        h4 {
          margin-bottom: 0.5rem;
          color: var(--primary-light);
        }
        
        pre {
          background-color: rgba(0, 0, 0, 0.5);
          padding: 1rem;
          border-radius: 4px;
          overflow-x: auto;
          font-size: 0.9rem;
          color: var(--light-gray);
        }
        
        button {
          background-color: var(--primary);
          color: var(--light);
          border: none;
          padding: 0.8rem 1.5rem;
          border-radius: 50px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: block;
          margin: 1.5rem auto 0;
        }
        
        button:hover {
          background-color: var(--primary-light);
        }
        
        button:disabled {
          background-color: var(--gray);
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
} 