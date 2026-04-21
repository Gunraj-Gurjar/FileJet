<div align="center">
  <h1>🚀 FileJet</h1>
  <p><strong>Send Large Files Instantly — Peer-to-Peer, End-to-End Encrypted</strong></p>
  <br/>
  <p>
    <img src="https://img.shields.io/badge/WebRTC-P2P-blue?style=for-the-badge" alt="WebRTC" />
    <img src="https://img.shields.io/badge/Encryption-AES_256_GCM-green?style=for-the-badge" alt="Encryption" />
    <img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge" alt="Next.js" />
    <img src="https://img.shields.io/badge/Max_Size-100GB+-purple?style=for-the-badge" alt="Max Size" />
  </p>
  <p>
    <img src="https://img.shields.io/badge/Backend-Live_on_Render-46E3B7?style=for-the-badge&logo=render" alt="Render" />
    <img src="https://img.shields.io/badge/TURN-Metered.ca-orange?style=for-the-badge" alt="TURN" />
  </p>
  <p>
    <strong>🔗 Live Backend:</strong> <a href="https://filejet.onrender.com/health">https://filejet.onrender.com</a>
  </p>
</div>

---

## What is FileJet?

FileJet is a production-ready, peer-to-peer file sharing platform. Files transfer **directly between browsers** using WebRTC DataChannels — the server only handles signaling, never touches your data.

- **No file size limits** — tested up to 100GB+
- **Zero server storage** — files never leave your device until the receiver downloads them
- **End-to-end encrypted** — AES-256-GCM, keys stay in the URL fragment
- **Instant share links** — drag, drop, share
- **QR code sharing** — scan to receive on mobile

---

## Architecture

```
┌──────────────┐    Signaling    ┌──────────────┐
│              │◄───────────────►│              │
│   Sender     │  (Socket.IO)   │   Receiver   │
│   Browser    │                │   Browser    │
│              │◄══════════════►│              │
│              │   WebRTC P2P   │              │
│              │  (DataChannel) │              │
└──────────────┘                └──────────────┘
                     │
                     │ Signaling Only
                     ▼
              ┌──────────────┐
              │   FileJet    │
              │   Server     │
              │  (Express +  │
              │  Socket.IO)  │
              └──────────────┘
```

**How it works:**
1. Sender drops a file → server creates a session → returns a share link
2. Receiver opens the link → both connect via Socket.IO for signaling
3. WebRTC peer connection established (offer/answer/ICE)
4. File streams directly: sender → receiver via DataChannel
5. Receiver's browser assembles chunks and triggers download

---

## Recent Updates

- **Local Network QR Code Sharing**: Implemented a dynamic API route (`/api/network-ip`) that detects the host's LAN IP. Scanning the generated QR code with a phone seamlessly routes directly to the application on your local Wi-Fi, bypassing `localhost` limitations.
- **Robust WebRTC DataChannels**: Eliminated P2P transfer stalling (previously hanging at 86%). Removed unreliable `maxRetransmits` settings to ensure TCP-like reliability and updated the receiver logic to independently assemble file chunks without race-prone completion events.
- **Production-Ready NAT Traversal (TURN)**: Integrated **Metered** TURN servers to guarantee connection success for users behind symmetric NATs, mobile carrier networks, and restrictive corporate firewalls. Short-lived TURN credentials are automatically fetched via our signaling server backend without exposing the master key.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, Tailwind CSS 4 |
| Animations | Framer Motion |
| Backend | Node.js, Express, Socket.IO |
| Networking | WebRTC DataChannels, STUN, **Metered TURN** |
| Encryption | Web Crypto API (AES-256-GCM) |
| QR Codes | qrcode.react |

---

## Project Structure

```
filejet/
├── client/                    # Next.js frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.js              # Landing + upload page
│   │   │   ├── layout.js            # Root layout
│   │   │   ├── globals.css           # Design system
│   │   │   ├── download/[sessionId]/ # Download page
│   │   │   └── dashboard/            # Dashboard page
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── DropZone.jsx
│   │   │   ├── FileCard.jsx
│   │   │   ├── TransferProgress.jsx
│   │   │   ├── ShareLink.jsx
│   │   │   ├── QRCodeDisplay.jsx
│   │   │   ├── FeatureGrid.jsx
│   │   │   └── PricingSection.jsx
│   │   └── lib/
│   │       ├── webrtc.js            # WebRTC connection manager
│   │       ├── fileChunker.js       # File chunking & assembly
│   │       ├── encryption.js        # E2E encryption (AES-GCM)
│   │       ├── transferManager.js   # Transfer orchestrator
│   │       ├── socket.js            # Socket.IO client
│   │       └── utils.js             # Formatting utilities
│   └── .env.local
├── server/                    # Express signaling server
│   ├── index.js               # Server entry point
│   ├── signaling.js           # WebRTC signaling handlers
│   ├── sessionStore.js        # In-memory session storage
│   ├── turn.js                # Metered TURN credential vending
│   └── .env
├── package.json               # Root workspace
├── .env.example
└── README.md
```

---

## Quick Start

