import Stripe from 'stripe'

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
  return new Stripe(key, { apiVersion: '2026-04-22.dahlia' })
}

export const PLANS = {
  starter: {
    name: 'Starter',
    price: 149,
    priceId: process.env.STRIPE_STARTER_PRICE_ID!,
    description: 'For independent advisors getting started',
    features: [
      'Up to 25 client profiles',
      'Unlimited assessments',
      'AI risk scoring',
      'PDF report export',
      'Email support',
    ],
  },
  professional: {
    name: 'Professional',
    price: 399,
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
    description: 'For growing advisory practices',
    features: [
      'Up to 150 client profiles',
      'Unlimited assessments',
      'AI risk scoring + recommendations',
      'PDF & CSV export',
      'Advisor notes & tagging',
      'Priority support',
      'Custom branding',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    price: 999,
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID!,
    description: 'For large firms and teams',
    features: [
      'Unlimited client profiles',
      'Unlimited assessments',
      'Full AI suite',
      'Multi-advisor management',
      'Compliance audit trail',
      'SSO & SAML',
      'Dedicated account manager',
      'SLA guarantee',
    ],
  },
} as const

export type PlanKey = keyof typeof PLANS
