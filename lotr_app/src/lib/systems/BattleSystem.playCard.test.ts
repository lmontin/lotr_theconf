import { Player } from '../models/Player';
import { playBattleCard } from './BattleSystem';
import { ICombatCard } from '../../types/data';

describe('BattleSystem playBattleCard', () => {
  const card: ICombatCard = { id: 'CARD_FELLOWSHIP_STRENGTH_2', name: '2', faction: 'Fellowship', cardType: 'strength', strength: 2, abilities: [], resolutionOrder: 5 };
  it('removes the card from hand and adds to discard', () => {
    const player = new Player('Fellowship' as any, []);
    player.hand = [card];
    player.discard = [];
    const played = playBattleCard(player, card.id);
    expect(played).toBe(card);
    expect(player.hand).toHaveLength(0);
    expect(player.discard).toContain(card);
  });
  it('returns undefined if card not in hand', () => {
    const player = new Player('Fellowship' as any, []);
    player.hand = [];
    player.discard = [];
    const played = playBattleCard(player, 'NON_EXISTENT_CARD');
    expect(played).toBeUndefined();
    expect(player.hand).toHaveLength(0);
    expect(player.discard).toHaveLength(0);
  });
});
