// Shared domain config
const DOMAIN_CONFIG = {
  "frostaihub.qzz.io":      process.env.ZONE_FROSTAIHUB,
  "crystalxcloud.qzz.io":   process.env.ZONE_CRYSTALXCLOUD,
  "frostnetwork.qzz.io":    process.env.ZONE_FROSTNETWORK,
  "proxlegendyt.indevs.in": process.env.ZONE_PROXLEGENDYT,
  "mydomainyt.qzz.io":      process.env.ZONE_MYDOMAINYT,
};
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

async function cfFetch(path, method = "GET", body = null) {
  const opts = {
    method,
    headers: { Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`, "Content-Type": "application/json" },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, opts);
  return res.json();
}

export default async function handler(req, res) {
  const { action, baseDomain, recordId, subdomain, target, type } = 
    req.method === "GET" ? req.query : req.body;

  if (!baseDomain || !DOMAIN_CONFIG[baseDomain]) {
    return res.status(400).json({ error: "Invalid domain" });
  }

  const zoneId = DOMAIN_CONFIG[baseDomain];

  try {
    // LIST all records for a domain
    if (action === "list") {
      const data = await cfFetch(`/zones/${zoneId}/dns_records?per_page=100`);
      if (!data.success) return res.status(500).json({ error: "Failed to fetch records" });
      // Filter only A and CNAME records (subdomains)
      const records = (data.result || [])
        .filter(r => ["A", "CNAME"].includes(r.type))
        .map(r => ({
          id: r.id,
          name: r.name,
          type: r.type,
          content: r.content,
          ttl: r.ttl,
          proxied: r.proxied,
          modified: r.modified_on,
        }));
      return res.status(200).json({ success: true, records });
    }

    // DELETE a record
    if (action === "delete") {
      if (!recordId) return res.status(400).json({ error: "recordId required" });
      const data = await cfFetch(`/zones/${zoneId}/dns_records/${recordId}`, "DELETE");
      if (!data.success) return res.status(500).json({ error: "Failed to delete record" });
      return res.status(200).json({ success: true });
    }

    // UPDATE a record
    if (action === "update") {
      if (!recordId || !target || !type) return res.status(400).json({ error: "recordId, target, type required" });
      const data = await cfFetch(`/zones/${zoneId}/dns_records/${recordId}`, "PATCH", {
        content: target,
        ttl: 1,
      });
      if (!data.success) return res.status(500).json({ error: data.errors?.[0]?.message || "Failed to update" });
      return res.status(200).json({ success: true, record: data.result });
    }

    return res.status(400).json({ error: "Invalid action" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
