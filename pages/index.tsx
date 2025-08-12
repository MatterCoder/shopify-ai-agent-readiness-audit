"use client";
import { useState, useEffect } from "react";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHttpClientTransport } from "@modelcontextprotocol/sdk/client/streamable-http.js";
import { motion, AnimatePresence } from "framer-motion";

type Finding = {
  id: string;
  title: string;
  severity: "info" | "warning" | "error";
  ownerText: string;
  fixText: string;
  techDetails: {
    detailsText: string;
    examples: any[];
  };
};

function AuditChatAnimation({
  messages,
  loading,
}: {
  messages: string[];
  loading: boolean;
}) {
  return (
    <div className="mt-6 border rounded-xl bg-slate-50 p-4 max-w-lg">
      <AnimatePresence>
        {messages.map((msg, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-start gap-2 mt-2"
          >
            <div className="w-8 h-8 bg-sky-500 rounded-full flex items-center justify-center text-white font-bold">
              A
            </div>
            <div className="bg-white px-3 py-2 rounded-lg shadow text-sm whitespace-pre-wrap">
              {msg}
            </div>
          </motion.div>
        ))}
        {loading && (
          <motion.div
            key="thinking"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            transition={{
              repeat: Infinity,
              duration: 1,
              repeatType: "reverse",
            }}
            className="text-slate-400 text-xs mt-2 pl-10"
          >
            Agent is thinking...
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Home() {
  const [storeUrl, setStoreUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [scoreBreakdown, setScoreBreakdown] = useState<Record<string, number>>(
    {}
  );
  const [error, setError] = useState<string | null>(null);

  function pushMessage(msg: string) {
    setMessages((prev) => [...prev, msg]);
  }

  function reset() {
    setMessages([]);
    setScore(null);
    setScoreBreakdown({});
    setError(null);
  }

  async function runAudit() {
    if (!storeUrl) return;
    reset();
    setLoading(true);

    try {
      pushMessage("🤖 Connecting to MCP endpoint...");
      const transport = new StreamableHttpClientTransport({
        url: `${storeUrl.replace(/\/$/, "")}/api/mcp`,
      });
      const client = new Client({
        name: "browser-client",
        version: "1.0.0",
      });
      await client.connect(transport);

      // Search catalog
      pushMessage("🔍 Running search_shop_catalog...");
      const searchStart = performance.now();
      const searchRes = await client.callTool({
        name: "search_shop_catalog",
        arguments: { query: "", limit: 10, country: "IE", language: "en" },
      });
      const searchLatency = performance.now() - searchStart;

      // Product details
      pushMessage("📦 Fetching product details...");
      let details: any[] = [];
      if (searchRes.data && Array.isArray(searchRes.data) && searchRes.data.length) {
        const productIds = searchRes.data.slice(0, 2).map((p: any) => p.id);
        for (const id of productIds) {
          try {
            const detail = await client.callTool({
              name: "get_product_details",
              arguments: { product_id: id },
            });
            details.push(detail.data);
          } catch {
            // ignore detail errors
          }
        }
      }

      // Policies
      pushMessage("📜 Checking policies...");
      let policies = null;
      try {
        policies = await client.callTool({
          name: "search_shop_policies_and_faqs",
          arguments: { query: "shipping" },
        });
      } catch {
        policies = null;
      }

      // Web signals
      pushMessage("🌐 Reading robots.txt & sitemap.xml & ai.txt...");
      const robots = await fetch(`${storeUrl}/robots.txt`)
        .then((r) => (r.ok ? r.text() : null))
        .catch(() => null);
      const sitemap = await fetch(`${storeUrl}/sitemap.xml`)
        .then((r) => (r.ok ? r.text() : null))
        .catch(() => null);
      const aiTxt = await fetch(`${storeUrl}/ai.txt
      
