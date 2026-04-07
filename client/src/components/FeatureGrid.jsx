'use client';

import { motion } from 'framer-motion';

const features = [
    {
        title: 'Peer-to-Peer Transfer',
        description: 'Files transfer directly between devices via WebRTC. No server storage, zero middlemen.',
        icon: (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
            </svg>
        ),
        gradient: 'from-indigo-500 to-purple-500',
    },
    {
        title: 'End-to-End Encrypted',
        description: 'AES-256-GCM encryption. Keys stay in the URL fragment — never touch our servers.',
        icon: (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
        ),
        gradient: 'from-emerald-500 to-teal-500',
    },
    {
        title: 'No Size Limits',
        description: 'Send files from 1MB to 100GB+. Chunked streaming keeps memory usage low.',
        icon: (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
            </svg>
        ),
        gradient: 'from-orange-500 to-amber-500',
    },
    {
        title: 'QR Code Sharing',
        description: 'Scan a QR code with your phone to instantly start receiving files.',
        icon: (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
            </svg>
        ),
        gradient: 'from-pink-500 to-rose-500',
    },
    {
        title: 'Blazing Fast',
        description: 'Direct device-to-device connection. No upload-then-download — it\'s instant.',
        icon: (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
        ),
        gradient: 'from-yellow-500 to-orange-500',
    },
    {
        title: 'Resume Transfers',
        description: 'Connection dropped? No problem. Resume from exactly where you left off.',
        icon: (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
        ),
        gradient: 'from-cyan-500 to-blue-500',
    },
];

const containerVariants = {
    hidden: {},
    visible: {
        transition: { staggerChildren: 0.1 },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function FeatureGrid() {
    return (
        <section id="features" className="py-24 relative">
            {/* Background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-500/5 rounded-full blur-[120px] pointer-events-none" />

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-16"
                >
                    <span className="inline-block px-4 py-1.5 rounded-full text-xs font-medium bg-brand-500/10 text-brand-400 border border-brand-500/20 mb-4">
                        Features
                    </span>
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                        Everything you need for
                        <span className="gradient-text"> seamless transfers</span>
                    </h2>
                    <p className="text-lg text-surface-200/50 max-w-2xl mx-auto">
                        Built with cutting-edge web technology for the fastest, most secure file transfers possible.
                    </p>
                </motion.div>

                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            variants={itemVariants}
                            className="group rounded-2xl glass p-6 hover:bg-white/[0.06] transition-all duration-300 hover:border-brand-500/30"
                        >
                            <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient} bg-opacity-10 text-white mb-4 group-hover:scale-110 transition-transform`}
                                style={{ background: `linear-gradient(135deg, var(--tw-gradient-stops))`, opacity: 0.15 }}
                            >
                                <div className={`text-brand-400`}>
                                    {feature.icon}
                                </div>
                            </div>
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 mb-4 group-hover:scale-110 transition-transform -mt-16">
                                {feature.icon}
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                            <p className="text-sm text-surface-200/50 leading-relaxed">{feature.description}</p>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
