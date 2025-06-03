import { Player } from '../models/Player';
import { chooseCard, getAvailableCards } from './BattleSystem';
import { ICombatCard } from '../../types/data';

describe('BattleSystem Card Selection', () => {
  const mockHand: ICombatCard[] = [
    { id: 'CARD_FELLOWSHIP_STRENGTH_3', name: '3', faction: 'Fellowship', cardType: 'strength', strength: 3, abilities: [], resolutionOrder: 5 },
    { id: 'CARD_FELLOWSHIP_MAGIC', name: 'Magic', faction: 'Fellowship', cardType: 'text', strength: null, abilities: [], resolutionOrder: 1 }
  ];

  it('getAvailableCards returns all cards in hand', () => {
    const player = new Player('Fellowship' as any, []);
    player.hand = [...mockHand];
    expect(getAvailableCards(player)).toEqual(mockHand);
  });

  it('chooseCard returns the first card in hand', () => {
    const player = new Player('Fellowship' as any, []);
    player.hand = [...mockHand];
    const chosen = chooseCard(player);
    expect(chosen).toBe(mockHand[0]);
  });

  it('chooseCard returns undefined if hand is empty', () => {
    const player = new Player('Fellowship' as any, []);
    player.hand = [];
    const chosen = chooseCard(player);
    expect(chosen).toBeUndefined();
  });
});
