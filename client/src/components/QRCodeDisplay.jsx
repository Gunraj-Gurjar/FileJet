'use client';

import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'framer-motion';

export default function QRCodeDisplay({ url }) {
    if (!url) return null;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4"
        >
            <div className="rounded-2xl bg-white p-4 shadow-xl shadow-brand-500/10">
                <QRCodeSVG
                    value={url}
                    size={180}
                    level="M"
                    bgColor="#ffffff"
                    fgColor="#18181b"
                    includeMargin={false}
                />
            </div>
            <p className="text-xs text-surface-200/40 text-center">
                Scan with your phone to receive the file
            </p>
        </motion.div>
    );
}
