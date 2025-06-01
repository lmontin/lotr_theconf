import { Player } from './Player';
import { ICombatCard } from '../../types/data';
import { Faction } from './GameState';

const mockCombatCards: ICombatCard[] = [
  { id: 'card1', name: 'Strength 1', faction: 'Fellowship', resolutionOrder: 1, strengthBonus: 1, effectDescription: '' },
  { id: 'card2', name: 'Strength 2', faction: 'Fellowship', resolutionOrder: 2, strengthBonus: 2, effectDescription: '' },
  { id: 'card3', name: 'Text Card', faction: 'Fellowship', resolutionOrder: 3, effectDescription: 'Some effect' },
  { id: 'card4', name: 'Sauron Card 1', faction: 'Sauron', resolutionOrder: 1, strengthBonus: 3, effectDescription: '' },
  { id: 'card5', name: 'Sauron Card 2', faction: 'Sauron', resolutionOrder: 2, effectDescription: 'Sauron effect' },
  { id: 'card6', name: 'Either Card', faction: 'Either', resolutionOrder: 1, strengthBonus: 1, effectDescription: '' },
];

const fellowshipDeck = mockCombatCards.filter(c => c.faction === 'Fellowship' || c.faction === 'Either');
const sauronDeck = mockCombatCards.filter(c => c.faction === 'Sauron' || c.faction === 'Either');

describe('Player', () => {
  let fellowshipPlayer: Player;
  let sauronPlayer: Player;

  beforeEach(() => {
    fellowshipPlayer = new Player('Fellowship', [...fellowshipDeck]);
    sauronPlayer = new Player('Sauron', [...sauronDeck]);
  });

  it('should initialize correctly for Fellowship', () => {
    expect(fellowshipPlayer.faction).toBe('Fellowship');
    expect(fellowshipPlayer.deck.length).toBe(fellowshipDeck.length);
    expect(fellowshipPlayer.hand.length).toBe(0);
    expect(fellowshipPlayer.discard.length).toBe(0);
    expect(fellowshipPlayer.is_ai).toBe(false);
  });

  it('should initialize correctly for Sauron (AI)', () => {
    expect(sauronPlayer.faction).toBe('Sauron');
    expect(sauronPlayer.deck.length).toBe(sauronDeck.length);
    expect(sauronPlayer.hand.length).toBe(0);
    expect(sauronPlayer.discard.length).toBe(0);
    expect(sauronPlayer.is_ai).toBe(true);
  });

  it('should draw cards from deck to hand', () => {
    const numToDraw = 2;
    const initialDeckSize = fellowshipPlayer.deck.length;
    fellowshipPlayer.drawCards(numToDraw);
    expect(fellowshipPlayer.hand.length).toBe(numToDraw);
    expect(fellowshipPlayer.deck.length).toBe(initialDeckSize - numToDraw);
  });

  it('should not draw more cards than available in deck', () => {
    const numToDraw = fellowshipPlayer.deck.length + 1;
    const initialDeckSize = fellowshipPlayer.deck.length;
    fellowshipPlayer.drawCards(numToDraw);
    expect(fellowshipPlayer.hand.length).toBe(initialDeckSize);
    expect(fellowshipPlayer.deck.length).toBe(0);
  });

  it('should play a card from hand to discard pile', () => {
    fellowshipPlayer.drawCards(1);
    const cardToPlay = fellowshipPlayer.hand[0];
    expect(cardToPlay).toBeDefined();

    const playedCard = fellowshipPlayer.playCard(cardToPlay.id);
    expect(playedCard).toEqual(cardToPlay);
    expect(fellowshipPlayer.hand.length).toBe(0);
    expect(fellowshipPlayer.discard.length).toBe(1);
    expect(fellowshipPlayer.discard[0]).toEqual(cardToPlay);
  });

  it('should return undefined if playing a card not in hand', () => {
    fellowshipPlayer.drawCards(1);
    const playedCard = fellowshipPlayer.playCard('nonexistent-card-id');
    expect(playedCard).toBeUndefined();
    expect(fellowshipPlayer.hand.length).toBe(1);
    expect(fellowshipPlayer.discard.length).toBe(0);
  });

  it('should reclaim discard pile into hand', () => {
    fellowshipPlayer.drawCards(2);
    const card1 = fellowshipPlayer.hand[0];
    const card2 = fellowshipPlayer.hand[1];
    fellowshipPlayer.playCard(card1.id);
    fellowshipPlayer.playCard(card2.id);

    expect(fellowshipPlayer.hand.length).toBe(0);
    expect(fellowshipPlayer.discard.length).toBe(2);

    fellowshipPlayer.reclaimDiscardPile();
    expect(fellowshipPlayer.hand.length).toBe(2);
    expect(fellowshipPlayer.discard.length).toBe(0);
    expect(fellowshipPlayer.hand).toContain(card1);
    expect(fellowshipPlayer.hand).toContain(card2);
  });

  it('should serialize to JSON correctly', () => {
    fellowshipPlayer.drawCards(1);
    fellowshipPlayer.playCard(fellowshipPlayer.hand[0].id);
    fellowshipPlayer.drawCards(1); // one card in hand, one in discard

    const json = fellowshipPlayer.toJSON();
    expect(json.faction).toBe('Fellowship');
    expect(json.hand.length).toBe(1);
    expect(json.hand[0]).toBe(fellowshipPlayer.hand[0].id);
    expect(json.deck.length).toBe(fellowshipDeck.length - 2); // 2 drawn initially
    expect(json.discard.length).toBe(1);
    expect(json.discard[0]).toBe(fellowshipPlayer.discard[0].id);
    expect(json.is_ai).toBe(false);
  });

  it('should deserialize from JSON correctly', () => {
    const originalPlayer = new Player('Sauron', [...sauronDeck]);
    originalPlayer.drawCards(2);
    originalPlayer.playCard(originalPlayer.hand[0].id);
    originalPlayer.drawCards(1);

    const jsonData = originalPlayer.toJSON();
    const recreatedPlayer = Player.fromJSON(jsonData, mockCombatCards);

    expect(recreatedPlayer.faction).toBe(originalPlayer.faction);
    expect(recreatedPlayer.hand.length).toBe(originalPlayer.hand.length);
    recreatedPlayer.hand.forEach(card => expect(originalPlayer.hand.find(c => c.id === card.id)).toBeDefined());
    expect(recreatedPlayer.deck.length).toBe(originalPlayer.deck.length);
    recreatedPlayer.deck.forEach(card => expect(originalPlayer.deck.find(c => c.id === card.id)).toBeDefined());
    expect(recreatedPlayer.discard.length).toBe(originalPlayer.discard.length);
    recreatedPlayer.discard.forEach(card => expect(originalPlayer.discard.find(c => c.id === card.id)).toBeDefined());
    expect(recreatedPlayer.is_ai).toBe(originalPlayer.is_ai);
  });
});
