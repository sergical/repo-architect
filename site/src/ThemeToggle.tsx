import { Sun, Moon } from 'lucide-react';
import { useTheme } from './useTheme';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className="bg-transparent border border-border rounded-lg p-2 cursor-pointer text-muted flex items-center justify-center w-9 h-9 transition-colors"
    >
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
