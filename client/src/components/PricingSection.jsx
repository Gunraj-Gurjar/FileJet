'use client';

import { motion } from 'framer-motion';

const plans = [
    {
        name: 'Free',
        price: '$0',
        period: 'forever',
        description: 'Perfect for occasional file sharing',
        features: [
            'Up to 5GB per transfer',
            'Peer-to-peer transfers',
            'End-to-end encryption',
            'Share links',
            'QR code sharing',
        ],
        notIncluded: [
            'Password-protected links',
            'Transfer analytics',
            'Priority support',
        ],
        cta: 'Get Started Free',
        popular: false,
    },
    {
        name: 'Pro',
        price: '$9',
        period: '/month',
        description: 'For power users and professionals',
        features: [
            'Up to 100GB per transfer',
            'Peer-to-peer transfers',
            'End-to-end encryption',
            'Password-protected links',
            'Transfer analytics',
            'Priority support',
            'No ads',
            'Custom expiry times',
        ],
        notIncluded: [],
        cta: 'Start Pro Trial',
        popular: true,
    },
    {
        name: 'Enterprise',
        price: '$49',
        period: '/month',
        description: 'For teams and organizations',
        features: [
            'Unlimited transfer size',
            'REST API access',
            'Custom branding',
            'Team management',
            'Custom storage backend',
            'SSO / SAML',
            'SLA guarantee',
            'Dedicated support',
        ],
        notIncluded: [],
        cta: 'Contact Sales',
        popular: false,
    },
];

export default function PricingSection() {
    return (
        <section id="pricing" className="py-24 relative">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-16"
                >
                    <span className="inline-block px-4 py-1.5 rounded-full text-xs font-medium bg-brand-500/10 text-brand-400 border border-brand-500/20 mb-4">
                        Pricing
                    </span>
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                        Simple, transparent
                        <span className="gradient-text"> pricing</span>
                    </h2>
                    <p className="text-lg text-surface-200/50 max-w-2xl mx-auto">
                        Start for free, upgrade when you need more.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                    {plans.map((plan, index) => (
                        <motion.div
                            key={plan.name}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className={`relative rounded-2xl p-6 lg:p-8 ${plan.popular
                                    ? 'glass border-brand-500/30 shadow-xl shadow-brand-500/10'
                                    : 'glass'
                                }`}
                        >
                            {plan.popular && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                    <span className="inline-block px-4 py-1 rounded-full text-xs font-semibold gradient-bg text-white shadow-lg shadow-brand-500/25">
                                        Most Popular
                                    </span>
                                </div>
                            )}

                            <div className="mb-6">
                                <h3 className="text-lg font-semibold text-white mb-1">{plan.name}</h3>
                                <p className="text-sm text-surface-200/50">{plan.description}</p>
                            </div>

                            <div className="mb-6">
                                <span className="text-4xl font-bold text-white">{plan.price}</span>
                                <span className="text-sm text-surface-200/50 ml-1">{plan.period}</span>
                            </div>

                            <button
                                className={`w-full rounded-xl py-3 text-sm font-medium transition-all mb-8 ${plan.popular
                                        ? 'gradient-bg text-white shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 hover:scale-[1.02] active:scale-[0.98]'
                                        : 'bg-white/5 text-white border border-white/10 hover:bg-white/10 hover:scale-[1.02] active:scale-[0.98]'
                                    }`}
                            >
                                {plan.cta}
                            </button>

                            <div className="space-y-3">
                                {plan.features.map((feature) => (
                                    <div key={feature} className="flex items-start gap-3">
                                        <svg className="h-5 w-5 text-success shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                        </svg>
                                        <span className="text-sm text-surface-200/70">{feature}</span>
                                    </div>
                                ))}
                                {plan.notIncluded.map((feature) => (
                                    <div key={feature} className="flex items-start gap-3">
                                        <svg className="h-5 w-5 text-surface-200/20 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        <span className="text-sm text-surface-200/30">{feature}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
