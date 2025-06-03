import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CardSelectionDialog } from './CardSelectionDialog';
import { ICombatCard } from '../../../src/types/data';

describe('CardSelectionDialog', () => {
  const mockHand: ICombatCard[] = [
    { id: 'c1', name: 'Magic', faction: 'Fellowship', cardType: 'text', strength: null, abilities: [{ id: 'a1', text: 'Do magic', trigger: 'RESOLVE_CARDS' }], resolutionOrder: 1 },
    { id: 'c2', name: '2', faction: 'Fellowship', cardType: 'strength', strength: 2, abilities: [], resolutionOrder: 2 }
  ];

  it('renders all cards in hand', () => {
    render(<CardSelectionDialog hand={mockHand} onSelect={() => {}} />);
    expect(screen.getByText('Magic')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('calls onSelect with the chosen card', () => {
    const onSelect = jest.fn();
    render(<CardSelectionDialog hand={mockHand} onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId('card-btn-c2'));
    expect(onSelect).toHaveBeenCalledWith(mockHand[1]);
  });

  it('shows no cards available if hand is empty', () => {
    render(<CardSelectionDialog hand={[]} onSelect={() => {}} />);
    expect(screen.getByText('No cards available')).toBeInTheDocument();
  });
});
