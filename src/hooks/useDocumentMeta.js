import { useEffect } from 'react';

const DEFAULT_TITLE = 'Deltapreneur';

/**
 * Set document title + optional meta description for public compliance pages.
 * Restores the default title on unmount.
 */
export default function useDocumentMeta({ title, description } = {}) {
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const previousTitle = document.title;
    if (title) {
      document.title = title;
    }

    let meta = document.querySelector('meta[name="description"]');
    const createdMeta = !meta;
    const previousDescription = meta?.getAttribute('content') ?? null;

    if (description) {
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'description');
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', description);
    }

    return () => {
      document.title = previousTitle || DEFAULT_TITLE;
      if (meta && description) {
        if (createdMeta) {
          meta.remove();
        } else if (previousDescription != null) {
          meta.setAttribute('content', previousDescription);
        } else {
          meta.removeAttribute('content');
        }
      }
    };
  }, [title, description]);
}
