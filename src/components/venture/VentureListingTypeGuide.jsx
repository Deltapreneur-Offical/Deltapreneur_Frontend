import { useState } from 'react';

import { Link } from 'react-router-dom';

import { ChevronDown, ChevronUp, Rocket, Users } from 'lucide-react';



const STORAGE_KEY = 'ventureGuideDismissed';



const VENTURE_SCENARIOS = [

  'Selling your entire business',

  'Selling part of your company',

  'Raising investment from buyers',

  'Finding someone to acquire your business',

  'Exiting and transferring ownership',

];



const COVENTURE_SCENARIOS = [

  'Finding a business partner or co-founder',

  'Bringing in someone with skills you lack',

  'Sharing ownership with a strategic collaborator',

  'Growing the company together instead of selling out',

  'Building a business as a team',

];



export default function VentureListingTypeGuide() {

  const [dismissed, setDismissed] = useState(() => {

    if (typeof window === 'undefined') return false;

    return localStorage.getItem(STORAGE_KEY) === 'true';

  });

  const [expanded, setExpanded] = useState(() => !dismissed);



  const handleDismiss = () => {

    localStorage.setItem(STORAGE_KEY, 'true');

    setDismissed(true);

    setExpanded(false);

  };



  const handleShowAgain = () => {

    localStorage.removeItem(STORAGE_KEY);

    setDismissed(false);

    setExpanded(true);

  };



  if (dismissed && !expanded) {

    return (

      <button

        type="button"

        onClick={handleShowAgain}

        className="mb-6 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"

      >

        Show listing type guide

      </button>

    );

  }



  return (

    <div className="mb-6 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-white p-4 sm:p-5 shadow-sm">

      <div className="flex items-start justify-between gap-3 mb-4">

        <div>

          <h2 className="font-display text-lg font-bold text-gray-900 m-0">Which listing is right for you?</h2>

          <p className="text-sm text-gray-600 mt-1 m-0">

            Not sure where to start? Pick the path that matches what you want to achieve with your business.

          </p>

        </div>

        <div className="flex items-center gap-2 shrink-0">

          <button

            type="button"

            onClick={() => setExpanded((v) => !v)}

            className="p-2 rounded-lg text-gray-500 hover:bg-white/80 hover:text-gray-800 transition-colors"

            aria-label={expanded ? 'Collapse guide' : 'Expand guide'}

          >

            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}

          </button>

          <button

            type="button"

            onClick={handleDismiss}

            className="text-xs font-semibold text-gray-500 hover:text-gray-800 px-2 py-1 rounded-lg hover:bg-white/80 transition-colors"

          >

            Dismiss

          </button>

        </div>

      </div>



      {expanded && (

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div className="flex flex-col rounded-xl border border-indigo-200 bg-white p-5 shadow-sm">

            <div className="flex items-center gap-3 mb-3">

              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">

                <Rocket className="w-5 h-5" aria-hidden />

              </span>

              <div>

                <h3 className="font-display text-base font-bold text-gray-900 m-0">Venture Listing</h3>

                <p className="text-xs text-gray-500 m-0">Sell, raise, or find a buyer</p>

              </div>

            </div>

            <p className="text-sm text-gray-600 m-0 mb-3">

              Choose this if you want to sell your business, sell ownership, raise investment, or find a buyer to acquire you.

            </p>

            <ul className="text-sm text-gray-600 flex-1 m-0 mb-4 pl-4 space-y-1 list-disc">

              {VENTURE_SCENARIOS.map((item) => (

                <li key={item}>{item}</li>

              ))}

            </ul>

            <Link to="/ventures/new" className="btn-glow btn-glow-sm w-full text-center">

              List Venture

            </Link>

          </div>



          <div className="flex flex-col rounded-xl border border-purple-200 bg-white p-5 shadow-sm">

            <div className="flex items-center gap-3 mb-3">

              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600">

                <Users className="w-5 h-5" aria-hidden />

              </span>

              <div>

                <h3 className="font-display text-base font-bold text-gray-900 m-0">Co-Venture Listing</h3>

                <p className="text-xs text-gray-500 m-0">Find a partner to build with</p>

              </div>

            </div>

            <p className="text-sm text-gray-600 m-0 mb-3">

              Choose this if you want a business partner, co-founder, or collaborator to grow the company together — not sell out.

            </p>

            <ul className="text-sm text-gray-600 flex-1 m-0 mb-4 pl-4 space-y-1 list-disc">

              {COVENTURE_SCENARIOS.map((item) => (

                <li key={item}>{item}</li>

              ))}

            </ul>

            <Link to="/ventures/new?type=co-venture" className="btn-glow btn-glow-sm w-full text-center">

              List Co-Venture

            </Link>

          </div>

        </div>

      )}

    </div>

  );

}

