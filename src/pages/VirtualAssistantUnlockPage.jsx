import { useCallback, useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { virtualAssistantAPI } from '../api/services';
import { unwrapApiData } from '../utils/apiResponse';
import VaWorkspaceUnlockExperience from '../components/virtual-assistant/VaWorkspaceUnlockExperience';
import {
  getVaApplicationUnlockId,
  hasSeenVaUnlock,
  markVaUnlockSeen,
} from '../hooks/useVaUnlockSeen';

/**
 * Full-screen unlock cinematic. Eligibility still enforced by VirtualAssistantGuard.
 * If already seen → workspace. Marks seen on Enter / Skip / Back.
 */
function VirtualAssistantUnlockPage() {
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    virtualAssistantAPI
      .getMy()
      .then((res) => {
        if (!active) return;
        setApplication(unwrapApiData(res) || null);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const applicationId = getVaApplicationUnlockId(application);
  const alreadySeen = applicationId ? hasSeenVaUnlock(applicationId) : false;

  const completeAndGo = useCallback(
    (to, state) => {
      if (applicationId) markVaUnlockSeen(applicationId);
      navigate(to, { replace: true, state });
    },
    [applicationId, navigate]
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
      </div>
    );
  }

  if (error || !application) {
    return <Navigate to="/virtual-assistant/journey" replace />;
  }

  if (alreadySeen) {
    return <Navigate to="/virtual-assistant/workspace" replace />;
  }

  return (
    <VaWorkspaceUnlockExperience
      referenceNumber={application.referenceNumber}
      onEnter={() => completeAndGo('/virtual-assistant/workspace', { fromUnlock: true })}
      onSkip={() => completeAndGo('/virtual-assistant/workspace', { fromUnlock: true })}
      onBackToJourney={() => completeAndGo('/virtual-assistant/journey')}
    />
  );
}

export default VirtualAssistantUnlockPage;
