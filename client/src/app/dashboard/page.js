'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

// Mock data for demo — in production, this would come from an API/database
const mockTransfers = [
    { id: 1, fileName: 'project-assets.zip', fileSize: 2147483648, date: '2026-03-08', status: 'complete', direction: 'sent' },
    { id: 2, fileName: 'presentation.pptx', fileSize: 52428800, date: '2026-03-07', status: 'complete', direction: 'received' },
    { id: 3, fileName: 'video-edit-final.mp4', fileSize: 5368709120, date: '2026-03-06', status: 'complete', direction: 'sent' },
    { id: 4, fileName: 'database-backup.sql', fileSize: 1073741824, date: '2026-03-05', status: 'expired', direction: 'sent' },
    { id: 5, fileName: 'design-files.fig', fileSize: 314572800, date: '2026-03-04', status: 'complete', direction: 'received' },
];

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function DashboardPage() {
    const [activeTab, setActiveTab] = useState('all');

    const filteredTransfers = activeTab === 'all'
        ? mockTransfers
        : mockTransfers.filter(t => t.direction === activeTab);

    const totalSent = mockTransfers.filter(t => t.direction === 'sent').reduce((a, t) => a + t.fileSize, 0);
    const totalReceived = mockTransfers.filter(t => t.direction === 'received').reduce((a, t) => a + t.fileSize, 0);

    return (
        <div className="min-h-screen bg-surface-950 noise-bg flex flex-col">
            <Navbar />

            <main className="flex-1 pt-28 pb-20">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-10"
                    >
                        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
                        <p className="text-surface-200/50">Your transfer history and analytics</p>
                    </motion.div>

                    {/* Stats Cards */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10"
                    >
                        {[
                            { label: 'Total Transfers', value: mockTransfers.length, icon: '↗', color: 'brand' },
                            { label: 'Data Sent', value: formatBytes(totalSent), icon: '↑', color: 'brand' },
                            { label: 'Data Received', value: formatBytes(totalReceived), icon: '↓', color: 'accent' },
                            { label: 'Plan', value: 'Free', icon: '★', color: 'warning' },
                        ].map((stat, i) => (
                            <div key={i} className="rounded-2xl glass p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm text-surface-200/50">{stat.label}</span>
                                    <span className="text-lg">{stat.icon}</span>
                                </div>
                                <p className="text-2xl font-bold text-white">{stat.value}</p>
                            </div>
                        ))}
                    </motion.div>

                    {/* Transfer History */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="rounded-2xl glass overflow-hidden"
                    >
                        {/* Tabs */}
                        <div className="flex items-center gap-1 p-2 border-b border-white/5">
                            {['all', 'sent', 'received'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize ${activeTab === tab
                                            ? 'bg-brand-500/10 text-brand-400'
                                            : 'text-surface-200/50 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/5">
                                        <th className="text-left text-xs font-medium text-surface-200/40 px-6 py-4">File</th>
                                        <th className="text-left text-xs font-medium text-surface-200/40 px-6 py-4">Size</th>
                                        <th className="text-left text-xs font-medium text-surface-200/40 px-6 py-4">Date</th>
                                        <th className="text-left text-xs font-medium text-surface-200/40 px-6 py-4">Direction</th>
                                        <th className="text-left text-xs font-medium text-surface-200/40 px-6 py-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTransfers.map((transfer) => (
                                        <tr key={transfer.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-400">
                                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                                        </svg>
                                                    </div>
                                                    <span className="text-sm text-white truncate max-w-[200px]">{transfer.fileName}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-surface-200/70">{formatBytes(transfer.fileSize)}</td>
                                            <td className="px-6 py-4 text-sm text-surface-200/50">{transfer.date}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${transfer.direction === 'sent'
                                                        ? 'bg-brand-500/10 text-brand-400'
                                                        : 'bg-accent-500/10 text-accent-400'
                                                    }`}>
                                                    {transfer.direction === 'sent' ? '↑' : '↓'} {transfer.direction}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${transfer.status === 'complete'
                                                        ? 'bg-success/10 text-success'
                                                        : 'bg-surface-200/10 text-surface-200/40'
                                                    }`}>
                                                    {transfer.status === 'complete' ? '✓' : '○'} {transfer.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {filteredTransfers.length === 0 && (
                            <div className="text-center py-12">
                                <p className="text-surface-200/40">No transfers found</p>
                            </div>
                        )}
                    </motion.div>

                    {/* Upgrade CTA */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mt-8 rounded-2xl gradient-bg-animated p-8 text-center"
                    >
                        <h3 className="text-xl font-bold text-white mb-2">Upgrade to Pro</h3>
                        <p className="text-white/70 mb-6">Unlock 100GB transfers, password-protected links, and analytics</p>
                        <button className="rounded-full bg-white px-8 py-3 text-sm font-semibold text-brand-600 hover:bg-white/90 transition-colors shadow-xl">
                            Upgrade Now — $9/mo
                        </button>
                    </motion.div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
