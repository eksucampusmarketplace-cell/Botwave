export const pythonListsLesson = {
  slug: 'python-lists',
  title: 'Lists and Loops',
  description: 'Learn how to store collections of data and iterate through them',
  language: 'python',
  level: 'beginner',
  estimatedTime: '30 minutes',
  xpReward: 35,
  prerequisiteSlugs: ['python-basics', 'python-conditionals', 'python-loops', 'python-functions'],
  sections: [
    {
      id: 'introduction',
      title: 'Introduction to Lists',
      type: 'explanation',
      content: [
        {
          type: 'paragraph',
          text: 'A list is a collection of items that are ordered and changeable. Think of it like a shopping list where you can add, remove, or change items.'
        }
      ]
    },
    {
      id: 'what-is-a-list',
      title: 'What is a List?',
      type: 'explanation',
      content: [
        {
          type: 'paragraph',
          text: 'Lists allow you to store multiple values in a single variable. Each item in a list has an index (position) starting from 0.'
        }
      ],
      codeExamples: [
        {
          language: 'python',
          code: '# This is a list of fruits\nfruits = [\"apple\", \"banana\", \"cherry\"]\nprint(fruits)',
          explanation: 'We created a list containing three strings: \"apple\", \"banana\", and \"cherry\".'
        }
      ],
      sandbox: {
        starterCode: '# Create a list of your favorite foods\nfavorite_foods = []\nprint(favorite_foods)',
        expectedOutput: '[]'
      }
    },
    {
      id: 'accessing-items',
      title: 'Accessing List Items',
      type: 'explanation',
      content: [
        {
          type: 'paragraph',
          text: 'To access an item in a list, refer to its index number inside square brackets. Remember: indexing starts at 0!'
        }
      ],
      codeExamples: [
        {
          language: 'python',
          code: 'fruits = [\"apple\", \"banana\", \"cherry\"]\nprint(fruits[0])  # First item\nprint(fruits[1])  # Second item\nprint(fruits[2])  # Third item',
          explanation: 'fruits[0] gives us \"apple\" (first item), fruits[1] gives us \"banana\" (second item), and fruits[2] gives us \"cherry\" (third item).'
        }
      ],
      sandbox: {
        starterCode: '# Access items in your list\nfavorite_foods = [\"pizza\", \"sushi\", \"salad\"]\nprint(favorite_foods[0])  # First food\nprint(favorite_foods[1])  # Second food\nprint(favorite_foods[2])  # Third food',
        expectedOutput: 'pizza\\nsushi\\nsalad'
      }
    },
    {
      id: 'modifying-lists',
      title: 'Modifying Lists',
      type: 'explanation',
      content: [
        {
          type: 'paragraph',
          text: 'Lists are mutable, which means you can change their content after creation.'
        }
      ],
      codeExamples: [
        {
          language: 'python',
          code: 'fruits = [\"apple\", \"banana\", \"cherry\"]\nfruits[1] = \"orange\"  # Change \"banana\" to \"orange\"\nprint(fruits)',
          explanation: 'We changed the second item (index 1) from \"banana\" to \"orange\".'
        }
      ],
      sandbox: {
        starterCode: '# Modify an item in your list\nfavorite_foods = [\"pizza\", \"sushi\", \"salad\"]\n# Change the second item to \"tacos\"\nfavorite_foods[1] = \"tacos\"\nprint(favorite_foods)',
        expectedOutput: '[\"pizza\", \"tacos\", \"salad\"]'
      }
    },
    {
      id: 'looping-through-lists',
      title: 'Looping Through Lists',
      type: 'explanation',
      content: [
        {
          type: 'paragraph',
          text: 'You can use a for loop to iterate through each item in a list, performing the same action on each item.'
        }
      ],
      codeExamples: [
        {
          language: 'python',
          code: 'fruits = [\"apple\", \"banana\", \"cherry\"]\nfor fruit in fruits:\n    print(fruit)',
          explanation: 'This loop goes through each item in the fruits list and prints it.'
        }
      ],
      sandbox: {
        starterCode: '# Loop through your list and print each item\nfavorite_foods = [\"pizza\", \"tacos\", \"salad\"]\nfor food in favorite_foods:\n    print(food)',
        expectedOutput: 'pizza\\ntacos\\nsalad'
      }
    },
    {
      id: 'exercise',
      title: 'Practice Exercise: Shopping List',
      type: 'exercise',
      instructions: 'Create a shopping list, add an item to it, remove an item, and then print the final list.',
      sandbox: {
        starterCode: '# Create your shopping list\nshopping_list = [\"bread\", \"milk\", \"eggs\"]\n# Add \"cheese\" to the list\n# Remove \"milk\" from the list\n# Print the final list\nprint(shopping_list)',
        expectedOutput: '[\"bread\", \"eggs\", \"cheese\"]'
      }
    },
    {
      id: 'quiz',
      title: 'Quick Quiz',
      type: 'quiz',
      questions: [
        {
          id: 'q1',
          question: 'What is the index of the first item in a Python list?',
          options: [
            { text: '0', isCorrect: true },
            { text: '1', isCorrect: false },
            { text: '-1', isCorrect: false },
            { text: 'It varies', isCorrect: false }
          ]
        },
        {
          id: 'q2',
          question: 'Which method would you use to add an item to the end of a list?',
          options: [
            { text: 'add()', isCorrect: false },
            { text: 'append()', isCorrect: true },
            { text: 'insert()', isCorrect: false },
            { text: 'push()', isCorrect: false }
          ]
        }
      ]
    }
  ]
};