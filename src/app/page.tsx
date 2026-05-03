import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { Button } from '@/components/ui/Button'
import { ArrowRight, BarChart3, ShieldCheck, Brain, Zap, Users, TrendingUp } from 'lucide-react'

const FEATURES = [
  {
    icon: Brain,
    title: 'AI Advisor',
    description: 'Ask any financial planning question. Get compliance-aware answers with regulatory citations built in.',
  },
  {
    icon: ShieldCheck,
    title: 'Compliance-first',
    description: 'Every output auto-includes FINRA, SEC, and Reg BI disclaimers. Stay protected, always.',
  },
  {
    icon: BarChart3,
    title: 'Monte Carlo projections',
    description: 'Run thousands of simulations in seconds. Show clients probability-based retirement outcomes.',
  },
  {
    icon: TrendingUp,
    title: 'Tax-loss harvesting',
    description: 'Automatically surface harvest opportunities with wash-sale rule guidance built in.',
  },
  {
    icon: Users,
    title: 'Client management',
    description: 'Unified client profiles with portfolio allocation, risk scoring, and review tracking.',
  },
  {
    icon: Zap,
    title: 'Smart reports',
    description: 'Generate and email polished client reports in one click — with disclaimer auto-append.',
  },
]

const PLANS = [
  {
    name: 'Starter',
    price: '$149',
    period: '/mo',
    description: 'Solo advisors and CFPs',
    features: ['AI Advisor chat', 'Retirement calculator', 'Monte Carlo (500 runs)', 'Email reports (100/mo)'],
    cta: 'Start free trial',
    highlighted: false,
  },
  {
    name: 'Professional',
    price: '$399',
    period: '/mo',
    description: 'Growing RIA firms',
    features: ['Everything in Starter', 'Tax-loss harvesting', 'Full compliance center', 'Unlimited reports', 'Document analysis'],
    cta: 'Start free trial',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: '$999',
    period: '/mo',
    description: 'Large broker-dealers',
    features: ['Everything in Pro', 'White-label branding', 'Salesforce CRM integration', 'SSO / Active Directory', 'SLA + priority support'],
    cta: 'Contact sales',
    highlighted: false,
  },
]

function HeroIllustration() {
  return (
    <div className="hidden lg:block w-96 flex-shrink-0">
      <svg viewBox="0 0 400 320" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="20" y="20" width="360" height="280" rx="16" fill="white" stroke="#E2E8F0" strokeWidth="1.5"/>
        <rect x="20" y="20" width="360" height="52" rx="16" fill="#1E3A8A"/>
        <rect x="20" y="52" width="360" height="20" fill="#1E3A8A"/>
        <circle cx="52" cy="46" r="12" fill="#3B82F6" opacity="0.5"/>
        <rect x="72" y="38" width="80" height="8" rx="4" fill="white" opacity="0.6"/>
        <rect x="72" y="50" width="50" height="6" rx="3" fill="white" opacity="0.3"/>
        <circle cx="100" cy="140" r="45" fill="#EFF6FF" stroke="#BFDBFE" strokeWidth="2"/>
        <circle cx="100" cy="140" r="35" fill="none" stroke="#2563EB" strokeWidth="6" strokeDasharray="176 44" strokeLinecap="round" transform="rotate(-90 100 140)"/>
        <text x="100" y="135" textAnchor="middle" fill="#1E3A8A" fontSize="18" fontWeight="bold">78</text>
        <text x="100" y="150" textAnchor="middle" fill="#64748B" fontSize="8">Health Score</text>
        <rect x="175" y="100" width="60" height="8" rx="4" fill="#EFF6FF"/>
        <rect x="175" y="100" width="48" height="8" rx="4" fill="#2563EB"/>
        <text x="175" y="95" fill="#64748B" fontSize="7">Protect</text>
        <text x="238" y="109" fill="#1E3A8A" fontSize="7" fontWeight="bold">80%</text>
        <rect x="175" y="125" width="60" height="8" rx="4" fill="#EFF6FF"/>
        <rect x="175" y="125" width="36" height="8" rx="4" fill="#F59E0B"/>
        <text x="175" y="120" fill="#64748B" fontSize="7">Grow</text>
        <text x="238" y="134" fill="#1E3A8A" fontSize="7" fontWeight="bold">60%</text>
        <rect x="175" y="150" width="60" height="8" rx="4" fill="#EFF6FF"/>
        <rect x="175" y="150" width="24" height="8" rx="4" fill="#EF4444"/>
        <text x="175" y="145" fill="#64748B" fontSize="7">Legacy</text>
        <text x="238" y="159" fill="#1E3A8A" fontSize="7" fontWeight="bold">40%</text>
        <rect x="40" y="210" width="320" height="1" fill="#F1F5F9"/>
        <circle cx="60" cy="233" r="14" fill="#DBEAFE"/>
        <text x="60" y="237" textAnchor="middle" fill="#2563EB" fontSize="9" fontWeight="bold">JD</text>
        <rect x="82" y="225" width="80" height="7" rx="3" fill="#E2E8F0"/>
        <rect x="82" y="236" width="50" height="5" rx="2" fill="#F1F5F9"/>
        <rect x="290" y="226" width="50" height="14" rx="7" fill="#DCFCE7"/>
        <text x="315" y="236" textAnchor="middle" fill="#16A34A" fontSize="7">Active</text>
        <rect x="40" y="255" width="320" height="1" fill="#F1F5F9"/>
        <circle cx="60" cy="270" r="14" fill="#FEF3C7"/>
        <text x="60" y="274" textAnchor="middle" fill="#D97706" fontSize="9" fontWeight="bold">SR</text>
        <rect x="82" y="262" width="70" height="7" rx="3" fill="#E2E8F0"/>
        <rect x="82" y="273" width="45" height="5" rx="2" fill="#F1F5F9"/>
        <rect x="290" y="263" width="50" height="14" rx="7" fill="#FEF3C7"/>
        <text x="315" y="273" textAnchor="middle" fill="#D97706" fontSize="7">Review</text>
        <rect x="260" y="80" width="100" height="36" rx="10" fill="#2563EB" opacity="0.95"/>
        <text x="310" y="96" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">AI Powered</text>
        <text x="310" y="108" textAnchor="middle" fill="white" opacity="0.8" fontSize="7">FINRA Compliant</text>
      </svg>
    </div>
  )
}

