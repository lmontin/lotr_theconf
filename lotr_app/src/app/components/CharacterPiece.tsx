'use client';

import React from 'react';
import { CharacterModel } from '@/lib/models/Character';

interface CharacterPieceProps {
  character: CharacterModel;
  onClick?: (characterId: string) => void;
  isSelected?: boolean;
}

const CharacterPiece: React.FC<CharacterPieceProps> = ({ character, onClick, isSelected }) => {
  const { id, name, faction, is_revealed } = character;

  const handleClick = () => {
    if (onClick) {
      onClick(id);
    }
  };

  const baseStyle = "p-2 border rounded shadow-md cursor-pointer transition-all duration-150 ease-in-out";
  const factionStyle = faction === "Fellowship" ? "bg-blue-200 border-blue-400" : "bg-red-200 border-red-400";
  const concealmentStyle = is_revealed ? "opacity-100" : "opacity-50 italic";
  const selectedStyle = isSelected ? "ring-2 ring-yellow-500 ring-offset-2 scale-105" : "border-gray-300";

  return (
    <div
      className={`${baseStyle} ${factionStyle} ${concealmentStyle} ${selectedStyle}`}
      onClick={handleClick}
      title={`${name} (${faction}) - ${is_revealed ? 'Revealed' : 'Concealed'}`}
    >
      <p className="font-bold text-sm">{name}</p>
      <p className="text-xs">{is_revealed ? '(Revealed)' : '(Concealed)'}</p>
    </div>
  );
};

export default CharacterPiece;
