# Web UI Components and Game Interface Architecture

## 1. Introduction

This document outlines the architecture and guiding principles for developing the Web UI components and game interface for the Lord of the Rings application. Its purpose is to ensure consistency, maintainability, and a clear development path for all UI-related tasks, starting with Task 4.0.

## 2. Guiding Principles

-   **Component-Based Architecture:** Leverage React's component model to build modular and reusable UI elements.
-   **Separation of Concerns:** Keep UI logic distinct from game state and business logic. UI components should primarily be responsible for rendering data and capturing user input.
-   **State Management:** Utilize React's state and props effectively. For global game state, integrate with the existing `GameState` class. Consider React Context for prop drilling avoidance if component trees become too deep.
-   **Responsiveness:** Design components to be adaptable to various screen sizes, ensuring a good user experience on both desktop and mobile (as per Task 6.5).
-   **Clarity and User Experience:** Prioritize clear visual feedback to the user, especially for game actions like movement, character states, and battle sequences.

## 3. Technology Stack

-   **Framework:** Next.js (with React)
-   **Language:** TypeScript
-   **Styling:** Tailwind CSS
-   **State Management (Game Logic):** Existing `GameState.ts` and related model classes.
-   **State Management (UI):** React local state, props. React Context may be introduced if needed for deeply nested components.

## 4. Folder Structure

-   **Main UI Components:** `lotr_app/src/app/components/`
    -   Sub-folders can be created within `components/` for better organization if the number of components grows (e.g., `components/gameboard/`, `components/battle/`).
-   **Page-Specific Components:** Reside within their respective page folders in `lotr_app/src/app/`.
-   **Static Assets (Images, SVGs):** `lotr_app/public/`
-   **Global Styles:** `lotr_app/src/app/globals.css`

## 5. Component Design

-   **Functional Components:** Prefer functional components with Hooks.
-   **Props:** Components should receive data and callbacks via props. Define clear TypeScript interfaces for props.
-   **State:** Use `useState` for local component state.
-   **Event Handling:** Standard React event handlers (e.g., `onClick`, `onDragStart`). Callbacks passed via props will be used to communicate events to parent components or trigger game logic.

## 6. State Management Integration

-   **Game State Source:** The primary game state will be managed by the `GameState` class (`lotr_app/src/lib/models/GameState.ts`).
-   **Accessing Game State in UI:**
    -   The main game page (`lotr_app/src/app/game/page.tsx`) will likely hold an instance of `GameState`.
    -   This state will be passed down to child components (like `GameBoard`) via props.
    -   Updates to the game state (e.g., after a character move) will trigger re-renders of relevant components.
-   **Updating Game State from UI:**
    -   User interactions (e.g., clicking to move a character) will trigger functions that call methods on the `GameState` instance or game logic functions (e.g., `moveCharacter` from `movement.ts`).
    -   These game logic functions will update the `GameState`, which in turn will cause the UI to re-render with the new state.

## 7. Key UI Components (Initial Focus - Task 4.0)

### 7.1. `GameBoard.tsx`
    -   **Location:** `lotr_app/src/app/components/GameBoard.tsx`
    -   **Responsibility:**
        -   Renders the overall game board layout, including all regions.
        -   Displays `CharacterPiece` components within their respective regions.
        -   Manages the selection of characters and target regions for movement.
        -   Integrates with `getLegalMoves` to visually indicate valid moves.
    -   **Interaction:** Will handle clicks on regions or characters to initiate movement.

### 7.2. `CharacterPiece.tsx`
    -   **Location:** `lotr_app/src/app/components/CharacterPiece.tsx`
    -   **Responsibility:**
        -   Displays a single character on the board.
        -   Visually represents the character's concealment status (hidden/revealed).
        -   May handle drag-and-drop interactions if that approach is chosen for movement.
    -   **Props:** Character data (name, faction, concealment status, current location), player affiliation.

### 7.3. `RegionDisplay.tsx` (Potential new component)
    -   **Location:** `lotr_app/src/app/components/RegionDisplay.tsx` (or similar name)
    -   **Responsibility:**
        -   Renders a single region on the board.
        -   Displays region name and potentially other visual cues (e.g., if it's a stronghold, if it's highlighted as a legal move).
        -   Handles click events to select a region as a movement destination.
    -   **Props:** Region data (name, ID, type), highlight status.

### 7.4. `MovementIndicator.tsx` (Potential new component for Task 6.6)
    -   **Location:** `lotr_app/src/app/components/MovementIndicator.tsx`
    -   **Responsibility:** Provides visual cues on the `GameBoard` for legal moves available to a selected character (e.g., highlighting regions, drawing arrows for special paths).

## 8. Styling

-   **Primary Tool:** Tailwind CSS will be used for most styling.
-   **Custom CSS:** For complex styles not easily achievable with Tailwind, or for global styles, `lotr_app/src/app/globals.css` can be used.
-   **Component-Specific Styles:** If necessary, CSS Modules can be considered for styles tightly coupled to a specific component, though Tailwind should cover most cases.

## 9. Interactivity (Movement - Task 4.3)

-   **Initial Approach:** Click-to-move is recommended for simplicity and touch-friendliness.
    1.  Player clicks on a `CharacterPiece` they control.
    2.  The `GameBoard` component fetches and displays legal moves for that character (potentially using `MovementIndicator`).
    3.  Player clicks on a valid `RegionDisplay` to select the destination.
    4.  The `GameBoard` component calls the `moveCharacter` function.
-   **Alternative (Drag-and-Drop):**
    -   If implemented, `react-dnd` or a similar library would be suitable.
    -   `CharacterPiece` would be draggable.
    -   `RegionDisplay` (or designated drop zones on `GameBoard`) would be droppable targets.
    -   Validation of legal moves would still be crucial.

## 10. API Integration (Game Logic)

-   UI components will interact with the game logic primarily through functions exposed in:
    -   `lotr_app/src/lib/gameLogic/movement.ts` (e.g., `getLegalMoves`, `moveCharacter`)
    -   `lotr_app/src/lib/models/GameState.ts` (for querying current state)
-   These functions will be called from event handlers within the React components, typically orchestrated by container components like `GameBoard.tsx` or the main game page.

## 11. Future Considerations (Tasks 5.0, 6.0 and beyond)

This architecture should be extensible to accommodate future UI components and interactions:

-   **`BattleDialog.tsx` (Task 6.1):** A modal or dedicated section to guide users through the 4-step battle resolution. It will need to display character stats, card choices, and outcomes.
-   **`CardSelection.tsx` (Task 6.2):** Component for players to view and select combat cards from their hand.
-   **`GameLog.tsx` (Task 6.3):** A display area for game events, moves, and battle results.
-   **Data Flow:** As complexity increases, especially with battle interactions and AI, careful management of data flow and state updates will be critical. React Context or a lightweight state management library might become beneficial.

This document should be updated as the UI development progresses and new architectural decisions are made.
