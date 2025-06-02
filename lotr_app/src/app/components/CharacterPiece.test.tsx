import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CharacterPiece from './CharacterPiece';

// Local type definitions to match what CharacterPiece component expects
enum CharacterType {
  FreePeoples = "FreePeoples",
  Shadow = "Shadow",
}

enum Nation {
  Gondor = "Gondor",
  Isengard = "Isengard",
  Rohan = "Rohan",
  Elves = "Elves",
  Dwarves = "Dwarves",
  Mordor = "Mordor",
  Northmen = "Northmen",
  Southrons = "Southrons",
}

enum PlayerId {
  Player1 = "Player1",
  Player2 = "Player2",
}

interface MockCharacterData {
  id: string;
  name: string;
  type: CharacterType; // Remains for logical grouping if needed elsewhere, but component uses faction string
  faction: string; // Added for direct use by CharacterPiece
  strength: number;
  is_revealed: boolean;
  nation: Nation;
  regionId: string;
  owner: PlayerId;
  elvenRing?: boolean;
  guide?: boolean;
  canLead?: boolean;
  corruption?: number;
  isMortal?: boolean;
  isLeader?: boolean;
  onTheBoard?: boolean;
  order?: number;
}

// Mock Character Data
const mockCharacterRevealed: MockCharacterData = {
  id: 'char1',
  name: 'Aragorn',
  type: CharacterType.FreePeoples,
  faction: 'Fellowship', // Added
  strength: 4,
  is_revealed: true,
  nation: Nation.Gondor,
  regionId: 'region1',
  owner: PlayerId.Player1,
  elvenRing: false,
  guide: false,
  canLead: true,
  corruption: 0,
  isMortal: true,
  isLeader: false,
  onTheBoard: true,
  order: 1,
};

const mockCharacterConcealed: MockCharacterData = {
  id: 'char2',
  name: 'Saruman',
  type: CharacterType.Shadow,
  faction: 'Sauron', // Changed from 'Sauron Forces' to 'Sauron'
  strength: 3,
  is_revealed: false,
  nation: Nation.Isengard,
  regionId: 'region2',
  owner: PlayerId.Player2,
  elvenRing: false,
  guide: false,
  canLead: true,
  corruption: 0,
  isMortal: true,
  isLeader: false,
  onTheBoard: true,
  order: 1,
};

describe('CharacterPiece', () => {
  let handleClick: jest.Mock;

  beforeEach(() => {
    handleClick = jest.fn();
  });

  it('renders character name and revealed status', () => {
    render(<CharacterPiece character={mockCharacterRevealed as any} onClick={handleClick} />);
    expect(screen.getByText('Aragorn')).toBeInTheDocument();
    expect(screen.getByText('(Revealed)')).toBeInTheDocument();
  });

  it('renders character name and concealed status', () => {
    render(<CharacterPiece character={mockCharacterConcealed as any} onClick={handleClick} />);
    expect(screen.getByText('Saruman')).toBeInTheDocument(); // Name should be visible
    expect(screen.getByText('(Concealed)')).toBeInTheDocument();
  });

  it('displays the correct title for a revealed character', () => {
    render(<CharacterPiece character={mockCharacterRevealed as any} onClick={handleClick} />);
    const expectedTitle = `Aragorn (Fellowship) - Revealed`; // Updated faction string
    expect(screen.getByTitle(expectedTitle)).toBeInTheDocument();
  });

  it('displays the correct title for a concealed character', () => {
    render(<CharacterPiece character={mockCharacterConcealed as any} onClick={handleClick} />);
    const expectedTitle = `Saruman (Sauron) - Concealed`; // Updated faction string to 'Sauron'
    expect(screen.getByTitle(expectedTitle)).toBeInTheDocument();
  });

  it('calls onClick handler with character id when clicked', () => {
    render(<CharacterPiece character={mockCharacterRevealed as any} onClick={handleClick} />);
    fireEvent.click(screen.getByText('Aragorn'));
    expect(handleClick).toHaveBeenCalledWith(expect.anything(), mockCharacterRevealed.id);
  });
});
