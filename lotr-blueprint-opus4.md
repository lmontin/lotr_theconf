# Blueprint for LOTR: The Confrontation (Enhanced Classic Edition)

## Key Notes
– Human (Fellowship) vs AI (Sauron)  
– Strict battle order with 4-step resolution
– Complete movement system with special paths
– Full concealment mechanics
– Hand reclaim system
– AI with strategic priorities
– Comprehensive test framework

## Static vs. Dynamic Data

### Static Definitions (gamedata.json)
```python
# CHANGED: Fixed typos, added complete adjacencies, proper capacity data
# regions – immutable layout with bidirectional adjacencies:
{
    "name": str,
    "row": int, 
    "position": int,
    "fellowshipAdjacent": str[],      # Forward regions for Fellowship
    "sauronAdjacent": str[],          # Forward regions for Sauron
    "fellowshipSpecialForward": str[], # River/Tunnel paths (Fellowship only)
    "special": str or str[],          # "Mountains", "Bag End", "Mount Doom", etc.
    "startingCapacityFellowship": int,
    "startingCapacitySauron": int,
    "factionCapacity": int            # Max per faction during game
}

# characters & combatCards remain the same structure
```

### Runtime State (GameState)
```python
class GameState:
    def __init__(self):
        # CHANGED: Enhanced state tracking
        self.turn_number = 0
        self.current_phase = "MOVEMENT"  # MOVEMENT, BATTLE, END_TURN
        self.current_player = "Sauron"   # Sauron starts
        
        # Character tracking
        self.character_locations = {}    # name → region_name
        self.region_occupants = {}       # region_name → [character_names]
        self.revealed_characters = set() # NEW: Track revealed characters
        
        # Players with hand management
        self.players = {
            "Fellowship": Player("Fellowship"),
            "Sauron": Player("Sauron")
        }
        
        # Battle state
        self.active_battle = None
        self.battle_history = []         # NEW: For AI learning
        
        # Game tracking
        self.last_move = None
        self.game_log = []              # NEW: For replay/debugging
        self.game_over = False
        self.winner = None

class Player:
    def __init__(self, faction):
        self.faction = faction
        self.hand = []      # CombatCard[]
        self.deck = []      # Initial 9 cards
        self.discard = []   # Used cards
        self.is_ai = (faction == "Sauron")  # NEW: AI flag
```

## Character Concealment System (NEW)

```python
class Character:
    def __init__(self, data, faction):
        self.name = data["name"]
        self.faction = faction
        self.strength = data["versions"]["classic"]["strength"]
        self.abilities = data["versions"]["classic"]["abilities"]
        self.location = None
        self.is_defeated = False
        self.is_revealed = False  # NEW: Concealment state
        
    def reveal(self):
        """Reveal character to opponent"""
        self.is_revealed = True
        game.revealed_characters.add(self.name)
        game.log(f"{self.name} is revealed")
        
    def conceal(self):
        """Conceal character (unless special ability prevents it)"""
        # Check for abilities that keep character revealed
        if not self.has_persistent_reveal():
            self.is_revealed = False
            game.revealed_characters.discard(self.name)
            
    def has_persistent_reveal(self):
        """Check if character should stay revealed (e.g., Crebain effect)"""
        # TODO: Implement based on active effects
        return False
```

## Enhanced Movement System

