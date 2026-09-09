/**
 * Static viewport edge glow.
 * Static frame glow; homepage overrides remap it to the saffron theme.
 */
export default function SiteGradientBorder() {
  return (
    <>
      <div className="site-static-border" aria-hidden />
      <style>{`
        .site-static-border {
          pointer-events: none;
          position: fixed;
          inset: 0;
          z-index: 1100;
        }

        .site-static-border::before {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          padding: 2px;
          -webkit-mask:
            linear-gradient(#fff 0 0) content-box,
            linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask:
            linear-gradient(#fff 0 0) content-box,
            linear-gradient(#fff 0 0);
          mask-composite: exclude;
          background:
            linear-gradient(135deg,
              rgba(0, 195, 255, 0.62) 0%,
              rgba(99, 102, 241, 0.44) 24%,
              rgba(88, 28, 135, 0.72) 48%,
              rgba(76, 29, 149, 0.68) 66%,
              rgba(255, 48, 108, 0.46) 86%,
              rgba(0, 195, 255, 0.48) 100%);
          box-shadow: 0 0 18px rgba(76, 29, 149, 0.22);
        }

        body.home-page-body .site-static-border::before {
          background:
            linear-gradient(135deg,
              var(--home-saffron-200) 0%,
              var(--home-saffron) 38%,
              var(--home-saffron-text) 70%,
              var(--home-saffron-300) 100%);
          box-shadow: 0 0 18px rgba(194, 65, 12, 0.18);
        }
      `}</style>
    </>
  );
}
