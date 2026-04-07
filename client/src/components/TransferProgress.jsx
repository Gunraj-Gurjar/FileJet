'use client';

import { motion } from 'framer-motion';
import { formatBytes, formatSpeed, formatETA } from '@/lib/utils';

export default function TransferProgress({ progress, state }) {
    const {
        percentage = 0,
        sent = 0,
        received = 0,
        total = 0,
        speed = 0,
        eta = 0,
        chunkIndex = 0,
        totalChunks = 0,
    } = progress || {};

    const transferred = sent || received;
    const isComplete = state === 'complete';
    const isError = state === 'error';
    const isTransferring = state === 'transferring';

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full rounded-2xl glass p-6 space-y-4"
        >
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {isComplete ? (
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10">
                            <svg className="h-5 w-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                        </div>
                    ) : isError ? (
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-error/10">
                            <svg className="h-5 w-5 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                            </svg>
                        </div>
                    ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10">
                            <svg className="h-5 w-5 text-brand-400 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                        </div>
                    )}
                    <div>
                        <p className="text-sm font-medium text-white">
                            {isComplete ? 'Transfer Complete!' : isError ? 'Transfer Failed' : 'Transferring...'}
                        </p>
                        <p className="text-xs text-surface-200/50">
                            {formatBytes(transferred)} / {formatBytes(total)}
                        </p>
                    </div>
                </div>
                <span className={`text-2xl font-bold ${isComplete ? 'text-success' : isError ? 'text-error' : 'gradient-text'}`}>
                    {percentage}%
                </span>
            </div>

            {/* Progress Bar */}
            <div className="relative h-3 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className={`absolute inset-y-0 left-0 rounded-full ${isComplete
                            ? 'bg-success'
                            : isError
                                ? 'bg-error'
                                : 'gradient-bg progress-striped'
                        }`}
                />
                {/* Glow on progress tip */}
                {isTransferring && (
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        className="absolute inset-y-0 left-0 rounded-full bg-brand-400/30 blur-sm"
                    />
                )}
            </div>

            {/* Stats Grid */}
            {isTransferring && (
                <div className="grid grid-cols-3 gap-4 pt-2">
                    <div className="text-center">
                        <p className="text-xs text-surface-200/40 mb-1">Speed</p>
                        <p className="text-sm font-medium text-white">{formatSpeed(speed)}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-surface-200/40 mb-1">ETA</p>
                        <p className="text-sm font-medium text-white">{formatETA(eta)}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-surface-200/40 mb-1">Chunks</p>
                        <p className="text-sm font-medium text-white">{chunkIndex} / {totalChunks}</p>
                    </div>
                </div>
            )}
        </motion.div>
    );
}
