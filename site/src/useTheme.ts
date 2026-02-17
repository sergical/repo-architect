import { useSyncExternalStore, useEffect } from 'react';

function getSnapshot(): string {
  return document.documentElement.getAttribute('data-theme') || 'dark';
}

function subscribe(onStoreChange: () => void): () => void {
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.attributeName === 'data-theme') {
        onStoreChange();
        break;
      }
    }
  });
  observer.observe(document.documentElement, { attributes: true });
  return () => observer.disconnect();
}

function getCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=(dark|light)`));
  return m ? m[1] : null;
}

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=31536000; SameSite=Lax`;
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot);

  function setTheme(next: string) {
    document.documentElement.setAttribute('data-theme', next);
    setCookie('theme', next);
  }

  function toggle() {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }

  // Follow OS theme changes in real-time when no explicit cookie override
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: light)');
    function onChange(e: MediaQueryListEvent) {
      if (!getCookie('theme')) {
        document.documentElement.setAttribute('data-theme', e.matches ? 'light' : 'dark');
      }
    }
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return { theme, setTheme, toggle } as const;
}
