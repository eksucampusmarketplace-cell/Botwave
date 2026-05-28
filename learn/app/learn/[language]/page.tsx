import Link from 'next/link';

interface LanguageParams {
  language: string;
}

export default function LanguageOverview({ params }: { params: LanguageParams }) {
  const { language } = params;
  
  // Language-specific data
  const languageData: Record<string, {
    name: string;
    description: string;
    icon: React.ReactNode;
    levels: Array<{
      name: string;
      description: string;
      slug: string;
    }>;
  }> = {
    python: {
      name: 'Python Programming',
      description: 'Learn Python from basics to advanced concepts with hands-on exercises',
      icon: null, // We'll use a simple text icon for now
      levels: [
        { name: 'Beginner', description: 'Start your Python journey', slug: 'beginner' },
        { name: 'Intermediate', description: 'Build on your foundation', slug: 'intermediate' },
        { name: 'Advanced', description: 'Master Python development', slug: 'advanced' },
      ]
    },
    javascript: {
      name: 'JavaScript Fundamentals',
      description: 'Master JavaScript for web development and beyond',
      icon: null,
      levels: [
        { name: 'Beginner', description: 'Start your JavaScript journey', slug: 'beginner' },
        { name: 'Intermediate', description: 'Build on your foundation', slug: 'intermediate' },
        { name: 'Advanced', description: 'Master JavaScript development', slug: 'advanced' },
      ]
    },
    web: {
      name: 'Web Development',
      description: 'Build websites with HTML, CSS, JavaScript, and modern frameworks',
      icon: null,
      levels: [
        { name: 'Beginner', description: 'Start building websites', slug: 'beginner' },
        { name: 'Intermediate', description: 'Create dynamic web applications', slug: 'intermediate' },
        { name: 'Advanced', description: 'Build full-stack applications', slug: 'advanced' },
      ]
    }
  };
  
  const data = languageData[language] || {
    name: language.charAt(0).toUpperCase() + language.slice(1),
    description: `Learn ${language}`,
    icon: null,
    levels: [
      { name: 'Beginner', description: 'Getting started', slug: 'beginner' },
      { name: 'Intermediate', description: 'Building skills', slug: 'intermediate' },
      { name: 'Advanced', description: 'Mastering concepts', slug: 'advanced' },
    ]
  };

  return (
    <main className="min-h-[calc(100vh-160px)] pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center space-y-6">
          <h1 className="text-3xl font-bold text-foreground">{data.name}</h1>
          <p className="text-muted-foreground max-w-2xl">{data.description}</p>
          
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.levels.map((level) => (
              <Link
                key={level.slug}
                href={`/learn/${language}/${level.slug}`}
                className="glass-card hover:glass-card hover:border-primary transition-colors cursor-pointer h-full"
              >
                <div className="p-6 flex flex-col h-full">
                  <h3 className="mb-4 flex-1 text-lg font-semibold text-primary">
                    {level.name}
                  </h3>
                  <p className="mb-4 flex-1 text-muted-foreground flex-grow">
                    {level.description}
                  </p>
                  <span className="mt-auto inline-flex items-center text-sm font-medium text-accent hover:text-accent/80">
                    Explore Level
                    <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}