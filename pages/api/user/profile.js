import { getUserProfile } from '../../../lib/auth';

export default async function handler(req, res) {
  // Check if phone is provided as query parameter
  const { phone } = req.query;

  if (!phone) {
    return res.status(400).json({ 
      success: false, 
      error: 'Phone number is required' 
    });
  }

  if (req.method === 'GET') {
    try {
      const result = await getUserProfile(phone);

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error('Get profile API error:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Server error retrieving user profile' 
      });
    }
  } else {
    res.setHeader('Allow', 'GET');
    return res.status(405).end('Method Not Allowed');
  }
} 