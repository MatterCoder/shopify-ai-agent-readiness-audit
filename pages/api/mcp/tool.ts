import type { NextApiRequest, NextApiResponse } from 'next';

// Use the same mcpClients Map from connect.ts
declare global {
  var mcpClients: Map<string, any>;
}

if (!global.mcpClients) {
  global.mcpClients = new Map();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Tool request body:', req.body);
    const { sessionId, toolName, arguments: toolArgs } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId' });
    }
    
    if (!toolName) {
      return res.status(400).json({ error: 'Missing toolName' });
    }
    
    console.log('Looking for client with sessionId:', sessionId);
    console.log('Available sessions:', Array.from(global.mcpClients.keys()));
    
    const client = global.mcpClients.get(sessionId);
    
    if (!client) {
      return res.status(400).json({ 
        error: 'No active MCP session found',
        sessionId,
        availableSessions: Array.from(global.mcpClients.keys())
      });
    }

    console.log('Calling tool:', toolName, 'with args:', toolArgs);
    const result = await client.callTool({ name: toolName, arguments: toolArgs });
    console.log('Tool result:', result);
    
    res.json({ success: true, data: result.content });
  } catch (error: any) {
    console.error('MCP tool error:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
}
