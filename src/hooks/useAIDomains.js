import { useCallback, useEffect, useRef, useState } from 'react';
import { aiDomainsAPI } from '../api/services';
import { readApiError } from '../utils/apiError';

const LOADING_STAGES = {
  start: 'Understanding your idea...',
  ai: 'Generating premium brands...',
  domains: 'Checking domain availability...',
  done: 'Preparing results...',
};
const REVEAL_BATCH_SIZE = 4;
const REVEAL_INTERVAL_MS = 100;

function getGuestSession() {
  if (typeof window === 'undefined') return '';
  const key = 'cobrother_guest_session';
  let value = window.localStorage.getItem(key);
  if (!value) {
    value = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    window.localStorage.setItem(key, value);
  }
  return value;
}

function extractError(error) {
  return readApiError(
    error,
    'Could not generate AI domains right now. Please try again in a moment.',
    { context: 'ai' },
  );
}

export default function useAIDomains() {
  const [results, setResults] = useState([]);
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [cached, setCached] = useState(false);
  const requestIdRef = useRef(0);
  const progressTimerRef = useRef(null);
  const revealTimerRef = useRef(null);

  const clearTimers = useCallback(() => {
    window.clearInterval(progressTimerRef.current);
    window.clearInterval(revealTimerRef.current);
  }, []);

  const startProgress = useCallback(() => {
    setProgress(0);
    setStage(LOADING_STAGES.start);
    progressTimerRef.current = window.setInterval(() => {
      setProgress((prev) => {
        if (prev < 70) return Math.min(70, prev + 7);
        return prev;
      });
    }, 40);
  }, []);

  const beginAiWait = useCallback(() => {
    setStage(LOADING_STAGES.ai);
    window.clearInterval(progressTimerRef.current);
    progressTimerRef.current = window.setInterval(() => {
      setProgress((prev) => {
        if (prev < 90) return Math.min(90, prev + 0.6);
        return prev;
      });
    }, 120);
  }, []);

  const completeProgress = useCallback(() => {
    window.clearInterval(progressTimerRef.current);
    setStage(LOADING_STAGES.done);
    setProgress(100);
  }, []);

  const revealResults = useCallback((items, currentRequestId) => {
    window.clearInterval(revealTimerRef.current);
    if (!items.length) {
      setResults([]);
      setLoading(false);
      return;
    }
    const firstCount = Math.min(REVEAL_BATCH_SIZE, items.length);
    setResults(items.slice(0, firstCount));
    setLoading(false);
    if (firstCount >= items.length) {
      return;
    }

    let visibleCount = firstCount;
    revealTimerRef.current = window.setInterval(() => {
      if (requestIdRef.current !== currentRequestId) {
        window.clearInterval(revealTimerRef.current);
        return;
      }
      visibleCount = Math.min(visibleCount + REVEAL_BATCH_SIZE, items.length);
      setResults(items.slice(0, visibleCount));
      if (visibleCount >= items.length) {
        window.clearInterval(revealTimerRef.current);
      }
    }, REVEAL_INTERVAL_MS);
  }, []);

  const reset = useCallback(() => {
    requestIdRef.current += 1;
    clearTimers();
    setResults([]);
    setCategory('');
    setLoading(false);
    setStage('');
    setProgress(0);
    setError('');
    setCached(false);
  }, [clearTimers]);

  const generate = useCallback(async (idea) => {
    const cleanIdea = String(idea || '').trim();
    if (cleanIdea.length < 3) {
      setError('Enter a business idea with at least 3 characters.');
      return;
    }

    const currentRequestId = requestIdRef.current + 1;
    requestIdRef.current = currentRequestId;
    clearTimers();
    setLoading(true);
    setError('');
    setResults([]);
    setCategory('');
    setCached(false);
    startProgress();

    try {
      beginAiWait();
      const { data } = await aiDomainsAPI.generate(cleanIdea, {
        headers: { 'X-Guest-Session': getGuestSession() },
      });
      if (requestIdRef.current !== currentRequestId) return;

      const nextResults = Array.isArray(data?.results) ? data.results : [];

      setCategory(data?.category || '');
      setCached(Boolean(data?.cached));
      completeProgress();
      if (requestIdRef.current !== currentRequestId) return;
      revealResults(nextResults, currentRequestId);
    } catch (err) {
      if (requestIdRef.current !== currentRequestId) return;
      clearTimers();
      if (import.meta.env.DEV) {
        console.error('[AI Domains] request failed:', err?.response?.data || err);
      }
      setError(extractError(err));
      setResults([]);
      setStage('');
      setProgress(0);
      setLoading(false);
    }
  }, [beginAiWait, clearTimers, completeProgress, revealResults, startProgress]);

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  return {
    results,
    category,
    loading,
    stage,
    progress,
    error,
    cached,
    generate,
    reset,
  };
}
