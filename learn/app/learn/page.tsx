import Link from 'next/link';

export default function LearnPage() {
  return (
    <main className="min-h-[calc(100vh-160px)] pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-2xl font-bold text-foreground">
          Learning Tracks
        </h1>
        <p className="mb-8 text-muted-foreground">
          Choose a learning path to start your coding journey
        </p>
        
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Track cards will be populated here */}
          <div className="glass-card hover:glass-card hover:border-primary transition-colors cursor-pointer">
            <div className="p-6">
              <h3 className="mb-4 text-lg font-semibold text-primary">
                Python Programming
              </h3>
              <p className="mb-4 text-muted-foreground">
                Learn Python from basics to advanced concepts with hands-on exercises
              </p>
              <Link href="/learn/python" className="inline-flex items-center text-sm font-medium text-accent hover:text-accent/80">
                Explore Track
                <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
          
          <div className="glass-card hover:glass-card hover:border-primary transition-colors cursor-pointer">
            <div className="p-6">
              <h3 className="mb-4 text-lg font-semibold text-primary">
                Web Development
              </h3>
              <p className="mb-4 text-muted-foreground">
                Build websites with HTML, CSS, JavaScript, and modern frameworks
              </p>
              <Link href="/learn/web" className="inline-flex items-center text-sm font-medium text-accent hover:text-accent/80">
                Explore Track
                <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
          
          <div className="glass-card hover:glass-card hover:border-primary transition-colors cursor-pointer">
            <div className="p-6">
              <h3 className="mb-4 text-lg font-semibold text-primary">
                JavaScript Fundamentals
              </h3>
              <p className="mb-4 text-muted-foreground">
                Master JavaScript for web development and beyond
              </p>
              <Link href="/learn/javascript" className="inline-flex items-center text-sm font-medium text-accent hover:text-accent/80">
                Explore Track
                <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
          
          {/* More tracks will be added dynamically from data */}
        </div>
      </div>
    </main>
  );
}