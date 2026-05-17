import { registerCommand, type MessageContext } from './registry';
import { sendReply, pickResponse } from './helpers';
import { gameStartReplies, pollReplies, leaderboardReplies } from '../utils/responsePools';
import { currentTimeStr } from '../utils/antiban';
import { savePoll, recordVote, getLeaderboard, getActivePoll, incrementLeaderboard } from '../../database';

// ─── Game State ──────────────────────────────────────────────────────────────

interface NumberGuessGame { type: 'numberguess'; target: number; attempts: number; userJid: string }
interface TriviaGame { type: 'trivia'; question: string; answer: string; options: string[]; userJid: string }
interface HangmanGame { type: 'hangman'; word: string; guessed: Set<string>; wrongGuesses: number; userJid: string }
interface WordChainGame { type: 'wordchain'; lastWord: string; usedWords: Set<string>; userJid: string }
type GameState = NumberGuessGame | TriviaGame | HangmanGame | WordChainGame;
const gameStates: Map<string, GameState> = new Map();

const triviaQuestions = [
  { q: 'What planet is known as the Red Planet?', a: 'mars', opts: ['Venus', 'Mars', 'Jupiter', 'Saturn'] },
  { q: 'How many continents are there?', a: '7', opts: ['5', '6', '7', '8'] },
  { q: 'What is the chemical symbol for gold?', a: 'au', opts: ['Go', 'Gd', 'Au', 'Ag'] },
  { q: 'Which ocean is the largest?', a: 'pacific', opts: ['Atlantic', 'Indian', 'Pacific', 'Arctic'] },
  { q: 'What year did the Titanic sink?', a: '1912', opts: ['1905', '1912', '1920', '1898'] },
  { q: 'What is the smallest country in the world?', a: 'vatican', opts: ['Monaco', 'Vatican City', 'San Marino', 'Liechtenstein'] },
  { q: 'How many bones are in the human body?', a: '206', opts: ['186', '206', '216', '256'] },
  { q: 'What gas do plants absorb from the atmosphere?', a: 'carbon dioxide', opts: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Hydrogen'] },
  { q: 'Which animal is the largest mammal?', a: 'blue whale', opts: ['Elephant', 'Blue Whale', 'Giraffe', 'Hippo'] },
  { q: 'What is the hardest natural substance?', a: 'diamond', opts: ['Gold', 'Iron', 'Diamond', 'Platinum'] },
  { q: 'In which country is the Great Barrier Reef?', a: 'australia', opts: ['Indonesia', 'Australia', 'Philippines', 'Brazil'] },
  { q: 'What is the speed of light in km/s (approx)?', a: '300000', opts: ['150,000', '200,000', '300,000', '400,000'] },
  { q: 'Who painted the Mona Lisa?', a: 'da vinci', opts: ['Michelangelo', 'Da Vinci', 'Raphael', 'Picasso'] },
  { q: 'What is the capital of Japan?', a: 'tokyo', opts: ['Osaka', 'Tokyo', 'Kyoto', 'Yokohama'] },
  { q: 'How many sides does a hexagon have?', a: '6', opts: ['5', '6', '7', '8'] },
];

const hangmanWords = [
  'javascript', 'python', 'whatsapp', 'computer', 'programming', 'algorithm',
  'database', 'keyboard', 'internet', 'software', 'hardware', 'function',
  'variable', 'elephant', 'chocolate', 'universe', 'adventure', 'butterfly',
  'telescope', 'dinosaur', 'pineapple', 'waterfall', 'hurricane', 'astronomy',
];

async function startGame(context: MessageContext, args: string[], sock: any): Promise<void> {
  const gameType = args[0]?.toLowerCase();

  if (!gameType) {
    const response = `*MINI GAMES*\n\nAvailable:\n!play numberguess\n!trivia\n!hangman\n!wordchain`;
    await sendReply(context.chatJid, response, sock, context.rawMessage.key, context.queue);
    return;
  }

  switch (gameType) {
    case 'numberguess': {
      const targetNumber = Math.floor(Math.random() * 100) + 1;
      gameStates.set(context.chatJid, { type: 'numberguess', target: targetNumber, attempts: 0, userJid: context.senderJid });
      await sendReply(
        context.chatJid,
        "I'm thinking of a number between 1 and 100.\nUse *!answer [number]* to guess!",
        sock,
        context.rawMessage.key,
        context.queue,
      );
      break;
    }
    case 'trivia': {
      const trivia = triviaQuestions[Math.floor(Math.random() * triviaQuestions.length)];
      gameStates.set(context.chatJid, { type: 'trivia', question: trivia.q, answer: trivia.a, options: trivia.opts, userJid: context.senderJid });
      let msg = `*TRIVIA TIME!*\n\n${trivia.q}\n\n`;
      trivia.opts.forEach((opt, i) => { msg += `${i + 1}. ${opt}\n`; });
      msg += '\nUse *!answer [number or text]* to answer!';
      await sendReply(context.chatJid, msg, sock, context.rawMessage.key, context.queue);
      break;
    }
    case 'hangman': {
      const word = hangmanWords[Math.floor(Math.random() * hangmanWords.length)];
      gameStates.set(context.chatJid, { type: 'hangman', word, guessed: new Set<string>(), wrongGuesses: 0, userJid: context.senderJid });
      const display = word.split('').map(() => '_').join(' ');
      await sendReply(context.chatJid, `*HANGMAN*\n\n${display}\n\nWord: ${word.length} letters\nWrong guesses left: 6\n\nGuess a letter with *!answer [letter]*`, sock, context.rawMessage.key, context.queue);
      break;
    }
    case 'wordchain': {
      const starters = ['apple', 'house', 'music', 'table', 'river', 'light', 'ocean', 'stone'];
      const starter = starters[Math.floor(Math.random() * starters.length)];
      gameStates.set(context.chatJid, { type: 'wordchain', lastWord: starter, usedWords: new Set([starter]), userJid: context.senderJid });
      await sendReply(context.chatJid, `*WORD CHAIN*\n\nI start with: *${starter}*\n\nYour turn! Send a word starting with the letter *${starter[starter.length - 1].toUpperCase()}*\n\nUse *!answer [word]*`, sock, context.rawMessage.key, context.queue);
      break;
    }
    default:
      await sendReply(
        context.chatJid,
        `Unknown game. Try: !play numberguess, !trivia, !hangman, !wordchain`,
        sock,
        context.rawMessage.key,
        context.queue,
      );
  }
}

async function handleAnswer(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!args.length) {
    await sendReply(context.chatJid, 'Please provide an answer.', sock, context.rawMessage.key, context.queue);
    return;
  }

  const game = gameStates.get(context.chatJid);
  if (!game) {
    await sendReply(context.chatJid, 'No active game. Start one with !play', sock, context.rawMessage.key, context.queue);
    return;
  }

  const answer = args.join(' ').toLowerCase().trim();

  switch (game.type) {
    case 'numberguess': {
      const guess = parseInt(args[0], 10);
      if (isNaN(guess)) {
        await sendReply(context.chatJid, 'Please provide a valid number', sock, context.rawMessage.key, context.queue);
        return;
      }
      game.attempts++;
      if (guess === game.target) {
        gameStates.delete(context.chatJid);
        await sendReply(context.chatJid, `CORRECT! The number was ${game.target}. You got it in ${game.attempts} attempt(s)!`, sock, context.rawMessage.key, context.queue);
      } else if (guess < game.target) {
        await sendReply(context.chatJid, `Too low! Try higher. (Attempt ${game.attempts})`, sock, context.rawMessage.key, context.queue);
      } else {
        await sendReply(context.chatJid, `Too high! Try lower. (Attempt ${game.attempts})`, sock, context.rawMessage.key, context.queue);
      }
      break;
    }
    case 'trivia': {
      // Accept option number or text match
      const optionNum = parseInt(answer, 10);
      const isCorrect =
        answer === game.answer ||
        answer.includes(game.answer) ||
        game.answer.includes(answer) ||
        (optionNum >= 1 && optionNum <= game.options.length && game.options[optionNum - 1].toLowerCase().includes(game.answer));
      gameStates.delete(context.chatJid);
      if (isCorrect) {
        await sendReply(context.chatJid, `Correct! The answer is *${game.options.find(o => o.toLowerCase().includes(game.answer)) || game.answer}*`, sock, context.rawMessage.key, context.queue);
      } else {
        await sendReply(context.chatJid, `Wrong! The correct answer was *${game.options.find(o => o.toLowerCase().includes(game.answer)) || game.answer}*\n\nTry again with !trivia`, sock, context.rawMessage.key, context.queue);
      }
      break;
    }
    case 'hangman': {
      const letter = answer[0]?.toLowerCase();
      if (!letter || !/[a-z]/.test(letter)) {
        await sendReply(context.chatJid, 'Please guess a single letter (a-z)', sock, context.rawMessage.key, context.queue);
        return;
      }
      if (game.guessed.has(letter)) {
        await sendReply(context.chatJid, `You already guessed "${letter}". Try a different letter.`, sock, context.rawMessage.key, context.queue);
        return;
      }
      game.guessed.add(letter);
      if (!game.word.includes(letter)) {
        game.wrongGuesses++;
      }
      const display = game.word.split('').map(c => game.guessed.has(c) ? c : '_').join(' ');
      const guessedLetters = Array.from(game.guessed).join(', ');
      if (!display.includes('_')) {
        gameStates.delete(context.chatJid);
        await sendReply(context.chatJid, `*YOU WIN!*\n\n${display}\n\nThe word was *${game.word}*! Wrong guesses: ${game.wrongGuesses}`, sock, context.rawMessage.key, context.queue);
      } else if (game.wrongGuesses >= 6) {
        gameStates.delete(context.chatJid);
        await sendReply(context.chatJid, `*GAME OVER!*\n\nThe word was *${game.word}*\n\nTry again with !hangman`, sock, context.rawMessage.key, context.queue);
      } else {
        await sendReply(context.chatJid, `${display}\n\nGuessed: ${guessedLetters}\nWrong guesses left: ${6 - game.wrongGuesses}`, sock, context.rawMessage.key, context.queue);
      }
      break;
    }
    case 'wordchain': {
      const word = answer.toLowerCase().trim();
      if (word.length < 2) {
        await sendReply(context.chatJid, 'Word must be at least 2 letters long.', sock, context.rawMessage.key, context.queue);
        return;
      }
      const requiredLetter = game.lastWord[game.lastWord.length - 1];
      if (word[0] !== requiredLetter) {
        await sendReply(context.chatJid, `Your word must start with *${requiredLetter.toUpperCase()}*! (Last word: ${game.lastWord})`, sock, context.rawMessage.key, context.queue);
        return;
      }
      if (game.usedWords.has(word)) {
        await sendReply(context.chatJid, `"${word}" was already used! Try another word starting with *${requiredLetter.toUpperCase()}*`, sock, context.rawMessage.key, context.queue);
        return;
      }
      game.usedWords.add(word);
      // Bot's turn — find a word starting with the last letter of user's word
      const nextLetter = word[word.length - 1];
      const botWords = ['elephant', 'tiger', 'rainbow', 'whisper', 'rocket', 'engine', 'energy', 'yellow', 'wizard', 'dream', 'music', 'castle', 'eagle', 'echo', 'orbit', 'turtle', 'emerald', 'desert', 'train', 'needle', 'eagle', 'evening', 'garden', 'nature', 'escape'];
      const available = botWords.filter(w => w[0] === nextLetter && !game.usedWords.has(w));
      if (available.length === 0) {
        gameStates.delete(context.chatJid);
        await sendReply(context.chatJid, `Nice one! I can't think of a word starting with *${nextLetter.toUpperCase()}*. You win! Chain length: ${game.usedWords.size} words`, sock, context.rawMessage.key, context.queue);
      } else {
        const botWord = available[Math.floor(Math.random() * available.length)];
        game.usedWords.add(botWord);
        game.lastWord = botWord;
        await sendReply(context.chatJid, `*${word}* — nice!\n\nMy turn: *${botWord}*\n\nYour turn! Word starting with *${botWord[botWord.length - 1].toUpperCase()}*\nChain: ${game.usedWords.size} words`, sock, context.rawMessage.key, context.queue);
      }
      break;
    }
  }
}

