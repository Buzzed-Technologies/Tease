import { createCustomerPortalSession } from '../../../lib/stripe';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone number is required' 
      });
    }

    // Define return URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                   `${req.headers.origin}`;
    
    const returnUrl = `${baseUrl}/account`;

    const result = await createCustomerPortalSession(phone, returnUrl);

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Create portal session API error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error creating portal session' 
    });
  }
} 