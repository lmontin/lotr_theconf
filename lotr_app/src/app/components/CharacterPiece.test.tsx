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
const mockCharacterRevealed: MockCharacterData & { getAbilities: () => string[], getCurrentVersionData: () => any } = {
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
  getAbilities: () => ['ARAGORN_SPECIAL_ATTACK_MOVE'],
  getCurrentVersionData: () => ({
    abilities: [
      {
        id: 'ARAGORN_SPECIAL_ATTACK_MOVE',
        text: 'When moving, can move into any adjacent region (forward, sideways, or backward) if he attacks at least one Sauron character',
        trigger: 'CHECK_MOVE_LEGALITY'
      }
    ]
  })
};

const mockCharacterConcealed: MockCharacterData & { getAbilities: () => string[], getCurrentVersionData: () => any } = {
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
  getAbilities: () => ['SARUMAN_FORCE_STRENGTH_COMPARISON'],
  getCurrentVersionData: () => ({
    abilities: [
      {
        id: 'SARUMAN_FORCE_STRENGTH_COMPARISON',
        text: 'In battle, if the Fellowship character does not retreat, may declare that no cards are played and resolve the battle solely by comparing character strength values',
        trigger: 'BEFORE_CARDS'
      }
    ]
  })
};

describe('CharacterPiece', () => {
  let handleClick: jest.Mock;

  beforeEach(() => {
    handleClick = jest.fn();
  });

  it('renders character name with strength for own character (revealed)', () => {
    render(<CharacterPiece 
      character={mockCharacterRevealed as any} 
      onClick={handleClick} 
      viewingPlayer="Fellowship"
    />);
    expect(screen.getByText('Aragorn (4)')).toBeInTheDocument();
  });

  it('renders character name with strength for own character (concealed)', () => {
    render(<CharacterPiece 
      character={mockCharacterConcealed as any} 
      onClick={handleClick} 
      viewingPlayer="Sauron"
    />);
    expect(screen.getByText('Saruman (3)')).toBeInTheDocument();
  });

  it('renders question mark for opponent concealed character', () => {
    render(<CharacterPiece 
      character={mockCharacterConcealed as any} 
      onClick={handleClick} 
      viewingPlayer="Fellowship"
    />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('renders opponent revealed character normally', () => {
    render(<CharacterPiece 
      character={mockCharacterRevealed as any} 
      onClick={handleClick} 
      viewingPlayer="Sauron"
    />);
    expect(screen.getByText('Aragorn (4)')).toBeInTheDocument();
  });

  it('displays the correct title with abilities for own character', () => {
    render(<CharacterPiece 
      character={mockCharacterRevealed as any} 
      onClick={handleClick} 
      viewingPlayer="Fellowship"
      currentPlayer="Fellowship"
    />);
    // Check that it contains the character name and ability
    const titleElement = screen.getByTitle(/Aragorn \(Fellowship\)/);
    expect(titleElement).toBeInTheDocument();
    expect(titleElement).toHaveAttribute('title', expect.stringContaining('When moving, can move into any adjacent region'));
  });

  it('displays generic title for opponent concealed character', () => {
    render(<CharacterPiece 
      character={mockCharacterConcealed as any} 
      onClick={handleClick} 
      viewingPlayer="Fellowship"
    />);
    const expectedTitle = `Sauron Character`;
    expect(screen.getByTitle(expectedTitle)).toBeInTheDocument();
  });

  it('calls onClick handler with character id when clicked', () => {
    render(<CharacterPiece 
      character={mockCharacterRevealed as any} 
      onClick={handleClick} 
      viewingPlayer="Fellowship"
      currentPlayer="Fellowship"
    />);
    fireEvent.click(screen.getByText('Aragorn (4)'));
    expect(handleClick).toHaveBeenCalledWith(expect.anything(), mockCharacterRevealed.id);
  });

  it('does not call onClick handler when opponent character is clicked during player turn', () => {
    render(<CharacterPiece 
      character={mockCharacterConcealed as any} 
      onClick={handleClick} 
      viewingPlayer="Sauron"
      currentPlayer="Fellowship"
    />);
    fireEvent.click(screen.getByText('Saruman (3)'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('does not show detailed tooltip for opponent character during player turn', () => {
    render(<CharacterPiece 
      character={mockCharacterRevealed as any} 
      onClick={handleClick} 
      viewingPlayer="Sauron"
      currentPlayer="Sauron"
    />);
    // Character is revealed and viewed by Sauron player, but current turn is Sauron
    // So they should see the basic info but not detailed abilities since it's Fellowship character
    const titleElement = screen.getByTitle('Aragorn (Fellowship)');
    expect(titleElement).toBeInTheDocument();
    expect(titleElement).not.toHaveAttribute('title', expect.stringContaining('When moving, can move into any adjacent region'));
  });
});
