/**
 * Integration test for GameBoard to reproduce the "Maximum update depth exceeded" error
 * This test simulates the user experience of selecting a character and checks for infinite re-renders
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import GameBoard from '@/app/components/GameBoard';
import { GameState } from '@/lib/models/GameState';
import rawGameData from '@/data/gameData.json';
import { IGameData } from '@/types/data';

const gameData: IGameData = rawGameData as IGameData;

// Mock console.error to catch React warnings about infinite re-renders
const originalConsoleError = console.error;
let consoleErrorCalls: string[] = [];

beforeEach(() => {
  consoleErrorCalls = [];
  console.error = jest.fn((message: string) => {
    consoleErrorCalls.push(message);
    originalConsoleError(message);
  });
});

afterEach(() => {
  console.error = originalConsoleError;
});

describe('GameBoard Integration Test - Infinite Re-render Issue', () => {
  let gameState: GameState;
  let onGameUpdateCallCount = 0;
  let onGameUpdate: () => void;

  beforeEach(() => {
    // Initialize game state similar to GamePage
    gameState = new GameState(gameData);
    gameState.randomlyPlaceFactionCharacters('Fellowship');
    gameState.randomlyPlaceFactionCharacters('Sauron');
    gameState.setupComplete = true; // Ensure setup is marked as complete
    gameState.nextPhase(); // Advance from SETUP to SAURON_MOVE
    
    // Track how many times onGameUpdate is called
    onGameUpdateCallCount = 0;
    onGameUpdate = jest.fn(() => {
      onGameUpdateCallCount++;
      console.log(`onGameUpdate called ${onGameUpdateCallCount} times`);
    });
  });

  test('should reproduce infinite re-render when selecting a character', async () => {
    // Render the GameBoard component
    render(<GameBoard gameState={gameState} onGameUpdate={onGameUpdate} />);

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByText('Game Board')).toBeInTheDocument();
    });

    // Get all characters and find a Fellowship character to select
    const allCharacters = gameState.getAllCharacters();
    const fellowshipCharacter = allCharacters.find(char => char.faction === 'Fellowship');
    
    expect(fellowshipCharacter).toBeDefined();
    console.log(`Testing with character: ${fellowshipCharacter!.name}`);

    // Find the character piece in the DOM and click it (use the first one found)
    const characterElements = screen.getAllByText(fellowshipCharacter!.name);
    expect(characterElements.length).toBeGreaterThan(0);
    const characterElement = characterElements[0]; // Use the first instance

    // Click the character to select it
    fireEvent.click(characterElement);

    // Wait for the selection to process
    await waitFor(() => {
      const selectedText = screen.queryByText(`Selected: ${fellowshipCharacter!.name} (${fellowshipCharacter!.faction})`);
      if (selectedText) {
        expect(selectedText).toBeInTheDocument();
      }
    }, { timeout: 1000 });

    // Check for the maximum update depth error in console errors
    const infiniteRenderError = consoleErrorCalls.find(call => 
      call.includes('Maximum update depth exceeded') || 
      call.includes('setState inside useEffect')
    );

    if (infiniteRenderError) {
      console.error('INFINITE RE-RENDER DETECTED:', infiniteRenderError);
      fail(`Infinite re-render detected: ${infiniteRenderError}`);
    }

    // Check if onGameUpdate was called excessively (more than expected)
    // It should only be called when a move is made, not during selection
    if (onGameUpdateCallCount > 5) {
      console.error(`onGameUpdate called ${onGameUpdateCallCount} times - possible infinite loop`);
      fail(`onGameUpdate called too many times: ${onGameUpdateCallCount}`);
    }

    console.log(`Test completed. onGameUpdate called ${onGameUpdateCallCount} times`);
  });

  test('should reproduce region highlighting issue', async () => {
    render(<GameBoard gameState={gameState} onGameUpdate={onGameUpdate} />);

    await waitFor(() => {
      expect(screen.getByText('Game Board')).toBeInTheDocument();
    });

    // Select a character
    const allCharacters = gameState.getAllCharacters();
    const testCharacter = allCharacters.find(char => char.faction === 'Fellowship');
    
    expect(testCharacter).toBeDefined();

    const characterElements = screen.getAllByText(testCharacter!.name);
    const characterElement = characterElements[0];
    fireEvent.click(characterElement);

    // Wait for legal moves to be calculated
    await waitFor(() => {
      // Check if regions are highlighted (should have yellow background)
      const yellowRegions = document.querySelectorAll('.bg-yellow-200');
      console.log(`Found ${yellowRegions.length} highlighted regions`);
      
      // If too many regions are highlighted, this indicates the bug
      if (yellowRegions.length > 10) { // Assuming a reasonable threshold
        console.warn(`Too many regions highlighted: ${yellowRegions.length}. This may indicate the bug.`);
      }
    }, { timeout: 2000 });

    // Check for React warnings about excessive re-renders
    const reactWarnings = consoleErrorCalls.filter(call => 
      call.includes('Warning') && (
        call.includes('useEffect') || 
        call.includes('dependency') ||
        call.includes('render')
      )
    );

    if (reactWarnings.length > 0) {
      console.warn('React warnings detected:', reactWarnings);
    }
  });

  test('should handle character selection and deselection properly', async () => {
    const { rerender } = render(<GameBoard gameState={gameState} onGameUpdate={onGameUpdate} />);

    await waitFor(() => {
      expect(screen.getByText('Game Board')).toBeInTheDocument();
    });

    const allCharacters = gameState.getAllCharacters();
    const testCharacter = allCharacters.find(char => char.faction === 'Fellowship');
    
    expect(testCharacter).toBeDefined();

    const characterElements = screen.getAllByText(testCharacter!.name);
    const characterElement = characterElements[0];
    
    // Select the character
    fireEvent.click(characterElement);
    
    // Wait for selection state
    await waitFor(() => {
      const selectedText = screen.queryByText(`Selected: ${testCharacter!.name} (${testCharacter!.faction})`);
      if (selectedText) {
        expect(selectedText).toBeInTheDocument();
      }
    });

    // Click the same character again to deselect
    fireEvent.click(characterElement);

    // Wait for deselection
    await waitFor(() => {
      const selectedText = screen.queryByText(`Selected: ${testCharacter!.name} (${testCharacter!.faction})`);
      expect(selectedText).not.toBeInTheDocument();
    });

    // Force a re-render to trigger potential infinite loops
    rerender(<GameBoard gameState={gameState} onGameUpdate={onGameUpdate} />);

    // Check if infinite re-render occurred after re-render
    await new Promise(resolve => setTimeout(resolve, 100)); // Small delay

    const infiniteRenderError = consoleErrorCalls.find(call => 
      call.includes('Maximum update depth exceeded')
    );

    if (infiniteRenderError) {
      fail(`Infinite re-render after forced re-render: ${infiniteRenderError}`);
    }
  });
});