export default function HomePage() {
  return (
    <div className="bg-white">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-white via-blue-50/50 to-slate-50">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(37,99,235,0.08),transparent_60%)]" />
        <div className="absolute inset-0 opacity-5" style={{backgroundImage:'radial-gradient(circle,#1E40AF 1px,transparent 1px)',backgroundSize:'24px 24px'}} />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 lg:py-36 flex items-center gap-12">
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-brand-600 text-xs font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
              Now in early access — 14-day free trial
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight text-gray-900">
              AI-Powered Financial Planning<br />
              <span className="text-brand-600">for Modern Advisors</span>
            </h1>
            <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              WealthPlanrAI combines artificial intelligence with compliance-first financial planning —
              helping advisors assess clients, identify gaps, and deliver personalized plans in minutes.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link href="/assessment">
                <Button size="lg" className="w-full sm:w-auto">
                  Start free assessment <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="#features">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                  See how it works
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-xs text-gray-500">No credit card required · 14-day free trial · Cancel anytime</p>
          </div>
          <HeroIllustration />
        </div>
      </section>

      {/* Social proof strip */}
      <div className="bg-gray-50 border-y border-gray-200 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4 text-sm text-gray-500">
            <span className="font-medium text-gray-700">Trusted by advisors at</span>
            {['Raymond James', 'LPL Financial', 'Ameriprise', 'Edward Jones'].map(name => (
              <span key={name} className="font-semibold text-gray-400">{name}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <section id="features" className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">Everything your practice needs</h2>
            <p className="mt-3 text-gray-500 max-w-xl mx-auto">
              Purpose-built for registered investment advisors. Compliance-first, AI-powered, and ready on day one.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map(f => {
              const Icon = f.icon
              return (
                <div key={f.title} className="p-6 rounded-xl border border-gray-100 hover:border-brand-200 hover:-translate-y-1 hover:shadow-md transition-all duration-200">
                  <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-brand-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Compliance callout */}
      <section className="bg-brand-600 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="text-white text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-2 mb-3">
              <ShieldCheck className="w-5 h-5" />
              <span className="text-sm font-semibold uppercase tracking-wide opacity-80">Compliance built in</span>
            </div>
            <h2 className="text-2xl font-bold">SEC · FINRA · Reg BI · CFPB</h2>
            <p className="mt-2 text-brand-100 max-w-xl">
              Every AI response, client report, and generated document automatically includes
              required regulatory disclaimers — reviewed and updated quarterly.
            </p>
          </div>
          <Link href="/pricing" className="flex-shrink-0">
            <Button size="lg" className="bg-white text-brand-700 hover:bg-brand-50">
              Get started free <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-[#F8FAFC]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">Simple, transparent pricing</h2>
            <p className="mt-3 text-gray-500">All plans include a 14-day free trial. No credit card required.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {PLANS.map(plan => (
              <div
                key={plan.name}
                className={`rounded-2xl p-8 border ${
                  plan.highlighted
                    ? 'bg-brand-600 text-white border-brand-700 shadow-xl scale-105'
                    : 'bg-white text-gray-900 border-gray-200'
                }`}
              >
                {plan.highlighted && (
                  <div className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-white/20 text-white text-xs font-medium mb-4">
                    Most popular
                  </div>
                )}
                <h3 className="font-bold text-lg">{plan.name}</h3>
                <p className={`text-sm mt-1 ${plan.highlighted ? 'text-brand-200' : 'text-gray-500'}`}>
                  {plan.description}
                </p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className={plan.highlighted ? 'text-brand-200' : 'text-gray-500'}>{plan.period}</span>
                </div>
                <ul className="mt-6 space-y-3">
                  {plan.features.map(f => (
                    <li key={f} className={`flex items-start gap-2 text-sm ${plan.highlighted ? 'text-brand-100' : 'text-gray-600'}`}>
                      <span className={`mt-0.5 flex-shrink-0 ${plan.highlighted ? 'text-brand-200' : 'text-brand-500'}`}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/pricing" className="block mt-8">
                  <Button
                    className={`w-full ${plan.highlighted ? 'bg-white text-brand-700 hover:bg-brand-50 border-0' : ''}`}
                    variant={plan.highlighted ? 'secondary' : 'primary'}
                    size="md"
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-gray-400 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-md bg-brand-600 flex items-center justify-center">
                <BarChart3 className="w-3.5 h-3.5 text-white" />
              </span>
              <span className="font-semibold text-white">WealthPlanrAI</span>
            </div>
            <p className="text-xs text-center">
              © {new Date().getFullYear()} WealthPlanrAI Inc. For licensed financial advisors only.
              SEC · FINRA · Reg BI compliant.
            </p>
            <div className="flex gap-6 text-sm">
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="/terms"   className="hover:text-white transition-colors">Terms</Link>
              <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
