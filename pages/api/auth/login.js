import { loginUser } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const { phone, password } = req.body;

    // Validate required fields
    if (!phone || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone number and password are required' 
      });
    }

    // Normalize phone number by removing spaces
    const normalizedPhone = phone.replace(/\s+/g, '');

    const result = await loginUser(normalizedPhone, password);

    if (!result.success) {
      return res.status(401).json(result);
    }

    // Set user in session or token
    // This is a simplified session approach - in production consider secure JWT
    // or other session management approaches
    req.session = {
      ...req.session,
      user: {
        phone: normalizedPhone,
        name: result.user.name,
        isSubscribed: result.user.is_subscribed,
        persona: result.user.persona
      }
    };

    return res.status(200).json(result);
  } catch (error) {
    console.error('Login API error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error during login' 
    });
  }
} 