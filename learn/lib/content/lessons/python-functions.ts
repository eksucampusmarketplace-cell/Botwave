export const pythonFunctionsLesson = {
  slug: 'python-functions',
  title: 'Functions: Reusable Code',
  description: 'Learn how to create and use functions in Python',
  language: 'python',
  level: 'beginner',
  estimatedTime: '30 minutes',
  xpReward: 40,
  prerequisiteSlugs: ['python-basics', 'python-conditionals', 'python-loops'],
  sections: [
    {
      id: 'introduction',
      title: 'Introduction to Functions',
      type: 'explanation',
      content: [
        {
          type: 'paragraph',
          text: 'Functions are reusable blocks of code that perform a specific task. Instead of writing the same code multiple times, you can write it once in a function and reuse it whenever needed.'
        },
        {
          type: 'analogy',
          text: 'Think of a function like a pizza maker machine. You put in the ingredients (parameters), the machine does the same process every time, and out comes a pizza (the result). You can use this machine over and over without having to remake it each time.'
        }
      ]
    },
    {
      id: 'defining-functions',
      title: 'Defining Functions',
      type: 'explanation',
      content: [
        {
          type: 'paragraph',
          text: 'In Python, we use the def keyword to define a function. We give it a name, list any parameters it needs, and then write the code that should run when the function is called.'
        }
      ],
      codeExamples: [
        {
          language: 'python',
          code: 'def greet():\n    print(\"Hello!\")\n\ngreet()  # This calls the function',
          explanation: 'This defines a function named greet that prints \"Hello!\". The last line calls the function to run it.'
        }
      ],
      sandbox: {
        starterCode: '# Define a function that prints a greeting\ndef greet():\n    # Your code here\n\n# Call the function\ngreet()',
        expectedOutput: 'Hello!'
      }
    },
    {
      id: 'parameters',
      title: 'Function Parameters',
      type: 'explanation',
      content: [
        {
          type: 'paragraph',
          text: 'Functions can accept inputs called parameters. These allow you to pass different data to the function each time you call it, making it more flexible.'
        }
      ],
      codeExamples: [
        {
          language: 'python',
          code: 'def greet(name):\n    print(f\"Hello, {name}!\")\n\ngreet(\"Alice\")\ngreet(\"Bob\")',
          explanation: 'This function accepts a parameter called name. When we call it with different names, it prints a personalized greeting for each.'
        }
      ],
      sandbox: {
        starterCode: '# Define a function that greets someone by name\ndef greet(name):\n    # Your code here\n\n# Call the function with different names\ngreet(\"Alice\")\ngreet(\"Bob\")',
        expectedOutput: 'Hello, Alice!\\nHello, Bob!'
      }
    },
    {
      id: 'return-values',
      title: 'Return Values',
      type: 'explanation',
      content: [
        {
          type: 'paragraph',
          text: 'Functions can send back results using the return statement. This allows you to use the function\'s output in other parts of your program.'
        }
      ],
      codeExamples: [
        {
          language: 'python',
          code: 'def add_numbers(a, b):\n    return a + b\n\nresult = add_numbers(3, 5)\nprint(result)', 
          explanation: 'This function takes two numbers, adds them together, and returns the result. We store the returned value in the result variable and then print it.'
        }
      ],
      sandbox: {
        starterCode: '# Define a function that adds two numbers and returns the result\ndef add_numbers(a, b):\n    # Your code here\n\n# Call the function and print the result\nresult = add_numbers(3, 5)\nprint(result)',
        expectedOutput: '8'
      }
    },
    {
      id: 'exercise',
      title: 'Practice Exercise: Temperature Converter',
      type: 'exercise',
      instructions: 'Create a function that converts Celsius to Fahrenheit using the formula: F = (C × 9/5) + 32',
      sandbox: {
        starterCode: '# Define a function that converts Celsius to Fahrenheit\ndef celsius_to_fahrenheit(celsius):\n    # Your code here\n\n# Test the function\ntemp_in_fahrenheit = celsius_to_fahrenheit(25)\nprint(f\"25°C is {temp_in_fahrenheit}°F\")',
        expectedOutput: '25°C is 77.0°F'
      }
    },
    {
      id: 'quiz',
      title: 'Quick Quiz',
      type: 'quiz',
      questions: [
        {
          id: 'q1',
          question: 'What keyword is used to define a function in Python?',
          options: [
            { text: 'function', isCorrect: false },
            { text: 'def', isCorrect: true },
            { text: 'func', isCorrect: false },
            { text: 'define', isCorrect: false }
          ]
        },
        {
          id: 'q2',
          question: 'What does the return statement do in a function?',
          options: [
            { text: 'It ends the function execution', isCorrect: false },
            { text: 'It sends a value back from the function', isCorrect: true },
            { text: 'It prints the function output', isCorrect: false },
            { text: 'It defines function parameters', isCorrect: false }
          ]
        }
      ]
    }
  ]
};