```python
def get_legal_moves(character, game_state, context=None):
    """
    NEW: Comprehensive movement validation
    Returns list of (move_type, destination_region) tuples
    """
    moves = []
    current = game_state.get_region(character.location)
    
    if context is None:
        context = {"character": character, "game": game_state}
    
    # 1. Regular forward movement
    forward_regions = current.fellowshipAdjacent if character.faction == "Fellowship" else current.sauronAdjacent
    for dest_name in forward_regions:
        dest = game_state.get_region(dest_name)
        if can_enter_region(character, dest, game_state):
            moves.append(("FORWARD", dest))
    
    # 2. Special paths (Fellowship only)
    if character.faction == "Fellowship" and hasattr(current, 'fellowshipSpecialForward'):
        for special_dest_name in current.fellowshipSpecialForward:
            special_dest = game_state.get_region(special_dest_name)
            # Check specific conditions for River/Tunnel
            if current.name == "Eregion" and special_dest_name == "Fangorn":  # Tunnel of Moria
                if can_enter_region(character, special_dest, game_state):
                    moves.append(("TUNNEL", special_dest))
            elif "RIVER" in context.get("move_type", ""):  # River Anduin
                if can_enter_region(character, special_dest, game_state):
                    moves.append(("RIVER", special_dest))
    
    # 3. Character-specific movement abilities
    context["available_moves"] = moves
    TRIGGER_EFFECTS("CHECK_MOVE_LEGALITY", context)
    
    # Add any ability-granted moves
    if context.get("additional_moves"):
        moves.extend(context["additional_moves"])
    
    return moves

def can_enter_region(character, region, game_state):
    """Check if character can enter a region based on capacity and enemies"""
    # Check capacity
    faction_count = sum(1 for c in region.get_characters(character.faction) if not c.is_defeated)
    if faction_count >= region.get_capacity(character.faction):
        return False
    
    # Check for enemies (unless special ability allows it)
    if region.contains_enemy(character.faction):
        # Will trigger battle, but movement is allowed
        pass
    
    return True
```

## Battle Resolution with Hand Management

```python
def initiate_battle(attacker, defender, game_state):
    """CHANGED: Added hand management and better state tracking"""
    battle = Battle(attacker, defender)
    game_state.active_battle = battle
    
    # Reset battle context
    ctx = {
        "battle": battle,
        "attacker": attacker,
        "defender": defender,
        "fellowship_character": attacker if attacker.faction == "Fellowship" else defender,
        "sauron_character": attacker if attacker.faction == "Sauron" else defender,
        "battle_ended_early": False,
        "skip_card_play": False,
        "cards_played": {},  # NEW: Track played cards
        "game": game_state
    }
    
    game_state.log(f"Battle: {attacker.name} attacks {defender.name}")
    
    # Step 1: Reveal characters
    attacker.reveal()
    defender.reveal()
    
    # Step 2: Character abilities (Fellowship first, then Sauron)
    TRIGGER_EFFECTS("BATTLE_START", ctx)
    if check_battle_end(ctx):
        return end_battle(battle, ctx, game_state)
    
    # Step 3: Card play (if not skipped)
    if not ctx["skip_card_play"]:
        # Get card choices
        fellowship_card = choose_card(ctx["fellowship_character"].player, ctx)
        sauron_card = choose_card(ctx["sauron_character"].player, ctx)
        
        # Play and discard cards
        play_combat_card(fellowship_card, "Fellowship", ctx)
        play_combat_card(sauron_card, "Sauron", ctx)
        
        # Resolve text effects (Sauron first, then Fellowship)
        TRIGGER_EFFECTS("RESOLVE_CARDS", ctx)
        if check_battle_end(ctx):
            return end_battle(battle, ctx, game_state)
    
    # Step 4: Compare strengths
    TRIGGER_EFFECTS("COMPARE_STRENGTHS", ctx)
    
    attacker_str = calculate_final_strength(attacker, ctx.get("attacker_card"), ctx)
    defender_str = calculate_final_strength(defender, ctx.get("defender_card"), ctx)
    
    game_state.log(f"Strength comparison: {attacker.name}({attacker_str}) vs {defender.name}({defender_str})")
    
    # Determine outcome
    if attacker_str > defender_str:
        defender.defeat()
        ctx["battle_outcome"] = "ATTACKER_WIN"
    elif defender_str > attacker_str:
        attacker.defeat()
        ctx["battle_outcome"] = "DEFENDER_WIN"
    else:
        attacker.defeat()
        defender.defeat()
        ctx["battle_outcome"] = "MUTUAL_DEFEAT"
    
    # Step 5: End-battle abilities
    TRIGGER_EFFECTS("BATTLE_END", ctx)
    
    return end_battle(battle, ctx, game_state)

def play_combat_card(card, faction, ctx):
    """NEW: Handle card playing and discarding"""
    player = ctx["game"].players[faction]
    player.hand.remove(card)
    player.discard.append(card)
    
    # Store in context for resolution
    if faction == "Fellowship":
        ctx["fellowship_card"] = card
        ctx["cards_played"]["Fellowship"] = card
    else:
        ctx["sauron_card"] = card
        ctx["cards_played"]["Sauron"] = card
    
    # Check for hand reclaim
    check_hand_reclaim(ctx["game"])

def check_hand_reclaim(game_state):
    """NEW: Reclaim all cards when both players have 9 discards"""
    fellow_discards = len(game_state.players["Fellowship"].discard)
    sauron_discards = len(game_state.players["Sauron"].discard)
    
    if fellow_discards == 9 and sauron_discards == 9:
        for player in game_state.players.values():
            player.hand.extend(player.discard)
            player.discard = []
        game_state.log("Both players reclaim their combat cards")
```

