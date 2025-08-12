import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url } = req.body;
    
    const response = await fetch(url);
    if (!response.ok) {
      return res.json({ success: false, data: null });
    }
    
    const text = await response.text();
    res.json({ success: true, data: text });
  } catch (error) {
    console.error('File fetch error:', error);
    res.json({ success: false, data: null });
  }
}