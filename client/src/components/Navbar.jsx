'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <motion.nav
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
                    ? 'glass shadow-lg shadow-brand-500/5'
                    : 'bg-transparent'
                }`}
        >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="relative flex h-9 w-9 items-center justify-center rounded-xl gradient-bg shadow-lg shadow-brand-500/25 transition-transform group-hover:scale-110">
                            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                            </svg>
                        </div>
                        <span className="text-xl font-bold tracking-tight">
                            File<span className="gradient-text">Jet</span>
                        </span>
                    </Link>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center gap-8">
                        <Link href="/#features" className="text-sm text-surface-200/70 hover:text-white transition-colors">
                            Features
                        </Link>
                        <Link href="/#pricing" className="text-sm text-surface-200/70 hover:text-white transition-colors">
                            Pricing
                        </Link>
                        <Link href="/dashboard" className="text-sm text-surface-200/70 hover:text-white transition-colors">
                            Dashboard
                        </Link>
                        <Link
                            href="/"
                            className="rounded-full gradient-bg px-5 py-2 text-sm font-medium text-white shadow-lg shadow-brand-500/25 transition-all hover:shadow-brand-500/40 hover:scale-105 active:scale-95"
                        >
                            Get Started
                        </Link>
                    </div>

                    {/* Mobile menu button */}
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className="md:hidden flex flex-col gap-1.5 p-2"
                        aria-label="Toggle menu"
                    >
                        <motion.span
                            animate={menuOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
                            className="block h-0.5 w-6 bg-white rounded-full"
                        />
                        <motion.span
                            animate={menuOpen ? { opacity: 0 } : { opacity: 1 }}
                            className="block h-0.5 w-6 bg-white rounded-full"
                        />
                        <motion.span
                            animate={menuOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
                            className="block h-0.5 w-6 bg-white rounded-full"
                        />
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {menuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden glass border-t border-white/5"
                    >
                        <div className="px-4 py-4 space-y-3">
                            <Link href="/#features" onClick={() => setMenuOpen(false)} className="block text-sm text-surface-200/70 hover:text-white py-2">Features</Link>
                            <Link href="/#pricing" onClick={() => setMenuOpen(false)} className="block text-sm text-surface-200/70 hover:text-white py-2">Pricing</Link>
                            <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="block text-sm text-surface-200/70 hover:text-white py-2">Dashboard</Link>
                            <Link href="/" className="block w-full text-center rounded-full gradient-bg px-5 py-2.5 text-sm font-medium text-white">
                                Get Started
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.nav>
    );
}
