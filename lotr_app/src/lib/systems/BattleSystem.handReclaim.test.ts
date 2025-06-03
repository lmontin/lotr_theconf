import { Player } from '../models/Player';
import { GameState } from '../models/GameState';
import { checkHandReclaimAfterCardPlay } from './BattleSystem';
import { ICombatCard } from '../../types/data';

describe('BattleSystem hand reclaim after card play', () => {
  function makeCards(n: number, prefix: string): ICombatCard[] {
    return Array.from({ length: n }, (_, i) => ({
      id: `${prefix}_${i}`,
      name: `${i}`,
      faction: 'Fellowship',
      cardType: 'strength',
      strength: i,
      abilities: [],
      resolutionOrder: 5
    }));
  }

  it('reclaims both hands when both players have 9 discards', () => {
    const fellowship = new Player('Fellowship' as any, []);
    const sauron = new Player('Sauron' as any, []);
    fellowship.hand = [];
    sauron.hand = [];
    fellowship.discard = makeCards(9, 'F');
    sauron.discard = makeCards(9, 'S');
    const gameState: any = {
      fellowshipPlayer: fellowship,
      sauronPlayer: sauron,
      checkAndTriggerHandReclaim: function() {
        if (this.fellowshipPlayer.discard.length >= 9 && this.sauronPlayer.discard.length >= 9) {
          this.fellowshipPlayer.reclaimDiscardPile();
          this.sauronPlayer.reclaimDiscardPile();
        }
      }
    };
    checkHandReclaimAfterCardPlay(gameState);
    expect(fellowship.hand).toHaveLength(9);
    expect(sauron.hand).toHaveLength(9);
    expect(fellowship.discard).toHaveLength(0);
    expect(sauron.discard).toHaveLength(0);
  });

  it('does not reclaim if only one player has 9 discards', () => {
    const fellowship = new Player('Fellowship' as any, []);
    const sauron = new Player('Sauron' as any, []);
    fellowship.hand = [];
    sauron.hand = [];
    fellowship.discard = makeCards(9, 'F');
    sauron.discard = makeCards(8, 'S');
    const gameState: any = {
      fellowshipPlayer: fellowship,
      sauronPlayer: sauron,
      checkAndTriggerHandReclaim: function() {
        if (this.fellowshipPlayer.discard.length >= 9 && this.sauronPlayer.discard.length >= 9) {
          this.fellowshipPlayer.reclaimDiscardPile();
          this.sauronPlayer.reclaimDiscardPile();
        }
      }
    };
    checkHandReclaimAfterCardPlay(gameState);
    expect(fellowship.hand).toHaveLength(0);
    expect(sauron.hand).toHaveLength(0);
    expect(fellowship.discard).toHaveLength(9);
    expect(sauron.discard).toHaveLength(8);
  });
});