async function createPoll(context: MessageContext, args: string[], sock: any): Promise<void> {
  const pollInput = args
    .join(' ')
    .split('|')
    .map((s) => s.trim());

  if (pollInput.length < 3) {
    await sendReply(
      context.chatJid,
      'Usage: *!poll [question] | [option1] | [option2] | ...*',
      sock,
      context.rawMessage.key,
      context.queue,
    );
    return;
  }

  const question = pollInput[0];
  const options = pollInput.slice(1).filter((o) => o.length > 0);

  try {
    await savePoll(context.sessionId || '', context.chatJid, question, options, context.senderJid);

    let pollMessage = `*POLL*\n\n*${question}*\n\n`;
    options.forEach((option, index) => {
      pollMessage += `${index + 1}. ${option}\n`;
    });
    pollMessage += '\nVote: !vote [number]';

    await sendReply(context.chatJid, pollMessage, sock, context.rawMessage.key, context.queue);
  } catch (error) {
    console.error('Error creating poll:', error);
    await sendReply(context.chatJid, 'Error creating poll.', sock, context.rawMessage.key, context.queue);
  }
}

async function handleVote(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!args.length) {
    await sendReply(context.chatJid, 'Usage: *!vote [number]*\n\nVote for an option in the active poll.', sock, context.rawMessage.key, context.queue);
    return;
  }

  const optionNum = parseInt(args[0], 10);
  if (isNaN(optionNum) || optionNum < 1) {
    await sendReply(context.chatJid, 'Please provide a valid option number.', sock, context.rawMessage.key, context.queue);
    return;
  }

  if (!context.sessionId) {
    await sendReply(context.chatJid, 'Voting not available without a session.', sock, context.rawMessage.key, context.queue);
    return;
  }

  try {
    const poll = await getActivePoll(context.sessionId, context.chatJid);
    if (!poll) {
      await sendReply(context.chatJid, 'No active poll in this chat. Create one with !poll', sock, context.rawMessage.key, context.queue);
      return;
    }

    if (optionNum > (poll.options?.length || 0)) {
      await sendReply(context.chatJid, `Invalid option. Choose 1-${poll.options.length}`, sock, context.rawMessage.key, context.queue);
      return;
    }

    await recordVote(poll.id, optionNum - 1);
    const vars = { name: context.senderJid.split('@')[0], time: currentTimeStr() };
    const response = pickResponse(pollReplies, vars, false);
    await sendReply(context.chatJid, `${response}\nYou voted for: *${poll.options[optionNum - 1]}*`, sock, context.rawMessage.key, context.queue);
  } catch (error) {
    console.error('Vote error:', error);
    await sendReply(context.chatJid, 'Error recording vote. Try again.', sock, context.rawMessage.key, context.queue);
  }
}