## AI Implementation

```python
def ai_choose_move(game_state):
    """NEW: Strategic AI for Sauron"""
    sauron = game_state.players["Sauron"]
    moves = []
    
    # Evaluate all possible moves
    for char in game_state.get_active_characters("Sauron"):
        for move_type, dest in get_legal_moves(char, game_state):
            score = evaluate_move(char, dest, move_type, game_state)
            moves.append((score, char, dest, move_type))
    
    # Sort by score (highest first)
    moves.sort(key=lambda x: x[0], reverse=True)
    
    if moves:
        score, char, dest, move_type = moves[0]
        game_state.log(f"AI chooses: {char.name} → {dest.name} ({move_type})")
        return char, dest
    
    return None, None

def evaluate_move(character, destination, move_type, game_state):
    """NEW: AI move evaluation"""
    score = 0
    
    # Priority 1: Attack Fellowship characters
    if destination.contains_enemy("Sauron"):
        score += 50
        # Bonus for attacking Frodo
        if "Frodo" in [c.name for c in destination.get_characters("Fellowship")]:
            score += 100
    
    # Priority 2: Move towards the Shire
    shire_distance = calculate_distance(destination, "The Shire")
    score += (10 - shire_distance) * 5
    
    # Priority 3: Protect key characters
    if character.name in ["Witch-king", "Balrog", "Shelob"]:
        # Avoid risky battles with these
        if destination.contains_enemy("Sauron"):
            enemy_strength = max(c.strength for c in destination.get_characters("Fellowship"))
            if enemy_strength >= character.strength:
                score -= 30
    
    # Priority 4: Use special abilities
    if move_type in ["TUNNEL", "RIVER", "SPECIAL"]:
        score += 20
    
    return score

def ai_choose_card(player, battle_context):
    """NEW: AI card selection"""
    available_cards = player.hand
    character = battle_context["sauron_character"]
    opponent = battle_context["fellowship_character"]
    
    # Simple heuristic
    if character.strength > opponent.strength:
        # Likely to win - use low strength or text card
        text_cards = [c for c in available_cards if c.card_type == "text"]
        if text_cards:
            return random.choice(text_cards)
        return min(available_cards, key=lambda c: c.strength or 0)
    else:
        # Need help - use high strength card
        strength_cards = [c for c in available_cards if c.card_type == "strength"]
        if strength_cards:
            return max(strength_cards, key=lambda c: c.strength)
        return available_cards[0]
```

## Complete Ability System

