export const whatIsHTMLLesson = {
  slug: 'what-is-html',
  title: 'What is HTML?',
  description: 'Learn the basics of HTML for structuring web pages',
  language: 'html',
  level: 'beginner',
  estimatedTime: '20 minutes',
  xpReward: 25,
  prerequisiteSlugs: [],
  sections: [
    {
      id: 'introduction',
      title: 'Introduction to HTML',
      type: 'explanation',
      content: [
        {
          type: 'paragraph',
          text: 'HTML (HyperText Markup Language) is the standard language for creating web pages. It provides the structure and content of a webpage.'
        },
        {
          type: 'analogy',
          text: 'Think of HTML like the skeleton of a human body. It provides the basic structure that everything else is built upon.'
        }
      ]
    },
    {
      id: 'how-web-works',
      title: 'How the Web Works',
      type: 'explanation',
      content: [
        {
          type: 'paragraph',
          text: 'When you visit a website, your browser requests an HTML file from a server. The browser then reads this file and displays it as a webpage.'
        }
      ],
      codeExamples: [
        {
          language: 'none',
          code: 'You (browser) → Request HTML file → Server → Send HTML file → Browser → Display webpage'
        }
      ]
    },
    {
      id: 'basic-structure',
      title: 'Basic HTML Structure',
      type: 'explanation',
      content: [
        {
          type: 'paragraph',
          text: 'Every HTML document follows a basic structure with specific tags that tell the browser how to interpret the content.'
        }
      ],
      codeExamples: [
        {
          language: 'html',
          code: '<!DOCTYPE html>\n<html>\n  <head>\n    <title>My First Webpage</title>\n  </head>\n  <body>\n    <h1>Hello, World!</h1>\n    <p>This is my first webpage.</p>\n  </body>\n</html>',
          explanation: 'This is the basic structure of an HTML page. The <!DOCTYPE html> declaration tells the browser this is HTML5. The <html> element is the root element. The <head> contains metadata about the page. The <body> contains the visible content.'
        }
      ],
      sandbox: {
        starterCode: '<!DOCTYPE html>\n<html>\n  <head>\n    <title></title>\n  </head>\n  <body>\n\n  </body>\n</html>',
        expectedOutput: 'A webpage with the title \"My First Webpage\" showing a heading \"Hello, World!\" and a paragraph \"This is my first webpage.\"'
      }
    },
    {
      id: 'common-tags',
      title: 'Common HTML Tags',
      type: 'explanation',
      content: [
        {
          type: 'paragraph',
          text: 'HTML provides various tags for different types of content. Here are some of the most commonly used ones:'
        }
      ],
      codeExamples: [
        {
          language: 'html',
          code: '<!-- Headings -->\n<h1>This is a heading</h1>\n<h2>This is a subheading</h2>\n\n<!-- Paragraphs -->\n<p>This is a paragraph of text.</p>\n\n<!-- Links -->\n<a href=\"https://example.com\">Visit Example.com</a>\n\n<!-- Images -->\n<img src=\"image.jpg\" alt=\"Description of image\">\n\n<!-- Lists -->\n<ul>\n  <li>First item</li>\n  <li>Second item</li>\n  <li>Third item</li>\n</ul>\n\n<!-- Divs (for grouping) -->\n<div>\n  <p>This is inside a div</p>\n</div>'
        }
      ],
      sandbox: {
        starterCode: '<!DOCTYPE html>\n<html>\n  <head>\n    <title>My Webpage</title>\n  </head>\n  <body>\n    <!-- Add your HTML here -->\n  </body>\n</html>',
        expectedOutput: 'A webpage with various HTML elements'
      }
    },
    {
      id: 'exercise',
      title: 'Practice Exercise: Create a Simple Webpage',
      type: 'exercise',
      instructions: 'Create a webpage with a heading, a paragraph, a link, and an image (you can use a placeholder image URL).',
      sandbox: {
        starterCode: '<!DOCTYPE html>\n<html>\n  <head>\n    <title>My Webpage</title>\n  </head>\n  <body>\n    <!-- Your HTML here -->\n  </body>\n</html>',
        expectedOutput: 'A complete webpage with heading, paragraph, link, and image'
      }
    },
    {
      id: 'quiz',
      title: 'Quick Quiz',
      type: 'quiz',
      questions: [
        {
          id: 'q1',
          question: 'What does HTML stand for?',
          options: [
            { text: 'HyperText Markup Language', isCorrect: true },
            { text: 'Home Tool Markup Language', isCorrect: false },
            { text: 'Hyperlinks and Text Markup Language', isCorrect: false },
            { text: 'Hyper Tool Multi Language', isCorrect: false }
          ]
        },
        {
          id: 'q2',
          question: 'Which tag is used to create a heading in HTML?',
          options: [
            { text: '<head>', isCorrect: false },
            { text: '<header>', isCorrect: false },
            { text: '<h1>', isCorrect: true },
            { text: '<heading>', isCorrect: false }
          ]
        }
      ]
    }
  ]
};