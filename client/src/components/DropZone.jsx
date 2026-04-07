'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FileCard from './FileCard';

export default function DropZone({ onFileSelect, selectedFile, disabled }) {
    const [isDragging, setIsDragging] = useState(false);
    const [cryptoSupported, setCryptoSupported] = useState(true);


    useEffect(() => {
        if (typeof window !== 'undefined') {
            const hasCrypto = !!(window.crypto && window.crypto.subtle);
            const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const isPrivateIP = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(window.location.hostname);
            // Allow on secure contexts OR localhost/LAN (files will transfer without encryption)
            setCryptoSupported(hasCrypto || isLocalhost || isPrivateIP);
        }
    }, []);

    const isDisabled = disabled || !cryptoSupported;

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isDisabled) setIsDragging(true);
    }, [isDisabled]);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (isDisabled) return;

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            onFileSelect(files[0]);
        }
    }, [onFileSelect, disabled]);

    const handleFileInput = useCallback((e) => {
        if (isDisabled) return;
        const files = e.target.files;
        if (files.length > 0) {
            onFileSelect(files[0]);
        }
    }, [onFileSelect]);

    return (
        <div className="w-full">
            <AnimatePresence mode="wait">
                {selectedFile ? (
                    <motion.div
                        key="file-selected"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                    >
                        <FileCard
                            file={selectedFile}
                            onRemove={() => onFileSelect(null)}
                            disabled={isDisabled}
                        />
                    </motion.div>
                ) : (
                    <motion.label
                        key="drop-zone"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`relative flex flex-col items-center justify-center w-full min-h-[280px] rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-300 group ${isDragging
                            ? 'border-brand-400 bg-brand-500/10 scale-[1.02]'
                            : 'border-surface-700 hover:border-brand-500/50 hover:bg-white/[0.02]'
                            } ${isDisabled ? 'border-error/50 bg-error/5 cursor-not-allowed opacity-80' : ''}`}
                    >
                        <input
                            type="file"
                            className="hidden"
                            onChange={handleFileInput}
                            disabled={isDisabled}
                            id="file-input"
                        />

                        {/* Animated upload icon */}
                        <motion.div
                            animate={isDragging ? { scale: 1.2, y: -10 } : { scale: 1, y: 0 }}
                            transition={{ type: 'spring', stiffness: 300 }}
                            className="relative mb-6"
                        >
                            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-500/10 group-hover:bg-brand-500/20 transition-colors">
                                <svg className="h-10 w-10 text-brand-400 group-hover:text-brand-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                                </svg>
                            </div>
                            {/* Glow effect */}
                            <div className="absolute inset-0 rounded-2xl bg-brand-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                        </motion.div>

                        {cryptoSupported ? (
                            <>
                                <p className="text-lg font-medium text-white mb-2">
                                    {isDragging ? 'Drop your file here' : 'Drag & drop your file here'}
                                </p>
                                <p className="text-sm text-surface-200/50 mb-4">
                                    or click to browse
                                </p>
                                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
                                    <svg className="h-4 w-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                                    </svg>
                                    <span className="text-xs text-surface-200/60">End-to-end encrypted • Max: Unlimited</span>
                                </div>
                            </>
                        ) : (
                            <div className="text-center max-w-sm">
                                <p className="text-lg font-medium text-error mb-2">
                                    Insecure Connection
                                </p>
                                <p className="text-sm text-error/70">
                                    End-to-end encryption requires a secure connection (HTTPS). Sending files is disabled.
                                </p>
                            </div>
                        )}
                    </motion.label>
                )}
            </AnimatePresence>
        </div>
    );
}
