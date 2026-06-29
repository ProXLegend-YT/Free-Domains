const DOMAIN_CONFIG = {
  "frostaihub.qzz.io":      process.env.ZONE_FROSTAIHUB,
  "crystalxcloud.qzz.io":   process.env.ZONE_CRYSTALXCLOUD,
  "frostnetwork.qzz.io":    process.env.ZONE_FROSTNETWORK,
  "proxlegendyt.indevs.in": process.env.ZONE_PROXLEGENDYT,
  "mydomainyt.qzz.io":      process.env.ZONE_MYDOMAINYT,
};

const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { subdomain, baseDomain } = req.query;

  if (!subdomain || !/^[a-z0-9-]{2,32}$/.test(subdomain)) {
    return res.status(400).json({ available: false, reason: "Invalid subdomain format" });
  }

  const reserved = ["www", "mail", "admin", "api", "ftp", "dev", "app", "test", "root", "ns1", "ns2", "smtp", "pop", "imap", "blog", "help", "support"];
  if (reserved.includes(subdomain.toLowerCase())) {
    return res.status(200).json({ available: false, reason: "Reserved name" });
  }

  const zoneId = DOMAIN_CONFIG[baseDomain];
  if (!zoneId) {
    return res.status(400).json({ available: false, reason: "Invalid base domain" });
  }

  const fullDomain = `${subdomain}.${baseDomain}`;

  try {
    const checkRes = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?name=${fullDomain}`,
      { headers: { Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`, "Content-Type": "application/json" } }
    );
    const data = await checkRes.json();
    return res.status(200).json({ available: !(data.result && data.result.length > 0) });
  } catch {
    return res.status(500).json({ error: "Could not check availability" });
  }
}
