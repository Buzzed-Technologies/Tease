import { registerUser } from '../../../lib/auth';
import fs from 'fs';
import path from 'path';

// Helper function to log to a file (since Vercel logs seem to be failing)
const logToFile = async (message) => {
  try {
    const logMessage = `${new Date().toISOString()}: ${message}\n`;
    // Only use in development, as Vercel doesn't allow file writing in production
    if (process.env.NODE_ENV === 'development') {
      const logDir = path.join(process.cwd(), 'logs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      fs.appendFileSync(path.join(logDir, 'register-debug.log'), logMessage);
    }
    // Always output to console as well
    console.log(message);
  } catch (err) {
    console.error('Error writing to log file:', err);
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    logToFile(`Register API called with body: ${JSON.stringify(req.body)}`);
    const { name, phone, password, persona } = req.body;

    // Check if the environment variables are set
    logToFile(`Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Defined' : 'MISSING'}`);
    logToFile(`Supabase Key: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Defined' : 'MISSING'}`);

    // Validate required fields
    if (!name || !phone || !password || !persona) {
      logToFile('Missing required fields');
      return res.status(400).json({ 
        success: false, 
        error: 'All fields are required' 
      });
    }

    // Validate phone number format
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phone.replace(/\s+/g, ''))) {
      logToFile(`Invalid phone format: ${phone}`);
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid phone number format' 
      });
    }

    // Validate password length
    if (password.length < 6) {
      logToFile('Password too short');
      return res.status(400).json({ 
        success: false, 
        error: 'Password must be at least 6 characters' 
      });
    }

    // Normalize phone number by removing spaces
    const normalizedPhone = phone.replace(/\s+/g, '');
    logToFile(`Attempting to register user with phone: ${normalizedPhone}`);

    const result = await registerUser(
      name, 
      normalizedPhone, 
      password, 
      persona
    );

    logToFile(`Registration result: ${JSON.stringify(result)}`);

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(201).json(result);
  } catch (error) {
    logToFile(`Registration API error: ${error.message}`);
    console.error('Registration API error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error during registration' 
    });
  }
} 