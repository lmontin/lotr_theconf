import { revealCard } from '@/lib/systems/BattleSystem';
import { ICombatCard } from '@/types/data';

describe('BattleSystem revealCard', () => {
  it('logs the card reveal and updates context', () => {
    const card: ICombatCard = { id: 'CARD_FELLOWSHIP_MAGIC', name: 'Magic', faction: 'Fellowship', cardType: 'text', strength: null, abilities: [], resolutionOrder: 1 };
    const ctx: any = { log: [] };
    revealCard(card, ctx);
    expect(ctx.log[0]).toMatch(/Card revealed: Magic/);
    expect(ctx.cardsRevealed).toContain('CARD_FELLOWSHIP_MAGIC');
    expect(ctx.magicCardRevealed).toBe(true);
  });
  it('sets eyeOfSauronRevealed for Eye of Sauron card', () => {
    const card: ICombatCard = { id: 'CARD_SAURON_EYE_OF_SAURON', name: 'Eye of Sauron', faction: 'Sauron', cardType: 'text', strength: null, abilities: [], resolutionOrder: 2 };
    const ctx: any = { log: [] };
    revealCard(card, ctx);
    expect(ctx.log[0]).toMatch(/Card revealed: Eye of Sauron/);
    expect(ctx.cardsRevealed).toContain('CARD_SAURON_EYE_OF_SAURON');
    expect(ctx.eyeOfSauronRevealed).toBe(true);
  });
  it('does nothing if ctx or ctx.log is missing', () => {
    const card: ICombatCard = { id: 'CARD_FELLOWSHIP_MAGIC', name: 'Magic', faction: 'Fellowship', cardType: 'text', strength: null, abilities: [], resolutionOrder: 1 };
    expect(() => revealCard(card, undefined)).not.toThrow();
    expect(() => revealCard(card, {})).not.toThrow();
  });
});
