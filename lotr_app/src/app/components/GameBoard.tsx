'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react'; // Added useMemo
import CharacterPiece from './CharacterPiece';
import { CardSelectionDialog } from './CardSelectionDialog';
import { GameState } from '@/lib/models/GameState';
import { CharacterModel } from '@/lib/models/Character';
import { RegionModel } from '@/lib/models/Region';
import { getLegalMoves, LegalMove } from '@/lib/gameLogic/movement';
import { resolveFullBattle, getAvailableCards } from '@/lib/systems/BattleSystem';
import { ICombatCard } from '@/types/data';
import { logUI, logMovement, logStateSnapshot, detailedLogger } from '@/lib/utils/detailedLogger';

interface GameBoardProps {
  gameState: GameState;
  onGameUpdate: () => void;
}

const GameBoard: React.FC<GameBoardProps> = ({ gameState, onGameUpdate }) => {
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [legalMoveRegionIds, setLegalMoveRegionIds] = useState<string[]>([]);
  const [legalMoves, setLegalMoves] = useState<LegalMove[]>([]);
  
  // Battle resolution state
  const [showCardSelection, setShowCardSelection] = useState(false);
  const [battlePhase, setBattlePhase] = useState<'WAITING_FOR_ATTACKER' | 'WAITING_FOR_DEFENDER' | 'RESOLVING' | null>(null);
  const [attackerCard, setAttackerCard] = useState<ICombatCard | null>(null);
  const [defenderCard, setDefenderCard] = useState<ICombatCard | null>(null);
  const [battleResult, setBattleResult] = useState<string | null>(null);

  const allCharacters = gameState.getAllCharacters();
  const allRegions = gameState.getAllRegions();
  const currentPlayer = gameState.getCurrentPlayer();
  // For now, assume viewing player is the same as current player
  // This could be made configurable for multiplayer scenarios
  const viewingPlayer = currentPlayer;

  useEffect(() => {
    // If a character was selected, calculate legal moves for them
    if (selectedCharacterId) {
      const character = gameState.getCharacterById(selectedCharacterId);
      if (character && !character.defeated) {
        console.log("Calculating legal moves for selected character:", character.name);
        const moves = getLegalMoves(character, gameState);
        setLegalMoves(moves);
        setLegalMoveRegionIds(moves.map(move => move.destinationRegionId));
      } else {
        // Character might have been defeated or removed, so clear selection
        console.log("Selected character not found or defeated, clearing selection");
        setSelectedCharacterId(null);
        setLegalMoves([]);
        setLegalMoveRegionIds([]);
      }
    } else {
      // No character selected, clear legal moves
      setLegalMoves([]);
      setLegalMoveRegionIds([]);
    }
  }, [selectedCharacterId]); // Only depend on selectedCharacterId to avoid infinite re-renders

  // Battle resolution effect
  useEffect(() => {
    const activeBattle = gameState.getActiveBattle();
    if (activeBattle && !showCardSelection && !battlePhase) {
      detailedLogger.info('BATTLE', 'GameBoard', 'battleTrigger', 
        'Battle detected, starting battle UI', 
        { 
          triggerId: activeBattle.triggeringCharacterId,
          defenderCount: activeBattle.defenders?.length || 0,
          hasDefenders: !!activeBattle.defenders
        });

      // Reveal attacker when battle starts
      const attacker = gameState.getCharacterById(activeBattle.triggeringCharacterId);
      if (attacker && !gameState.isCharacterRevealed(attacker.id)) {
        gameState.addRevealedCharacter(attacker.id);
        gameState.log(`${attacker.name} is revealed due to battle.`);
        detailedLogger.info('BATTLE', 'GameBoard', 'battleTrigger', 
          `Attacker ${attacker.name} revealed due to battle`);
      }
      
      // Reveal defender characters when battle starts
      if (activeBattle.defenders && activeBattle.defenders.length > 0) {
        activeBattle.defenders.forEach((defender: CharacterModel) => {
          if (!gameState.isCharacterRevealed(defender.id)) {
            gameState.addRevealedCharacter(defender.id);
            gameState.log(`${defender.name} is revealed due to battle.`);
            detailedLogger.info('BATTLE', 'GameBoard', 'battleTrigger', 
              `Defender ${defender.name} revealed due to battle`);
          }
        });
      }
      
      // Start battle resolution process
      setBattlePhase('WAITING_FOR_ATTACKER');
      setShowCardSelection(true);
      setBattleResult(null);
      setAttackerCard(null);
      setDefenderCard(null);
      
      detailedLogger.info('BATTLE', 'GameBoard', 'battleTrigger', 
        'Battle UI setup complete, waiting for attacker card selection');
        
      onGameUpdate(); // Update UI to show revealed characters
    }
  }, [gameState.getActiveBattle(), showCardSelection, battlePhase]);

  const handleCardSelection = (card: ICombatCard) => {
    const activeBattle = gameState.getActiveBattle();
    if (!activeBattle) {
      detailedLogger.warn('BATTLE', 'GameBoard', 'handleCardSelection', 
        'Card selection attempted but no active battle found');
      return;
    }

    detailedLogger.info('BATTLE', 'GameBoard', 'handleCardSelection', 
      `Card selected in battle phase: ${battlePhase}`, 
      { 
        cardId: card.id, 
        cardName: card.name, 
        cardStrength: card.strength,
        battlePhase,
        attackerId: activeBattle.triggeringCharacterId,
        defenderCount: activeBattle.defenders?.length || 0
      });

    if (battlePhase === 'WAITING_FOR_ATTACKER') {
      setAttackerCard(card);
      setBattlePhase('WAITING_FOR_DEFENDER');
      detailedLogger.info('BATTLE', 'GameBoard', 'handleCardSelection', 
        'Attacker card selected, waiting for defender', 
        { attackerCard: card.name });
      // Don't hide card selection yet, wait for defender
    } else if (battlePhase === 'WAITING_FOR_DEFENDER') {
      setDefenderCard(card);
      setBattlePhase('RESOLVING');
      setShowCardSelection(false);
      
      detailedLogger.info('BATTLE', 'GameBoard', 'handleCardSelection', 
        'Defender card selected, resolving battle', 
        { defenderCard: card.name, attackerCard: attackerCard?.name });
      
      // Resolve the battle
      resolveBattle(activeBattle, attackerCard!, card);
    }
  };

  const resolveBattle = (battle: any, attackerCard: ICombatCard, defenderCard: ICombatCard) => {
    detailedLogger.info('BATTLE', 'GameBoard', 'resolveBattle', 
      'Starting battle resolution', 
      { 
        battleId: battle.triggeringCharacterId,
        attackerCard: attackerCard.name,
        defenderCard: defenderCard.name,
        defenderCount: battle.defenders?.length || 0
      });

    const attacker = gameState.getCharacterById(battle.triggeringCharacterId);
    const defenders = battle.defenders;
    
    if (!attacker || !defenders || defenders.length === 0) {
      const errorMsg = 'Battle resolution failed: invalid battle data';
      detailedLogger.error('BATTLE', 'GameBoard', 'resolveBattle', errorMsg, 
        { 
          hasAttacker: !!attacker, 
          hasDefenders: !!defenders, 
          defenderCount: defenders?.length || 0 
        });
      setBattleResult(errorMsg);
      setTimeout(() => clearBattle(), 3000);
      return;
    }

    // For simplicity, battle against first defender
    const defender = defenders[0];
    
    // Debug: Check if attacker and defender are the same object reference
    detailedLogger.info('BATTLE', 'GameBoard', 'resolveBattle', 
      'Checking character object references', 
      { 
        attackerName: attacker.name,
        attackerId: attacker.id,
        attackerObjectRef: attacker === defender ? 'SAME_OBJECT' : 'DIFFERENT_OBJECT',
        defenderName: defender.name,
        defenderId: defender.id,
        sameCharacter: attacker.id === defender.id
      });
    
    detailedLogger.info('BATTLE', 'GameBoard', 'resolveBattle', 
      'Resolving full battle between characters', 
      { 
        attackerName: attacker.name,
        attackerStrength: attacker.strength,
        defenderName: defender.name,
        defenderStrength: defender.strength,
        attackerCardName: attackerCard.name,
        defenderCardName: defenderCard.name
      });
    
    const battleContext = resolveFullBattle(attacker, defender, gameState, attackerCard, defenderCard);
    
    // Play the cards (remove from hands)
    if (attacker.faction === 'Fellowship') {
      const fellowshipResult = gameState.fellowshipPlayer.playCard(attackerCard.id);
      const sauronResult = gameState.sauronPlayer.playCard(defenderCard.id);
      detailedLogger.debug('BATTLE', 'GameBoard', 'resolveBattle', 
        'Cards played from hands', 
        { 
          fellowshipCardPlayed: !!fellowshipResult,
          sauronCardPlayed: !!sauronResult,
          fellowshipHandSize: gameState.fellowshipPlayer.hand.length,
          sauronHandSize: gameState.sauronPlayer.hand.length
        });
    } else {
      const sauronResult = gameState.sauronPlayer.playCard(attackerCard.id);
      const fellowshipResult = gameState.fellowshipPlayer.playCard(defenderCard.id);
      detailedLogger.debug('BATTLE', 'GameBoard', 'resolveBattle', 
        'Cards played from hands', 
        { 
          sauronCardPlayed: !!sauronResult,
          fellowshipCardPlayed: !!fellowshipResult,
          sauronHandSize: gameState.sauronPlayer.hand.length,
          fellowshipHandSize: gameState.fellowshipPlayer.hand.length
        });
    }
    
    const resultText = battleContext.log.join('\n');
    setBattleResult(resultText);
    
    detailedLogger.info('BATTLE', 'GameBoard', 'resolveBattle', 
      'Battle resolution complete', 
      { 
        outcome: battleContext.outcome,
        logEntries: battleContext.log.length,
        resultPreview: battleContext.log[battleContext.log.length - 1] || 'No result'
      });
    
    // Clear the battle after showing result
    setTimeout(() => clearBattle(), 5000);
  };

  const clearBattle = () => {
    detailedLogger.info('BATTLE', 'GameBoard', 'clearBattle', 'Clearing battle state and UI');
    
    // Log current character states before clearing battle
    const activeBattle = gameState.getActiveBattle();
    if (activeBattle) {
      const attacker = gameState.getCharacterById(activeBattle.triggeringCharacterId);
      const defenders = activeBattle.defenders;
      
      detailedLogger.info('BATTLE', 'GameBoard', 'clearBattle', 
        'Character states before clearing battle UI', 
        { 
          attackerName: attacker?.name,
          attackerDefeated: attacker?.defeated,
          attackerLocation: attacker?.location,
          defenderStates: defenders?.map((d: any) => ({
            name: d.name,
            defeated: d.defeated,
            location: d.location
          })) || []
        });
    }
    
    gameState.setActiveBattle(null);
    setBattlePhase(null);
    setShowCardSelection(false);
    setBattleResult(null);
    setAttackerCard(null);
    setDefenderCard(null);
    onGameUpdate();
  };

  const handleCharacterClick = (characterId: string) => {
    const character = gameState.getCharacterById(characterId);
    if (!character) return;

    logUI('GameBoard', 'handleCharacterClick', 'Character click detected', {
      characterId,
      characterName: character.name,
      faction: character.faction,
      currentLocation: character.getLocation(),
      defeated: character.defeated,
      currentlySelected: selectedCharacterId === characterId
    });

    if (selectedCharacterId === characterId) {
      setSelectedCharacterId(null);
      setLegalMoves([]);
      setLegalMoveRegionIds([]);
      logUI('GameBoard', 'handleCharacterClick', `Character deselected: ${character.name}`);
    } else {
      setSelectedCharacterId(characterId);
      logUI('GameBoard', 'handleCharacterClick', `Character selected: ${character.name}`);
      
      const moves = getLegalMoves(character, gameState);
      setLegalMoves(moves);
      setLegalMoveRegionIds(moves.map(move => move.destinationRegionId));
      
      logUI('GameBoard', 'handleCharacterClick', `Legal moves calculated for ${character.name}`, {
        movesCount: moves.length,
        moves: moves,
        legalRegionIds: moves.map(move => move.destinationRegionId)
      });
    }
  };

  const handleRegionClick = (regionId: string) => {
    const region = gameState.getRegionById(regionId);
    
    logUI('GameBoard', 'handleRegionClick', 'Region click detected', {
      regionId,
      regionName: region?.name,
      selectedCharacterId,
      isLegalMove: legalMoveRegionIds.includes(regionId),
      legalMoveRegions: legalMoveRegionIds,
      currentGamePhase: gameState.getCurrentPhase(),
      currentPlayer: gameState.getCurrentPlayer()
    });

    if (selectedCharacterId && legalMoveRegionIds.includes(regionId)) {
      const characterToMove = gameState.getCharacterById(selectedCharacterId);
      const targetRegion = gameState.getRegionById(regionId);

      if (characterToMove && targetRegion) {
        logMovement('GameBoard', 'handleRegionClick', 'Attempting character move', {
          characterId: selectedCharacterId,
          characterName: characterToMove.name,
          characterFaction: characterToMove.faction,
          fromRegion: characterToMove.getLocation(),
          toRegion: regionId,
          toRegionName: targetRegion.name,
          gamePhase: gameState.getCurrentPhase(),
          currentPlayer: gameState.getCurrentPlayer()
        });

        logStateSnapshot('GameBoard', 'handleRegionClick', 'BEFORE MOVE', gameState);
        
        const moveSuccess = gameState.moveCharacter(selectedCharacterId, regionId);

        logStateSnapshot('GameBoard', 'handleRegionClick', 'AFTER MOVE', gameState);

        logMovement('GameBoard', 'handleRegionClick', 'Move result', {
          success: moveSuccess,
          characterLocation: characterToMove.getLocation(),
          activeBattle: gameState.getActiveBattle(),
          activeBattleExists: !!gameState.getActiveBattle()
        });

        if (moveSuccess) {
          // After a successful move, advance the turn
          gameState.nextTurn();
          setSelectedCharacterId(null);
          setLegalMoves([]);
          setLegalMoveRegionIds([]);
          onGameUpdate(); 
        } else {
          logUI('GameBoard', 'handleRegionClick', "Move failed via GameState method. Character may remain selected with old legal moves.");
        }
      } else {
        logUI('GameBoard', 'handleRegionClick', 'Move failed: Character or target region not found.', {
          characterFound: !!characterToMove,
          regionFound: !!targetRegion
        });
        setSelectedCharacterId(null);
        setLegalMoves([]);
        setLegalMoveRegionIds([]);
      }
    } else {
      logUI('GameBoard', 'handleRegionClick', 'No valid move action', {
        hasSelectedCharacter: !!selectedCharacterId,
        isLegalMove: legalMoveRegionIds.includes(regionId),
        reason: !selectedCharacterId ? 'No character selected' : 'Region is not a legal move'
      });
      
      if (selectedCharacterId) {
        setSelectedCharacterId(null);
        setLegalMoves([]);
        setLegalMoveRegionIds([]);
      }
    }
  };

  const selectedCharacter = selectedCharacterId ? gameState.getCharacterById(selectedCharacterId) : null;

  // Group and sort regions for rendering based on row and position
  const regionsByRow = useMemo(() => {
    const grouped: { [key: number]: RegionModel[] } = {};
    allRegions.forEach(region => {
      if (!grouped[region.row]) {
        grouped[region.row] = [];
      }
      grouped[region.row].push(region);
    });

    for (const row in grouped) {
      grouped[row].sort((a, b) => a.position - b.position);
    }
    return grouped;
  }, [allRegions]);

  const sortedRowNumbers = useMemo(() => {
    return Object.keys(regionsByRow).map(Number).sort((a, b) => a - b);
  }, [regionsByRow]);

  return (
    <div className="w-full min-h-screen bg-gray-100 p-4">
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold">
          {gameState.getCurrentPhase() === 'SETUP' 
            ? 'Setup Phase - Place Characters' 
            : `Turn ${gameState.getTurn()} - ${gameState.getCurrentPlayer()}`}
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Phase: {gameState.getCurrentPhase()}
        </p>
        {gameState.getCurrentPhase() === 'SETUP' && (
          <div className="mt-2">
            <p className="text-xs text-blue-600 mb-1">
              Setup Status: {gameState.isSetupComplete() ? 'Complete ✓' : 'In Progress...'}
            </p>
            <button
              onClick={() => {
                gameState.nextPhase();
                onGameUpdate();
              }}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              disabled={!gameState.isSetupComplete()}
            >
              {gameState.isSetupComplete() ? 'Start Game (Begin Turn 1)' : 'Waiting for Setup...'}
            </button>
          </div>
        )}
        {gameState.getCurrentPhase() !== 'SETUP' && gameState.getCurrentPhase() !== 'GAME_OVER' && (
          <button
            onClick={() => {
              gameState.nextPhase();
              onGameUpdate();
            }}
            className="mt-2 ml-2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
          >
            Next Phase
          </button>
        )}
      </div>

      {/* Debug: Player Card Information */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
        <h3 className="font-bold text-blue-800 mb-2">Player Card Status:</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p><strong>Fellowship Player:</strong></p>
            <p>Hand: {gameState.fellowshipPlayer.hand.length} cards</p>
            <p>Deck: {gameState.fellowshipPlayer.deck.length} cards</p>
            <p>Discard: {gameState.fellowshipPlayer.discard.length} cards</p>
          </div>
          <div>
            <p><strong>Sauron Player:</strong></p>
            <p>Hand: {gameState.sauronPlayer.hand.length} cards</p>
            <p>Deck: {gameState.sauronPlayer.deck.length} cards</p>
            <p>Discard: {gameState.sauronPlayer.discard.length} cards</p>
          </div>
        </div>
      </div>

      {/* Battle Resolution UI */}
      {gameState.getActiveBattle() && (
        <div className="mb-6 p-4 bg-red-100 border-2 border-red-300 rounded-lg">
          <h2 className="text-xl font-bold text-red-800 mb-2">Battle in Progress!</h2>
          <div className="text-sm text-red-700 mb-3">
            <p><strong>Region:</strong> {gameState.getActiveBattle().regionName}</p>
            <p><strong>Attacker Faction:</strong> {gameState.getActiveBattle().attackingFaction}</p>
            <p><strong>Defender Faction:</strong> {gameState.getActiveBattle().defendingFaction}</p>
          </div>
          
          {/* Character Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Attacker Details */}
            <div className="bg-red-200 p-3 rounded border">
              <h3 className="font-bold text-red-900 mb-2">Attacker</h3>
              {(() => {
                const attacker = gameState.getCharacterById(gameState.getActiveBattle().triggeringCharacterId);
                if (!attacker) return <p>Character not found</p>;
                return (
                  <div className="text-sm">
                    <p><strong>Name:</strong> {attacker.name}</p>
                    <p><strong>Strength:</strong> {attacker.strength}</p>
                    <p><strong>Faction:</strong> {attacker.faction}</p>
                    {attacker.getCurrentVersionData().abilities && attacker.getCurrentVersionData().abilities!.length > 0 && (
                      <div>
                        <p><strong>Abilities:</strong></p>
                        <ul className="list-disc list-inside ml-2">
                          {attacker.getCurrentVersionData().abilities!.map((ability: any, index: number) => (
                            <li key={index} className="text-xs">{ability.text}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
            
            {/* Defender Details */}
            <div className="bg-blue-200 p-3 rounded border">
              <h3 className="font-bold text-blue-900 mb-2">Defender</h3>
              {(() => {
                const defenders = gameState.getActiveBattle().defenders;
                if (!defenders || defenders.length === 0) return <p>No defenders</p>;
                const defender = defenders[0]; // Show first defender for now
                return (
                  <div className="text-sm">
                    <p><strong>Name:</strong> {defender.name}</p>
                    <p><strong>Strength:</strong> {defender.strength}</p>
                    <p><strong>Faction:</strong> {defender.faction}</p>
                    {defender.getCurrentVersionData().abilities && defender.getCurrentVersionData().abilities!.length > 0 && (
                      <div>
                        <p><strong>Abilities:</strong></p>
                        <ul className="list-disc list-inside ml-2">
                          {defender.getCurrentVersionData().abilities!.map((ability: any, index: number) => (
                            <li key={index} className="text-xs">{ability.text}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {defenders.length > 1 && (
                      <p className="text-xs italic mt-1">+ {defenders.length - 1} other defender(s)</p>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
          
          <div className="text-xs text-red-600 mb-3">
            <p><strong>Fellowship hand:</strong> {gameState.fellowshipPlayer.hand.length} cards | <strong>Sauron hand:</strong> {gameState.sauronPlayer.hand.length} cards</p>
          </div>
          
          {battleResult && (
            <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded">
              <h3 className="font-bold text-yellow-800 mb-2">Battle Result:</h3>
              <pre className="text-sm text-yellow-700 whitespace-pre-wrap">{battleResult}</pre>
              <button 
                onClick={clearBattle}
                className="mt-2 px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700"
              >
                Dismiss
              </button>
            </div>
          )}
          
          {showCardSelection && (
            <div className="bg-white p-4 rounded border">
              <h3 className="font-bold mb-2">
                {battlePhase === 'WAITING_FOR_ATTACKER' 
                  ? `${gameState.getActiveBattle().attackingFaction} Player: Select your card`
                  : `${gameState.getActiveBattle().defendingFaction} Player: Select your card`}
              </h3>
              {battlePhase === 'WAITING_FOR_ATTACKER' && attackerCard && (
                <p className="text-sm text-green-600 mb-2">✓ Attacker card selected: {attackerCard.name}</p>
              )}
              {(() => {
                const currentPlayer = battlePhase === 'WAITING_FOR_ATTACKER' 
                  ? (gameState.getActiveBattle().attackingFaction === 'Fellowship' ? gameState.fellowshipPlayer : gameState.sauronPlayer)
                  : (gameState.getActiveBattle().defendingFaction === 'Fellowship' ? gameState.fellowshipPlayer : gameState.sauronPlayer);
                const availableCards = getAvailableCards(currentPlayer);
                
                return (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">
                      Available cards: {availableCards.length} / Hand size: {currentPlayer.hand.length}
                    </p>
                    <CardSelectionDialog
                      hand={availableCards}
                      onSelect={handleCardSelection}
                      disabled={battlePhase === 'RESOLVING'}
                    />
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {selectedCharacter && (
        <p className="mb-4 text-lg font-semibold text-indigo-700 text-center">
          Selected: {selectedCharacter.name} ({selectedCharacter.faction})
        </p>
      )}
      {legalMoveRegionIds.length > 0 && !selectedCharacter && (
         // Hide legal moves hint if no character is selected, as legal moves are cleared.
        <></>
      )}
      {legalMoveRegionIds.length > 0 && selectedCharacter && (
        <p className="mb-4 text-md text-yellow-600 text-center">
          Legal moves for {selectedCharacter.name} highlighted in yellow.
        </p>
      )}

      {/* Game Board Layout by Rows and Positions */}
      <div className="space-y-4 mb-8"> {/* Container for all rows */}
        {sortedRowNumbers.map(rowNumber => (
          <div key={`row-${rowNumber}`} className="flex flex-row flex-wrap justify-center items-stretch gap-2 sm:gap-4"> {/* Row container */}
            {regionsByRow[rowNumber].map(region => {
              const charactersInRegion = allCharacters.filter(char => char.getLocation() === region.id);
              const isLegalMove = legalMoveRegionIds.includes(region.id);
              const regionBgColor = isLegalMove ? "bg-yellow-200" : "bg-green-300";
              const regionBorderColor = isLegalMove ? "border-yellow-500" : "border-transparent";

              return (
                <div
                  key={region.id}
                  className={`p-3 sm:p-4 rounded shadow-lg flex flex-col items-center justify-start cursor-pointer hover:shadow-xl transition-all duration-150 ease-in-out ${regionBgColor} border-4 ${regionBorderColor} w-[120px] h-[120px] sm:w-[150px] sm:h-[150px]`}
                  onClick={() => handleRegionClick(region.id)}
                  title={`${region.name} (Row: ${region.row}, Pos: ${region.position}) | ID: ${region.id} | Cap: F${region.getCapacity('Fellowship')},S${region.getCapacity('Sauron')}`}
                >
                  <span className="font-bold text-xs sm:text-sm mb-1 sm:mb-2 text-center truncate w-full">{region.name}</span>
                  <div className="space-y-1 w-full overflow-y-auto flex-grow" style={{maxHeight: 'calc(100% - 30px)'}}>
                    {charactersInRegion.length > 0 ? (
                      charactersInRegion.map(char => (
                        <CharacterPiece
                          key={char.id}
                          character={char}
                          onClick={(e, charId) => { e.stopPropagation(); handleCharacterClick(charId); }} // Modified to use charId from callback
                          isSelected={char.id === selectedCharacterId}
                          currentPlayer={currentPlayer}
                          viewingPlayer={viewingPlayer}
                        />
                      ))
                    ) : (
                      <p className="text-xs text-gray-600 italic text-center mt-2">Empty</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <h2 className="text-xl font-semibold mb-3 text-center">Character Pool (Active Characters)</h2>
      <div className="flex flex-wrap gap-3 p-3 bg-gray-200 rounded-lg justify-center">
        {allCharacters.filter(char => !char.defeated).map(char => (
          <CharacterPiece
            key={char.id}
            character={char}
            onClick={(_e, charId) => handleCharacterClick(charId)} // Modified to use charId, _e as event is not used here for stopPropagation
            isSelected={char.id === selectedCharacterId}
            currentPlayer={currentPlayer}
            viewingPlayer={viewingPlayer}
          />
        ))}
      </div>
    </div>
  );
};

export default GameBoard;
