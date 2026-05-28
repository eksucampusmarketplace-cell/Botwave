export const pythonConditionalsLesson = {
  slug: 'python-conditionals',
  title: 'Making Decisions with if/else',
  description: 'Learn how to make decisions in your Python programs',
  language: 'python',
  level: 'beginner',
  estimatedTime: '25 minutes',
  xpReward: 30,
  prerequisiteSlugs: ['python-basics'],
  sections: [
    {
      id: 'introduction',
      title: 'Introduction to Conditionals',
      type: 'explanation',
      content: [
        {
          type: 'paragraph',
          text: 'Sometimes we want our programs to make decisions based on conditions. For example, \"If it\'s raining, take an umbrella.\" In programming, we use if/else statements to make these decisions.'
        },
        {
          type: 'analogy',
          text: 'Think of a conditional like a fork in the road. Depending on which condition is true, you take one path or another.'
        }
      ]
    },
    {
      id: 'if-statements',
      title: 'If Statements',
      type: 'explanation',
      content: [
        {
          type: 'paragraph',
          text: 'The basic if statement checks if a condition is true. If it is, it runs the code inside the block.'


        }
      ],
      codeExamples: [
        {
          language: 'python',
          code: 'age = 18\nif age >= 18:\n    print(\"You are an adult!\")',
          explanation: 'This code checks if age is greater than or equal to 18. If true, it prints the message.'
        }
      ],
      sandbox: {
        starterCode: 'age = 0\n# Write your code here\nif age >= 18:\n    print(\"You are an adult!\")',
        expectedOutput: 'You are an adult!'
      }
    },
    {
      id: 'else-statements',
      title: 'Else Statements',
      type: 'explanation',
      content: [
        {
          type: 'paragraph',
          text: 'We can add an else clause to run code when the if condition is false.'
        }
      ],
      codeExamples: [
        {
          language: 'python',
          code: 'age = 16\nif age >= 18:\n    print(\"You are an adult!\")\nelse:\n    print(\"You are a minor!\")',
          explanation: 'Since age is 16 (less than 18), the else block runs and prints \"You are a minor!\".'
        }
      ],
      sandbox: {
        starterCode: 'age = 0\n# Write your code here\nif age >= 18:\n    print(\"You are an adult!\")\nelse:\n    print(\"You are a minor!\")',
        expectedOutput: 'You are a minor!'
      }
    },
    {
      id: 'elif-statements',
      title: 'Elif Statements',
      type: 'explanation',
      content: [
        {
          type: 'paragraph',
          text: 'When we have more than two conditions, we can use elif (short for \"else if\") to check additional conditions.'
        }
      ],
      codeExamples: [
        {
          language: 'python',
          code: 'score = 85\nif score >= 90:\n    print(\"Grade: A\")\nelif score >= 80:\n    print(\"Grade: B\")\nelif score >= 70:\n    print(\"Grade: C\")\nelse:\n    print(\"Grade: D or F\")',
          explanation: 'This checks multiple conditions in order. Since score is 85, it matches the second condition (>= 80) and prints \"Grade: B\".'
        }
      ],
      sandbox: {
        starterCode: 'score = 0\n# Write your code here\nif score >= 90:\n    print(\"Grade: A\")\nelif score >= 80:\n    print(\"Grade: B\")\nelif score >= 70:\n    print(\"Grade: C\")\nelse:\n    print(\"Grade: D or F\")',
        expectedOutput: 'Grade: F'
      }
    },
    {
      id: 'comparison-operators',
      title: 'Comparison Operators',
      type: 'explanation',
      content: [
        {
          type: 'paragraph',
          text: 'Comparison operators are used to compare values in conditions.'
        }
      ],
      codeExamples: [
        {
          language: 'python',
          code: '# Equal to: ==\n# Not equal to: !=\n# Greater than: >\n# Less than: <\n# Greater than or equal to: >=\n# Less than or equal to: <=\n\nprint(5 == 5)   # True\nprint(5 != 3)   # True\nprint(5 > 3)    # True\nprint(5 < 3)    # False\nprint(5 >= 5)   # True\nprint(5 <= 3)   # False'
        }
      ],
      sandbox: {
        starterCode: '# Try different comparisons\nx = 10\ny = 5\nprint(x > y)',
        expectedOutput: 'True'
      }
    },
    {
      id: 'exercise',
      title: 'Practice Exercise: Age Checker',
      type: 'exercise',
      instructions: 'Write a program that asks for an age and tells if the person can vote (18 or older).',
      sandbox: {
        starterCode: '# Get age from user (for this exercise, we\'ll set it directly)\nage = 0\n# Write your code here\nif age >= 18:\n    print(\"You can vote!\")\nelse:\n    print(\"You cannot vote yet.\")',
        expectedOutput: 'You cannot vote yet.'
      }
    },
    {
      id: 'quiz',
      title: 'Quick Quiz',
      type: 'quiz',
      questions: [
        {
          id: 'q1',
          question: 'What will this code print?\\nif 5 > 3:\\n    print(\"Five is greater\")',
          options: [
            { text: 'Five is greater', isCorrect: true },
            { text: 'Nothing', isCorrect: false },
            { text: 'Five is greater\\n', isCorrect: false },
            { text: 'Error', isCorrect: false }
          ]
        },
        {
          id: 'q2',
          question: 'Which of the following is the correct syntax for an if/else statement?',
          options: [
            { text: 'if condition: ... else: ...', isCorrect: true },
            { text: 'if condition { ... } else { ... }', isCorrect: false },
            { text: 'if (condition) ... else ...', isCorrect: false },
            { text: 'if condition then ... else ...', isCorrect: false }
          ]
        }
      ]
    }
  ]
};