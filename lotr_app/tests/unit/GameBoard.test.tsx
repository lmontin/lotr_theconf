import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'; // Added within
import '@testing-library/jest-dom';
import GameBoard from '@/app/components/GameBoard';
import { GameState } from '@/lib/models/GameState';
import { CharacterModel } from '@/lib/models/Character';
import { RegionModel } from '@/lib/models/Region';
import { getLegalMoves as mockGetLegalMoves } from '@/lib/gameLogic/movement'; // Actual import for type, will be mocked

// Mock the GameState class and its methods
jest.mock('@/lib/models/GameState');
// Mock the CharacterModel and RegionModel if they have complex internal logic not needed for these UI tests
// For now, we'll assume their constructors and basic property access are fine.
// jest.mock('@/lib/models/Character');
// jest.mock('@/lib/models/Region');

// Mock the movement logic that GameBoard uses
jest.mock('@/lib/gameLogic/movement', () => ({
  ...jest.requireActual('@/lib/gameLogic/movement'), // Import and retain default exports
  getLegalMoves: jest.fn(),
}));

const mockCharacter1Data = {
  id: 'char1',
  name: 'Aragorn',
  faction: 'Fellowship',
  strength: 3, // Add top-level strength property
  versions: { classic: { strength: 3, abilities: [] } },
  is_revealed: true,
  defeated: false,
  // location: 'region1', // Initial location set in beforeEach
  getLocation: jest.fn(), // Mocked in beforeEach
  isDefeated: jest.fn(() => false),
  getAbilities: jest.fn(() => []), // Add missing method
  getCurrentVersionData: jest.fn(() => ({ strength: 3, abilities: [] })), // Add missing method
  // Ensure all properties expected by CharacterPiece are present or mocked
  image_url: 'path/to/aragorn.png', 
  type: 'Hero', 
} as unknown as CharacterModel;

const mockCharacter2Data = {
  id: 'char2',
  name: 'Frodo',
  faction: 'Fellowship',
  strength: 1, // Add top-level strength property
  versions: { classic: { strength: 1, abilities: [] } },
  is_revealed: true,
  defeated: false,
  // location: 'region1', // Initial location set in beforeEach
  getLocation: jest.fn(), // Mocked in beforeEach
  isDefeated: jest.fn(() => false),
  getAbilities: jest.fn(() => []), // Add missing method
  getCurrentVersionData: jest.fn(() => ({ strength: 1, abilities: [] })), // Add missing method
  image_url: 'path/to/frodo.png',
  type: 'Ring-bearer',
} as unknown as CharacterModel;

const mockRegion1Data = {
  id: 'region1',
  name: 'Rivendell',
  row: 1,
  position: 1,
  capacity: { Fellowship: 2, Sauron: 1, total: 3 },
  getCapacity: jest.fn((faction) => faction === 'Fellowship' ? 2 : 1),
  getOccupants: jest.fn(), // Mocked in beforeEach
} as unknown as RegionModel;

const mockRegion2Data = {
  id: 'region2',
  name: 'Lorien',
  row: 1,
  position: 2,
  capacity: { Fellowship: 1, Sauron: 1, total: 2 },
  getCapacity: jest.fn((faction) => 1),
  getOccupants: jest.fn(), // Mocked in beforeEach
} as unknown as RegionModel;

const mockRegion3Data = {
  id: 'region3',
  name: 'Moria',
  row: 2,
  position: 1,
  capacity: { Fellowship: 1, Sauron: 1, total: 2 },
  getCapacity: jest.fn((faction) => 1),
  getOccupants: jest.fn(), // Mocked in beforeEach
} as unknown as RegionModel;


