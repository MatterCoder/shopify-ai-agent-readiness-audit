const express = require('express');
const cors = require('cors');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for your frontend
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

// Store active MCP clients by session
const mcpClients = new Map();

// Connect to MCP endpoint
app.post('/api/mcp/connect', async (req, res) => {
  try {
    const { mcpUrl, sessionId } = req.body;
    
    const transport = new StreamableHTTPClientTransport(new URL(mcpUrl));
    const client = new Client({
      name: "proxy-client",
      version: "1.0.0",
    });
    
    await client.connect(transport);
    mcpClients.set(sessionId, client);
    
    res.json({ success: true, sessionId });
  } catch (error) {
    console.error('MCP connection error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Call MCP tool
app.post('/api/mcp/tool', async (req, res) => {
  try {
    const { sessionId, toolName, arguments: toolArgs } = req.body;
    const client = mcpClients.get(sessionId);
    
    if (!client) {
      return res.status(400).json({ error: 'No active MCP session' });
    }
    
    const result = await client.callTool({
      name: toolName,
      arguments: toolArgs
    });
    
    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error('MCP tool call error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Disconnect MCP client
app.post('/api/mcp/disconnect', async (req, res) => {
  try {
    const { sessionId } = req.body;
    const client = mcpClients.get(sessionId);
    
    if (client) {
      await client.close();
      mcpClients.delete(sessionId);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('MCP disconnect error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Fetch web files (robots.txt, sitemap.xml, ai.txt)
app.post('/api/fetch-file', async (req, res) => {
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
});

app.listen(PORT, () => {
  console.log(`MCP Proxy server running on port ${PORT}`);
});
