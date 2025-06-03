import { ICombatCard } from '../../types/data';
import { Faction } from './GameState'; // Assuming Faction is exported from GameState

export class Player {
    faction: Faction;
    hand: ICombatCard[];
    deck: ICombatCard[]; // Should be initialized with 9 cards from gameData.json
    discard: ICombatCard[];
    is_ai: boolean;

    constructor(faction: Faction, initialDeck: ICombatCard[]) {
        this.faction = faction;
        this.deck = [...initialDeck]; // Initialize with a copy of the provided deck
        this.hand = [];
        this.discard = [];
        this.is_ai = faction === 'Sauron';

        // Typically, a player might draw an initial hand here,
        // but the rules for initial hand draw are not specified yet.
        // For now, we'll assume the deck is set up, and hand is empty.
    }

    /**
     * Draws a specified number of cards from the deck to the hand.
     * If the deck runs out, no more cards are drawn.
     * @param numCards The number of cards to draw.
     */
    drawCards(numCards: number): void {
        for (let i = 0; i < numCards; i++) {
            if (this.deck.length > 0) {
                const card = this.deck.pop(); // Removes card from deck
                if (card) {
                    this.hand.push(card); // Adds card to hand
                }
            } else {
                // Optionally, handle deck reshuffle if rules allow, or log deck empty
                console.warn(`${this.faction} player's deck is empty. Cannot draw more cards.`);
                break;
            }
        }
    }

    /**
     * Plays a card from the hand to the discard pile.
     * @param cardId The ID of the card to play.
     * @returns The played card, or undefined if not found or not playable.
     */
    playCard(cardId: string): ICombatCard | undefined {
        const cardIndex = this.hand.findIndex(card => card.id === cardId);
        if (cardIndex > -1) {
            const playedCard = this.hand.splice(cardIndex, 1)[0];
            this.discard.push(playedCard);
            return playedCard;
        }
        console.warn(`Card with id ${cardId} not found in ${this.faction} player's hand.`);
        return undefined;
    }

    /**
     * Moves all cards from the discard pile back to the hand.
     * Typically used for the hand reclaim mechanic.
     */
    reclaimDiscardPile(): void {
        this.hand.push(...this.discard);
        this.discard = [];
    }

    /**
     * Alias for reclaimDiscardPile - used by GameState.
     */
    reclaimHand(): void {
        this.reclaimDiscardPile();
    }

    toJSON(): any {
        return {
            faction: this.faction,
            hand: this.hand.map(card => card.id), // Save card IDs instead of full objects
            deck: this.deck.map(card => card.id),
            discard: this.discard.map(card => card.id),
            is_ai: this.is_ai,
        };
    }

    static fromJSON(jsonData: any, allCombatCards: ICombatCard[]): Player {
        const player = new Player(jsonData.faction, []); // Initial deck will be repopulated
        player.hand = jsonData.hand.map((cardId: string) => allCombatCards.find(c => c.id === cardId)).filter(Boolean) as ICombatCard[];
        player.deck = jsonData.deck.map((cardId: string) => allCombatCards.find(c => c.id === cardId)).filter(Boolean) as ICombatCard[];
        player.discard = jsonData.discard.map((cardId: string) => allCombatCards.find(c => c.id === cardId)).filter(Boolean) as ICombatCard[];
        player.is_ai = jsonData.is_ai;
        return player;
    }
}