async function showLeaderboard(context: MessageContext, sock: any): Promise<void> {
  if (!context.sessionId) {
    await sendReply(context.chatJid, 'LEADERBOARD - Session not configured.', sock, context.rawMessage.key, context.queue);
    return;
  }

  try {
    const leaderboardData = await getLeaderboard(context.sessionId, 10);

    if (!leaderboardData || leaderboardData.length === 0) {
      await sendReply(context.chatJid, 'LEADERBOARD - No messages yet.', sock, context.rawMessage.key, context.queue);
      return;
    }

    let leaderboardMsg = '*LEADERBOARD*\n\n';
    leaderboardData.forEach((entry: any, index: number) => {
      const name = entry.user_name || entry.user_jid?.split('@')[0] || 'Unknown';
      const medal = index === 0 ? '' : index === 1 ? '' : index === 2 ? '' : `${index + 1}.`;
      leaderboardMsg += `${medal} *${name}* - ${entry.message_count || 0} msgs\n`;
    });

    await sendReply(context.chatJid, leaderboardMsg, sock, context.rawMessage.key, context.queue);
  } catch (error) {
    console.error('Leaderboard error:', error);
    await sendReply(context.chatJid, 'Leaderboard temporarily unavailable', sock, context.rawMessage.key, context.queue);
  }
}

