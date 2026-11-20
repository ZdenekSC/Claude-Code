import { ChampionIndex, ChampionInfo } from './champions';

/** Small champion set for tests (ratings roughly follow Data Dragon's info block). */
const C = (id: string, key: number, name: string, tags: string[], attack: number, magic: number): ChampionInfo => ({
  id, key, name, tags, attack, magic, defense: 5,
});

export const testIndex = new ChampionIndex('test', [
  C('Ahri', 103, 'Ahri', ['Mage', 'Assassin'], 3, 8),
  C('Syndra', 134, 'Syndra', ['Mage'], 2, 9),
  C('Orianna', 61, 'Orianna', ['Mage'], 4, 9),
  C('Lissandra', 127, 'Lissandra', ['Mage'], 2, 8),
  C('Zed', 238, 'Zed', ['Assassin'], 9, 1),
  C('Yasuo', 157, 'Yasuo', ['Fighter', 'Assassin'], 8, 4),
  C('Garen', 86, 'Garen', ['Fighter', 'Tank'], 7, 1),
  C('Jinx', 222, 'Jinx', ['Marksman'], 9, 2),
  C('LeeSin', 64, 'Lee Sin', ['Fighter', 'Assassin'], 8, 3),
  C('Malphite', 54, 'Malphite', ['Tank', 'Fighter'], 5, 7),
  C('Soraka', 16, 'Soraka', ['Support', 'Mage'], 2, 7),
  C('Sejuani', 113, 'Sejuani', ['Tank', 'Fighter'], 5, 6),
  C('MonkeyKing', 62, 'Wukong', ['Fighter', 'Tank'], 8, 2),
]);
