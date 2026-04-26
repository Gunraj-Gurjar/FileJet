'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import TransferProgress from '@/components/TransferProgress';
import { joinTransfer, TRANSFER_STATES } from '@/lib/transferManager';
import { formatBytes } from '@/lib/utils';
import { downloadBlob } from '@/lib/fileChunker';

export default function DownloadPage() {
    const params = useParams();
    const sessionId = params.sessionId;

    const [sessionData, setSessionData] = useState(null);
    const [transferState, setTransferState] = useState(TRANSFER_STATES.IDLE);
    const [progress, setProgress] = useState(null);
    const [error, setError] = useState(null);
    const [downloadReady, setDownloadReady] = useState(false);
    const [fileResult, setFileResult] = useState(null);
    const [loading, setLoading] = useState(true);
    const [passwordInput, setPasswordInput] = useState('');
    const [needsPassword, setNeedsPassword] = useState(false);

    const [encryptionKey, setEncryptionKey] = useState(null);

    // Initial mount handling to avoid hydration mismatch
    useEffect(() => {
        const hash = window.location.hash;
        const keyMatch = hash.match(/key=([^&]+)/);
        if (keyMatch) setEncryptionKey(keyMatch[1]);
    }, []);

    // Fetch session metadata
    useEffect(() => {
        if (!sessionId) return;

        async function fetchSession() {
            try {
                // Use centralized SERVER_URL but keep it dynamic for dev
                const { SERVER_URL } = await import('@/lib/config');
                const res = await fetch(`${SERVER_URL}/api/sessions/${sessionId}`);
                if (!res.ok) throw new Error('Session not found or expired');
                const data = await res.json();
                setSessionData(data);
                if (data.hasPassword) setNeedsPassword(true);
            } catch (err) {
                console.error('[Download] Fetch error:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        fetchSession();
    }, [sessionId]);

    // Start receiving
    const handleStartDownload = useCallback(async () => {
        if (!sessionId) return;
        setError(null);

        try {
            await joinTransfer(sessionId, {
                password: passwordInput || undefined,
                encryptionKey,
                onStateChange: (state) => {
                    setTransferState(state);
                },
                onProgress: (prog) => {
                    setProgress(prog);
                },
                onComplete: (result) => {
                    // Store result — let user click Save button (Brave blocks auto-download)
                    setFileResult(result);
                    setDownloadReady(true);
                    // Try auto-download (works on Chrome/Firefox, may be blocked on Brave)
                    try { downloadBlob(result.blob, result.fileName); } catch (e) { console.log('[Download] Auto-download blocked, user can click Save button'); }
                },
            });
        } catch (err) {
            setError(err.message || 'Failed to connect');
            setTransferState(TRANSFER_STATES.ERROR);
        }
    }, [sessionId, passwordInput, encryptionKey]);

    const isActive = [
        TRANSFER_STATES.CONNECTING,
        TRANSFER_STATES.WAITING_FOR_PEER,
        TRANSFER_STATES.TRANSFERRING,
    ].includes(transferState);

    return (
        <div className="min-h-screen bg-surface-950 noise-bg flex flex-col">
            <Navbar />

            <main className="flex-1 pt-32 pb-20">
                <div className="mx-auto max-w-xl px-4 sm:px-6">
                    {/* Background glow */}
                    <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-brand-600/8 rounded-full blur-[150px] pointer-events-none" />

                    {loading ? (
                        <div className="text-center py-20">
                            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10 mb-4">
                                <svg className="h-6 w-6 text-brand-400 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                            </div>
                            <p className="text-surface-200/50">Loading session...</p>
                        </div>
                    ) : error && !sessionData ? (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center py-20"
                        >
                            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-error/10 mb-6">
                                <svg className="h-8 w-8 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-semibold text-white mb-2">Session Not Found</h2>
                            <p className="text-surface-200/50 mb-6">This transfer session has expired or doesn&apos;t exist.</p>
                            <Link
                                href="/"
                                className="inline-flex items-center gap-2 rounded-full gradient-bg px-6 py-3 text-sm font-medium text-white shadow-lg shadow-brand-500/25"
                            >
                                Send a New File
                            </Link>
                        </motion.div>
                    ) : sessionData && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="space-y-6"
                        >
                            {/* Header */}
                            <div className="text-center mb-8">
                                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500/10 mb-6">
                                    <svg className="h-8 w-8 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                    </svg>
                                </div>
                                <h1 className="text-2xl font-bold text-white mb-2">Ready to Download</h1>
                                <p className="text-surface-200/50">Someone is sharing a file with you</p>
                            </div>

                            {/* File Info Card */}
                            <div className="rounded-2xl glass p-6 space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400">
                                        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-base font-medium text-white truncate">{sessionData.fileName}</p>
                                        <p className="text-sm text-surface-200/50">{formatBytes(sessionData.fileSize)}</p>
                                    </div>
                                </div>

                                {/* Sender status */}
                                <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                                    <div className={`h-2.5 w-2.5 rounded-full ${sessionData.senderConnected ? 'bg-success animate-pulse' : 'bg-warning'
                                        }`} />
                                    <span className="text-sm text-surface-200/50">
                                        {sessionData.senderConnected ? 'Sender is online' : 'Waiting for sender to come online'}
                                    </span>
                                </div>
                            </div>

                            {/* Password Input */}
                            {needsPassword && transferState === TRANSFER_STATES.IDLE && (
                                <div className="rounded-2xl glass p-5">
                                    <label className="block text-sm font-medium text-white mb-2">
                                        This file is password-protected
                                    </label>
                                    <input
                                        type="password"
                                        value={passwordInput}
                                        onChange={(e) => setPasswordInput(e.target.value)}
                                        placeholder="Enter password..."
                                        className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder-surface-200/30 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-colors"
                                    />
                                </div>
                            )}

                            {/* Download Button */}
                            {transferState === TRANSFER_STATES.IDLE && (
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleStartDownload}
                                    className="w-full rounded-2xl gradient-bg py-4 text-base font-semibold text-white shadow-xl shadow-brand-500/25 hover:shadow-brand-500/40 transition-all"
                                >
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                        </svg>
                                        Download File
                                    </span>
                                </motion.button>
                            )}

                            {/* Status while connecting */}
                            {(transferState === TRANSFER_STATES.WAITING_FOR_PEER || transferState === TRANSFER_STATES.CONNECTING) && (
                                <div className="rounded-2xl glass p-6 text-center">
                                    <svg className="h-8 w-8 text-brand-400 animate-spin mx-auto mb-3" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    <p className="text-white font-medium">
                                        {transferState === TRANSFER_STATES.WAITING_FOR_PEER
                                            ? 'Connecting to sender...'
                                            : 'Establishing peer connection...'}
                                    </p>
                                    <p className="text-sm text-surface-200/50 mt-1">This may take a few seconds</p>
                                </div>
                            )}

                            {/* Transfer Progress */}
                            {(transferState === TRANSFER_STATES.TRANSFERRING || transferState === TRANSFER_STATES.COMPLETE) && (
                                <TransferProgress progress={progress} state={transferState} />
                            )}

                            {/* Complete */}
                            {transferState === TRANSFER_STATES.COMPLETE && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-center space-y-4"
                                >
                                    <p className="text-success text-sm">✓ Transfer complete!</p>

                                    {/* Save File Button — works on all browsers including Brave */}
                                    {fileResult && (
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => downloadBlob(fileResult.blob, fileResult.fileName)}
                                            className="w-full rounded-2xl bg-success/90 hover:bg-success py-4 text-base font-semibold text-white shadow-xl shadow-success/25 hover:shadow-success/40 transition-all"
                                        >
                                            <span className="flex items-center justify-center gap-2">
                                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                                </svg>
                                                💾 Save File to Device
                                            </span>
                                        </motion.button>
                                    )}

                                    <Link
                                        href="/"
                                        className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-6 py-3 text-sm font-medium text-white hover:bg-white/10 transition-colors"
                                    >
                                        Send Your Own File
                                    </Link>
                                </motion.div>
                            )}

                            {/* Error */}
                            {error && transferState === TRANSFER_STATES.ERROR && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="rounded-xl bg-error/10 border border-error/20 p-4 text-sm text-error text-center"
                                >
                                    {error}
                                </motion.div>
                            )}

                            {/* Security info */}
                            <div className="flex items-center justify-center gap-2 pt-4">
                                <svg className="h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                                </svg>
                                <span className="text-xs text-surface-200/40">
                                    End-to-end encrypted • Direct P2P transfer
                                </span>
                            </div>
                        </motion.div>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
}