// ─── Register Game Commands ──────────────────────────────────────────────────

registerCommand({ name: 'play', aliases: ['play'], category: 'games', description: 'Start a mini game', execute: (ctx, args, sock) => startGame(ctx, args, sock) });
registerCommand({ name: 'trivia', aliases: ['trivia'], category: 'games', description: 'Start a trivia game', execute: (ctx, _a, sock) => startGame(ctx, ['trivia'], sock) });
registerCommand({ name: 'hangman', aliases: ['hangman'], category: 'games', description: 'Start hangman', execute: (ctx, _a, sock) => startGame(ctx, ['hangman'], sock) });
registerCommand({ name: 'wordchain', aliases: ['wordchain'], category: 'games', description: 'Start word chain', execute: (ctx, _a, sock) => startGame(ctx, ['wordchain'], sock) });
registerCommand({ name: 'answer', aliases: ['answer'], category: 'games', description: 'Answer a game question', execute: (ctx, args, sock) => handleAnswer(ctx, args, sock) });
registerCommand({ name: 'poll', aliases: ['poll', 'survey'], category: 'games', description: 'Create a poll', execute: (ctx, args, sock) => createPoll(ctx, args, sock) });
registerCommand({ name: 'vote', aliases: ['vote'], category: 'games', description: 'Vote on a poll', execute: (ctx, args, sock) => handleVote(ctx, args, sock) });
registerCommand({ name: 'leaderboard', aliases: ['leaderboard', 'top', 'scores', 'lb'], category: 'games', description: 'Show leaderboard', execute: (ctx, _a, sock) => showLeaderboard(ctx, sock) });
