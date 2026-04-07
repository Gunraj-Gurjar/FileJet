'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import DropZone from '@/components/DropZone';
import ShareLink from '@/components/ShareLink';
import QRCodeDisplay from '@/components/QRCodeDisplay';
import TransferProgress from '@/components/TransferProgress';
import FeatureGrid from '@/components/FeatureGrid';
import PricingSection from '@/components/PricingSection';
import { createTransfer, TRANSFER_STATES } from '@/lib/transferManager';
import { formatBytes } from '@/lib/utils';

export default function HomePage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [transferState, setTransferState] = useState(TRANSFER_STATES.IDLE);
  const [progress, setProgress] = useState(null);
  const [shareInfo, setShareInfo] = useState(null);
  const [error, setError] = useState(null);

  const handleFileSelect = useCallback((file) => {
    setSelectedFile(file);
    setTransferState(TRANSFER_STATES.IDLE);
    setProgress(null);
    setShareInfo(null);
    setError(null);
  }, []);

  const handleGenerateLink = useCallback(async () => {
    if (!selectedFile) return;
    setError(null);

    try {
      setTransferState(TRANSFER_STATES.CREATING_SESSION);
      let appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      let willBeInsecure = false;

      if (window.location.hostname === 'localhost') {
        try {
          const res = await fetch('/api/network-ip');
          if (res.ok) {
            const data = await res.json();
            if (data.ip) {
              appUrl = `http://${data.ip}:${window.location.port || '3001'}`;
              willBeInsecure = true; // receivers on local IP will use HTTP (insecure)
            }
          }
        } catch (e) {
          console.error('Failed to get network IP:', e);
        }
      } else if (appUrl.startsWith('http://') && window.location.hostname !== 'localhost') {
        willBeInsecure = true;
      }

      // Check if current context supports WebCrypto and the receiver will too
      // (This is only called on button click, so window is guaranteed to be defined)
      const cryptoSupported = !!(window.crypto && window.crypto.subtle);
      const shouldEncrypt = cryptoSupported && !willBeInsecure;

      const result = await createTransfer(selectedFile, {
        encrypt: shouldEncrypt,
        onStateChange: (state) => {
          setTransferState(state);
        },
        onProgress: (prog) => {
          setProgress(prog);
        },
      });

      setShareInfo({
        shareUrl: `${appUrl}/download/${result.sessionId}`,
        encryptionKey: result.encryptionKey,
        sessionId: result.sessionId,
      });
    } catch (err) {
      setError(err.message || 'Failed to create transfer session');
      setTransferState(TRANSFER_STATES.ERROR);
    }
  }, [selectedFile]);

  const isTransferActive = [
    TRANSFER_STATES.CREATING_SESSION,
    TRANSFER_STATES.WAITING_FOR_PEER,
    TRANSFER_STATES.CONNECTING,
    TRANSFER_STATES.TRANSFERRING,
  ].includes(transferState);

  return (
    <div className="min-h-screen bg-surface-950 noise-bg">
      <Navbar />

      {/* ─── Hero Section ──────────────────────────────────── */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Background effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-brand-600/10 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute top-20 right-0 w-[400px] h-[400px] bg-accent-600/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="text-center mb-12"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 mb-6"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
              </span>
              <span className="text-xs font-medium text-brand-400">Peer-to-Peer • End-to-End Encrypted</span>
            </motion.div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6">
              <span className="text-white">Send Large Files</span>
              <br />
              <span className="gradient-text">Instantly</span>
            </h1>

            <p className="text-lg md:text-xl text-surface-200/50 max-w-2xl mx-auto leading-relaxed">
              Transfer files up to 100GB+ directly between devices.
              No cloud storage needed. No upload wait times.
              <span className="text-white font-medium"> Just pure speed.</span>
            </p>
          </motion.div>

          {/* ─── Upload Area ──────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="max-w-2xl mx-auto space-y-5"
          >
            <DropZone
              onFileSelect={handleFileSelect}
              selectedFile={selectedFile}
              disabled={isTransferActive}
            />

            {/* Generate Link Button */}
            {selectedFile && !shareInfo && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGenerateLink}
                disabled={isTransferActive}
                className="w-full rounded-2xl gradient-bg py-4 text-base font-semibold text-white shadow-xl shadow-brand-500/25 hover:shadow-brand-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {transferState === TRANSFER_STATES.CREATING_SESSION ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating Session...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.686-3.626a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364l1.757 1.757" />
                    </svg>
                    Generate Share Link
                  </span>
                )}
              </motion.button>
            )}

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl bg-error/10 border border-error/20 p-4 text-sm text-error"
              >
                {error}
              </motion.div>
            )}

            {/* Share Link + QR Code */}
            {shareInfo && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-5"
              >
                <ShareLink
                  shareUrl={shareInfo.shareUrl}
                  encryptionKey={shareInfo.encryptionKey}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="rounded-2xl glass p-6 flex flex-col items-center justify-center">
                    <QRCodeDisplay
                      url={shareInfo.encryptionKey
                        ? `${shareInfo.shareUrl}#key=${shareInfo.encryptionKey}`
                        : shareInfo.shareUrl
                      }
                    />
                  </div>

                  <div className="rounded-2xl glass p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <div className={`h-2.5 w-2.5 rounded-full ${transferState === TRANSFER_STATES.WAITING_FOR_PEER
                        ? 'bg-warning animate-pulse'
                        : transferState === TRANSFER_STATES.TRANSFERRING
                          ? 'bg-success animate-pulse'
                          : transferState === TRANSFER_STATES.COMPLETE
                            ? 'bg-success'
                            : 'bg-surface-200/30'
                        }`} />
                      <span className="text-sm text-surface-200/70">
                        {transferState === TRANSFER_STATES.WAITING_FOR_PEER
                          ? 'Waiting for receiver...'
                          : transferState === TRANSFER_STATES.CONNECTING
                            ? 'Connecting...'
                            : transferState === TRANSFER_STATES.TRANSFERRING
                              ? 'Transfer in progress'
                              : transferState === TRANSFER_STATES.COMPLETE
                                ? 'Transfer complete!'
                                : 'Ready'}
                      </span>
                    </div>

                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-surface-200/40">File</span>
                        <span className="text-white truncate ml-4">{selectedFile?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-surface-200/40">Size</span>
                        <span className="text-white">{selectedFile ? formatBytes(selectedFile.size) : '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-surface-200/40">Encryption</span>
                        <span className={shareInfo.encryptionKey ? "text-success" : "text-warning"}>
                          {shareInfo.encryptionKey ? 'AES-256-GCM' : 'Disabled (Local Network)'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-surface-200/40">Transfer</span>
                        <span className="text-brand-400">Direct P2P</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Transfer Progress */}
                {(transferState === TRANSFER_STATES.TRANSFERRING || transferState === TRANSFER_STATES.COMPLETE) && (
                  <TransferProgress progress={progress} state={transferState} />
                )}
              </motion.div>
            )}
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex items-center justify-center gap-8 mt-16 text-center"
          >
            {[
              { value: '100GB+', label: 'Max File Size' },
              { value: '0', label: 'Server Storage' },
              { value: 'AES-256', label: 'Encryption' },
            ].map((stat, i) => (
              <div key={i} className="px-4">
                <p className="text-xl md:text-2xl font-bold gradient-text">{stat.value}</p>
                <p className="text-xs text-surface-200/40 mt-1">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Features ──────────────────────────────────────── */}
      <FeatureGrid />

      {/* ─── Pricing ───────────────────────────────────────── */}
      <PricingSection />

      {/* ─── CTA Section ───────────────────────────────────── */}
      <section className="py-24 relative">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to send files at
              <span className="gradient-text"> warp speed?</span>
            </h2>
            <p className="text-lg text-surface-200/50 mb-8 max-w-xl mx-auto">
              No account needed. Just drop a file and share the link.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="rounded-full gradient-bg px-8 py-4 text-base font-semibold text-white shadow-xl shadow-brand-500/25 hover:shadow-brand-500/40 transition-all"
            >
              Start Transferring — It&apos;s Free
            </motion.button>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
