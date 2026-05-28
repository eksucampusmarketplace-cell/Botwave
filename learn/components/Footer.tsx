export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="flex flex-col items-center space-x-4 text-sm text-muted-foreground">
            <a href="/" className="hover:text-primary transition-colors">
              BotWave Learn
            </a>
            <a href="/learn" className="hover:text-primary transition-colors">
              Tracks
            </a>
            <a href="/profile" className="hover:text-primary transition-colors">
              Profile
            </a>
            <a href="/leaderboard" className="hover:text-primary transition-colors">
              Leaderboard
            </a>
            <a href="/challenges" className="hover:text-primary transition-colors">
              Challenges
            </a>
          </div>
          
          <div className="text-xs text-muted-foreground/50">
            &copy; {new Date().getFullYear()} BotWave Learn. All rights reserved.
          </div>
          
          <div className="flex space-x-4 text-xs text-muted-foreground/50">
            <a href="/privacy" className="hover:text-primary transition-colors">
              Privacy
            </a>
            <a href="/terms" className="hover:text-primary transition-colors">
              Terms
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}