'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ShareLink({ shareUrl, encryptionKey }) {
    const [copied, setCopied] = useState(false);

    // Build the full URL with encryption key in fragment
    const fullUrl = encryptionKey
        ? `${shareUrl}#key=${encryptionKey}`
        : shareUrl;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(fullUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = fullUrl;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full rounded-2xl glass p-5"
        >
            <p className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <svg className="h-4 w-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.686-3.626a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364l1.757 1.757" />
                </svg>
                Share this link
            </p>

            <div className="flex items-center gap-2">
                <div className="flex-1 rounded-xl bg-white/5 border border-white/10 px-4 py-3 overflow-hidden">
                    <p className="text-sm text-surface-200/70 truncate font-mono">
                        {fullUrl}
                    </p>
                </div>

                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleCopy}
                    className={`shrink-0 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-all ${copied
                            ? 'bg-success/10 text-success border border-success/20'
                            : 'gradient-bg text-white shadow-lg shadow-brand-500/20'
                        }`}
                >
                    <AnimatePresence mode="wait">
                        {copied ? (
                            <motion.span
                                key="copied"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="flex items-center gap-1"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                                Copied!
                            </motion.span>
                        ) : (
                            <motion.span
                                key="copy"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="flex items-center gap-1"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                                </svg>
                                Copy
                            </motion.span>
                        )}
                    </AnimatePresence>
                </motion.button>
            </div>

            <div className="flex items-center gap-2 mt-3">
                <svg className="h-3.5 w-3.5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                <span className="text-xs text-surface-200/40">
                    {encryptionKey ? 'End-to-end encrypted — key is in the link' : 'Share this link with the recipient'}
                </span>
            </div>
        </motion.div>
    );
}
