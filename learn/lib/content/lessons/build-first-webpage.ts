export const buildFirstWebpageLesson = {
  slug: 'build-first-webpage',
  title: 'Build Your First Webpage',
  description: 'Create a complete webpage with HTML and CSS',
  language: 'html-css',
  level: 'beginner',
  estimatedTime: '30 minutes',
  xpReward: 40,
  prerequisiteSlugs: ['what-is-html'],
  sections: [
    {
      id: 'introduction',
      title: 'Introduction to Webpage Styling',
      type: 'explanation',
      content: [
        {
          type: 'paragraph',
          text: 'While HTML provides the structure of a webpage, CSS (Cascading Style Sheets) provides the presentation - colors, layout, fonts, and overall visual design.'
        },
        {
          type: 'analogy',
          text: 'Think of HTML as the frame and walls of a house, and CSS as the paint, furniture, and interior design that makes it beautiful and comfortable to live in.'
        }
      ]
    },
    {
      id: 'what-is-css',
      title: 'What is CSS?',
      type: 'explanation',
      content: [
        {
          type: 'paragraph',
          text: 'CSS is a language that describes how HTML elements should be displayed on screen, paper, or in other media. It allows you to control the layout of multiple web pages all at once.'
        }
      ],
      codeExamples: [
        {
          language: 'css',
          code: '/* This is a CSS comment */\nbody {\n  background-color: #f0f0f0;\n  font-family: Arial, sans-serif;\n}\n\nh1 {\n  color: blue;\n  text-align: center;\n}\n\np {\n  font-size: 18px;\n  color: #333;\n}',
          explanation: 'This CSS sets the page background color, font, heading color and alignment, and paragraph font size and color.'
        }
      ]
    },
    {
      id: 'adding-css-to-html',
      title: 'Adding CSS to HTML',
      type: 'explanation',
      content: [
        {
          type: 'paragraph',
          text: 'There are three ways to add CSS to your HTML: inline (directly in HTML tags), internal (in a <style> tag in the head), and external (in a separate .css file).'
        }
      ],
      codeExamples: [
        {
          language: 'html',
          code: '<!DOCTYPE html>\n<html>\n  <head>\n    <title>My Styled Webpage</title>\n    <style>\n      /* Internal CSS */\n      body {\n        background-color: #f8f9fa;\n        font-family: \\'Segoe UI\\', Tahoma, Geneva, Verdana, sans-serif;\n        margin: 40px;\n      }\n      \n      h1 {\n        color: #2c3e50;\n        text-align: center;\n      }\n      \n      .highlight {\n        color: #e74c3c;\n        font-weight: bold;\n      }\n    </style>\n  </head>\n  <body>\n    <h1>My Favorite Things</h1>\n    <p>Hello! My name is <span class=\"highlight\">Alice</span> and I love:</p>\n    <ul>\n      <li>Programming</li>\n      <li>Reading books</li>\n      <li>Playing guitar</li>\n    </ul>\n    <p><em>Have a wonderful day!</em></p>\n  </body>\n</html>',
          explanation: 'This example shows internal CSS (inside the <style> tag) that styles the body, heading, and a special highlight class.'
        }
      ],
      sandbox: {
        starterCode: '<!DOCTYPE html>\n<html>\n  <head>\n    <title>My Webpage</title>\n    <style>\n      /* Add your CSS here */\n    </style>\n  </head>\n  <body>\n    <!-- Add your HTML content here -->\n  </body>\n</html>',
        expectedOutput: 'A styled webpage with heading, paragraph, list, and custom styling'
      }
    },
    {
      id: 'exercise',
      title: 'Practice Exercise: Create a Personal Webpage',
      type: 'exercise',
      instructions: 'Create a webpage about yourself with a heading, paragraph about your interests, a list of your hobbies, and apply some basic styling.',
      sandbox: {
        starterCode: '<!DOCTYPE html>\n<html>\n  <head>\n    <title>My Webpage</title>\n    <style>\n      /* Add your CSS styling here */\n    </style>\n  </head>\n  <body>\n    <!-- Add your HTML content here -->\n  </body>\n</html>',
        expectedOutput: 'A personal webpage with styling'
      }
    },
    {
      id: 'quiz',
      title: 'Quick Quiz',
      type: 'quiz',
      questions: [
        {
          id: 'q1',
          question: 'What does CSS stand for?',
          options: [
            { text: 'Creative Style Sheets', isCorrect: false },
            { text: 'Cascading Style Sheets', isCorrect: true },
            { text: 'Computer Style Sheets', isCorrect: false },
            { text: 'Colorful Style Sheets', isCorrect: false }
          ]
        },
        {
          id: 'q2',
          question: 'Where does internal CSS go in an HTML document?',
          options: [
            { text: 'In the <body> tag', isCorrect: false },
            { text: 'In the <head> tag inside a <style> tag', isCorrect: true },
            { text: 'At the end of the HTML file', isCorrect: false },
            { text: 'In the <title> tag', isCorrect: false }
          ]
        }
      ]
    }
  ]
};