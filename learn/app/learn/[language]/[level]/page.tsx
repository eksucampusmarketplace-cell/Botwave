import Link from 'next/link';

interface LevelParams {
  language: string;
  level: string;
}

export default function LevelOverview({ params }: { params: LevelParams }) {
  const { language, level } = params;
  
  // Sample lesson data - in a real implementation, this would come from lib/content/lessons/
  const sampleLessons = [
    {
      slug: 'what-is-programming',
      title: 'What is programming?',
      description: 'Understand what code is and why programming exists',
      xp: 10,
      estimatedTime: '10 min'
    },
    {
      slug: 'first-program',
      title: 'Your first Python program',
      description: 'Install Python and run your first program',
      xp: 15,
      estimatedTime: '15 min'
    },
    {
      slug: 'variables',
      title: 'Variables in Python',
      description: 'Learn how to store and manipulate data',
      xp: 20,
      estimatedTime: '20 min'
    }
  ];

  // Adjust sample data based on language and level
  const lessons = sampleLessons.map(lesson => ({
    ...lesson,
    title: language === 'python' 
      ? lesson.title.replace('Python', language.charAt(0).toUpperCase() + language.slice(1))
      : lesson.title,
    description: lesson.description.replace('Python', language.charAt(0).toUpperCase() + language.slice(1))
  }));

  return (
    <main className="min-h-[calc(100vh-160px)] pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link href={`/learn/${language}`} className="text-sm text-muted-foreground hover:text-primary transition-colors">
            ← Back to {language.charAt(0).toUpperCase() + language.slice(1)}
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-foreground">
            {level.charAt(0).toUpperCase() + level.slice(1)} {language.charAt(0).toUpperCase() + language.slice(1)}
          </h1>
          <p className="text-muted-foreground">
            Complete these lessons to level up your {language} skills
          </p>
        </div>
        
        <div className="space-y-6">
          {lessons.map((lesson) => (
            <Link
              key={lesson.slug}
              href={`/learn/${language}/${level}/${lesson.slug}`}
              className="glass-card hover:glass-card hover:border-primary transition-colors cursor-pointer"
            >
              <div className="p-6 flex flex-col">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 flex items-center justify-center bg-primary/10 rounded-lg">
                      {/* In a real app, we'd have lesson-specific icons */}
                      <span className="text-primary">{lesson.xp}</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-1">
                    <h3 className="text-lg font-semibold text-primary">{lesson.title}</h3>
                    <p className="text-muted-foreground">{lesson.description}</p>
                    <div className="mt-2 flex items-center text-xs text-muted-foreground/50">
                      <span>{lesson.estimatedTime}</span>
                      <span className="mx-2">•</span>
                      <span>{lesson.xp} XP</span>
                    </div>
                  </div>
                </div>
                <span className="mt-4 inline-flex items-center text-sm font-medium text-accent hover:text-accent/80">
                  Start Lesson
                  <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}