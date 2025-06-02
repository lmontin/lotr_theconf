import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CharacterPiece, { CharacterData } from './CharacterPiece';

// Mock Character Data
const mockCharacterRevealed: CharacterData = {
  id: 'frodo1',
  name: 'Frodo Baggins',
  faction: 'Free Peoples',
  isConcealed: false,
};

const mockCharacterConcealed: CharacterData = {
  id: 'gollum1',
  name: 'Gollum',
  faction: 'Sauron', // Example, could be neutral or unique
  isConcealed: true,
};

describe('CharacterPiece Component', () => {
  test('renders character name and revealed status', () => {
    render(<CharacterPiece character={mockCharacterRevealed} />);
    expect(screen.getByText('Frodo Baggins')).toBeInTheDocument();
    expect(screen.getByText('(Revealed)')).toBeInTheDocument();
    expect(screen.queryByText('(Concealed)')).not.toBeInTheDocument();
  });

  test('renders character name and concealed status', () => {
    render(<CharacterPiece character={mockCharacterConcealed} />);
    expect(screen.getByText('Gollum')).toBeInTheDocument();
    expect(screen.getByText('(Concealed)')).toBeInTheDocument();
    expect(screen.queryByText('(Revealed)')).not.toBeInTheDocument();
  });

  test('applies correct styling for revealed Free Peoples character', () => {
    const { container } = render(<CharacterPiece character={mockCharacterRevealed} />);
    const divElement = container.firstChild as HTMLElement;
    expect(divElement).toHaveClass('bg-blue-200', 'border-blue-400', 'opacity-100');
    expect(divElement).not.toHaveClass('opacity-50');
  });

  test('applies correct styling for concealed Sauron character', () => {
    const { container } = render(<CharacterPiece character={mockCharacterConcealed} />);
    const divElement = container.firstChild as HTMLElement;
    expect(divElement).toHaveClass('bg-red-200', 'border-red-400', 'opacity-50', 'italic');
  });

  test('calls onClick handler when clicked', () => {
    const handleClick = jest.fn();
    render(<CharacterPiece character={mockCharacterRevealed} onClick={handleClick} />);
    fireEvent.click(screen.getByText('Frodo Baggins'));
    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(handleClick).toHaveBeenCalledWith('frodo1');
  });

  test('does not throw error if onClick handler is not provided', () => {
    render(<CharacterPiece character={mockCharacterRevealed} />);
    expect(() => fireEvent.click(screen.getByText('Frodo Baggins'))).not.toThrow();
  });
});
