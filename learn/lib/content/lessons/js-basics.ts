export const jsBasicsLesson = {
  slug: 'js-basics',
  title: 'JavaScript Basics',
  description: 'Learn the fundamentals of JavaScript programming',
  language: 'javascript',
  level: 'beginner',
  estimatedTime: '30 minutes',
  xpReward: 50,
  prerequisiteSlugs: [],
  sections: [
    {
      id: 'introduction',
      title: 'Introduction to JavaScript',
      type: 'explanation',
      content: [
        {
          type: 'paragraph',
          text: 'JavaScript is the programming language of the web. It allows you to make websites interactive and dynamic.'
        },
        {
          type: 'analogy',
          text: 'Think of JavaScript like a remote control for your TV. Just as a remote control lets you change channels and volume, JavaScript lets you change what happens on a webpage.'
        }
      ]
    },
    {
      id: 'first-program',
      title: 'Your First JavaScript Program',
      type: 'explanation',
      content: [
        {
          type: 'paragraph',
          text: 'In JavaScript, we can use console.log() to print messages to the browser console.'
        }
      ],
      codeExamples: [
        {
          language: 'javascript',
          code: 'console.log(\"Hello, World!\");',
          explanation: 'This line tells JavaScript to display the text inside the quotation marks in the browser console.'
        }
      ],
      sandbox: {
        starterCode: 'console.log(\"Hello, World!\");',
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
          text: 'Variables in JavaScript are used to store data. Think of them as containers that hold information you can use later.'
        }
      ],
      codeExamples: [
        {
          language: 'javascript',
          code: '// This is a comment\nlet name = \"Alice\";\nlet age = 25;\nlet height = 5.5;\nlet isStudent = true;\nconsole.log(name);\nconsole.log(age);\nconsole.log(height);\nconsole.log(isStudent);',
          explanation: 'We created four variables: name (string), age (number), height (number), and isStudent (boolean).'
        }
      ],
      sandbox: {
        starterCode: '// Create a variable for your name and log it\nlet name = \"\";\nconsole.log(name);',
        expectedOutput: 'Your Name'
      }
    },
    {
      id: 'exercise',
      title: 'Practice Exercise',
      type: 'exercise',
      instructions: 'Modify the code below to log your name and age.',
      sandbox: {
        starterCode: '// Your code here\nlet name = \"\";\nlet age = 0;\nconsole.log(name);\nconsole.log(age);',
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
          question: 'What will the following code log?\\nconsole.log(\"Hello\");',
          options: [
            { text: 'Hello', isCorrect: true },
            { text: 'hello', isCorrect: false },
            { text: 'Hello\\n', isCorrect: false },
            { text: 'console.log(\"Hello\")', isCorrect: false }
          ]
        },
        {
          id: 'q2',
          question: 'Which keyword is used to declare a variable in modern JavaScript?',
          options: [
            { text: 'var', isCorrect: false },
            { text: 'let', isCorrect: true },
            { text: 'const', isCorrect: false },
            { text: 'variable', isCorrect: false }
          ]
        }
      ]
    }
  ]
};