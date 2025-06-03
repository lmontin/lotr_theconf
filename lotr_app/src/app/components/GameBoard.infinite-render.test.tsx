import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import GameBoard from './GameBoard';
import { GameState } from '@/lib/models/GameState';
import rawGameData from '@/data/gameData.json';
import { IGameData } from '@/types/data';

const gameData: IGameData = rawGameData as IGameData;

// Mock console.error to catch infinite update errors
const originalConsoleError = console.error;
let consoleErrorCalls: string[] = [];

describe('GameBoard - Infinite Re-render Prevention', () => {
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

  test('should not trigger infinite re-renders when selecting characters', async () => {
    const gameState = new GameState(gameData);
    gameState.randomlyPlaceFactionCharacters('Fellowship');
    gameState.randomlyPlaceFactionCharacters('Sauron');

    const mockOnGameUpdate = jest.fn();
    
    render(<GameBoard gameState={gameState} onGameUpdate={mockOnGameUpdate} />);

    // Find character elements by their titles (which are visible in the HTML)
    const characterElements = screen.getAllByTitle(/\(Fellowship\)||\(Sauron\)/);
    expect(characterElements.length).toBeGreaterThan(0);

    // Select the first character
    const firstCharacter = characterElements[0];
    fireEvent.click(firstCharacter);

    // Wait a bit to see if infinite re-renders occur
    await waitFor(() => {
      // Check that no "Maximum update depth exceeded" errors occurred
      const maxUpdateErrors = consoleErrorCalls.filter(call => 
        call.includes('Maximum update depth exceeded') || 
        call.includes('Too many re-renders')
      );
      expect(maxUpdateErrors).toHaveLength(0);
    }, { timeout: 2000 });

    // Also verify that the console.error mock wasn't called excessively
    expect(consoleErrorCalls.length).toBeLessThan(10); // Allow some normal errors but not excessive
  });

  test('should handle rapid character selections without infinite loops', async () => {
    const gameState = new GameState(gameData);
    gameState.randomlyPlaceFactionCharacters('Fellowship');
    gameState.randomlyPlaceFactionCharacters('Sauron');

    const mockOnGameUpdate = jest.fn();
    
    render(<GameBoard gameState={gameState} onGameUpdate={mockOnGameUpdate} />);

    const characterElements = screen.getAllByTitle(/\(Fellowship\)||\(Sauron\)/);
    
    // Rapidly click multiple characters
    for (let i = 0; i < Math.min(3, characterElements.length); i++) {
      fireEvent.click(characterElements[i]);
      // Small delay to simulate rapid clicking
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Wait to ensure no infinite re-renders
    await waitFor(() => {
      const maxUpdateErrors = consoleErrorCalls.filter(call => 
        call.includes('Maximum update depth exceeded') || 
        call.includes('Too many re-renders')
      );
      expect(maxUpdateErrors).toHaveLength(0);
    }, { timeout: 2000 });

    // Verify console errors are minimal
    expect(consoleErrorCalls.length).toBeLessThan(15);
  });

  test('should not cause excessive re-renders with character selection state changes', async () => {
    const gameState = new GameState(gameData);
    gameState.randomlyPlaceFactionCharacters('Fellowship');
    
    const mockOnGameUpdate = jest.fn();
    
    // Mock console.log to count re-renders
    const originalConsoleLog = console.log;
    let reRenderCount = 0;
    console.log = jest.fn((message: string) => {
      if (message.includes('Calculating legal moves for selected character')) {
        reRenderCount++;
      }
      originalConsoleLog(message);
    });

    render(<GameBoard gameState={gameState} onGameUpdate={mockOnGameUpdate} />);

    // Find Fellowship characters and click one
    const fellowshipCharacters = screen.getAllByTitle(/\(Fellowship\)/);
    if (fellowshipCharacters.length > 0) {
      fireEvent.click(fellowshipCharacters[0]);

      await waitFor(() => {
        // Should not have excessive re-calculations of legal moves
        expect(reRenderCount).toBeLessThanOrEqual(2); // Allow 1-2 calculations, not dozens
      }, { timeout: 1000 });
    }

    // Verify no infinite re-render errors
    const maxUpdateErrors = consoleErrorCalls.filter(call => 
      call.includes('Maximum update depth exceeded') || 
      call.includes('Too many re-renders')
    );
    expect(maxUpdateErrors).toHaveLength(0);

    console.log = originalConsoleLog;
  });
});
