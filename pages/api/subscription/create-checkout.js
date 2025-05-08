import { createCheckoutSession } from '../../../lib/stripe';

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

    // Define success and cancel URLs
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                   `${req.headers.origin}`;
    
    const successUrl = `${baseUrl}/account?subscription=success`;
    const cancelUrl = `${baseUrl}/account?subscription=cancel`;

    const result = await createCheckoutSession(
      phone, 
      successUrl, 
      cancelUrl
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Create checkout session API error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error creating checkout session' 
    });
  }
} 