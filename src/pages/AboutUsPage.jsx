import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useInView } from '../utils/simpleMotion';
import {
  ArrowRight, Rocket, Palette, Users, Cpu, Globe,
  CheckCircle, Zap, Target, Shield, TrendingUp,
  ChevronRight, Building2, Sparkles,
} from 'lucide-react';
import TopNavbar from '../components/common/TopNavbar';
import HomeNavbar from '../components/common/HomeNavbar';
import HomeFooter from '../components/common/HomeFooter';
import BrandWordmark from '../components/common/BrandWordmark';

/* ─────────────────────────────────────────────────────────────
   Scroll-reveal wrapper
───────────────────────────────────────────────────────────── */
function Reveal({ children, delay = 0, direction = 'up', className = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  const variants = {
    up:    { hidden: { opacity: 0, y: 28 },  visible: { opacity: 1, y: 0 } },
    left:  { hidden: { opacity: 0, x: -28 }, visible: { opacity: 1, x: 0 } },
    right: { hidden: { opacity: 0, x: 28 },  visible: { opacity: 1, x: 0 } },
    fade:  { hidden: { opacity: 0 },          visible: { opacity: 1 } },
  };

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={variants[direction]}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* Label chip */
function Chip({ children }) {
  return (
    <span className="cb-body inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50 px-3.5 py-1 text-[0.68rem] font-bold uppercase tracking-[.18em] text-[#9440dd]">
      {children}
    </span>
  );
}

/* Section divider */
function Divider() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Page component
───────────────────────────────────────────────────────────── */
export default function AboutUsPage() {
  const navigate = useNavigate();
  const [openDropdown, setOpenDropdown] = useState(null);

  return (
    <div className="min-h-screen bg-white cb-body">

      {/* ── Fonts & global token styles ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=Instrument+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap');

        .cb-display { font-family: 'Bricolage Grotesque', sans-serif; }
        .cb-body    { font-family: 'Instrument Sans', sans-serif; }

        /* Glow helpers */
        .cb-glow-center  { background: radial-gradient(ellipse 70% 55% at 50% 40%, rgba(37,99,235,.06), transparent); }
        .cb-glow-blue-tl { background: radial-gradient(circle at 0% 0%, rgba(37,99,235,.10), transparent 65%); }
        .cb-glow-teal-br { background: radial-gradient(circle at 100% 100%, rgba(20,184,166,.08), transparent 65%); }

        /* Dot grid texture */
        .cb-dots { background-image: radial-gradient(circle, rgba(15,23,42,.06) 1px, transparent 1px); background-size: 28px 28px; }

        /* Card hover */
        .cb-hover {
          transition: transform .22s ease, box-shadow .22s ease, border-color .22s ease;
        }
        .cb-hover:hover {
          transform: translateY(-4px);
          box-shadow: 0 18px 50px -10px rgba(15,23,42,.10);
          border-color: rgba(148,64,221,.22);
        }

        /* Shimmer underline on hero word */
        .cb-accent-word {
          position: relative;
          display: inline;
          background: linear-gradient(135deg, #9440dd, #7c3aed);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* Monospaced numbers */
        .cb-mono { font-variant-numeric: tabular-nums; }
      `}</style>

      <TopNavbar homeMobileMenu />
      <HomeNavbar
        openDropdown={openDropdown}
        setOpenDropdown={setOpenDropdown}
        navigate={navigate}
        showBack
      />

      {/* ══════════════════════════════════════════════════════
          § 1  HERO
      ══════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-white px-4 sm:px-6 lg:px-8 pt-20 pb-24 sm:pt-28 sm:pb-32">

        {/* Background atmosphere */}
        <div className="pointer-events-none absolute inset-0 cb-glow-center" />
        <div className="pointer-events-none absolute -top-40 -right-40 h-[520px] w-[520px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(37,99,235,.08), transparent 65%)' }} />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(20,184,166,.07), transparent 65%)' }} />
        <div className="pointer-events-none absolute inset-0 cb-dots opacity-100" />

        <div className="relative max-w-5xl mx-auto">

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <Chip>About Us</Chip>
          </motion.div>

          {/* H1 */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            className="cb-display mt-6 text-5xl sm:text-6xl md:text-7xl font-extrabold text-slate-900 leading-[1.04] tracking-tight"
          >
            We don't just build businesses.{' '}
            <span className="cb-accent-word">We build creators.</span>
          </motion.h1>

          {/* Sub */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: 0.22 }}
            className="mt-7 max-w-2xl text-lg sm:text-xl text-slate-600 leading-relaxed"
          >
            <BrandWordmark className="h-6 w-auto align-middle inline-block mr-1.5" inline alt="CoBrother" />{' '}
            is a collaboration-driven ecosystem for founders, entrepreneurs, and
            organizations who are serious about challenging the status quo — equipped with
            the systems, brand, and technology to back it up.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.34 }}
            className="mt-10 flex flex-wrap items-center gap-4"
          >
            <motion.a
              href="/join-form"
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}
              className="cb-display inline-flex items-center gap-2 rounded-xl bg-[#9440dd] px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 hover:bg-[#7c3aed] transition-colors no-underline"
            >
              Join CoBrother <ArrowRight className="h-4 w-4" />
            </motion.a>
            <motion.a
              href="/contact"
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-7 py-3.5 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all no-underline"
            >
              Contact Us <ChevronRight className="h-4 w-4" />
            </motion.a>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-16 pt-10 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-8"
          >
            {[
              { value: '4',  label: 'Core Pillars' },
              { value: '1',  label: 'Unified Ecosystem' },
              { value: '∞',  label: 'Startup Potential' },
              { value: '0',  label: 'Middlemen' },
            ].map(({ value, label }) => (
              <div key={label}>
                <p className="cb-display cb-mono text-4xl sm:text-5xl font-black text-slate-900">{value}</p>
                <p className="mt-1.5 text-sm text-slate-500 font-medium">{label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <Divider />

      {/* ══════════════════════════════════════════════════════
          § 2  WHY WE EXIST
      ══════════════════════════════════════════════════════ */}
      <section className="relative px-4 sm:px-6 lg:px-8 py-20 sm:py-28 bg-white overflow-hidden">
        <div className="pointer-events-none absolute top-0 right-0 h-96 w-96 rounded-full"
          style={{ background: 'radial-gradient(circle at 100% 0%, rgba(20,184,166,.08), transparent 65%)' }} />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-24 items-center">

          {/* Text */}
          <div>
            <Reveal delay={0}><Chip>Why We Exist</Chip></Reveal>
            <Reveal delay={0.08}>
              <h2 className="cb-display mt-5 text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 leading-tight">
                The current ecosystem is broken — and we're here to fix it.
              </h2>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed">
                Great ideas fail every day — not because founders lack capability, but
                because the support around them does. Technology feels inaccessible.
                Domain strategy lacks direction. And meaningful collaboration is rare.
              </p>
            </Reveal>
            <Reveal delay={0.24}>
              <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
                <BrandWordmark className="h-5 w-auto align-middle inline-block mr-1" inline alt="CoBrother" />{' '}
                exists to bridge these gaps with one unified, execution-first
                ecosystem featuring Domains, Ventures, Creators, and Technology — so founders spend their energy on growth, not setup.
              </p>
            </Reveal>
          </div>

          {/* Problem cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: Zap,     title: 'Ideas fail without execution',  desc: 'Great concepts die without the right systems to move them forward.',        color: 'blue'    },
              { icon: Cpu,     title: 'Technology is too complex',     desc: "Builders shouldn't need a tech team just to access powerful tools.",        color: 'teal'    },
              { icon: Palette, title: 'Domain strategy lacks direction',      desc: 'A strong online presence without clear domain strategy is missed opportunity.',               color: 'violet'  },
              { icon: Users,   title: 'Collaboration is underused',    desc: 'The best growth happens together. We build the space for that.',            color: 'emerald' },
            ].map(({ icon: Icon, title, desc, color }, i) => {
              const c = {
                blue:    { bg: 'bg-purple-50', border: 'border-purple-100', icon: 'text-[#9440dd]', iconBg: 'bg-purple-100' },
                teal:    { bg: 'bg-purple-50', border: 'border-purple-100', icon: 'text-[#9440dd]', iconBg: 'bg-purple-100' },
                violet:  { bg: 'bg-purple-50', border: 'border-purple-100', icon: 'text-[#9440dd]', iconBg: 'bg-purple-100' },
                emerald: { bg: 'bg-purple-50', border: 'border-purple-100', icon: 'text-[#9440dd]', iconBg: 'bg-purple-100' },
              }[color];
              return (
                <Reveal key={title} delay={i * 0.09}>
                  <motion.div
                    whileHover={{ y: -4, boxShadow: '0 16px 40px -8px rgba(15,23,42,.10)' }}
                    transition={{ duration: 0.2 }}
                    className={`rounded-2xl border ${c.border} ${c.bg} p-5 h-full`}
                  >
                    <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${c.iconBg} mb-4`}>
                      <Icon className={`h-4 w-4 ${c.icon}`} strokeWidth={2.5} />
                    </div>
                    <h3 className="cb-display text-sm font-bold text-slate-900 mb-1.5">{title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{desc}</p>
                  </motion.div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <Divider />

      {/* ══════════════════════════════════════════════════════
          § 3  VISION & MISSION  (dark section)
      ══════════════════════════════════════════════════════ */}
      <section className="relative px-4 sm:px-6 lg:px-8 py-20 sm:py-28 bg-slate-950 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-[.04] cb-dots"
          style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(37,99,235,.09), transparent)' }} />

        <div className="relative max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <Reveal><Chip>Our Purpose</Chip></Reveal>
            <Reveal delay={0.1}>
            <h2 className="cb-display mt-5 text-3xl sm:text-4xl md:text-5xl font-bold text-[#f3e8ff] leading-tight">
                Vision & Mission
              </h2>
            </Reveal>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Vision */}
            <Reveal direction="left" delay={0.1}>
              <motion.div
                whileHover={{ y: -4, borderColor: 'rgba(255,255,255,.18)' }}
                transition={{ duration: 0.22 }}
                className="relative rounded-2xl border border-white/10 bg-white/5 p-9 h-full overflow-hidden"
              >
                <div className="absolute top-0 right-0 h-48 w-48 rounded-bl-full"
                  style={{ background: 'radial-gradient(circle at 100% 0%, rgba(37,99,235,.14), transparent 65%)' }} />
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/20 border border-purple-500/30 mb-6">
                  <Globe className="h-5 w-5 text-purple-300" strokeWidth={2} />
                </div>
                <h3 className="cb-display text-xl font-bold text-white mb-4">Our Vision</h3>
                <p className="text-slate-300 leading-relaxed">
                  To create a disruption-driven ecosystem where businesses don't just
                  compete — they redefine industries. A world where every ambitious
                  founder has what they need to build something truly different.
                </p>
              </motion.div>
            </Reveal>

            {/* Mission */}
            <Reveal direction="right" delay={0.1}>
              <motion.div
                whileHover={{ y: -4, borderColor: 'rgba(255,255,255,.18)' }}
                transition={{ duration: 0.22 }}
                className="relative rounded-2xl border border-white/10 bg-white/5 p-9 h-full overflow-hidden"
              >
                <div className="absolute top-0 right-0 h-48 w-48 rounded-bl-full"
                  style={{ background: 'radial-gradient(circle at 100% 0%, rgba(20,184,166,.12), transparent 65%)' }} />
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/20 border border-purple-500/30 mb-6">
                  <Target className="h-5 w-5 text-purple-300" strokeWidth={2} />
                </div>
                <h3 className="cb-display text-xl font-bold text-white mb-4">Our Mission</h3>
                <p className="text-slate-300 leading-relaxed mb-6">
                  To equip entrepreneurs with everything needed to move from idea to
                  scale — fast, confidently, and sustainably.
                </p>
                <ul className="space-y-3">
                  {[
                    'Execution-ready systems from day one',
                    'A strong, scalable brand identity',
                    'Accessible, ready-to-use technology',
                    'A collaborative growth environment',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-slate-300">
                      <CheckCircle className="h-4 w-4 text-purple-300 mt-0.5 flex-shrink-0" strokeWidth={2.5} />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          § 4  FOUR CORE PILLARS
      ══════════════════════════════════════════════════════ */}
      <section className="relative px-4 sm:px-6 lg:px-8 py-20 sm:py-28 bg-white overflow-hidden">
        <div className="pointer-events-none absolute inset-0 cb-glow-center" />

        <div className="relative max-w-7xl mx-auto">
          <div className="max-w-2xl mb-14">
            <Reveal><Chip>What We Do</Chip></Reveal>
            <Reveal delay={0.1}>
              <h2 className="cb-display mt-5 text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 leading-tight">
                Four pillars. One ecosystem.
              </h2>
            </Reveal>
            <Reveal delay={0.18}>
              <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
                Most companies offer services. Some offer tools. We deliver outcomes — by
                combining all four growth drivers into one unified platform.
              </p>
            </Reveal>
          </div>

          <div className="space-y-5">
            {[
              {
                num: '01', icon: Rocket, title: 'Venture',
                sub: 'Turning ideas into scalable businesses',
                body: 'Ideas are plentiful. Execution is rare. Venture is our startup studio and co-creation arm — where we build alongside founders from the ground up. We provide ready-to-deploy infrastructure, scalable business models, and hands-on support from concept to market launch.',
                points: ['Build from the ground up', 'Ready-to-deploy infrastructure', 'Scalable business models', 'Concept to launch support'],
                accent: { border: 'border-purple-100', num: 'text-purple-300', chip: 'bg-[#9440dd]', icon: 'text-[#9440dd]', iconBg: 'bg-purple-50 border-purple-100', check: 'text-[#9440dd]', ptBg: 'bg-purple-50/70 border-purple-100' },
              },
              {
                num: '02', icon: Palette, title: 'Domains',
                sub: 'Your domain, your identity',
                body: "In today's digital market, a strong domain is your foundation. Our Domains pillar helps you register, manage, and leverage domains to build a distinct, market-ready presence — while CoBrother powers the engine behind the scenes. You leverage our ecosystem. You own your domain — completely.",
                points: ['Premium domain registration', 'Domain management systems', 'Identity-ready domains', 'Complete ownership & control'],
                accent: { border: 'border-purple-100', num: 'text-purple-300', chip: 'bg-[#9440dd]', icon: 'text-[#9440dd]', iconBg: 'bg-purple-50 border-purple-100', check: 'text-[#9440dd]', ptBg: 'bg-purple-50/70 border-purple-100' },
              },
              {
                num: '03', icon: Users, title: 'Creators',
                sub: 'A community that challenges the norm',
                body: "Growth doesn't come from comfort zones. Creators is our community of builders, innovators, and forward-thinkers. They collaborate, share real opportunities, and solve genuine problems together. This isn't just a network — it's a movement.",
                points: ['Challenge conventional models', 'Collaborate on real problems', 'Share insights & resources', 'Be part of a movement'],
                accent: { border: 'border-purple-100', num: 'text-purple-300', chip: 'bg-[#9440dd]', icon: 'text-[#9440dd]', iconBg: 'bg-purple-50 border-purple-100', check: 'text-[#9440dd]', ptBg: 'bg-purple-50/70 border-purple-100' },
              },
              {
                num: '04', icon: Cpu, title: 'Technology',
                sub: 'Delivered directly to your doorstep',
                body: "Technology should be an advantage, not a barrier. We bring ready-to-use, scalable tech directly to businesses — eliminating the need to build from scratch. Pre-built systems, plug-and-play infrastructure, and customizable solutions. You focus on growth. We handle the foundation.",
                points: ['Pre-built systems on day one', 'Fully customizable solutions', 'Plug-and-play infrastructure', 'No deep technical knowledge needed'],
                accent: { border: 'border-purple-100', num: 'text-purple-300', chip: 'bg-[#9440dd]', icon: 'text-[#9440dd]', iconBg: 'bg-purple-50 border-purple-100', check: 'text-[#9440dd]', ptBg: 'bg-purple-50/70 border-purple-100' },
              },
            ].map(({ num, icon: Icon, title, sub, body, points, accent }, i) => (
              <Reveal key={num} delay={i * 0.07}>
                <motion.div
                  whileHover={{ y: -3, boxShadow: '0 20px 50px -10px rgba(15,23,42,.09)' }}
                  transition={{ duration: 0.2 }}
                  className={`rounded-2xl border ${accent.border} bg-white p-7 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start`}
                >
                  {/* Number + label */}
                  <div className="lg:col-span-3 flex items-start gap-5 lg:flex-col lg:gap-3">
                    <span className={`cb-display cb-mono text-[5rem] sm:text-[6rem] font-black ${accent.num} leading-none select-none opacity-50`}>
                      {num}
                    </span>
                    <div className="flex flex-col gap-3 mt-2 lg:mt-0">
                      <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl border ${accent.iconBg}`}>
                        <Icon className={`h-5 w-5 ${accent.icon}`} strokeWidth={2} />
                      </div>
                      <span className={`inline-block rounded-full ${accent.chip} px-3 py-1 text-[.62rem] font-bold uppercase tracking-[.14em] text-white`}>
                        {title}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="lg:col-span-9">
                    <h3 className="cb-display text-2xl sm:text-3xl font-bold text-slate-900 mb-1">{title}</h3>
                    <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-5">{sub}</p>
                    <p className="text-base sm:text-lg text-slate-600 leading-relaxed mb-7">{body}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {points.map((pt) => (
                        <div key={pt} className={`flex items-center gap-2.5 rounded-xl border ${accent.ptBg} px-4 py-3`}>
                          <CheckCircle className={`h-4 w-4 ${accent.check} flex-shrink-0`} strokeWidth={2.5} />
                          <span className="text-sm font-medium text-slate-700">{pt}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <Divider />

      {/* ══════════════════════════════════════════════════════
          § 5  WHAT MAKES US DIFFERENT
      ══════════════════════════════════════════════════════ */}
      <section className="relative px-4 sm:px-6 lg:px-8 py-20 sm:py-28 bg-white overflow-hidden">
        <div className="pointer-events-none absolute top-0 left-0 h-96 w-96 rounded-full"
          style={{ background: 'radial-gradient(circle at 0% 0%, rgba(37,99,235,.07), transparent 65%)' }} />

        <div className="relative max-w-7xl mx-auto">
          <div className="max-w-2xl mb-14">
            <Reveal><Chip>Our Difference</Chip></Reveal>
            <Reveal delay={0.1}>
              <h2 className="cb-display mt-5 text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 leading-tight">
                What makes{' '}
                <BrandWordmark className="h-9 sm:h-11 w-auto align-middle inline-block mx-1" inline alt="CoBrother" />{' '}
                different?
              </h2>
            </Reveal>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Building2,   title: 'We deliver outcomes, not just services',   desc: "Other companies hand you tools and walk away. We stay in — combining venture building, domains, and tech into one unified outcome." },
              { icon: Zap,         title: 'Speed is a core feature',                  desc: 'Our execution-first approach means founders launch faster, iterate sooner, and grow without getting stuck in setup mode.' },
              { icon: Shield,      title: 'You own everything',                       desc: 'Your brand, your IP, your business. We power the infrastructure — you keep complete ownership and control.' },
              { icon: Globe,       title: "Built for India's builders",               desc: 'Designed for the grassroots entrepreneur, the first-time founder, and the scaling startup — not just the well-funded few.' },
              { icon: TrendingUp,  title: 'Collaboration as a growth lever',          desc: "The Creators community isn't a side feature. It's a core growth driver — real connections, real opportunities." },
              { icon: Sparkles,    title: 'Technology without the complexity',        desc: "Done-For-Me tech that works from day one. No lengthy setup, no steep learning curve — just results." },
            ].map(({ icon: Icon, title, desc }, i) => (
              <Reveal key={title} delay={i * 0.07}>
                <motion.div
                  whileHover={{ y: -6, boxShadow: '0 24px 56px -10px rgba(15,23,42,.14)', borderColor: 'rgba(148,64,221,.34)' }}
                  transition={{ duration: 0.2 }}
                  className="rounded-3xl border-2 border-purple-200 bg-white p-8 sm:p-10 h-full min-h-[270px] group shadow-md"
                >
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 border border-slate-200 mb-7 group-hover:bg-purple-50 group-hover:border-purple-200 transition-colors duration-200">
                    <Icon className="h-7 w-7 text-slate-500 group-hover:text-[#9440dd] transition-colors duration-200" strokeWidth={2} />
                  </div>
                  <h3 className="cb-display text-xl sm:text-2xl font-bold text-slate-900 mb-4 leading-snug">{title}</h3>
                  <p className="text-lg text-slate-600 leading-relaxed">{desc}</p>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <Divider />

      {/* ══════════════════════════════════════════════════════
          § 6  WHO IT'S FOR
      ══════════════════════════════════════════════════════ */}
      <section className="relative px-4 sm:px-6 lg:px-8 py-20 sm:py-28 bg-slate-50 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-[.025]"
          style={{ backgroundImage: 'radial-gradient(circle, #0f172a 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

        <div className="relative max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-24 items-center">

          {/* Text */}
          <div>
            <Reveal direction="left"><Chip>Who It's For</Chip></Reveal>
            <Reveal direction="left" delay={0.1}>
              <h2 className="cb-display mt-5 text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 leading-tight">
                If you're building something meaningful, you belong here.
              </h2>
            </Reveal>
            <Reveal direction="left" delay={0.18}>
              <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed">
                <BrandWordmark className="h-5 w-auto align-middle inline-block mr-1" inline alt="CoBrother" />{' '}
                is built for people who are serious about execution — whether
                you're just starting out or ready to scale what you've already built.
              </p>
            </Reveal>
          </div>

          {/* Audience cards */}
          <div className="space-y-3">
            {[
              { label: 'Startup founders',           desc: 'With a clear vision and the drive to execute it.' },
              { label: 'Aspiring entrepreneurs',     desc: 'Ready to take their first serious step forward.' },
              { label: 'Digital-first businesses',   desc: 'Looking to grow smarter with better tools and systems.' },
              { label: 'Creators and innovators',    desc: 'Who want to turn their craft into a scalable brand.' },
              { label: 'Scaling organizations',      desc: 'That need a technology partner, not just a vendor.' },
            ].map(({ label, desc }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, x: 24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: i * 0.08 }}
                whileHover={{ x: 4, borderColor: 'rgba(148,64,221,.25)', backgroundColor: '#fff' }}
                className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-colors cursor-default group"
              >
                <div className="h-8 w-8 flex-shrink-0 rounded-full bg-purple-50 border border-purple-100 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                  <CheckCircle className="h-4 w-4 text-[#9440dd]" strokeWidth={2.5} />
                </div>
                <div>
                  <p className="cb-display text-sm font-bold text-slate-900">{label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Divider />

      {/* ══════════════════════════════════════════════════════
          § 8  THE BIGGER VISION
      ══════════════════════════════════════════════════════ */}
      <section className="relative px-4 sm:px-6 lg:px-8 py-20 sm:py-28 bg-slate-50 overflow-hidden">
        <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full"
          style={{ background: 'radial-gradient(circle at 100% 0%, rgba(37,99,235,.07), transparent 65%)' }} />

        <div className="relative max-w-5xl mx-auto">
          <Reveal><Chip>The Big Picture</Chip></Reveal>
          <Reveal delay={0.1}>
            <h2 className="cb-display mt-5 text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 leading-tight max-w-3xl">
              We're not building a company.{' '}
              <span className="text-[#9440dd]">We're building a generation.</span>
            </h2>
          </Reveal>
          <div className="mt-7 space-y-4 max-w-2xl">
            <Reveal delay={0.16}>
              <p className="text-base sm:text-xl text-slate-600 leading-relaxed">
                Our goal is to produce a generation of creators — businesses and
                individuals who don't just follow markets, but reshape them. People who
                build with purpose, move with speed, and grow without artificial limits.
              </p>
            </Reveal>
            <Reveal delay={0.22}>
              <p className="text-base sm:text-xl text-slate-600 leading-relaxed">
                That's the bigger vision behind every product, every community, and
                every line of code we write.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          § 9  CTA
      ══════════════════════════════════════════════════════ */}
      <section className="relative px-4 sm:px-6 lg:px-8 py-20 sm:py-28 bg-slate-950 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-[.04]"
          style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(37,99,235,.11), transparent)' }} />
        <div className="pointer-events-none absolute -left-20 top-1/2 -translate-y-1/2 h-80 w-80 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(20,184,166,.07), transparent 65%)' }} />

        <div className="relative max-w-3xl mx-auto text-center">
          <Reveal><Chip>Get Started</Chip></Reveal>
          <Reveal delay={0.1}>
            <h2 className="cb-display mt-6 text-4xl sm:text-5xl md:text-6xl font-extrabold text-white leading-tight">
              Ready to build differently?
            </h2>
          </Reveal>
          <Reveal delay={0.18}>
            <p className="mt-5 text-slate-400 text-base sm:text-lg leading-relaxed">
              Join{' '}
              <BrandWordmark
                className="h-5 w-auto align-middle inline-block mx-1 brightness-0 invert opacity-70"
                inline alt="CoBrother"
              />.
              Access technology. Build faster. Disrupt with confidence.
            </p>
          </Reveal>
          <Reveal delay={0.26}>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <motion.a
                href="/join-form"
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                className="cb-display inline-flex items-center justify-center gap-2.5 rounded-xl bg-[#9440dd] px-9 py-4 text-base font-semibold text-white shadow-2xl shadow-purple-900/40 hover:bg-[#7c3aed] transition-colors no-underline w-full sm:w-auto"
              >
                Join CoBrother <ArrowRight className="h-4 w-4" />
              </motion.a>
              <motion.a
                href="/contact"
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-9 py-4 text-base font-semibold text-white/80 hover:bg-white/10 hover:border-white/25 hover:text-white transition-all no-underline w-full sm:w-auto"
              >
                Get in Touch <ChevronRight className="h-4 w-4" />
              </motion.a>
            </div>
          </Reveal>
        </div>
      </section>

      <HomeFooter />
    </div>
  );
}
