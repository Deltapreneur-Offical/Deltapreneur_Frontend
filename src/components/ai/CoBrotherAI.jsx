import { AnimatePresence, motion } from 'framer-motion';
import {
  Bot,
  Bookmark,
  BriefcaseBusiness,
  Check,
  Clock3,
  Copy,
  Cpu,
  Download,
  ExternalLink,
  Gavel,
  Globe2,
  History,
  Loader2,
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  Moon,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Send,
  Share2,
  Sparkles,
  StopCircle,
  Sun,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { cobrotherAIAPI, streamCoBrotherAI } from '../../api/ai';
import broAILogo from '../../assets/Cobrother_Profile.png';
import { useAuth } from '../../context/AuthContext';

const MODES = [
  { id: 'domains', label: 'Domains', icon: Globe2 },
  { id: 'ventures', label: 'Ventures', icon: BriefcaseBusiness },
  { id: 'technologies', label: 'Technologies', icon: Cpu },
  { id: 'auctions', label: 'Auctions', icon: Gavel },
];

const MODE_TO_API = {
  domains: 'broker',
  ventures: 'founder',
  technologies: 'marketplace',
  auctions: 'auction',
};

const QUICK_STARTS_BY_MODE = {
  domains: [
    {
      icon: Globe2,
      text: 'How do I buy a domain?',
      prompt: 'How do I buy a premium domain on CoBrother?',
    },
    {
      icon: Globe2,
      text: 'How do I list my domain?',
      prompt: 'Explain how to list my domain on CoBrother.',
    },
  ],
  ventures: [
    {
      icon: BriefcaseBusiness,
      text: 'How do I list a venture?',
      prompt: 'Explain how to list my venture on CoBrother.',
    },
    {
      icon: BriefcaseBusiness,
      text: 'Evaluate venture opportunities',
      prompt: 'Help me evaluate venture listings and what to compare before investing or partnering.',
    },
  ],
  technologies: [
    {
      icon: Cpu,
      text: 'Find technology listings',
      prompt: 'Show me software and technology listings on CoBrother and explain how to evaluate them.',
    },
    {
      icon: Cpu,
      text: 'How do I buy software?',
      prompt: 'How do I buy or acquire a technology listing on CoBrother?',
    },
  ],
  auctions: [
    {
      icon: Gavel,
      text: 'Show active domain auctions',
      prompt: 'Show me active domain auctions and explain what I should compare before bidding.',
    },
    {
      icon: Gavel,
      text: 'Auction bidding tips',
      prompt: 'What should I know before placing a bid in a CoBrother domain auction?',
    },
  ],
};

const EMPTY_SECTIONS = {
  domains: 'Compare domain names, pricing signals, SEO value, and acquisition steps.',
  ventures: 'Evaluate venture listings, founder fit, monetization, and negotiation questions.',
  technologies: 'Discover software listings, compare tech assets, and plan acquisition or licensing steps.',
  auctions: 'Prepare bids, compare auctions, estimate time pressure, and plan next actions.',
};

const STORAGE_KEY = 'bro-ai-state-v2';

function nowLabel() {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date());
}

function newId(prefix = 'msg') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function markdownToHtml(value = '') {
  const escaped = escapeHtml(value);
  const withCode = escaped.replace(/```([\s\S]*?)```/g, (_, code) => {
    return `<pre class="my-3 overflow-x-auto rounded-xl border border-black/10 bg-black/5 p-3 text-xs leading-relaxed dark:border-white/10 dark:bg-white/5"><code>${code.trim()}</code></pre>`;
  });

  return withCode
    .replace(/^### (.*)$/gm, '<h4 class="mt-4 text-sm font-semibold">$1</h4>')
    .replace(/^## (.*)$/gm, '<h3 class="mt-4 text-base font-semibold">$1</h3>')
    .replace(/^# (.*)$/gm, '<h2 class="mt-4 text-lg font-semibold">$1</h2>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="rounded bg-black/10 px-1 py-0.5 text-[0.85em] dark:bg-white/10">$1</code>')
    .replace(/^\s*[-*] (.*)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul class="my-3 list-disc space-y-1 pl-5">$1</ul>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br />')
    .replace(/^(.+)$/s, '<p>$1</p>');
}

function MarkdownMessage({ content }) {
  return (
    <div
      className="prose prose-sm max-w-none leading-6 prose-p:my-0 prose-ul:my-2 prose-li:my-1"
      dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }}
    />
  );
}

function normalizeList(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.items)) return value.data.items;
  return [];
}

