import React from "react";

export function Footer() {
  return (
    <footer className="w-full border-t border-border bg-card/50 py-12 mt-20">
      <div className="container mx-auto px-4 text-center max-w-2xl">
        <p className="text-sm text-muted-foreground leading-relaxed">
          This tool analyzes public on-chain activity only. It does not confirm official Arc airdrop eligibility. No wallet connection, signature, or payment is required.
        </p>
        <div className="mt-6 flex items-center justify-center gap-4 text-sm text-muted-foreground/80">
          <span>&copy; {new Date().getFullYear()} Arc Activity Index</span>
          <span>&bull;</span>
          <a href="#" className="hover:text-foreground transition-colors">Terms</a>
          <span>&bull;</span>
          <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
        </div>
      </div>
    </footer>
  );
}
