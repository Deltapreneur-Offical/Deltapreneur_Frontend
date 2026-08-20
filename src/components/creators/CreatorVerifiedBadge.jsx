import { useState, useRef, useEffect, useCallback } from "react";

/**
 * Premium circular green verified badge with a compact SaaS-style tooltip.
 * Tooltip shows only "Verified by HubRegistrar".
 *
 * Props:
 *   verified        – boolean – renders nothing when false
 *   size            – "sm" | "md" | "lg"
 *   className       – extra wrapper class
 *   nonInteractive  – boolean – when true: tooltip is disabled, no tabIndex is
 *                     set, and pointer-events are not captured. Use this whenever
 *                     the badge sits inside an absolutely-positioned overlay that
 *                     should not intercept card clicks (e.g. avatar badge,
 *                     cover-image overlay).
 */
export default function CreatorVerifiedBadge({
  verified,
  size = "md",
  className = "",
  nonInteractive = false,
}) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ above: false, alignRight: false });
  const badgeRef = useRef(null);
  const hideTimer = useRef(null);

  const show = useCallback(() => {
    if (nonInteractive) return;
    clearTimeout(hideTimer.current);
    if (badgeRef.current) {
      const rect = badgeRef.current.getBoundingClientRect();
      setPos({
        above: window.innerHeight - rect.bottom < 80,
        alignRight: window.innerWidth - rect.left < 220,
      });
    }
    setVisible(true);
  }, [nonInteractive]);

  const hide = useCallback(() => {
    if (nonInteractive) return;
    hideTimer.current = setTimeout(() => setVisible(false), 80);
  }, [nonInteractive]);

  useEffect(() => () => clearTimeout(hideTimer.current), []);

  if (!verified) return null;

  const badgePx = size === "sm" ? 16 : size === "lg" ? 22 : 18;

  /* When nonInteractive, render a plain SVG icon – no wrapper span, no tooltip,
     no pointer-event capture, no tabIndex. This ensures absolutely-positioned
     badge overlays never intercept clicks on the card beneath them. */
  if (nonInteractive) {
    return (
      <svg
        width={badgePx}
        height={badgePx}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Verified by HubRegistrar"
        role="img"
        className={className}
        style={{ display: "block", flexShrink: 0, pointerEvents: "none" }}
      >
        <circle cx="12" cy="12" r="12" fill="#10b981" />
        <polyline
          points="7,12 10.5,15.5 17,9"
          stroke="#fff"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  /* Interactive mode – full tooltip on hover / focus */
  const tooltipStyle = {
    position: "absolute",
    zIndex: 9999,
    whiteSpace: "nowrap",
    ...(pos.above
      ? { bottom: "calc(100% + 8px)", top: "auto" }
      : { top: "calc(100% + 8px)", bottom: "auto" }),
    ...(pos.alignRight
      ? { right: 0, left: "auto", transform: `scale(${visible ? 1 : 0.92})` }
      : { left: "50%", transform: `translateX(-50%) scale(${visible ? 1 : 0.92})` }),
    opacity: visible ? 1 : 0,
    pointerEvents: visible ? "auto" : "none",
    transition: "opacity 160ms ease, transform 160ms ease",
  };

  const arrowStyle = {
    position: "absolute",
    width: "8px",
    height: "8px",
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRight: "none",
    borderBottom: "none",
    transform: pos.above ? "rotate(225deg)" : "rotate(45deg)",
    ...(pos.above ? { bottom: "-5px" } : { top: "-5px" }),
    ...(pos.alignRight ? { right: "12px" } : { left: "50%", marginLeft: "-4px" }),
  };

  return (
    <span
      ref={badgeRef}
      className={`relative inline-flex items-center justify-center ${className}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      tabIndex={0}
      role="img"
      aria-label="Verified by HubRegistrar"
      style={{ outline: "none", cursor: "default", lineHeight: 0 }}
    >
      {/* Badge SVG */}
      <svg
        width={badgePx}
        height={badgePx}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
        style={{ flexShrink: 0, display: "block", pointerEvents: "none" }}
      >
        <circle cx="12" cy="12" r="12" fill="#10b981" />
        <polyline
          points="7,12 10.5,15.5 17,9"
          stroke="#fff"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Tooltip */}
      <span
        role="tooltip"
        style={tooltipStyle}
        onMouseEnter={() => clearTimeout(hideTimer.current)}
        onMouseLeave={hide}
      >
        <span aria-hidden style={arrowStyle} />
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            padding: "8px 12px",
            boxShadow: "0 4px 16px -2px rgba(15,23,42,0.12), 0 1px 4px -1px rgba(15,23,42,0.06)",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
            style={{ flexShrink: 0, pointerEvents: "none" }}
          >
            <circle cx="12" cy="12" r="12" fill="#10b981" />
            <polyline
              points="7,12 10.5,15.5 17,9"
              stroke="#fff"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "#0f172a",
              letterSpacing: "-0.01em",
              lineHeight: 1,
            }}
          >
            Verified by HubRegistrar
          </span>
        </span>
      </span>
    </span>
  );
}
