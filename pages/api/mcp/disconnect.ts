import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId } = req.body;
    const client = global.mcpClients?.get(sessionId);
    
    if (client) {
      await client.close();
      global.mcpClients.delete(sessionId);
    }
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('MCP disconnect error:', error);
    res.status(500).json({ error: error.message });
  }
}