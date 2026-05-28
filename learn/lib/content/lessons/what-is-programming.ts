export const whatIsProgrammingLesson = {
  slug: 'what-is-programming',
  title: 'What is Programming?',
  description: 'Understand what code is and why programming exists',
  language: 'none', // No specific language
  level: 'beginner',
  estimatedTime: '20 minutes',
  xpReward: 20,
  prerequisiteSlugs: [],
  sections: [
    {
      id: 'introduction',
      title: 'Introduction to Programming',
      type: 'explanation',
      content: [
        {
          type: 'paragraph',
          text: 'Programming is giving instructions to a computer to perform tasks. Think of it like writing a recipe for a computer to follow.'
        }
      ]
    },
    {
      id: 'analogy',
      title: 'Real Life Analogy: Cooking Recipe',
      type: 'explanation',
      content: [
        {
          type: 'paragraph',
          text: 'Imagine you want to teach someone how to make a peanut butter and jelly sandwich. You would give them step-by-step instructions:'
        },
        {
          type: 'list',
          items: [
            'Get two slices of bread',
            'Open the peanut butter jar',
            'Spread peanut butter on one slice',
            'Open the jelly jar',
            'Spread jelly on the other slice',
            'Put the slices together',
            'Cut the sandwich in half',
            'Enjoy your sandwich!'
          ]
        },
        {
          type: 'paragraph',
          text: 'Just like this recipe, a computer program is a set of step-by-step instructions that tells the computer exactly what to do.'
        }
      ]
    },
    {
      id: 'what-is-a-computer',
      title: 'What is a Computer?',
      type: 'explanation',
      content: [
        {
          type: 'paragraph',
          text: 'A computer is a machine that can follow instructions very quickly and accurately. It doesn\'t think on its own - it only does exactly what we tell it to do.'
        },
        {
          type: 'analogy',
          text: 'Think of a computer like a very fast, very obedient robot that can only follow the exact instructions we give it.'
        }
      ]
    },
    {
      id: 'what-is-code',
      title: 'What is Code?',
      type: 'explanation',
      content: [
        {
          type: 'paragraph',
          text: 'Code is the language we use to write instructions for computers. It\'s like a special language that both humans and computers can understand.'
        },
        {
          type: 'analogy',
          text: 'Think of code as a translator between human ideas and computer actions. We write in code, and the computer translates it into actions.'
        }
      ]
    },
    {
      id: 'why-learn-programming',
      title: 'Why Learn Programming?',
      type: 'explanation',
      content: [
        {
          type: 'paragraph',
          text: 'Programming allows you to create websites, apps, games, and solve problems. It\'s like having a superpower to build things that can help people.'
        },
        {
          type: 'list',
          items: [
            'Create websites and web applications',
            'Build mobile apps for phones and tablets',
            'Make video games',
            'Analyze data and solve complex problems',
            'Automate repetitive tasks',
            'Control robots and other hardware',
            'Create artificial intelligence systems'
          ]
        }
      ]
    },
    {
      id: 'exercise',
      title: 'Practice Exercise: Think Like a Computer',
      type: 'exercise',
      instructions: 'Write a set of instructions for brushing your teeth. Be very specific - remember, a computer needs exact instructions!',
      sandbox: {
        starterCode: '# Write your tooth-brushing instructions here\n# Example: 1. Pick up toothbrush\n# 2. Put toothpaste on brush\n# 3. Brush teeth for 2 minutes\n# 4. Rinse mouth with water\n# 5. Put toothbrush away',
        expectedOutput: 'Your tooth-brushing instructions'
      }
    },
    {
      id: 'quiz',
      title: 'Quick Quiz',
      type: 'quiz',
      questions: [
        {
          id: 'q1',
          question: 'What is programming?',
          options: [
            { text: 'Giving instructions to a computer', isCorrect: true },
            { text: 'Building physical computers', isCorrect: false },
            { text: 'Designing computer hardware', isCorrect: false },
            { text: 'Using social media', isCorrect: false }
          ]
        },
        {
          id: 'q2',
          question: 'What is code?',
          options: [
            { text: 'The language used to instruct computers', isCorrect: true },
            { text: 'A type of computer hardware', isCorrect: false },
            { text: 'A computer virus', isCorrect: false },
            { text: 'A computer monitor', isCorrect: false }
          ]
        }
      ]
    }
  ]
};