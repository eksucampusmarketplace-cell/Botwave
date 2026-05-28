export const firstJavaScriptLesson = {
  slug: 'first-javascript',
  title: 'Your First JavaScript Program',
  description: 'Learn how to write and run your first JavaScript program',
  language: 'javascript',
  level: 'beginner',
  estimatedTime: '20 minutes',
  xpReward: 25,
  prerequisiteSlugs: ['js-basics'],
  sections: [
    {
      id: 'introduction',
      title: 'Introduction to JavaScript',
      type: 'explanation',
      content: [
        {
          type: 'paragraph',
          text: 'JavaScript is a programming language that makes websites interactive. While HTML provides the structure and CSS provides the style, JavaScript provides the behavior.'
        },
        {
          type: 'analogy',
          text: 'Think of a website like a car: HTML is the frame and body, CSS is the paint and interior design, and JavaScript is the engine that makes it move and respond to the driver.'
        }
      ]
    },
    {
      id: 'where-to-run-js',
      title: 'Where to Run JavaScript',
      type: 'explanation',
      content: [
        {
          type: 'paragraph',
          text: 'JavaScript can run in several places, but the most common is in web browsers. Every modern browser has a JavaScript engine that can read and execute JavaScript code.'
        }
      ],
      codeExamples: [
        {
          language: 'none',
          code: 'HTML (structure) + CSS (style) + JavaScript (behavior) = Interactive Website'
        }
      ]
    },
    {
      id: 'console-log',
      title: 'The Console.log() Function',
      type: 'explanation',
      content: [
        {
          type: 'paragraph',
          text: 'The most basic way to output information in JavaScript is using console.log(). This sends output to the browser\'s developer console, which is useful for testing and debugging.'
        }
      ],
      codeExamples: [
        {
          language: 'javascript',
          code: 'console.log(\"Hello, World!\");\nconsole.log(42);\nconsole.log(true);',
          explanation: 'These lines print different types of values to the console: a string, a number, and a boolean.'
        }
      ],
      sandbox: {
        starterCode: '# Write your first JavaScript here\nconsole.log(\"Hello, World!\");',
        expectedOutput: 'Hello, World!'
      }
    },
    {
      id: 'alert-function',
      title: 'The Alert() Function',
      type: 'explanation',
      content: [
        {
          type: 'paragraph',
          text: 'Another way to show information to users is with the alert() function, which creates a pop-up box in the browser window.'
        }
      ],
      codeExamples: [
        {
          language: 'javascript',
          code: 'alert(\"Hello, World!\");',
          explanation: 'This line creates a pop-up box that displays the text \"Hello, World!\".'
        }
      ],
      sandbox: {
        starterCode: '# Try the alert function\nalert(\"Hello, World!\");',
        expectedOutput: 'A pop-up box showing \"Hello, World!\"'
      }
    },
    {
      id: 'exercise',
      title: 'Practice Exercise: Personal Greeting',
      type: 'exercise',
      instructions: 'Create a program that asks for the user\'s name and then greets them personally.',
      sandbox: {
        starterCode: '# For this exercise, we\\'ll simulate user input\nlet name = \"Alice\";  // This would normally come from user input\n// Write your code here\nconsole.log(\"Hello, \" + name + \"!\");',
        expectedOutput: 'Hello, Alice!'
      }
    },
    {
      id: 'quiz',
      title: 'Quick Quiz',
      type: 'quiz',
      questions: [
        {
          id: 'q1',
          question: 'What is the primary use of JavaScript in web development?',
          options: [
            { text: 'Adding structure to web pages', isCorrect: false },
            { text: 'Adding style to web pages', isCorrect: false },
            { text: 'Adding behavior and interactivity to web pages', isCorrect: true },
            { text: 'Creating server-side applications', isCorrect: false }
          ]
        },
        {
          id: 'q2',
          question: 'Which function displays output in the browser console?',
          options: [
            { text: 'alert()', isCorrect: false },
            { text: 'console.log()', isCorrect: true },
            { text: 'print()', isCorrect: false },
            { text: 'echo()', isCorrect: false }
          ]
        }
      ]
    }
  ]
};