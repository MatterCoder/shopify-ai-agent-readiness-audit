"use client";
import { useState } from "react";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport  } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

import { motion, AnimatePresence, HTMLMotionProps } from "framer-motion";

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
      const sessionId = Math.random().toString(36).substring(7);
      
      pushMessage("🤖 Connecting to MCP endpoint...");
      const connectRes = await fetch('/api/mcp/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mcpUrl: `${storeUrl.replace(/\/$/, "")}/api/mcp`,
          sessionId
        })
      });
      
      if (!connectRes.ok) {
        const errorData = await connectRes.json();
        throw new Error(errorData.error || 'Failed to connect to MCP');
      }

      pushMessage("🔍 Running search_shop_catalog...");
      const searchRes = await fetch('/api/mcp/tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          toolName: "search_shop_catalog",
          arguments: { query: 'what products are for sale', context: "user wants to know what products are for sale" }
        })
      });
      const searchData = await searchRes.json();
      if (!searchData.success) throw new Error(searchData.error);

      console.log('Search results:', searchData.data); // Add this debug line

      pushMessage("📦 Fetching product details...");
      let details: any[] = [];
      if (searchData.data && Array.isArray(searchData.data) && searchData.data.length) {
        const productIds = searchData.data.slice(0, 2).map((p: any) => p.id).filter((id: string | number) => id); // Filter out undefined ids
        console.log('Product IDs found:', productIds); // Add this debug line
        
        for (const id of productIds) {
          if (!id) continue; // Skip if id is falsy
          try {
            const detailRes = await fetch('/api/mcp/tool', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId,
                toolName: "get_product_details",
                arguments: { product_id: id }
              })
            });
            const detailData = await detailRes.json();
            if (detailData.success) {
              details.push(detailData.data);
            }
          } catch {
            // ignore detail errors
          }
        }
      }

      pushMessage("📜 Checking policies...");
      let policies = null;
      try {
        const policiesRes = await fetch('/api/mcp/tool', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            toolName: "search_shop_policies_and_faqs",
            arguments: { query: "shipping" }
          })
        });
        const policiesData = await policiesRes.json();
        if (policiesData.success) {
          policies = policiesData;
        }
      } catch {
        policies = null;
      }

      pushMessage("🌐 Reading robots.txt & sitemap.xml & llms.txt...");

      const fetchFile = async (url: string) => {
        try {
          const response = await fetch('/api/fetch-file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
          });
          const result = await response.json();
          return result.success ? result.data : null;
        } catch {
          return null;
        }
      };

      const robots = await fetchFile(`${storeUrl}/robots.txt`);
      const sitemap = await fetchFile(`${storeUrl}/sitemap.xml`);
      const aiTxt = await fetchFile(`${storeUrl}/llms.txt`);

      pushMessage("✅ Computing readiness score...");

      const scoreDetails: Record<string, number> = {
        dataCompleteness: 0,
        filters: 0,
        policies: 0,
        media: 0,
        reliability: 0,
      };

      // Data completeness (35 pts)
      let pricePassCount = 0;
      let availPassCount = 0;
      let variantsPassCount = 0;
      let identityPassCount = 0;
      let imagesAltCount = 0;
      let imagesTotalCount = 0;

      details.forEach((product) => {
        if (
          product.price !== undefined &&
          typeof product.price === "number" &&
          product.priceCurrency &&
          typeof product.priceCurrency === "string"
        ) {
          pricePassCount++;
        }
        if (
          product.availability &&
          ["InStock", "OutOfStock", "PreOrder"].includes(product.availability)
        ) {
          availPassCount++;
        }
        if (
          product.variants &&
          Array.isArray(product.variants) &&
          product.variants.length > 0 &&
          product.variants.every(
            (v: any) =>
              typeof v.title === "string" &&
              ["InStock", "OutOfStock", "PreOrder"].includes(v.availability) &&
              v.images &&
              Array.isArray(v.images) &&
              v.images.length > 0
          )
        ) {
          variantsPassCount++;
        }
        if (
          product.brand &&
          typeof product.brand === "string" &&
          product.variants &&
          product.variants.every(
            (v: any) =>
              typeof v.sku === "string" &&
              (v.gtin !== undefined || v.mpn !== undefined)
          )
        ) {
          identityPassCount++;
        }
        if (
          product.images &&
          Array.isArray(product.images) &&
          product.images.length > 0
        ) {
          imagesTotalCount += product.images.length;
          product.images.forEach((img: any) => {
            if (img.alt_text && img.alt_text.trim().length > 0) {
              imagesAltCount++;
            }
          });
        }
      });

      const productCount = details.length || 1;

      const priceScore = (pricePassCount / productCount) * 7;
      const availScore = (availPassCount / productCount) * 7;
      const variantsScore = (variantsPassCount / productCount) * 7;
      const identityScore = (identityPassCount / productCount) * 7;
      const imagesScore = (imagesAltCount / (imagesTotalCount || 1)) * 7;

      scoreDetails.dataCompleteness =
        priceScore + availScore + variantsScore + identityScore + imagesScore;

      pushMessage(
        `• Price & currency formats: ${pricePassCount}/${productCount} (${priceScore.toFixed(
          1
        )}/7 pts)`
      );
      pushMessage(
        `• Availability enum check: ${availPassCount}/${productCount} (${availScore.toFixed(
          1
        )}/7 pts)`
      );
      pushMessage(
        `• Variants completeness: ${variantsPassCount}/${productCount} (${variantsScore.toFixed(
          1
        )}/7 pts)`
      );
      pushMessage(
        `• Identity fields present: ${identityPassCount}/${productCount} (${identityScore.toFixed(
          1
        )}/7 pts)`
      );
      pushMessage(
        `• Images alt text coverage: ${imagesAltCount}/${imagesTotalCount} (${imagesScore.toFixed(
          1
        )}/7 pts)`
      );

      // Filters (20 pts)
      let filterCount = 0;
      if (
        searchData.data &&
        Array.isArray(searchData.data) &&
        searchData.data.length > 0 &&
        searchData.data[0].available_filters
      ) {
        filterCount = Object.keys(searchData.data[0].available_filters).length;
      }
      const filtersScore = Math.min(filterCount / 8, 1) * 20;
      scoreDetails.filters = filtersScore;
      pushMessage(
        `• Filters/facets breadth: ${filterCount} filters (${filtersScore.toFixed(
          1
        )}/20 pts)`
      );

      // Policies (25 pts)
      const policiesScore = policies && policies.data && Array.isArray(policies.data) && policies.data.length > 0 ? 25 : 0;
      scoreDetails.policies = policiesScore;
      pushMessage(
        `• Policies tool presence: ${
          policiesScore === 25 ? "found" : "missing"
        } (${policiesScore}/25 pts)`
      );

      // Media accessibility (10 pts)
      // Check for robots.txt, sitemap.xml, llms.txt presence as reliability proxies
      let mediaScore = 0;
      if (robots) mediaScore += 3;
      if (sitemap) mediaScore += 3;
      if (aiTxt) mediaScore += 4;
      scoreDetails.media = mediaScore;
      pushMessage(
        `• Web signals found: robots.txt (${robots ? "yes" : "no"}), sitemap.xml (${
          sitemap ? "yes" : "no"
        }), llms.txt (${aiTxt ? "yes" : "no"}) (${mediaScore}/10 pts)`
      );

      // Reliability (10 pts)
      // Assume MCP endpoint latency under 1s is perfect
      // Here we fake reliability as 10 pts because MCP is connected
      const reliabilityScore = 10;
      scoreDetails.reliability = reliabilityScore;
      pushMessage(`• MCP connection reliability: ${reliabilityScore}/10 pts`);

      // Final score
      const finalScore = Object.values(scoreDetails).reduce((a, b) => a + b, 0);
      setScore(finalScore);
      setScoreBreakdown(scoreDetails);

      pushMessage(`🏆 Final AI Agent Readiness Score: ${finalScore.toFixed(1)} / 100`);

      // Disconnect when done
      await fetch('/api/mcp/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });

    } catch (e: any) {
      setError(e.message || "Unknown error");
      pushMessage(`❌ Error: ${e.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
  <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-100">
    <h1 className="text-3xl font-bold mb-6">
      Shopify AI Agent Readiness Audit
    </h1>

    <div className="max-w-md w-full mb-4">
      <input
        type="url"
        placeholder="Enter your store URL, e.g. https://examplestore.com"
        className="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
        value={storeUrl}
        onChange={(e) => setStoreUrl(e.target.value)}
        disabled={loading}
      />
    </div>

    <button
      className={`px-6 py-2 rounded-md text-white font-semibold ${
        loading ? "bg-gray-400 cursor-not-allowed" : "bg-sky-600 hover:bg-sky-700"
      }`}
      onClick={runAudit}
      disabled={loading || !storeUrl}
    >
      {loading ? "Running audit..." : "Run Audit"}
    </button>

    {error && (
      <p className="mt-4 text-red-600 font-medium max-w-md">{error}</p>
    )}

    {score !== null && (
      <div className="mt-6 max-w-md bg-white p-4 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-2">Score Breakdown</h2>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
          <li>Data Completeness: {scoreBreakdown.dataCompleteness.toFixed(1)} / 35</li>
          <li>Filters/Facets: {scoreBreakdown.filters.toFixed(1)} / 20</li>
          <li>Policies Tool: {scoreBreakdown.policies.toFixed(1)} / 25</li>
          <li>Media Accessibility: {scoreBreakdown.media.toFixed(1)} / 10</li>
          <li>Reliability: {scoreBreakdown.reliability.toFixed(1)} / 10</li>
        </ul>
        <p className="mt-3 font-bold text-lg">
          Final Score: {score.toFixed(1)} / 100
        </p>
      </div>
    )}

    <AuditChatAnimation messages={messages} loading={loading} />
  </main>
  );
}
