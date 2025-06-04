import React from 'react';
import { ICombatCard } from '../../types/data';
import { detailedLogger } from '@/lib/utils/detailedLogger';

interface CardSelectionDialogProps {
  hand: ICombatCard[];
  onSelect: (card: ICombatCard) => void;
  disabled?: boolean;
}

export const CardSelectionDialog: React.FC<CardSelectionDialogProps> = ({ hand, onSelect, disabled }) => {
  detailedLogger.debug('BATTLE', 'CardSelectionDialog', 'render', 
    'Card selection dialog rendered', 
    { 
      cardCount: hand.length, 
      isDisabled: !!disabled,
      cardNames: hand.map(c => c.name)
    });

  const handleCardClick = (card: ICombatCard) => {
    detailedLogger.info('BATTLE', 'CardSelectionDialog', 'handleCardClick', 
      `Card clicked: ${card.name}`, 
      { 
        cardId: card.id, 
        cardName: card.name, 
        cardType: card.cardType,
        cardStrength: card.strength,
        isDisabled: !!disabled
      });
    
    if (!disabled) {
      onSelect(card);
    }
  };

  return (
    <div className="card-selection-dialog">
      <h2>Select a Card to Play</h2>
      <div className="card-list" style={{ display: 'flex', gap: '1rem' }}>
        {hand.length === 0 && <div>No cards available</div>}
        {hand.map(card => (
          <button
            key={card.id}
            onClick={() => handleCardClick(card)}
            disabled={!!disabled}
            style={{
              border: '1px solid #888',
              borderRadius: '8px',
              padding: '1rem',
              background: '#fff',
              cursor: disabled ? 'not-allowed' : 'pointer',
              minWidth: '80px',
            }}
            data-testid={`card-btn-${card.id}`}
          >
            <div><strong>{card.name}</strong></div>
            <div>Type: {card.cardType}</div>
            {card.strength !== null && <div>Strength: {card.strength}</div>}
            {card.abilities && card.abilities.length > 0 && (
              <ul style={{ fontSize: '0.9em', margin: 0, padding: 0 }}>
                {card.abilities.map(ability => (
                  <li key={ability.id}>{ability.text}</li>
                ))}
              </ul>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