function formatMoney(value) {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: numeric > 999 ? 0 : 2,
  }).format(numeric);
}

function formatTimeLeft(value) {
  if (!value) return null;
  const end = new Date(value).getTime();
  if (!Number.isFinite(end)) return String(value);
  const diff = end - Date.now();
  if (diff <= 0) return 'Ended';
  const hours = Math.floor(diff / 36e5);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h left`;
  return `${Math.max(1, hours)}h left`;
}

function transcriptMarkdown(messages) {
  return messages
    .map((message) => {
      const role = message.role === 'user' ? 'You' : 'Bro AI';
      return `## ${role} - ${message.createdAt || ''}\n\n${message.content || ''}`;
    })
    .join('\n\n---\n\n');
}

function downloadText(filename, content, type = 'text/markdown;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function extractMarketplaceItems(metadata) {
  return normalizeList(
    metadata?.marketplace ||
      metadata?.marketplacePreview ||
      metadata?.results ||
      metadata?.data ||
      metadata?.items,
  ).slice(0, 4);
}

function iconForItem(item) {
  const type = String(item?.type || item?.category || '').toLowerCase();
  if (type.includes('auction')) return Gavel;
  if (type.includes('venture')) return BriefcaseBusiness;
  return Globe2;
}

function BroAIIcon({ isDark, className }) {
  return (
    <img
      src={broAILogo}
      alt=""
      className={`rounded-full object-contain ${isDark ? 'brightness-0 invert drop-shadow-[0_0_6px_rgba(212,175,55,0.35)]' : ''} ${className}`}
    />
  );
}

