export const pythonBasicsLesson = {
  slug: 'python-basics',
  title: 'Python Basics',
  description: 'Learn the fundamentals of Python programming',
  language: 'python',
  level: 'beginner',
  estimatedTime: '30 minutes',
  xpReward: 50,
  prerequisiteSlugs: [],
  sections: [
    {
      id: 'introduction',
      title: 'Introduction to Python',
      type: 'explanation',
      content: [
        {
          type: 'paragraph',
          text: 'Python is a popular programming language known for its simplicity and readability. It is used in web development, data science, artificial intelligence, and more.'
        },
        {
          type: 'analogy',
          text: 'Think of Python like a recipe book. Just as a recipe gives you step-by-step instructions to cook a dish, Python gives you instructions to make a computer perform tasks.'
        }
      ]
    },
    {
      id: 'first-program',
      title: 'Your First Python Program',
      type: 'explanation',
      content: [
        {
          type: 'paragraph',
          text: 'The first program most people write in Python is one that prints \"Hello, World!\" to the screen.'
        }
      ],
      codeExamples: [
        {
          language: 'python',
          code: 'print(\"Hello, World!\")',
          explanation: 'This line tells Python to display the text inside the quotation marks.'
        }
      ],
      sandbox: {
        starterCode: 'print(\"Hello, World!\")',
        expectedOutput: 'Hello, World!'
      }
    },
    {
      id: 'variables',
      title: 'Variables and Data Types',
      type: 'explanation',
      content: [
        {
          type: 'paragraph',
          text: 'Variables are used to store data that can be used and manipulated in your program. Think of them as labeled boxes where you can keep information.'
        }
      ],
      codeExamples: [
        {
          language: 'python',
          code: '# This is a comment\nname = \"Alice\"\nage = 25\nheight = 5.5\nis_student = True\nprint(name)\nprint(age)\nprint(height)\nprint(is_student)',
          explanation: 'We created four variables: name (string), age (integer), height (float), and is_student (boolean).'
        }
      ],
      sandbox: {
        starterCode: '# Create a variable for your name and print it\nname = \"\"',
        expectedOutput: 'Your Name'
      }
    },
    {
      id: 'exercise',
      title: 'Practice Exercise',
      type: 'exercise',
      instructions: 'Modify the code below to print your name and age.',
      sandbox: {
        starterCode: '# Your code here\nname = \"\"\nage = 0\nprint(name)\nprint(age)',
        expectedOutput: 'Your Name\\nYour Age'
      }
    },
    {
      id: 'quiz',
      title: 'Quick Quiz',
      type: 'quiz',
      questions: [
        {
          id: 'q1',
          question: 'What will the following code print?\\nprint(\"Hello\")',
          options: [
            { text: 'Hello', isCorrect: true },
            { text: 'hello', isCorrect: false },
            { text: 'Hello\\n', isCorrect: false },
            { text: 'print(\"Hello\")', isCorrect: false }
          ]
        },
        {
          id: 'q2',
          question: 'Which of the following is a valid variable name in Python?',
          options: [
            { text: '123abc', isCorrect: false },
            { text: '_var', isCorrect: true },
            { text: 'var-name', isCorrect: false },
            { text: 'var name', isCorrect: false }
          ]
        }
      ]
    }
  ]
};