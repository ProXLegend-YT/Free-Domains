export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { subdomain, target, type = "A" } = req.body;

  // Basic validation
  if (!subdomain || !target) {
    return res.status(400).json({ error: "subdomain and target are required" });
  }

  // Only allow safe subdomain characters
  if (!/^[a-z0-9-]{2,32}$/.test(subdomain)) {
    return res.status(400).json({
      error: "Subdomain must be 2-32 characters, lowercase letters, numbers, hyphens only",
    });
  }

  // Blocked reserved names
  const reserved = ["www", "mail", "admin", "api", "ftp", "dev", "app", "test", "root", "ns1", "ns2", "smtp", "pop", "imap"];
  if (reserved.includes(subdomain.toLowerCase())) {
    return res.status(400).json({ error: "That subdomain name is reserved" });
  }

  // Pull secrets from Vercel environment variables
  const CLOUDFLARE_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
  const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
  const BASE_DOMAIN = process.env.BASE_DOMAIN; // e.g. frostaihub.qzz.io

  if (!CLOUDFLARE_ZONE_ID || !CLOUDFLARE_API_TOKEN || !BASE_DOMAIN) {
    return res.status(500).json({ error: "Server misconfigured — env vars missing" });
  }

  const fullDomain = `${subdomain}.${BASE_DOMAIN}`;

  try {
    // Check if subdomain already exists
    const checkRes = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records?name=${fullDomain}`,
      {
        headers: {
          Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
    const checkData = await checkRes.json();

    if (checkData.result && checkData.result.length > 0) {
      return res.status(409).json({ error: "Subdomain already taken" });
    }

    // Create DNS record
    const createRes = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
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
      const msg = createData.errors?.[0]?.message || "Cloudflare rejected the request";
      return res.status(400).json({ error: msg });
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