describe('GameBoard Component', () => {
  let mockGameStateInstance: jest.Mocked<GameState>;
  let mockOnGameUpdate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup initial locations for characters
    (mockCharacter1Data.getLocation as jest.Mock).mockReturnValue('region1');
    (mockCharacter2Data.getLocation as jest.Mock).mockReturnValue('region1');

    // Setup initial occupants for regions based on character locations
    (mockRegion1Data.getOccupants as jest.Mock).mockReturnValue([mockCharacter1Data, mockCharacter2Data]);
    (mockRegion2Data.getOccupants as jest.Mock).mockReturnValue([]);
    (mockRegion3Data.getOccupants as jest.Mock).mockReturnValue([]);

    mockGameStateInstance = {
      getAllCharacters: jest.fn(() => [mockCharacter1Data, mockCharacter2Data]),
      getAllRegions: jest.fn(() => [mockRegion1Data, mockRegion2Data, mockRegion3Data]),
      getCurrentPlayer: jest.fn(() => 'Fellowship'), // Add the missing method
      getTurn: jest.fn(() => 1), // Add the missing method
      getCharacterById: jest.fn(id => {
        if (id === 'char1') return mockCharacter1Data;
        if (id === 'char2') return mockCharacter2Data;
        return undefined;
      }),
      getRegionById: jest.fn(id => {
        if (id === 'region1') return mockRegion1Data;
        if (id === 'region2') return mockRegion2Data;
        if (id === 'region3') return mockRegion3Data;
        return undefined;
      }),
      moveCharacter: jest.fn().mockReturnValue(true), // Default mock, can be overridden in specific tests
      log: jest.fn(),
      getActiveBattle: jest.fn(() => null), // Added mock method
      // Add any other GameState methods called by GameBoard if not already present
    } as unknown as jest.Mocked<GameState>;

    (mockGetLegalMoves as jest.Mock).mockReturnValue([]);
    mockOnGameUpdate = jest.fn();
  });

  test('renders characters and regions correctly', () => {
    render(<GameBoard gameState={mockGameStateInstance} onGameUpdate={mockOnGameUpdate} />);

    // Check for regions
    const rivendellRegion = screen.getByText('Rivendell').closest('div[class*="cursor-pointer"]');
    const lorienRegion = screen.getByText('Lorien').closest('div[class*="cursor-pointer"]');
    const moriaRegion = screen.getByText('Moria').closest('div[class*="cursor-pointer"]');

    expect(rivendellRegion).toBeInTheDocument();
    expect(lorienRegion).toBeInTheDocument();
    expect(moriaRegion).toBeInTheDocument();

    // Check for characters within their initial region (Rivendell)
    expect(within(rivendellRegion! as HTMLElement).getByText(/Aragorn/)).toBeInTheDocument();
    expect(within(rivendellRegion! as HTMLElement).getByText(/Frodo/)).toBeInTheDocument();
    
    // Check for characters in the pool - scope the search to the pool's direct container
    const characterPoolHeading = screen.getByText('Character Pool (All Characters)');
    const characterPoolContainer = characterPoolHeading.nextElementSibling;
    expect(characterPoolContainer).toBeInTheDocument(); 
    if (!characterPoolContainer) throw new Error("Character pool container not found");

    expect(within(characterPoolContainer as HTMLElement).getByText(/Aragorn/)).toBeInTheDocument();
    expect(within(characterPoolContainer as HTMLElement).getByText(/Frodo/)).toBeInTheDocument();
  });

  test('clicking a character selects it and fetches legal moves', async () => {
    (mockGetLegalMoves as jest.Mock).mockReturnValue([
      { type: 'FORWARD', destinationRegionId: 'region2' },
    ]);

    render(<GameBoard gameState={mockGameStateInstance} onGameUpdate={mockOnGameUpdate} />);

    const rivendellRegion = screen.getByText('Rivendell').closest('div[class*="cursor-pointer"]');
    const aragornPieceInRegion = within(rivendellRegion! as HTMLElement).getByText(/Aragorn/).closest('div[title*="Aragorn"]');
    
    expect(aragornPieceInRegion).not.toBeNull();
    if (!aragornPieceInRegion) return; 

    fireEvent.click(aragornPieceInRegion);

    await waitFor(() => {
      expect(mockGetLegalMoves).toHaveBeenCalledWith(mockCharacter1Data, mockGameStateInstance);
    });
    expect(screen.getByText('Selected: Aragorn (Fellowship)')).toBeInTheDocument();
    
    const lorienRegion = screen.getByText('Lorien').closest('div[class*="cursor-pointer"]');
    expect(lorienRegion).toHaveClass('border-yellow-500');
    expect(lorienRegion).toHaveClass('bg-yellow-200');
  });

  test('clicking a selected character deselects it', async () => {
    render(<GameBoard gameState={mockGameStateInstance} onGameUpdate={mockOnGameUpdate} />);
    
    const rivendellRegion = screen.getByText('Rivendell').closest('div[class*="cursor-pointer"]');
    const aragornPieceInRegion = within(rivendellRegion! as HTMLElement).getByText((content, element) => {
      return element?.textContent?.includes('Aragorn') || false;
    }).closest('div[title*="Aragorn"]');

    expect(aragornPieceInRegion).not.toBeNull();
    if (!aragornPieceInRegion) return;

    // First click to select
    fireEvent.click(aragornPieceInRegion);
    await waitFor(() => {
      expect(screen.getByText('Selected: Aragorn (Fellowship)')).toBeInTheDocument();
    });

    // Second click to deselect
    fireEvent.click(aragornPieceInRegion);
    await waitFor(() => {
      expect(screen.queryByText(/Selected: Aragorn \(Fellowship\)/)).not.toBeInTheDocument();
    });
    const lorienRegion = screen.getByText('Lorien').closest('div[class*="cursor-pointer"]');
    expect(lorienRegion).not.toHaveClass('border-yellow-500');
  });

  test('clicking a legal move region moves the character, updates UI, and calls onGameUpdate', async () => {
    // Initial state: Aragorn (char1) and Frodo (char2) are in Rivendell (region1)
    // This is set by beforeEach

    (mockGetLegalMoves as jest.Mock).mockReturnValue([
      { type: 'FORWARD', destinationRegionId: 'region2' }, 
    ]);

    (mockGameStateInstance.moveCharacter as jest.Mock).mockImplementation((charId, destRegionId) => {
      if (charId === 'char1' && destRegionId === 'region2') {
        (mockCharacter1Data.getLocation as jest.Mock).mockReturnValue('region2'); 
        (mockRegion1Data.getOccupants as jest.Mock).mockReturnValue([mockCharacter2Data]); 
        (mockRegion2Data.getOccupants as jest.Mock).mockReturnValue([mockCharacter1Data]);   
        return true; 
      }
      return false;
    });
    
    render(<GameBoard gameState={mockGameStateInstance} onGameUpdate={mockOnGameUpdate} />);

    // 1. Select Aragorn (from Rivendell)
    const rivendellRegionContainer = screen.getByText('Rivendell').closest('div[class*="cursor-pointer"]');
    const aragornPieceContainer = within(rivendellRegionContainer! as HTMLElement).getByText((content, element) => {
      return element?.textContent?.includes('Aragorn') || false;
    }).closest('div[title*="Aragorn"]');
    expect(aragornPieceContainer).toBeInTheDocument();
    fireEvent.click(aragornPieceContainer!);

    await waitFor(() => {
      expect(screen.getByText('Selected: Aragorn (Fellowship)')).toBeInTheDocument();
    });

    // Verify Lorien (region2) is highlighted
    let lorienRegionContainer = screen.getByText('Lorien').closest('div[class*="cursor-pointer"]');
    expect(lorienRegionContainer).toHaveClass('border-yellow-500', 'bg-yellow-200');

    // 2. Click Lorien (the legal move region)
    fireEvent.click(lorienRegionContainer!);

    // Assertions after the click:
    await waitFor(() => {
      expect(mockGameStateInstance.moveCharacter).toHaveBeenCalledWith('char1', 'region2');
    });
    
    expect(mockOnGameUpdate).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Selected: Aragorn \(Fellowship\)/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Legal moves for Aragorn/i)).not.toBeInTheDocument(); 

    lorienRegionContainer = screen.getByText('Lorien').closest('div[class*="cursor-pointer"]'); 
    expect(lorienRegionContainer).not.toHaveClass('border-yellow-500');
    expect(lorienRegionContainer).not.toHaveClass('bg-yellow-200');
    expect(lorienRegionContainer).toHaveClass('bg-green-300'); 

    expect(within(lorienRegionContainer! as HTMLElement).queryByText(/Aragorn/)).toBeInTheDocument();

    const updatedRivendellRegionContainer = screen.getByText('Rivendell').closest('div[class*="cursor-pointer"]');
    expect(within(updatedRivendellRegionContainer! as HTMLElement).queryByText(/Aragorn/)).not.toBeInTheDocument();
    expect(within(updatedRivendellRegionContainer! as HTMLElement).queryByText(/Frodo/)).toBeInTheDocument();
  });

  test('clicking an illegal region does not move character and deselects', async () => {
    (mockGetLegalMoves as jest.Mock).mockReturnValue([
      { type: 'FORWARD', destinationRegionId: 'region2' }, // Legal move is Lorien
    ]);

    render(<GameBoard gameState={mockGameStateInstance} onGameUpdate={mockOnGameUpdate} />);

    // 1. Select Aragorn (from Rivendell)
    const rivendellRegionContainer = screen.getByText('Rivendell').closest('div[class*="cursor-pointer"]');
    const aragornPieceContainer = within(rivendellRegionContainer! as HTMLElement).getByText((content, element) => {
      return element?.textContent?.includes('Aragorn') || false;
    }).closest('div[title*="Aragorn"]');
    expect(aragornPieceContainer).toBeInTheDocument();
    fireEvent.click(aragornPieceContainer!);

    await waitFor(() => {
      expect(screen.getByText('Selected: Aragorn (Fellowship)')).toBeInTheDocument();
    });

    // 2. Click Moria (region3), which is NOT a legal move
    const moriaRegionContainer = screen.getByText('Moria').closest('div[class*="cursor-pointer"]');
    expect(moriaRegionContainer).toBeInTheDocument();
    fireEvent.click(moriaRegionContainer!);

    await waitFor(() => {
      expect(screen.queryByText(/Selected: Aragorn \(Fellowship\)/)).not.toBeInTheDocument();
    });

    expect(mockGameStateInstance.moveCharacter).not.toHaveBeenCalled();
    expect(mockOnGameUpdate).not.toHaveBeenCalled();

    const currentRivendellContainer = screen.getByText('Rivendell').closest('div[class*="cursor-pointer"]');
    expect(within(currentRivendellContainer! as HTMLElement).getByText((content, element) => {
      return element?.textContent?.includes('Aragorn') || false;
    })).toBeInTheDocument();

    const lorienRegionContainer = screen.getByText('Lorien').closest('div[class*="cursor-pointer"]');
    expect(lorienRegionContainer).not.toHaveClass('border-yellow-500');
  });

  test('UI updates correctly when gameState prop changes (e.g. external update)', async () => {
    const { rerender } = render(
      <GameBoard gameState={mockGameStateInstance} onGameUpdate={mockOnGameUpdate} />
    );

    // Aragorn should be in Rivendell
    let rivendellContainer = screen.getByText('Rivendell').closest('div[class*="cursor-pointer"]');
    expect(within(rivendellContainer! as HTMLElement).getByText((content, element) => {
      return element?.textContent?.includes('Aragorn') || false;
    })).toBeInTheDocument();

    // Simulate an external update: Aragorn moves to Lorien
    (mockCharacter1Data.getLocation as jest.Mock).mockReturnValue('region2');
    (mockRegion1Data.getOccupants as jest.Mock).mockReturnValue([mockCharacter2Data]); // Aragorn left, Frodo remains
    (mockRegion2Data.getOccupants as jest.Mock).mockReturnValue([mockCharacter1Data]); // Aragorn arrived

    rerender(<GameBoard gameState={mockGameStateInstance} onGameUpdate={mockOnGameUpdate} />);
    
    const lorienContainer = screen.getByText('Lorien').closest('div[class*="cursor-pointer"]');
    expect(within(lorienContainer! as HTMLElement).getByText(/Aragorn/)).toBeInTheDocument();
    
    rivendellContainer = screen.getByText('Rivendell').closest('div[class*="cursor-pointer"]'); 
    expect(within(rivendellContainer! as HTMLElement).queryByText(/Aragorn/)).not.toBeInTheDocument();
    expect(within(rivendellContainer! as HTMLElement).getByText(/Frodo/)).toBeInTheDocument(); // Frodo should still be there
  });
});

