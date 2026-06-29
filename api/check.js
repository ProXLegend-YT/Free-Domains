export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { subdomain } = req.query;

  if (!subdomain || !/^[a-z0-9-]{2,32}$/.test(subdomain)) {
    return res.status(400).json({ available: false, reason: "Invalid subdomain format" });
  }

  const reserved = ["www", "mail", "admin", "api", "ftp", "dev", "app", "test", "root", "ns1", "ns2", "smtp", "pop", "imap", "blog", "help", "support"];
  if (reserved.includes(subdomain.toLowerCase())) {
    return res.status(200).json({ available: false, reason: "Reserved name" });
  }

  const CLOUDFLARE_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
  const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
  const BASE_DOMAIN = process.env.BASE_DOMAIN;

  if (!CLOUDFLARE_ZONE_ID || !CLOUDFLARE_API_TOKEN || !BASE_DOMAIN) {
    return res.status(500).json({ error: "Server misconfigured" });
  }

  const fullDomain = `${subdomain}.${BASE_DOMAIN}`;

  try {
    const checkRes = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records?name=${fullDomain}`,
      {
        headers: {
          Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await checkRes.json();
    const taken = data.result && data.result.length > 0;

    return res.status(200).json({ available: !taken });
  } catch {
    return res.status(500).json({ error: "Could not check availability" });
  }
}
