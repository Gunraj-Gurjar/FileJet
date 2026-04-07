'use client';

import { motion } from 'framer-motion';
import { formatBytes, getFileIcon } from '@/lib/utils';

/** File type icon SVGs */
const FILE_ICONS = {
    image: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
        </svg>
    ),
    video: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 016 11.625v-1.5m1.125 1.875c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m0-3.75h9.75m0 0A1.125 1.125 0 0118 11.625v-1.5m-9.75 1.875c.621 0 1.125.504 1.125 1.125v1.5m-1.125-2.625c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125" />
        </svg>
    ),
    file: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
    ),
    archive: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
    ),
};

export default function FileCard({ file, onRemove, disabled }) {
    const iconType = getFileIcon(file.type);
    const icon = FILE_ICONS[iconType] || FILE_ICONS.file;
    const extension = file.name.split('.').pop()?.toUpperCase() || 'FILE';

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full rounded-2xl glass p-5"
        >
            <div className="flex items-center gap-4">
                {/* File icon */}
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400">
                    {icon}
                </div>

                {/* File info */}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate" title={file.name}>
                        {file.name}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-surface-200/50">{formatBytes(file.size)}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 font-medium">
                            {extension}
                        </span>
                    </div>
                </div>

                {/* Remove button */}
                {!disabled && (
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={onRemove}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 text-surface-200/50 hover:bg-error/10 hover:text-error transition-colors"
                        aria-label="Remove file"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </motion.button>
                )}
            </div>
        </motion.div>
    );
}
