export function Footer() {
  return (
    <footer className="text-center py-10 px-6 text-muted text-[0.85rem] relative">
      <div className="w-[200px] h-px bg-gradient-to-r from-transparent via-border to-transparent mx-auto mb-6" />
      <p>
        <a href="https://github.com/sergical/repo-architect">GitHub</a>
        {' \u00b7 Built with '}
        <a href="https://claude.ai">Claude</a>
      </p>
    </footer>
  );
}
