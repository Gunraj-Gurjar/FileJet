# FileJet Deployment Checklist

## Frontend: Vercel

- Project root directory: `client`
- Framework preset: Next.js
- Install command: `npm install`
- Build command: `npm run build`

Set these Vercel environment variables for Production, Preview, and Development:

```env
NEXT_PUBLIC_SERVER_URL=https://filejet.onrender.com
NEXT_PUBLIC_APP_URL=https://filejet-client-eta.vercel.app
```

If you move to a custom Vercel domain, update `NEXT_PUBLIC_APP_URL` to that exact HTTPS origin.

## Backend: Render

- Root directory: `server`
- Build command: `npm install`
- Start command: `npm start`

Set these Render environment variables:

```env
NODE_ENV=production
PORT=3001
CLIENT_URL=https://filejet-client-eta.vercel.app
METERED_DOMAIN=filejet.metered.live
TURN_SECRET_KEY=<your-metered-api-key>
```

If Render assigns its own `PORT`, keep the service default and do not hard-code a port in the Render dashboard.

## Smooth Transfer Requirements

- Keep the backend awake or use a paid Render instance for fewer cold starts.
- TURN credentials must work at `/api/ice-servers`; cross-network transfers depend on them.
- The Vercel frontend must point to the Render HTTPS URL, not `localhost`.
- For every new deployment, smoke test one small file and one 100MB+ file.

## Quick Verification

```powershell
Invoke-WebRequest https://filejet.onrender.com/health
Invoke-WebRequest https://filejet.onrender.com/api/ice-servers
```

Expected:

- `/health` returns JSON with `status: "ok"`.
- `/api/ice-servers` returns a non-empty TURN server list when Metered is configured.
