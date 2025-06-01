## Relevant Files

- `lotr_app/data/gamedata.json` - Static game data (regions, characters, combat cards)
- `lotr_app/src/lib/models/GameState.ts` - Core game state management class
- `lotr_app/src/lib/models/Character.ts` - Character class with concealment mechanics
- `lotr_app/src/lib/models/Region.ts` - Region class with adjacency and capacity logic
- `lotr_app/src/lib/models/Player.ts` - Player class with hand management
- `lotr_app/src/lib/systems/MovementSystem.ts` - Movement validation and special paths
- `lotr_app/src/lib/systems/BattleSystem.ts` - Battle resolution with 4-step process
- `lotr_app/src/lib/systems/AbilitySystem.ts` - Ability trigger and handler system
- `lotr_app/src/lib/ai/SauronAI.ts` - AI decision-making logic
- `lotr_app/src/app/components/GameBoard.tsx` - Main game board UI component
- `lotr_app/src/app/components/CharacterPiece.tsx` - Character display with concealment
- `lotr_app/src/app/components/BattleDialog.tsx` - Battle resolution UI
- `lotr_app/src/app/game/page.tsx` - Main game page
- `lotr_app/jest.config.ts` - Jest configuration file
- `lotr_app/jest.setup.ts` - Jest setup file for additional configurations
- `lotr_app/src/types/data.ts` - TypeScript interfaces for static game data
- `lotr_app/src/utils/validateGameData.ts` - Utility function to validate gamedata.json

### Notes

- Unit tests should be placed alongside code files (e.g., `GameState.ts` and `GameState.test.ts`)
- Use `npx jest [optional/path/to/test/file]` to run tests
- The game follows strict battle order and movement rules per the original board game

## Tasks

- [x] 1.0 Set Up Project Structure and Core Data Models
  - [x] 1.1 Initialize Next.js project with TypeScript and install dependencies (React, Tailwind CSS, Jest)
  - [x] 1.2 Create TypeScript interfaces for static data types (IRegion, ICharacter, ICombatCard)
  - [x] 1.3 Fix gamedata.json issues (typos, missing adjacencies, capacity data)
  - [x] 1.4 Create data validation utility to ensure gamedata.json integrity
  - [x] 1.5 Set up folder structure (/lib, /components, /data, /tests)

- [ ] 2.0 Implement Game State Management System
  - [x] 2.1 Create GameState class with turn tracking, phase management, and player state
  - [x] 2.2 Implement Character class with concealment mechanics (reveal/conceal methods)
  - [ ] 2.3 Build Region class with capacity checking and occupant tracking
  - [ ] 2.4 Create Player class with hand, deck, and discard pile management
  - [ ] 2.5 Implement hand reclaim system (when both players have 9 discards)
  - [ ] 2.6 Add game logging system for debugging and replay
  - [ ] 2.7 Create state persistence methods (save/load game)
  - [ ] 2.8 Write unit tests for all state management classes

- [ ] 3.0 Build Movement and Battle Resolution Systems
  - [ ] 3.1 Implement get_legal_moves function with forward, tunnel, and river path logic
  - [ ] 3.2 Create movement validation for capacity limits and mountain restrictions
  - [ ] 3.3 Build 4-step battle resolution system (reveal, abilities, cards, strength comparison)
  - [ ] 3.4 Implement ability trigger system with proper timing (BATTLE_START, RESOLVE_CARDS, etc.)
  - [ ] 3.5 Create all character ability handlers (Frodo retreat, Sam substitute, etc.)
  - [ ] 3.6 Implement all combat card ability handlers (Magic, Noble Sacrifice, etc.)
  - [ ] 3.7 Build retreat mechanics with direction validation
  - [ ] 3.8 Create test scenarios for battle resolution (including Aragorn vs Shelob example)

- [ ] 4.0 Develop AI Decision Logic
  - [ ] 4.1 Create move evaluation function with scoring system
  - [ ] 4.2 Implement AI priorities (attack Frodo, move toward Shire, protect key characters)
  - [ ] 4.3 Build card selection heuristics based on character strength comparison
  - [ ] 4.4 Add special ability usage logic for AI characters
  - [ ] 4.5 Create difficulty levels by adjusting AI scoring weights
  - [ ] 4.6 Write unit tests for AI decision making

- [ ] 5.0 Create Web UI Components and Game Interface
  - [ ] 5.1 Build GameBoard component with region layout matching the game board
  - [ ] 5.2 Create CharacterPiece component with concealment display (hidden/revealed states)
  - [ ] 5.3 Implement drag-and-drop or click-to-move movement interface
  - [ ] 5.4 Build BattleDialog component for step-by-step battle resolution
  - [ ] 5.5 Create CardSelection component for choosing combat cards
  - [ ] 5.6 Implement game log display showing move history and battle results
  - [ ] 5.7 Add win condition dialogs and game over screen
  - [ ] 5.8 Build responsive layout for mobile and desktop play
  - [ ] 5.9 Add visual indicators for legal moves and special paths
  - [ ] 5.10 Create integration tests for complete game flow