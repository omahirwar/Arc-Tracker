import { Link } from "wouter";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M2 12A10 10 0 0 1 22 12" />
            </svg>
          </div>
          <span className="font-bold text-xl tracking-tight text-foreground">arc</span>
        </Link>
        
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
          <Link href="/" className="text-foreground transition-colors hover:text-foreground">Home</Link>
          <a href="#" className="transition-colors hover:text-foreground">Leaderboard</a>
          <a href="#faq" className="transition-colors hover:text-foreground">FAQ</a>
          <a href="#" className="transition-colors hover:text-foreground">About</a>
        </nav>

        <div className="flex items-center">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-medium text-foreground">Arc Testnet</span>
          </div>
        </div>
      </div>
    </header>
  );
}
