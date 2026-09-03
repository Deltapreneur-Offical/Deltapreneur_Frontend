import { useState } from 'react';
import { motion } from '../utils/simpleMotion';
import { useNavigate } from 'react-router-dom';
import { Trash2, FileText, Mail, Clock, ShieldAlert } from 'lucide-react';
import TopNavbar from '../components/common/TopNavbar';
import HomeNavbar from '../components/common/HomeNavbar';
import HomeFooter from '../components/common/HomeFooter';
import BackToHomeButton from '../components/common/BackToHomeButton';

export default function DataDeletionPage() {
  const navigate = useNavigate();
  const [openDropdown, setOpenDropdown] = useState(null);
  const lastUpdated = '10th July 2026';

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <TopNavbar homeMobileMenu />
      <HomeNavbar openDropdown={openDropdown} setOpenDropdown={setOpenDropdown} navigate={navigate} />

      <section className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-900">
        <div className="pointer-events-none absolute inset-0">
          <motion.div
            className="absolute -top-24 left-1/4 h-72 sm:h-80 md:h-96 w-72 sm:w-80 md:w-96 rounded-full bg-red-300/20 blur-3xl"
            animate={{ x: [0, 40, -20, 0], y: [0, -20, 20, 0], scale: [1, 1.1, 0.95, 1] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-transparent to-slate-50/80" />
        </div>

        <div className="relative mx-auto max-w-7xl px-2 sm:px-4 md:px-6 lg:px-8">
          <div className="pt-4 sm:pt-6 mb-4 sm:mb-6">
            <BackToHomeButton />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-3xl text-center mb-10"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-red-200/80 bg-red-50 px-4 py-2 mb-5 shadow-sm">
              <Trash2 className="h-4 w-4 text-red-600" />
              <span className="text-sm font-semibold text-red-800">Facebook Platform Compliance</span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-4 font-display text-slate-900">
              <span className="text-slate-800">Data Deletion </span>
              <span className="text-red-600">Instructions</span>
            </h1>

            <p className="text-xs sm:text-sm md:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
              If you have signed up or logged in to Deltapreneur using your Facebook account, you can request the deletion of your personal data at any time.
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-xs sm:text-sm text-slate-600">
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
                <Clock className="h-4 w-4 text-slate-500" /> Last Updated: <span className="font-medium text-slate-900">{lastUpdated}</span>
              </span>
            </div>
          </motion.div>

          <div className="mx-auto max-w-3xl mb-20">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl shadow-slate-200/40 space-y-8">
              
              <section>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-red-50 rounded-lg text-red-600">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900">Requesting full Account & Profile deletion:</h2>
                </div>
                <p className="text-slate-600 text-sm sm:text-base leading-relaxed mb-4">
                  If you also wish to permanently delete all profile records, ventures, domains, or other data stored in the Deltapreneur application:
                </p>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Mail className="h-4 w-4 text-indigo-600" />
                      <h3 className="text-sm font-semibold text-slate-900">Contact Support Team</h3>
                    </div>
                    <p className="text-sm text-slate-600">Send an email request from your registered email address.</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="text-sm font-semibold text-slate-900">support@hubregistrar.com</span>
                    <p className="text-xs text-slate-500 mt-1">Resolution within 24-48 business hours</p>
                  </div>
                </div>
              </section>

            </div>
          </div>
        </div>
      </section>

      <HomeFooter />
    </div>
  );
}
