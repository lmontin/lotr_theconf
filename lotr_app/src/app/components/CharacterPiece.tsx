'use client';

import React from 'react';

// Assuming a basic Character type, this will be refined later
// when integrated with actual game data models like `lotr_app/src/lib/models/Character.ts`
export interface CharacterData {
  id: string;
  name: string;
  faction: 'Free Peoples' | 'Sauron'; // Example factions
  isConcealed: boolean;
  locationId?: string; // Made locationId optional here as well for consistency
}

interface CharacterPieceProps {
  character: CharacterData;
  onClick?: (characterId: string) => void; // Optional click handler
  isSelected?: boolean; // New prop for selection state
}

const CharacterPiece: React.FC<CharacterPieceProps> = ({ character, onClick, isSelected }) => {
  const { id, name, isConcealed, faction } = character;

  const handleClick = () => {
    if (onClick) {
      onClick(id);
    }
  };

  // Basic styling - this will be improved
  const baseStyle = "p-2 border rounded shadow-md cursor-pointer transition-all duration-150 ease-in-out";
  const factionStyle = faction === 'Free Peoples' ? "bg-blue-200 border-blue-400" : "bg-red-200 border-red-400";
  const concealmentStyle = isConcealed ? "opacity-50 italic" : "opacity-100";
  const selectedStyle = isSelected ? "ring-2 ring-yellow-500 ring-offset-2 scale-105" : "border-gray-300"; // Add ring for selected, ensure default border

  return (
    <div
      className={`${baseStyle} ${factionStyle} ${concealmentStyle} ${selectedStyle}`}
      onClick={handleClick}
      title={`${name} (${faction}) - ${isConcealed ? 'Concealed' : 'Revealed'}`}
    >
      <p className="font-bold text-sm">{name}</p>
      <p className="text-xs">{isConcealed ? '(Concealed)' : '(Revealed)'}</p>
    </div>
  );
};

export default CharacterPiece;
