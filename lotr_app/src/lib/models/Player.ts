import { ICombatCard } from '../../types/data';
import { Faction } from './GameState'; // Assuming Faction is exported from GameState
import { detailedLogger } from '../utils/detailedLogger';

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

        detailedLogger.debug('BATTLE', 'Player', 'constructor', 
            `Player ${faction} initialized`, 
            { 
                faction, 
                deckSize: this.deck.length, 
                handSize: this.hand.length,
                isAI: this.is_ai 
            });

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
        detailedLogger.debug('BATTLE', 'Player', 'drawCards', 
            `${this.faction} attempting to draw ${numCards} cards`, 
            { 
                faction: this.faction,
                requestedCards: numCards,
                deckSize: this.deck.length,
                currentHandSize: this.hand.length
            });

        const cardsDrawn: string[] = [];
        for (let i = 0; i < numCards; i++) {
            if (this.deck.length > 0) {
                const card = this.deck.pop(); // Removes card from deck
                if (card) {
                    this.hand.push(card); // Adds card to hand
                    cardsDrawn.push(card.name);
                }
            } else {
                // Optionally, handle deck reshuffle if rules allow, or log deck empty
                detailedLogger.warn('BATTLE', 'Player', 'drawCards', 
                    `${this.faction} player's deck is empty. Cannot draw more cards.`);
                console.warn(`${this.faction} player's deck is empty. Cannot draw more cards.`);
                break;
            }
        }

        detailedLogger.info('BATTLE', 'Player', 'drawCards', 
            `${this.faction} drew ${cardsDrawn.length} cards`, 
            { 
                faction: this.faction,
                cardsDrawn,
                newHandSize: this.hand.length,
                remainingDeckSize: this.deck.length
            });
    }

    /**
     * Plays a card from the hand to the discard pile.
     * @param cardId The ID of the card to play.
     * @returns The played card, or undefined if not found or not playable.
     */
    playCard(cardId: string): ICombatCard | undefined {
        detailedLogger.debug('BATTLE', 'Player', 'playCard', 
            `${this.faction} attempting to play card ${cardId}`, 
            { 
                faction: this.faction,
                cardId,
                handSize: this.hand.length,
                handCards: this.hand.map(c => c.id)
            });

        const cardIndex = this.hand.findIndex(card => card.id === cardId);
        if (cardIndex > -1) {
            const playedCard = this.hand.splice(cardIndex, 1)[0];
            this.discard.push(playedCard);
            
            detailedLogger.info('BATTLE', 'Player', 'playCard', 
                `${this.faction} successfully played card: ${playedCard.name}`, 
                { 
                    faction: this.faction,
                    playedCard: {
                        id: playedCard.id,
                        name: playedCard.name,
                        strength: playedCard.strength,
                        cardType: playedCard.cardType
                    },
                    newHandSize: this.hand.length,
                    newDiscardSize: this.discard.length
                });
                
            return playedCard;
        }
        
        detailedLogger.warn('BATTLE', 'Player', 'playCard', 
            `Card with id ${cardId} not found in ${this.faction} player's hand`, 
            { 
                faction: this.faction,
                requestedCardId: cardId,
                availableCards: this.hand.map(c => c.id)
            });
        console.warn(`Card with id ${cardId} not found in ${this.faction} player's hand.`);
        return undefined;
    }

    /**
     * Moves all cards from the discard pile back to the hand.
     * Typically used for the hand reclaim mechanic.
     */
    reclaimDiscardPile(): void {
        const cardsReclaimed = this.discard.map(c => c.name);
        
        detailedLogger.info('BATTLE', 'Player', 'reclaimDiscardPile', 
            `${this.faction} reclaiming discard pile`, 
            { 
                faction: this.faction,
                cardsReclaimed,
                discardSize: this.discard.length,
                currentHandSize: this.hand.length
            });

        this.hand.push(...this.discard);
        this.discard = [];
        
        detailedLogger.info('BATTLE', 'Player', 'reclaimDiscardPile', 
            `${this.faction} hand reclaim complete`, 
            { 
                faction: this.faction,
                newHandSize: this.hand.length,
                newDiscardSize: this.discard.length
            });
    }

    /**
     * Alias for reclaimDiscardPile - used by GameState.
     */
    reclaimHand(): void {
        detailedLogger.debug('BATTLE', 'Player', 'reclaimHand', 
            `${this.faction} hand reclaim triggered via alias`);
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
