export const pythonLoopsLesson = {
  slug: 'python-loops',
  title: 'Loops in Python',
  description: 'Learn how to repeat actions with loops in Python',
  language: 'python',
  level: 'beginner',
  estimatedTime: '25 minutes',
  xpReward: 30,
  prerequisiteSlugs: ['python-basics', 'python-conditionals'],
  sections: [
    {
      id: 'introduction',
      title: 'Introduction to Loops',
      type: 'explanation',
      content: [
        {
          type: 'paragraph',
          text: 'Sometimes we need to do the same thing many times. Instead of writing the same code over and over, we can use loops to repeat actions automatically.'
        },
        {
          type: 'analogy',
          text: 'Think of a loop like a conveyor belt in a factory. Instead of a worker doing the same task 100 times by hand, the conveyor belt brings each item to the worker one at a time, and the worker does the same task on each item.'
        }
      ]
    },
    {
      id: 'while-loops',
      title: 'While Loops',
      type: 'explanation',
      content: [
        {
          type: 'paragraph',
          text: 'A while loop continues to run as long as a condition is true. It\'s like saying \"Keep doing this while this condition remains true.\"'
        }
      ],
      codeExamples: [
        {
          language: 'python',
          code: 'count = 1\nwhile count <= 5:\n    print(count)\n    count = count + 1',
          explanation: 'This loop starts with count=1. As long as count is less than or equal to 5, it prints the count and then adds 1 to count.'
        }
      ],
      sandbox: {
        starterCode: 'count = 1\n# Write your while loop here\nwhile count <= 5:\n    print(count)\n    count = count + 1',
        expectedOutput: '1\\n2\\n3\\n4\\n5'
      }
    },
    {
      id: 'for-loops',
      title: 'For Loops',
      type: 'explanation',
      content: [
        {
          type: 'paragraph',
          text: 'A for loop is used to iterate over a sequence (like a list of items) or to repeat an action a specific number of times.'
        }
      ],
      codeExamples: [
        {
          language: 'python',
          code: 'for i in range(1, 6):\n    print(i)',
          explanation: 'This loop uses range(1, 6) which generates numbers from 1 to 5. For each number in that sequence, it prints the number.'
        }
      ],
      sandbox: {
        starterCode: '# Write your for loop here\nfor i in range(1, 6):\n    print(i)',
        expectedOutput: '1\\n2\\n3\\n4\\n5'
      }
    },
    {
      id: 'loop-control',
      title: 'Loop Control: Break and Continue',
      type: 'explanation',
      content: [
        {
          type: 'paragraph',
          text: 'Sometimes we want to exit a loop early or skip to the next iteration. We can use break to exit the loop completely, or continue to skip to the next iteration.'
        }
      ],
      codeExamples: [
        {
          language: 'python',
          code: 'for i in range(1, 11):\n    if i == 5:\n        break  # Exit the loop when i is 5\n    print(i)',
          explanation: 'This loop would normally print 1 through 10, but when i equals 5, the break statement causes the loop to exit early, so it only prints 1 through 4.'
        }
      ],
      sandbox: {
        starterCode: '# Write your loop with break here\nfor i in range(1, 11):\n    if i == 5:\n        break\n    print(i)',
        expectedOutput: '1\\n2\\n3\\n4'
      }
    },
    {
      id: 'exercise',
      title: 'Practice Exercise: Countdown',
      type: 'exercise',
      instructions: 'Write a program that counts down from 10 to 1 and then prints \"Blast off!\".',
      sandbox: {
        starterCode: '# Write your countdown here\n# Start at 10 and go down to 1\nfor i in range(10, 0, -1):\n    print(i)\nprint(\"Blast off!\")',
        expectedOutput: '10\\n9\\n8\\n7\\n6\\n5\\n4\\n3\\n2\\n1\\nBlast off!'
      }
    },
    {
      id: 'quiz',
      title: 'Quick Quiz',
      type: 'quiz',
      questions: [
        {
          id: 'q1',
          question: 'What will this code print?\\nfor i in range(3):\\n    print(i)',
          options: [
            { text: '0\\n1\\n2', isCorrect: true },
            { text: '1\\n2\\n3', isCorrect: false },
            { text: '0\\n1\\n2\\n3', isCorrect: false },
            { text: '3\\n2\\n1', isCorrect: false }
          ]
        },
        {
          id: 'q2',
          question: 'Which statement is used to exit a loop early?',
          options: [
            { text: 'continue', isCorrect: false },
            { text: 'break', isCorrect: true },
            { text: 'exit', isCorrect: false },
            { text: 'stop', isCorrect: false }
          ]
        }
      ]
    }
  ]
};