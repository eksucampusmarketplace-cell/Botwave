const K_FACTOR = 32;
const DEFAULT_RATING = 1200;

export function calculateElo(
  winnerRating: number,
  loserRating: number,
  isDraw: boolean = false
): { newWinnerRating: number; newLoserRating: number } {
  const expectedWinner = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
  const expectedLoser = 1 / (1 + Math.pow(10, (winnerRating - loserRating) / 400));

  if (isDraw) {
    const newWinnerRating = Math.round(winnerRating + K_FACTOR * (0.5 - expectedWinner));
    const newLoserRating = Math.round(loserRating + K_FACTOR * (0.5 - expectedLoser));
    return { newWinnerRating, newLoserRating };
  }

  const newWinnerRating = Math.round(winnerRating + K_FACTOR * (1 - expectedWinner));
  const newLoserRating = Math.round(loserRating + K_FACTOR * (0 - expectedLoser));
  return { newWinnerRating, newLoserRating };
}

export { DEFAULT_RATING, K_FACTOR };
