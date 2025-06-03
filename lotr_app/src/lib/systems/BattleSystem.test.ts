import { resolveFullBattle } from './BattleSystem';
import { CharacterModel } from '../models/Character';
import { GameState } from '../models/GameState';

describe('resolveFullBattle', () => {
  function makeCharacter(name: string, strength: number, faction: 'Fellowship' | 'Sauron') {
    return {
      name,
      strength,
      faction,
      isRevealed: false,
      reveal: jest.fn(function () { this.isRevealed = true; }),
      setDefeated: jest.fn(),
    } as unknown as CharacterModel;
  }

  function makeGameState() {
    return {
      log: jest.fn(),
    } as unknown as GameState;
  }

  it('attacker wins with higher strength', () => {
    const attacker = makeCharacter('Aragorn', 5, 'Fellowship');
    const defender = makeCharacter('Orc', 3, 'Sauron');
    const gameState = makeGameState();
    const ctx = resolveFullBattle(attacker, defender, gameState);
    expect(ctx.outcome).toBe('ATTACKER_WIN');
    expect(attacker.setDefeated).not.toHaveBeenCalled();
    expect(defender.setDefeated).toHaveBeenCalledWith(true);
  });

  it('defender wins with higher strength', () => {
    const attacker = makeCharacter('Orc', 2, 'Sauron');
    const defender = makeCharacter('Gimli', 4, 'Fellowship');
    const gameState = makeGameState();
    const ctx = resolveFullBattle(attacker, defender, gameState);
    expect(ctx.outcome).toBe('DEFENDER_WIN');
    expect(attacker.setDefeated).toHaveBeenCalledWith(true);
    expect(defender.setDefeated).not.toHaveBeenCalled();
  });

  it('tie results in mutual defeat', () => {
    const attacker = makeCharacter('Boromir', 3, 'Fellowship');
    const defender = makeCharacter('Orc', 3, 'Sauron');
    const gameState = makeGameState();
    const ctx = resolveFullBattle(attacker, defender, gameState);
    expect(ctx.outcome).toBe('MUTUAL_DEFEAT');
    expect(attacker.setDefeated).toHaveBeenCalledWith(true);
    expect(defender.setDefeated).toHaveBeenCalledWith(true);
  });

  it('card strength is added to base strength', () => {
    const attacker = makeCharacter('Aragorn', 4, 'Fellowship');
    const defender = makeCharacter('Orc', 4, 'Sauron');
    const gameState = makeGameState();
    const attackerCard = { name: 'Sword', strength: 2 };
    const defenderCard = { name: 'Shield', strength: 1 };
    const ctx = resolveFullBattle(attacker, defender, gameState, attackerCard, defenderCard);
    expect(ctx.outcome).toBe('ATTACKER_WIN');
    expect(attacker.setDefeated).not.toHaveBeenCalled();
    expect(defender.setDefeated).toHaveBeenCalledWith(true);
  });

  it('calls reveal on both characters if not already revealed', () => {
    const attacker = makeCharacter('Aragorn', 5, 'Fellowship');
    const defender = makeCharacter('Orc', 3, 'Sauron');
    const gameState = makeGameState();
    resolveFullBattle(attacker, defender, gameState);
    expect(attacker.reveal).toHaveBeenCalled();
    expect(defender.reveal).toHaveBeenCalled();
  });
});
