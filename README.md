# SubForge — Free Subdomain Registrar

Let users claim subdomains under your domain instantly, powered by Cloudflare DNS.

## Project Structure

```
subforge/
├── public/
│   └── index.html        ← Frontend (the page users see)
├── api/
│   ├── check.js          ← GET  /api/check?subdomain=xxx
│   └── register.js       ← POST /api/register
├── vercel.json           ← Vercel routing config
└── README.md
```

## Setup

### 1. Push to GitHub
Create a new GitHub repo and push this folder.

### 2. Import to Vercel
- Go to vercel.com → New Project → Import your GitHub repo
- Vercel auto-detects the config

### 3. Add Environment Variables in Vercel
Go to your project → Settings → Environment Variables and add:

| Variable | Value |
|---|---|
| `CLOUDFLARE_ZONE_ID` | Found in Cloudflare Dashboard → your domain → Overview (right sidebar) |
| `CLOUDFLARE_API_TOKEN` | Cloudflare → My Profile → API Tokens → Create Token → "Edit zone DNS" template |
| `BASE_DOMAIN` | Your base domain e.g. `frostaihub.qzz.io` |

### 4. Update BASE_DOMAIN in index.html
Open `public/index.html` and change line:
```js
const BASE_DOMAIN = "frostaihub.qzz.io";
```
to your actual domain.

### 5. Deploy
Redeploy in Vercel after adding env vars — done! 🎉

## How it works
1. User types a subdomain name
2. Frontend calls `/api/check` — checks Cloudflare if it's taken
3. User picks A record (IP) or CNAME (hostname) target
4. Frontend calls `/api/register` — creates DNS record via Cloudflare API
5. User adds the domain in their Vercel project settings
