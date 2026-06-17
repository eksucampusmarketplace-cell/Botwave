export const DAILY_REWARDS = [
  { day: 1, coins: 1500, gems: 5, energy: 10 },
  { day: 2, coins: 2500, gems: 5, energy: 15 },
  { day: 3, coins: 4000, gems: 10, energy: 20 },
  { day: 4, coins: 6000, gems: 10, energy: 25 },
  { day: 5, coins: 8500, gems: 15, energy: 30 },
  { day: 6, coins: 12000, gems: 20, energy: 40 },
  { day: 7, coins: 18000, gems: 35, energy: 50 },
];

export type QuestKey = 'raid_3' | 'collect_10000' | 'train_25';

export type QuestDef = {
  key: QuestKey;
  title: string;
  description: string;
  metric: string;
  target: number;
  reward: { coins?: number; gems?: number; energy?: number };
};

export const QUESTS: QuestDef[] = [
  {
    key: 'raid_3',
    title: 'Send a Message',
    description: 'Raid street targets 3 times.',
    metric: 'raids',
    target: 3,
    reward: { coins: 2500, gems: 5 },
  },
  {
    key: 'collect_10000',
    title: 'Clean the Books',
    description: 'Collect 10,000 coins from businesses.',
    metric: 'coins_collected',
    target: 10000,
    reward: { coins: 5000, energy: 15 },
  },
  {
    key: 'train_25',
    title: 'Recruit Muscle',
    description: 'Train 25 crew members.',
    metric: 'troops_trained',
    target: 25,
    reward: { coins: 4000, gems: 10 },
  },
];

export function grantReward<
  T extends { coins: number; gems: number; energy: number; energy_max: number },
>(player: T, reward: { coins?: number; gems?: number; energy?: number }): T {
  player.coins = Number(player.coins) + (reward.coins ?? 0);
  player.gems = Number(player.gems) + (reward.gems ?? 0);
  player.energy = Math.min(player.energy_max, Number(player.energy) + (reward.energy ?? 0));
  return player;
}
