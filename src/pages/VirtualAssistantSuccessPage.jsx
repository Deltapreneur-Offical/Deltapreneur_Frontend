import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Check, Home, Mail } from 'lucide-react';
import TopNavbar from '../components/common/TopNavbar';
import HomeFooter from '../components/common/HomeFooter';
import { PageReveal } from '../components/motion/PageMotion';

const VirtualAssistantSuccessPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const referenceNumber = searchParams.get('ref');

  if (!referenceNumber) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
        <TopNavbar />
        <PageReveal className="flex items-center justify-center min-h-[70vh] px-4">
          <div className="max-w-lg w-full">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 sm:p-8 lg:p-10 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check size={40} className="text-green-600" />
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Application Submitted Successfully!
              </h1>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Thank you for applying to become a Virtual Assistant at CoBrother. We have received your application and our team will review it shortly.
              </p>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                <p className="text-sm font-semibold text-gray-700 mb-1">Your Application Reference Number</p>
                <p className="text-2xl font-bold font-display text-purple-700 tracking-wider">Check your email for the reference number</p>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-sm font-semibold text-gray-700 mb-1">Current Status</p>
                <p className="text-lg font-bold text-yellow-700">Pending Review</p>
              </div>
              <p className="text-sm text-gray-600 mb-8">
                Please save this reference number for future correspondence. A confirmation email has been sent to your email address.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => navigate('/')}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Home size={18} />
                  Back to Home
                </button>
                <button
                  onClick={() => navigate('/virtual-assistant')}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-purple-600 border border-purple-600 font-semibold rounded-lg hover:bg-purple-50 transition-colors"
                >
                  <Mail size={18} />
                  Submit Another Application
                </button>
              </div>
            </div>
          </div>
        </PageReveal>
        <HomeFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      <TopNavbar />
      <PageReveal className="flex items-center justify-center min-h-[70vh] px-4">
        <div className="max-w-lg w-full">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 sm:p-8 lg:p-10 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check size={40} className="text-green-600" />
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Application Submitted Successfully!
            </h1>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Thank you for applying to become a Virtual Assistant at CoBrother. We have received your application and our team will review it shortly.
            </p>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
              <p className="text-sm font-semibold text-gray-700 mb-1">Your Application Reference Number</p>
              <p className="text-2xl font-bold font-display text-purple-700 tracking-wider">{referenceNumber}</p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-sm font-semibold text-gray-700 mb-1">Current Status</p>
              <p className="text-lg font-bold text-yellow-700">Pending Review</p>
            </div>
            <p className="text-sm text-gray-600 mb-8">
              Please save this reference number for future correspondence. A confirmation email has been sent to your email address.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Home size={18} />
                Back to Home
              </button>
              <button
                onClick={() => navigate('/virtual-assistant')}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-purple-600 border border-purple-600 font-semibold rounded-lg hover:bg-purple-50 transition-colors"
              >
                <Mail size={18} />
                Submit Another Application
              </button>
            </div>
          </div>
        </div>
      </PageReveal>
      <HomeFooter />
    </div>
  );
};

export default VirtualAssistantSuccessPage;
