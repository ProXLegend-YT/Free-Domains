// Domain config — each domain needs its own Zone ID env var
const DOMAIN_CONFIG = {
  "frostaihub.qzz.io":      process.env.ZONE_FROSTAIHUB,
  "crystalxcloud.qzz.io":   process.env.ZONE_CRYSTALXCLOUD,
  "frostnetwork.qzz.io":    process.env.ZONE_FROSTNETWORK,
  "proxlegendyt.indevs.in": process.env.ZONE_PROXLEGENDYT,
  "mydomainyt.qzz.io":      process.env.ZONE_MYDOMAINYT,
};

const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { subdomain, baseDomain, target, type = "A" } = req.body;

  if (!subdomain || !target || !baseDomain) {
    return res.status(400).json({ error: "subdomain, baseDomain and target are required" });
  }

  if (!/^[a-z0-9-]{2,32}$/.test(subdomain)) {
    return res.status(400).json({ error: "Subdomain must be 2-32 chars, lowercase letters, numbers, hyphens only" });
  }

  const reserved = ["www", "mail", "admin", "api", "ftp", "dev", "app", "test", "root", "ns1", "ns2", "smtp", "pop", "imap"];
  if (reserved.includes(subdomain.toLowerCase())) {
    return res.status(400).json({ error: "That subdomain name is reserved" });
  }

  const zoneId = DOMAIN_CONFIG[baseDomain];
  if (!zoneId) {
    return res.status(400).json({ error: "Invalid base domain selected" });
  }

  if (!CLOUDFLARE_API_TOKEN) {
    return res.status(500).json({ error: "Server misconfigured — API token missing" });
  }

  const fullDomain = `${subdomain}.${baseDomain}`;

  try {
    // Check if already exists
    const checkRes = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?name=${fullDomain}`,
      { headers: { Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`, "Content-Type": "application/json" } }
    );
    const checkData = await checkRes.json();
    if (checkData.result && checkData.result.length > 0) {
      return res.status(409).json({ error: "Subdomain already taken" });
    }

    // Create record
    const createRes = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          type: type === "CNAME" ? "CNAME" : "A",
          name: subdomain,
          content: target,
          ttl: 1,
          proxied: false,
        }),
      }
    );

    const createData = await createRes.json();
    if (!createData.success) {
      return res.status(400).json({ error: createData.errors?.[0]?.message || "Cloudflare rejected the request" });
    }

    return res.status(200).json({
      success: true,
      domain: fullDomain,
      recordId: createData.result.id,
      type: createData.result.type,
      target: createData.result.content,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