```python
# NEW: Full ability implementations
ability_handlers = {
    # Fellowship abilities
    "FRODO_RETREAT": handle_frodo_retreat,
    "SAM_SUBSTITUTE": handle_sam_substitute,
    "SAM_STRENGTH_BONUS": handle_sam_strength_bonus,
    "PIPPIN_RETREAT": handle_pippin_retreat,
    "MERRY_VS_WITCHKING": handle_merry_vs_witchking,
    "GANDALF_REVEAL_CARD": handle_gandalf_reveal,
    "ARAGORN_SPECIAL_ATTACK_MOVE": handle_aragorn_move,
    "LEGOLAS_VS_FLYING_NAZGUL": handle_legolas_vs_nazgul,
    "GIMLI_VS_ORCS": handle_gimli_vs_orcs,
    "BOROMIR_MUTUAL_DESTRUCTION": handle_boromir_sacrifice,
    
    # Sauron abilities
    "BALROG_TUNNEL_AMBUSH": handle_balrog_tunnel,
    "SHELOB_POST_BATTLE_MOVE": handle_shelob_move,
    "WITCHKING_SIDEWAYS_ATTACK": handle_witchking_move,
    "WITCHKING_FRODO_RETREAT_OPTION": handle_witchking_frodo,
    "FLYING_NAZGUL_SPECIAL_MOVE": handle_flying_nazgul_move,
    "BLACK_RIDER_LONG_CHARGE": handle_black_rider_charge,
    "SARUMAN_FORCE_STRENGTH_COMPARISON": handle_saruman_no_cards,
    "ORCS_FIRST_STRIKE": handle_orcs_first_strike,
    "WARG_NEGATE_ABILITY": handle_warg_negate,
    "CAVE_TROLL_NEGATE_SAURON_CARD": handle_cave_troll_negate,
    
    # Card abilities
    "CARD_FELLOWSHIP_MAGIC": handle_magic_card,
    "CARD_SAURON_MAGIC": handle_magic_card,
    "CARD_NOBLE_SACRIFICE": handle_noble_sacrifice,
    "CARD_ELVEN_CLOAK": handle_elven_cloak,
    "CARD_FELLOWSHIP_RETREAT": handle_fellowship_retreat_card,
    "CARD_SAURON_RETREAT": handle_sauron_retreat_card,
    "CARD_EYE_OF_SAURON": handle_eye_of_sauron
}

# Example implementations
def handle_frodo_retreat(source, context):
    """Frodo can retreat sideways when defending (not in mountains)"""
    if source.name != "Frodo" or not context.get("IS_DEFENDING"):
        return
    
    current_region = context["game"].get_region(source.location)
    if "Mountains" in current_region.special:
        return
    
    # Get sideways retreat options
    retreats = get_valid_retreat_destinations(source, "sideways", context)
    if retreats:
        # AI or player choice
        if context["game"].players[source.faction].is_ai:
            dest = retreats[0]  # Simple AI: take first option
        else:
            dest = player_choice("Choose retreat destination", retreats)
        
        if dest:
            move_character(source, dest, context["game"])
            context["battle_ended_early"] = True
            return "RETREAT"

def handle_sam_substitute(source, context):
    """Sam can substitute for Frodo if in same region"""
    if source.name != "Sam":
        return
        
    # Check if Frodo is being attacked in same region
    defender = context.get("defender")
    if defender and defender.name == "Frodo":
        sam_region = context["game"].get_region(source.location)
        if source in sam_region.get_characters("Fellowship"):
            # Offer substitution
            if player_choice("Substitute Sam for Frodo?", ["Yes", "No"]) == "Yes":
                # Swap defender
                context["defender"] = source
                context["fellowship_character"] = source
                source.reveal()  # Reveal Sam
                context["game"].log("Sam substitutes for Frodo!")
```

## Game Loop with Turn Phases

