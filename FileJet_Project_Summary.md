# FileJet - Project Development Overview

## 1. Project Introduction
**FileJet** is a peer-to-peer (P2P) large file-sharing platform designed to send files directly between devices without storing them on a central server. It relies on WebRTC for direct, high-speed, and secure transfer.

**Goal:** Over the last month, the goal was to architect the system, implement the signaling flow, build an interactive and responsive UI, and robustly handle large file chunking and WebRTC transferring.

---

## 2. Technologies Used
- **Frontend Core:** Next.js (React), Javascript
- **Styling & Animation:** Tailwind CSS, Framer Motion, Vanilla CSS (Glassmorphism & modern UI patterns)
- **Backend Signaling:** Node.js, Express.js
- **Real-Time Communication:** Socket.IO (for WebRTC handshake & session management)
- **P2P Transport:** WebRTC API (RTCPeerConnection, RTCDataChannel)
- **Security / Extras:** Web Crypto API (AES-256-GCM for End-to-End Encryption), qrcode.react (QR generation)

---

## 3. Step-by-Step Development & Solutions

### Phase 1: Planning and Architecture
- **Step Process:** Developed the fundamental architecture where the server operates *only* as a signaling intermediary to introduce peers. No file data is persisted.
- **Problem Faced:** Establishing how peers connect across different networks and how to expose URL structures so local network devices could scan the QR code and connect seamlessly.
- **Solution:** Implemented local network IP exposure so a smartphone on the same WiFi can scan the QR code and navigate directly to the Next.js dev server.

### Phase 2: Building UI & Features
- **Step Process:** Designed a modern UI utilizing Tailwind CSS and Framer Motion. Key components created include `DropZone`, `TransferProgress`, `ShareLink`, and an integrated `QRCodeDisplay`.
- **Implementation:** Added visual cues (pulsing animations), smooth page transitions, gradient text, and drag-and-drop aesthetics that give a premium look.

### Phase 3: Core WebRTC File Transfer
- **Step Process:** Used the HTML5 File API to read huge files in chunks (using 240KB chunks optimized for WebRTC limits).
- **Problem Faced (The 74% - 86% Stalls):** The system consistently ran into errors where the file transfer would stall just before completing.
- **Root Cause & Solution 1 (Buffer Overflows):** Sending data iteratively over WebRTC quickly overwhelms the sender's OS buffer. Solved by implementing flow control (`bufferedAmountLowThreshold`) pausing the file iteration and waiting for the buffer to drain whenever the queue exceeded a 4MB size (`MAX_BUFFER_SIZE`).
- **Root Cause & Solution 2 (Data Channel Unreliability):** Discovered that `maxRetransmits: null` caused some browsers to silently drop chunks when the network was crowded. Solved by removing the attribute altogether, shifting the WebRTC channel to its default, strictly reliable state (like TCP).
- **Root Cause & Solution 3 (Race Conditions):** Fixed an issue where the string `"file-complete"` metadata was arriving faster and being processed synchronously ahead of the buffered binary chunks. Solved by modifying the receiver logic to *independently verify* and finalize the file transfer the moment it successfully counted the requested expected chunks.

---

## 4. Current Limitations of the System
When taking advice from an AI model moving forward, keep these limitations in mind:

1. **Memory Ceiling for Vast Files:** To give the user the file at the end, the system merges all array buffers in memory (`new Blob(pendingChunks)`). Attempting to transfer a 10GB+ file could crash a tab that isn't using the newer File System Access API (like `FileSystemWritableFileStream`) to spool data directly onto the hard drive.
2. **NAT Traversal (STUN vs TURN):** Right now, the application relies on Google's free STUN servers. STUN connects peers *directly*. However, Corporate networks or symmetrical NATs block direct connections. A future fix requires integrating paid/open-source TURN servers (like Twilio or Coturn) which automatically fallback to relaying data when P2P fails.
3. **No Resumability:** Because WebRTC relies entirely on an active RTCPeerConnection, if the sender accidentally closes out the browser or the WIFI blips, the entire file connection is permanently terminated. No resume functionality exists yet.
4. **Single Peer Limitation:** The current logic assumes exactly one sender and exactly one receiver. It is not currently meant for multi-casting a file to 5 listeners at the exact same moment.

---

## 5. Summary
FileJet is currently fully functional logic-wise. WebRTC connections stabilize correctly, and chunking and buffering handle files dynamically over the local network with end-to-end encryption. The most difficult architectural speedbumps (WebRTC data channel races and reliable chunk reception) have been eradicated.
