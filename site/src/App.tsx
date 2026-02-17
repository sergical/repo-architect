import { ThemeToggle } from './ThemeToggle';
import { Hero } from './Hero';
import { HowItWorks } from './HowItWorks';
import { Features } from './Features';
import { Usage } from './Usage';
import { Gallery } from './Gallery';
import { QuickStart } from './QuickStart';
import { Footer } from './Footer';

export function App() {
  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 bg-bg/80 backdrop-blur-sm">
        <a href="#" aria-label="Back to top">
          <img src="/logo.svg" alt="repo-architect" className="h-8" />
        </a>
        <ThemeToggle />
      </header>

      <Hero />
      <HowItWorks />
      <Features />
      <Usage />
      <Gallery />
      <QuickStart />
      <Footer />
    </>
  );
}