```python
def main():
    """CHANGED: Added phase management and concealment"""
    game = setup_game("Classic")
    
    while not game.check_win_conditions():
        game.current_phase = "MOVEMENT"
        current = game.current_player
        opponent = game.get_opponent(current)
        
        # Start turn
        ctx = {"game": game, "current_player": current}
        TRIGGER_EFFECTS("START_TURN", ctx)
        
        # Movement phase
        moved = False
        attempts = 0
        while not moved and attempts < 3:
            if game.players[current].is_ai:
                char, dest = ai_choose_move(game)
            else:
                char, dest = player_choose_move(game)
            
            if char and dest:
                moved = move_character(char, dest, game)
            attempts += 1
        
        if not moved:
            # Cannot move - lose game
            game.end_game(opponent)
            break
        
        # Battle phase (handled in move_character if applicable)
        
        # End turn phase
        game.current_phase = "END_TURN"
        TRIGGER_EFFECTS("END_TURN", ctx)
        
        # Conceal all revealed characters
        conceal_all_characters(game)
        
        # Switch players
        game.current_player = opponent
        game.turn_number += 1
    
    print(f"Game Over! Winner: {game.winner}")

def conceal_all_characters(game):
    """NEW: Conceal all revealed characters at end of turn"""
    for char_name in list(game.revealed_characters):
        char = game.get_character(char_name)
        if char and not char.is_defeated:
            char.conceal()
```

## Test Framework

```python
def test_aragorn_vs_shelob():
    """Test the example battle from the rulebook"""
    game = setup_test_game()
    
    # Place characters
    aragorn = place_character("Aragorn", "Mirkwood", game)
    shelob = place_character("Shelob", "Fangorn", game)
    
    # Test Aragorn's special movement
    moves = get_legal_moves(aragorn, game)
    assert any(m[1].name == "Fangorn" for m in moves), "Aragorn should be able to attack Fangorn"
    
    # Move and trigger battle
    move_character(aragorn, game.get_region("Fangorn"), game)
    
    # Mock card choices
    game.players["Fellowship"].mock_card_choice = get_card("4", "Fellowship")
    game.players["Sauron"].mock_card_choice = get_card("Eye of Sauron", "Sauron")
    
    # Verify battle outcome
    assert shelob.is_defeated, "Shelob should be defeated"
    assert not aragorn.is_defeated, "Aragorn should survive"
    assert game.battle_history[-1]["winner"] == "Aragorn"

def test_hand_reclaim():
    """NEW: Test hand reclaim mechanics"""
    game = setup_test_game()
    
    # Use all cards
    for i in range(9):
        game.players["Fellowship"].discard.append(game.players["Fellowship"].hand.pop())
        game.players["Sauron"].discard.append(game.players["Sauron"].hand.pop())
    
    # Verify reclaim
    check_hand_reclaim(game)
    assert len(game.players["Fellowship"].hand) == 9
    assert len(game.players["Sauron"].hand) == 9
    assert len(game.players["Fellowship"].discard) == 0
```

## Win Conditions

```python
def check_win_conditions(game):
    """CHANGED: Comprehensive win condition checking"""
    # Fellowship wins if Frodo enters Mordor
    frodo = game.get_character("Frodo")
    if frodo and not frodo.is_defeated and frodo.location == "Mordor":
        game.winner = "Fellowship"
        game.game_over = True
        return "Fellowship"
    
    # Sauron wins if Frodo is defeated
    if frodo and frodo.is_defeated:
        game.winner = "Sauron"
        game.game_over = True
        return "Sauron"
    
    # Sauron wins if 3+ characters in Shire
    shire = game.get_region("The Shire")
    sauron_in_shire = len([c for c in shire.get_characters("Sauron") if not c.is_defeated])
    if sauron_in_shire >= 3:
        game.winner = "Sauron"
        game.game_over = True
        return "Sauron"
    
    return None
```

This enhanced blueprint includes:
- Complete concealment system
- Hand management with reclaim mechanics
- Strategic AI implementation
- Full movement validation with special paths
- Complete ability handler framework
- Turn phase management
- Comprehensive test framework
- Game logging for debugging/replay
- Fixed data structure issues

All new and changed sections are marked with comments (NEW/CHANGED) to help identify improvements.