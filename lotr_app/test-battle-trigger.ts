import { GameState } from './src/lib/models/GameState';
import gameData from './src/data/gameData.json';

// Create a test game state
const gameState = new GameState(gameData);

// Place Frodo in The Shire
gameState.placeCharacter('CHAR_FELLOWSHIP_FRODO', 'REGION_THE_SHIRE');

// Place Warg in The High Pass  
gameState.placeCharacter('CHAR_SAURON_WARG', 'REGION_THE_HIGH_PASS');

console.log('Initial setup:');
console.log('Game phase:', gameState.getCurrentPhase());
console.log('Current player:', gameState.getCurrentPlayer());
console.log('Turn:', gameState.getTurn());

// Advance turn to move out of SETUP phase
gameState.nextTurn();

console.log('\nAfter nextTurn:');
console.log('Game phase:', gameState.getCurrentPhase());
console.log('Current player:', gameState.getCurrentPlayer());
console.log('Turn:', gameState.getTurn());

// Move Frodo to The High Pass (where Warg is)
console.log('\nMoving Frodo to The High Pass...');
const moveResult = gameState.moveCharacter('CHAR_FELLOWSHIP_FRODO', 'REGION_THE_HIGH_PASS');

console.log('Move successful:', moveResult);
console.log('Active battle:', gameState.getActiveBattle());
console.log('Battle history length:', gameState.battleHistory.length);

if (gameState.battleHistory.length > 0) {
  console.log('Last battle:', gameState.battleHistory[gameState.battleHistory.length - 1]);
}

console.log('\nFinal character locations:');
const frodo = gameState.getCharacterById('CHAR_FELLOWSHIP_FRODO');
const warg = gameState.getCharacterById('CHAR_SAURON_WARG');
console.log('Frodo location:', frodo?.getLocation());
console.log('Frodo defeated:', frodo?.defeated);
console.log('Warg location:', warg?.getLocation()); 
console.log('Warg defeated:', warg?.defeated);
