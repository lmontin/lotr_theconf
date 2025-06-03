'use client';

import React from 'react';
import { CharacterModel } from '@/lib/models/Character';

interface CharacterPieceProps {
  character: CharacterModel;
  onClick?: (event: React.MouseEvent<HTMLDivElement>, characterId: string) => void; // Modified onClick signature
  isSelected?: boolean;
  currentPlayer?: 'Fellowship' | 'Sauron'; // Current player's turn
  viewingPlayer?: 'Fellowship' | 'Sauron'; // The player viewing the board
}

const CharacterPiece: React.FC<CharacterPieceProps> = ({ 
  character, 
  onClick, 
  isSelected, 
  currentPlayer, 
  viewingPlayer 
}) => {
  const { id, name, faction, is_revealed, strength } = character;

  // Determine if character details should be shown
  const shouldShowDetails = is_revealed || (viewingPlayer && faction === viewingPlayer);
  
  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => { // Added event parameter
    if (onClick) {
      onClick(event, id); // Pass event and id
    }
  };

  // Get character abilities for tooltip (only if details should be shown)
  const abilities = character.getAbilities();
  const currentVersionData = character.getCurrentVersionData();
  const abilityTexts = shouldShowDetails ? (currentVersionData.abilities?.map(ability => ability.text) || []) : [];
  
  const tooltipText = shouldShowDetails 
    ? (abilityTexts.length > 0 
        ? `${name} (${faction})\n\nAbilities:\n${abilityTexts.map(text => `• ${text}`).join('\n')}`
        : `${name} (${faction})`)
    : `${faction} Character`;

  const baseStyle = "p-2 border rounded shadow-md cursor-pointer transition-all duration-150 ease-in-out relative";
  const factionStyle = faction === "Fellowship" ? "bg-blue-200 border-blue-400" : "bg-red-200 border-red-400";
  const concealmentStyle = is_revealed ? "opacity-100" : "opacity-50 italic";
  const selectedStyle = isSelected ? "ring-2 ring-yellow-500 ring-offset-2 scale-105" : "border-gray-300";

  return (
    <div
      className={`${baseStyle} ${factionStyle} ${concealmentStyle} ${selectedStyle} group`}
      onClick={handleClick}
      title={tooltipText}
    >
      {shouldShowDetails ? (
        <p className="font-bold text-sm">{name} ({strength})</p>
      ) : (
        <p className="font-bold text-sm text-center">?</p>
      )}
      
      {/* Custom hover tooltip */}
      {shouldShowDetails && abilityTexts.length > 0 && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 max-w-xs whitespace-normal">
          <div className="font-semibold mb-1">Abilities:</div>
          {abilityTexts.map((text, index) => (
            <div key={index} className="mb-1 last:mb-0">• {text}</div>
          ))}
          {/* Arrow pointing down */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
        </div>
      )}
    </div>
  );
};

export default CharacterPiece;