### Prerequisites
- Node.js 18+
- npm 9+

### 1. Clone & Install

```bash
git clone https://github.com/Gunraj-Gurjar/FileJet.git
cd FileJet
npm run install:all
```

### 2. Configure Environment

```bash
# Copy the example env file
cp .env.example server/.env

# Create client env
echo "NEXT_PUBLIC_SERVER_URL=http://localhost:3001" > client/.env.local
echo "NEXT_PUBLIC_APP_URL=http://localhost:3000" >> client/.env.local

# Add Metered TURN API credentials (if available) to server folder
echo "METERED_DOMAIN=your_app.metered.live" >> server/.env
echo "TURN_SECRET_KEY=your_secret_key" >> server/.env
```

### 3. Run Development

```bash
# Start both server and client
npm run dev

# Or run separately:
npm run dev:server   # Port 3001
npm run dev:client   # Port 3000
```

### 4. Open
Visit **http://localhost:3000** in your browser.

---

## Deployment

### Backend → Render ✅ (Live)

The signaling server is deployed on **Render** at:

> **https://filejet.onrender.com**

| Setting | Value |
|---------|-------|
| Service Type | Web Service (Free) |
| Root Directory | `server` |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Runtime | Node |

**Environment variables set on Render:**

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | `production` |
| `CLIENT_URL` | Frontend origin for CORS |
| `METERED_DOMAIN` | Metered.ca app domain |
| `TURN_SECRET_KEY` | Metered.ca API secret key |

**Verify endpoints:**
- Health check: [`/health`](https://filejet.onrender.com/health)
- ICE servers: [`/api/ice-servers`](https://filejet.onrender.com/api/ice-servers)

> ⚠️ Free tier instances spin down after inactivity (~50s cold start on first request).

### Frontend → Vercel

```bash
cd client
npx vercel --prod
```

Set environment variables in Vercel:
- `NEXT_PUBLIC_SERVER_URL` = `https://filejet.onrender.com`
- `NEXT_PUBLIC_APP_URL` = your Vercel domain

### Database (Optional)

For persistent sessions, replace `sessionStore.js` with MongoDB:
- Use **MongoDB Atlas** free tier
- Add `MONGODB_URI` to server env

---

## Scaling Architecture

```
                    ┌─────────────┐
                    │  CloudFlare │
                    │  CDN / WAF  │
                    └──────┬──────┘
                           │
                    ┌──────┴──────┐
                    │   Load      │
                    │  Balancer   │
                    └──────┬──────┘
           ┌───────────────┼───────────────┐
    ┌──────┴──────┐ ┌──────┴──────┐ ┌──────┴──────┐
    │  Signaling  │ │  Signaling  │ │  Signaling  │
    │  Server 1   │ │  Server 2   │ │  Server N   │
    └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
           │               │               │
    ┌──────┴───────────────┴───────────────┴──────┐
    │             Redis Pub/Sub Adapter            │
    │        (Socket.IO sticky sessions)           │
    └──────────────────────┬──────────────────────┘
                           │
                    ┌──────┴──────┐
                    │  MongoDB    │
                    │  Atlas      │
                    └─────────────┘

    ┌───────────────────────────────────────┐
    │          TURN Server Cluster          │
    │    (Coturn, for NAT traversal)        │
    │    Deployed at edge locations         │
    └───────────────────────────────────────┘
```

**Key scaling strategies:**
- **Horizontal scaling**: add more signaling servers behind a load balancer
- **Redis adapter**: Socket.IO Redis adapter for cross-server pub/sub
- **TURN clusters**: deploy Coturn at edge locations for media relay
- **CDN**: CloudFlare or Vercel Edge for static frontend assets
- **Database**: MongoDB Atlas with read replicas for analytics
- **Edge computing**: use Vercel Edge Functions for session creation

---

## Security

| Feature | Implementation |
|---------|---------------|
| Encryption | AES-256-GCM via Web Crypto API |
| Key Distribution | URL fragment (never sent to server) |
| Transport | DTLS (WebRTC built-in) |
| Session Tokens | UUID-based, auto-expiring (24h TTL) |
| Password Links | Optional per-session password |
| CORS | Strict origin allowlist |

---

## Future Roadmap

- [ ] **Multi-file transfers** — send folders/multiple files at once
- [x] **TURN server integration** — Integrated Metered.ca TURN server handling for NAT traversal
- [x] **Backend deployment** — Live on Render at https://filejet.onrender.com
- [ ] **Frontend deployment** — Deploy Next.js client to Vercel
- [ ] **MongoDB persistence** — user accounts, transfer history
- [ ] **Cloud backup option** — S3-compatible temporary storage
- [ ] **Mobile apps** — React Native clients
- [ ] **Browser extension** — right-click to share
- [ ] **Webhooks** — notify on transfer completion
- [ ] **API access** — REST API for enterprise automation
- [ ] **Analytics dashboard** — transfer metrics, bandwidth usage
- [ ] **Team workspaces** — shared transfer history
- [ ] **Custom branding** — white-label for enterprise

---

## License

MIT © FileJet
