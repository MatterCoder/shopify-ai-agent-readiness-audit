import type { NextApiRequest, NextApiResponse } from 'next';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

// Use the same global mcpClients Map
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
    console.log('Connect request body:', req.body);
    const { mcpUrl, sessionId } = req.body;
    
    if (!mcpUrl || !sessionId) {
      return res.status(400).json({ error: 'Missing mcpUrl or sessionId' });
    }
    
    console.log('Connecting to MCP URL:', mcpUrl, 'with sessionId:', sessionId);
    
    const transport = new StreamableHTTPClientTransport(new URL(mcpUrl));
    const client = new Client({
      name: "proxy-client",
      version: "1.0.0",
    });
    
    await client.connect(transport);
    global.mcpClients.set(sessionId, client);
    
    console.log('Successfully connected. Active sessions:', Array.from(global.mcpClients.keys()));
    
    res.json({ success: true, sessionId });
  } catch (error: any) {
    console.error('MCP connection error:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
}
