import Link from 'next/link';
import { Menu, Sun, Moon, Users, Code, Trophy, Zap, Folder, List } from 'lucide-react';
import { useState } from 'react';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="bg-border/50 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center space-x-3">
              <div className="h-8 w-8">
                <Code className="text-primary"/>
              </div>
              <span className="text-xl font-bold text-foreground">
                BotWave Learn
              </span>
            </Link>
          </div>
          <div className="hidden md:flex md:items-center md:space-x-6">
            <Link href="/learn" className="text-muted-foreground hover:text-primary transition-colors">
              Tracks
            </Link>
            <Link href="/profile" className="text-muted-foreground hover:text-primary transition-colors">
              Profile
            </Link>
            <Link href="/leaderboard" className="text-muted-foreground hover:text-primary transition-colors">
              Leaderboard
            </Link>
            <Link href="/challenges" className="text-muted-foreground hover:text-primary transition-colors">
              Challenges
            </Link>
          </div>
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-muted-foreground hover:text-primary transition-colors"
              aria-label="Open menu"
            >
              {isOpen ? <Moon className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link
              href="/learn"
              className="block rounded-md px-3 py-2 text-base font-medium text-muted-foreground hover:text-primary hover:bg-accent/10 transition-colors"
            >
              Tracks
            </Link>
            <Link
              href="/profile"
              className="block rounded-md px-3 py-2 text-base font-medium text-muted-foreground hover:text-primary hover:bg-accent/10 transition-colors"
            >
              Profile
            </Link>
            <Link
              href="/leaderboard"
              className="block rounded-md px-3 py-2 text-base font-medium text-muted-foreground hover:text-primary hover:bg-accent/10 transition-colors"
            >
              Leaderboard
            </Link>
            <Link
              href="/challenges"
              className="block rounded-md px-3 py-2 text-base font-medium text-muted-foreground hover:text-primary hover:bg-accent/10 transition-colors"
            >
              Challenges
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}