function BubbleActions({ content, isDark }) {
  const [copied, setCopied] = useState(false);

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(content || '');
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copyMessage}
      className={`mt-3 inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition ${
        isDark
          ? 'border-white/10 text-slate-300 hover:border-[#D4AF37]/40 hover:text-white'
          : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-900'
      }`}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function MarketplaceCards({ items, onSave, isDark }) {
  if (!items.length) return null;

  return (
    <div className="mt-3 grid gap-2">
      {items.map((item, index) => {
        const Icon = iconForItem(item);
        const price =
          formatMoney(item?.price || item?.currentBid || item?.askingPrice || item?.valuation) ||
          item?.priceLabel;
        const timeLeft = formatTimeLeft(item?.endsAt || item?.endTime || item?.auctionEnd);
        const title = item?.title || item?.name || item?.domain || `Marketplace item ${index + 1}`;
        const href = item?.url || item?.href || item?.link;

        return (
          <div
            key={`${title}-${index}`}
            className={`rounded-2xl border p-3 transition ${
              isDark
                ? 'border-white/10 bg-white/[0.03] hover:border-[#D4AF37]/35'
                : 'border-slate-200 bg-white hover:border-[var(--cobrother-brand-green)] hover:shadow-sm'
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  isDark ? 'bg-[#D4AF37]/15 text-[#D4AF37]' : 'bg-[var(--cobrother-brand-green-soft)] text-[var(--cobrother-brand-green)]'
                }`}
              >
                <Icon className="h-4.5 w-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className={`truncate text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-950'}`}>
                  {title}
                </p>
                <div className={`mt-1 flex flex-wrap gap-2 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {price && (
                    <span className="inline-flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5" />
                      {price}
                    </span>
                  )}
                  {timeLeft && (
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3.5 w-3.5" />
                      {timeLeft}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => onSave(item)}
                  className={`flex h-9 w-9 items-center justify-center rounded-xl border transition ${
                    isDark
                      ? 'border-white/10 text-slate-300 hover:border-[#D4AF37]/50 hover:text-[#D4AF37]'
                      : 'border-slate-200 text-slate-500 hover:border-[var(--cobrother-brand-green)] hover:text-[var(--cobrother-brand-green)]'
                  }`}
                  aria-label="Save item"
                >
                  <Bookmark className="h-4 w-4" />
                </button>
                {href && (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className={`flex h-9 w-9 items-center justify-center rounded-xl border transition ${
                      isDark
                        ? 'border-white/10 text-slate-300 hover:border-[#D4AF37]/50 hover:text-[#D4AF37]'
                        : 'border-slate-200 text-slate-500 hover:border-[var(--cobrother-brand-green)] hover:text-[var(--cobrother-brand-green)]'
                    }`}
                    aria-label="Open item"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LoadingBubble({ isDark }) {
  return (
    <div className="flex items-start gap-3">
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
          isDark ? 'border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#D4AF37]' : 'border-slate-200 bg-slate-50 text-[var(--cobrother-brand-green)]'
        }`}
      >
        <Bot className="h-4 w-4" />
      </span>
      <div
        className={`max-w-[85%] rounded-2xl border px-4 py-3 ${
          isDark ? 'border-white/10 bg-[#111827] text-slate-200' : 'border-slate-200 bg-white text-slate-700'
        }`}
      >
        <div className="flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Thinking through the marketplace signals...
        </div>
      </div>
    </div>
  );
}

export default function CoBrotherAI() {
  const { hasAccessToken } = useAuth();
  const [open, setOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [mode, setMode] = useState('domains');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState('');
  const [theme, setTheme] = useState('light');
  const [moreOpen, setMoreOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [marketplacePreview, setMarketplacePreview] = useState([]);
  const [autoScroll, setAutoScroll] = useState(true);

  const listRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const recognitionRef = useRef(null);

  const isDark = theme === 'dark';
  const quickStarts = QUICK_STARTS_BY_MODE[mode] || QUICK_STARTS_BY_MODE.domains;
  const marketplaceItems = useMemo(
    () => extractMarketplaceItems(metadata).concat(marketplacePreview).slice(0, 4),
    [metadata, marketplacePreview],
  );

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (typeof saved.voiceOutputEnabled === 'boolean') {
        setVoiceOutputEnabled(saved.voiceOutputEnabled);
      }
    } catch {}
    setTheme('light');
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ voiceOutputEnabled }));
  }, [voiceOutputEnabled]);

  useEffect(() => {
    if (!open || !hasAccessToken) return;
    let mounted = true;
    cobrotherAIAPI
      .getChats()
      .then(({ data }) => {
        if (!mounted) return;
        setHistory(normalizeList(data).slice(0, 8));
      })
      .catch(() => {
        if (mounted) setHistory([]);
      });
    return () => {
      mounted = false;
    };
  }, [open, hasAccessToken, conversationId]);

  useEffect(() => {
    if (!open || !input.trim() || input.trim().length < 3) {
      setMarketplacePreview([]);
      return;
    }

    const timer = window.setTimeout(() => {
      cobrotherAIAPI
        .searchMarketplace(input.trim())
        .then(({ data }) => setMarketplacePreview(normalizeList(data).slice(0, 3)))
        .catch(() => setMarketplacePreview([]));
    }, 450);

    return () => window.clearTimeout(timer);
  }, [open, input]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onstart = () => {
      setIsListening(true);
      setVoiceNotice('Listening...');
    };
    recognition.onerror = () => {
      setIsListening(false);
      setVoiceNotice('Voice input was interrupted.');
    };
    recognition.onend = () => {
      setIsListening(false);
      window.setTimeout(() => setVoiceNotice(''), 1600);
    };
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || '')
        .join(' ');
      setInput(transcript.trim());
    };

    recognitionRef.current = recognition;
    setVoiceSupported(true);

    return () => recognition.abort();
  }, []);

  useEffect(() => {
    if (!autoScroll || !listRef.current) return;
    listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isStreaming, autoScroll]);

  function onScroll() {
    const node = listRef.current;
    if (!node) return;
    const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
    setAutoScroll(distance < 120);
  }

  function stopSpeaking() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }

  function speak(content) {
    if (!voiceOutputEnabled || !('speechSynthesis' in window) || !content) return;
    stopSpeaking();
    const utterance = new SpeechSynthesisUtterance(content.replace(/[#*_`]/g, ''));
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }

  async function saveItem(item) {
    if (!hasAccessToken) {
      setVoiceNotice('Sign in to save marketplace items.');
      return;
    }
    try {
      await cobrotherAIAPI.saveFavorite({ item });
      setVoiceNotice('Saved to your AI favorites.');
    } catch {
      setVoiceNotice('Could not save this item.');
    } finally {
      window.setTimeout(() => setVoiceNotice(''), 1800);
    }
  }

  async function submit(nextPrompt = input) {
    const prompt = nextPrompt.trim();
    if (!prompt || isStreaming) return;

    setOpen(true);
    setInput('');
    setMoreOpen(false);
    setAutoScroll(true);

    const userMessage = {
      id: newId('user'),
      role: 'user',
      content: prompt,
      createdAt: nowLabel(),
    };
    const assistantId = newId('assistant');
    const assistantMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      createdAt: nowLabel(),
    };

    const nextMessages = [...messages, userMessage, assistantMessage];
    setMessages(nextMessages);
    setIsStreaming(true);
    setMetadata(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamCoBrotherAI(
        {
          message: prompt,
          mode: MODE_TO_API[mode] || 'marketplace',
          conversation_id: conversationId || undefined,
          voice: voiceOutputEnabled,
        },
        {
          signal: controller.signal,
          onEvent: (event, data) => {
            const nextConversationId = data?.conversation_id || data?.conversationId || data?.id;
            if (event === 'conversation' || nextConversationId) {
              setConversationId(nextConversationId);
            }

            if (event === 'metadata' || data?.metadata) {
              setMetadata((current) => ({ ...(current || {}), ...(data.metadata || data) }));
            }

            if (event === 'error') {
              throw new Error(data?.message || 'Bro AI hit a response error.');
            }

            if (event === 'done') {
              if (data?.conversation_id || data?.conversationId) {
                setConversationId(data.conversation_id || data.conversationId);
              }
              if (data?.metadata) setMetadata(data.metadata);
              return;
            }

            const token = data?.delta || data?.content || data?.text || '';
            if (!token) return;
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantId
                  ? { ...message, content: `${message.content}${token}` }
                  : message,
              ),
            );
          },
        },
      );

      setMessages((current) => {
        const assistant = current.find((message) => message.id === assistantId);
        if (assistant?.content) speak(assistant.content);
        return current;
      });
    } catch (error) {
      if (controller.signal.aborted) return;
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                content:
                  error?.message ||
                  'Bro AI is unavailable right now. Please try again in a moment.',
              }
            : message,
        ),
      );
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
      inputRef.current?.focus();
    }
  }

  function stopGeneration() {
    abortRef.current?.abort();
    setIsStreaming(false);
  }

  function startFresh() {
    stopGeneration();
    stopSpeaking();
    setMessages([]);
    setConversationId(null);
    setMetadata(null);
    setMarketplacePreview([]);
    setInput('');
    setMoreOpen(false);
  }

  async function loadChat(chat) {
    const chatMessages = normalizeList(chat?.messages || chat?.conversation || chat?.data?.messages);
    setMessages(
      chatMessages.map((message) => ({
        id: message.id || newId('history'),
        role: message.role === 'user' ? 'user' : 'assistant',
        content: message.content || message.message || '',
        createdAt: message.createdAt || nowLabel(),
      })),
    );
    setConversationId(chat.id || chat.conversationId || null);
    setMoreOpen(false);
    setOpen(true);
  }

  function toggleListen() {
    if (!voiceSupported || !recognitionRef.current) {
      setVoiceNotice('Voice input is not supported in this browser.');
      window.setTimeout(() => setVoiceNotice(''), 1800);
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      return;
    }

    try {
      recognitionRef.current.start();
    } catch {
      setVoiceNotice('Voice input is already starting.');
    }
  }

  function exportMarkdown() {
    if (!messages.length) return;
    downloadText('bro-ai-conversation.md', transcriptMarkdown(messages));
    setMoreOpen(false);
  }

  function exportPdf() {
    if (!messages.length) return;
    const html = transcriptMarkdown(messages)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replace(/\n/g, '<br />');
    const popup = window.open('', '_blank', 'noopener,noreferrer');
    if (!popup) return;
    popup.document.write(`
      <html>
        <head><title>Bro AI Conversation</title></head>
        <body style="font-family: Inter, system-ui, sans-serif; line-height: 1.6; padding: 32px;">${html}</body>
      </html>
    `);
    popup.document.close();
    popup.print();
    setMoreOpen(false);
  }

  async function shareConversation() {
    const text = transcriptMarkdown(messages);
    if (!text) return;
    if (navigator.share) {
      await navigator.share({ title: 'Bro AI conversation', text });
    } else {
      await navigator.clipboard.writeText(text);
      setVoiceNotice('Conversation copied.');
      window.setTimeout(() => setVoiceNotice(''), 1400);
    }
    setMoreOpen(false);
  }

  const panelClass = fullscreen
    ? 'fixed inset-x-3 bottom-3 top-[calc(var(--home-nav-stack-height,0px)+0.75rem)] z-[1100] sm:inset-x-5 sm:bottom-5 sm:top-[calc(var(--home-nav-stack-height,0px)+1.25rem)]'
    : 'fixed inset-x-3 top-[calc(var(--home-nav-stack-height,0px)+0.75rem)] bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-[1100] sm:inset-x-auto sm:right-5 sm:w-[min(520px,calc(100vw-2.5rem))]';

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        className={`fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-[90] flex h-14 w-14 items-center justify-center rounded-2xl border shadow-2xl transition sm:h-16 sm:w-16 ${
          isDark
            ? 'border-[#D4AF37]/35 bg-[#0B0F14] text-[#D4AF37] hover:border-[#D4AF37]/70'
            : 'border-slate-200 bg-white text-[var(--cobrother-brand-green)] hover:border-[var(--cobrother-brand-green)]'
        } ${open ? 'pointer-events-none scale-95 opacity-0' : 'opacity-100'}`}
        aria-label="Open Bro AI"
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.96 }}
      >
        <BroAIIcon isDark={isDark} className="h-9 w-9 sm:h-10 sm:w-10" />
        <span className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-[var(--cobrother-brand-green)]" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.section
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className={`${panelClass} flex overflow-hidden rounded-3xl border ${
              isDark
                ? 'border-white/10 bg-[#0B0F14] text-white shadow-[0_24px_80px_rgba(0,0,0,0.55)]'
                : 'border-slate-200 bg-white text-slate-950 shadow-[0_24px_80px_rgba(15,23,42,0.18)]'
            }`}
            role="dialog"
            aria-label="Bro AI marketplace assistant"
          >
            <div className="flex min-h-0 w-full flex-col">
              <header
                className={`shrink-0 border-b px-3 py-3 sm:px-4 ${
                  isDark ? 'border-white/10 bg-[#0F172A]/80' : 'border-slate-200 bg-white/95'
                }`}
              >
                <div className="flex items-center gap-3">
                  <BroAIIcon isDark={isDark} className="h-10 w-10" />
                  <div className="min-w-0 flex-1">
                    <h2
                      className={`truncate text-[24px] font-bold leading-7 tracking-[-0.02em] ${
                        isDark ? 'text-white' : 'text-slate-950'
                      }`}
                      style={{ fontFamily: '"Plus Jakarta Sans", Inter, system-ui, sans-serif' }}
                    >
                      Bro
                    </h2>
                    <p className={`truncate text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      AI Assistant
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={startFresh}
                      className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                        isDark ? 'text-slate-300 hover:bg-white/10 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950'
                      }`}
                      aria-label="Start new chat"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setVoiceOutputEnabled((value) => !value)}
                      className={`hidden h-9 w-9 items-center justify-center rounded-xl transition sm:flex ${
                        voiceOutputEnabled
                          ? isDark
                            ? 'bg-[#D4AF37]/15 text-[#D4AF37]'
                            : 'bg-[var(--cobrother-brand-green-soft)] text-[var(--cobrother-brand-green)]'
                          : isDark
                            ? 'text-slate-300 hover:bg-white/10 hover:text-white'
                            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950'
                      }`}
                      aria-label="Toggle voice output"
                    >
                      {voiceOutputEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFullscreen((value) => !value)}
                      className={`hidden h-9 w-9 items-center justify-center rounded-xl transition sm:flex ${
                        isDark ? 'text-slate-300 hover:bg-white/10 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950'
                      }`}
                      aria-label={fullscreen ? 'Exit full screen' : 'Expand Bro AI'}
                    >
                      {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </button>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setMoreOpen((value) => !value)}
                        className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                          isDark ? 'text-slate-300 hover:bg-white/10 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950'
                        }`}
                        aria-label="Open Bro AI menu"
                        aria-expanded={moreOpen}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      <AnimatePresence>
                        {moreOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.15 }}
                            className={`absolute right-0 top-11 z-20 w-64 overflow-hidden rounded-2xl border p-2 shadow-2xl ${
                              isDark ? 'border-white/10 bg-[#111827] text-slate-200' : 'border-slate-200 bg-white text-slate-700'
                            }`}
                          >
                            <button type="button" onClick={() => setTheme(isDark ? 'light' : 'dark')} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm transition hover:bg-black/5 dark:hover:bg-white/10">
                              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                              {isDark ? 'Use light mode' : 'Use dark mode'}
                            </button>
                            <button type="button" onClick={() => setVoiceOutputEnabled((value) => !value)} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm transition hover:bg-black/5 dark:hover:bg-white/10 sm:hidden">
                              {voiceOutputEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                              {voiceOutputEnabled ? 'Voice output on' : 'Voice output off'}
                            </button>
                            <button type="button" onClick={() => setFullscreen((value) => !value)} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm transition hover:bg-black/5 dark:hover:bg-white/10 sm:hidden">
                              {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                              {fullscreen ? 'Exit full screen' : 'Expand'}
                            </button>
                            <button type="button" onClick={exportMarkdown} disabled={!messages.length} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm transition hover:bg-black/5 disabled:opacity-40 dark:hover:bg-white/10">
                              <Download className="h-4 w-4" />
                              Export markdown
                            </button>
                            <button type="button" onClick={exportPdf} disabled={!messages.length} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm transition hover:bg-black/5 disabled:opacity-40 dark:hover:bg-white/10">
                              <Download className="h-4 w-4" />
                              Export PDF
                            </button>
                            <button type="button" onClick={shareConversation} disabled={!messages.length} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm transition hover:bg-black/5 disabled:opacity-40 dark:hover:bg-white/10">
                              <Share2 className="h-4 w-4" />
                              Share or copy
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        stopGeneration();
                        stopSpeaking();
                        setOpen(false);
                      }}
                      className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                        isDark ? 'text-slate-300 hover:bg-white/10 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950'
                      }`}
                      aria-label="Close Bro AI"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <nav className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Bro AI modes">
                  {MODES.map((item) => {
                    const Icon = item.icon;
                    const active = mode === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setMode(item.id)}
                        className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl border px-4 text-sm font-medium transition duration-200 ${
                          active
                            ? isDark
                              ? 'border-[#D4AF37]/50 bg-[#D4AF37]/15 text-[#D4AF37] shadow-[0_0_24px_rgba(212,175,55,0.12)]'
                              : 'border-[var(--cobrother-brand-green)] bg-[var(--cobrother-brand-green-soft)] text-[var(--cobrother-brand-green)]'
                            : isDark
                              ? 'border-white/10 text-slate-300 hover:border-white/20 hover:bg-white/5'
                              : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </button>
                    );
                  })}
                </nav>
              </header>

              <main
                ref={listRef}
                onScroll={onScroll}
                className={`min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-4 ${
                  isDark ? 'bg-[#0B0F14]' : 'bg-slate-50/70'
                }`}
              >
                {messages.length === 0 ? (
                  <div className="mx-auto flex min-h-full max-w-md flex-col justify-center py-2">
                    <div className="text-center">
                      <BroAIIcon isDark={isDark} className="mx-auto h-14 w-14" />
                      <h3
                        className={`mt-4 text-[26px] font-semibold leading-tight tracking-[-0.02em] ${
                          isDark ? 'text-white' : 'text-slate-950'
                        }`}
                      >
                        Welcome to CoBrother
                      </h3>
                      <p className={`mx-auto mt-2 max-w-sm text-sm leading-6 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        {EMPTY_SECTIONS[mode]} Get focused guidance without leaving the marketplace.
                      </p>
                    </div>
                    <div className="mt-6 grid gap-2">
                      {quickStarts.map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.prompt}
                            type="button"
                            onClick={() => submit(item.prompt)}
                            className={`group flex min-h-11 items-center gap-3 rounded-2xl border p-3 text-left text-sm font-medium transition ${
                              isDark
                                ? 'border-white/10 bg-[#111827] text-slate-100 hover:border-[#D4AF37]/40 hover:bg-[#151f2f]'
                                : 'border-slate-200 bg-white text-slate-800 hover:border-[var(--cobrother-brand-green)] hover:shadow-sm'
                            }`}
                          >
                            <span
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${
                                isDark ? 'bg-[#D4AF37]/15 text-[#D4AF37]' : 'bg-[var(--cobrother-brand-green-soft)] text-[var(--cobrother-brand-green)]'
                              }`}
                            >
                              <Icon className="h-4.5 w-4.5" />
                            </span>
                            <span className="flex-1">{item.text}</span>
                            <Send className={`h-4 w-4 opacity-0 transition group-hover:opacity-100 ${isDark ? 'text-[#D4AF37]' : 'text-[var(--cobrother-brand-green)]'}`} />
                          </button>
                        );
                      })}
                    </div>
                    {history.length > 0 && (
                      <div className="mt-5">
                        <p className={`mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                          <History className="h-3.5 w-3.5" />
                          Recent chats
                        </p>
                        <div className="grid gap-2">
                          {history.slice(0, 3).map((chat, index) => (
                            <button
                              key={chat.id || index}
                              type="button"
                              onClick={() => loadChat(chat)}
                              className={`min-h-11 rounded-xl border px-3 py-2 text-left text-sm transition ${
                                isDark
                                  ? 'border-white/10 text-slate-300 hover:border-white/20 hover:bg-white/5'
                                  : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-white'
                              }`}
                            >
                              {chat.title || chat.name || `Conversation ${index + 1}`}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-5">
                    {messages.map((message) => {
                      const isUser = message.role === 'user';
                      return (
                        <div key={message.id} className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                          {!isUser && (
                            <span
                              className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                                isDark ? 'border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#D4AF37]' : 'border-slate-200 bg-white text-[var(--cobrother-brand-green)]'
                              }`}
                            >
                              <Bot className="h-4 w-4" />
                            </span>
                          )}
                          <article
                            className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                              isUser
                                ? 'bg-[#D4AF37] text-[#111827]'
                                : isDark
                                  ? 'border border-white/10 bg-[#111827] text-slate-100'
                                  : 'border border-slate-200 bg-white text-slate-800'
                            }`}
                          >
                            <div className="mb-1 flex items-center gap-2">
                              <span className={`text-xs font-semibold ${isUser ? 'text-[#111827]' : isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                                {isUser ? 'You' : 'Bro AI'}
                              </span>
                              <span className={`text-[11px] ${isUser ? 'text-[#111827]/70' : isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                {message.createdAt}
                              </span>
                            </div>
                            {message.content ? (
                              <MarkdownMessage content={message.content} />
                            ) : (
                              <span className="inline-flex items-center gap-2 text-sm">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Drafting...
                              </span>
                            )}
                            {!isUser && message.content && <BubbleActions content={message.content} isDark={isDark} />}
                          </article>
                        </div>
                      );
                    })}
                    {isStreaming && <LoadingBubble isDark={isDark} />}
                    <MarketplaceCards items={marketplaceItems} onSave={saveItem} isDark={isDark} />
                  </div>
                )}
              </main>

              <footer
                className={`shrink-0 border-t p-3 sm:p-4 ${
                  isDark ? 'border-white/10 bg-[#0F172A]/95' : 'border-slate-200 bg-white'
                }`}
              >
                {(voiceNotice || isListening || isSpeaking) && (
                  <div className={`mb-2 flex items-center justify-between rounded-xl px-3 py-2 text-xs ${
                    isDark ? 'bg-white/5 text-slate-300' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <span>{voiceNotice || (isListening ? 'Listening...' : 'Speaking response...')}</span>
                    {isSpeaking && (
                      <button type="button" onClick={stopSpeaking} className="font-semibold">
                        Stop
                      </button>
                    )}
                  </div>
                )}
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    submit();
                  }}
                  className={`flex items-end gap-2 rounded-2xl border p-2 transition focus-within:ring-2 ${
                    isDark
                      ? 'border-white/10 bg-[#111827] focus-within:border-[#D4AF37]/45 focus-within:ring-[#D4AF37]/15'
                      : 'border-slate-200 bg-white focus-within:border-[var(--cobrother-brand-green)] focus-within:ring-[rgba(var(--cobrother-brand-green-rgb),0.16)]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={toggleListen}
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition ${
                      isListening
                        ? 'bg-[#D4AF37] text-[#111827]'
                        : isDark
                          ? 'text-slate-300 hover:bg-white/10 hover:text-white'
                          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950'
                    }`}
                    aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
                  >
                    {isListening ? <MicOff className="h-4.5 w-4.5" /> : <Mic className="h-4.5 w-4.5" />}
                  </button>
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        submit();
                      }
                    }}
                    rows={1}
                    placeholder="Ask about domains, ventures, technologies, auctions..."
                    className={`max-h-28 min-h-11 flex-1 resize-none border-0 bg-transparent px-1 py-2.5 text-sm leading-6 outline-none placeholder:opacity-100 ${
                      isDark ? 'text-white placeholder:text-slate-400' : 'text-slate-950 placeholder:text-slate-500'
                    }`}
                  />
                  {isStreaming ? (
                    <button
                      type="button"
                      onClick={stopGeneration}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-900 transition hover:bg-slate-300"
                      aria-label="Stop response"
                    >
                      <StopCircle className="h-5 w-5" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={!input.trim()}
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition disabled:cursor-not-allowed disabled:opacity-45 ${
                        isDark
                          ? 'bg-[#D4AF37] text-[#111827] hover:bg-[#E4C760]'
                          : 'bg-[var(--cobrother-brand-green)] text-white hover:brightness-95'
                      }`}
                      aria-label="Send message"
                    >
                      <Send className="h-4.5 w-4.5" />
                    </button>
                  )}
                </form>
                <div className={`mt-2 flex items-center justify-between gap-2 text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  <span className="truncate">
                    {hasAccessToken ? 'Responses can use your CoBrother context.' : 'Sign in for saved chats and favorites.'}
                  </span>
                  <button
                    type="button"
                    onClick={startFresh}
                    className={`inline-flex shrink-0 items-center gap-1 font-medium transition ${
                      isDark ? 'text-[#D4AF37] hover:text-[#E4C760]' : 'text-[var(--cobrother-brand-green)] hover:brightness-90'
                    }`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    New
                  </button>
                </div>
              </footer>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}
