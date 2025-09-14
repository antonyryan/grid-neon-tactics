import { v } from "convex/values";
import { mutation } from "./_generated/server";

function parseCost(cost: string): { amount: number; type: "SP" | "HP" } {
  const trimmed = cost.trim().toUpperCase();
  if (trimmed === "0" || trimmed === "0 SP" || trimmed === "0 HP") {
    return { amount: 0, type: "SP" };
  }
  const parts = trimmed.split(/\s+/);
  const amount = parseInt(parts[0] ?? "0", 10);
  const type = (parts[1] === "HP" ? "HP" : "SP") as "SP" | "HP";
  return { amount: isNaN(amount) ? 0 : amount, type };
}

export const movePlayer = mutation({
  args: {
    roomId: v.string(),
    playerId: v.string(),
    fromX: v.number(),
    fromY: v.number(),
    toX: v.number(),
    toY: v.number(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_room_id", (q) => q.eq("roomId", args.roomId))
      .first();

    if (!room) {
      throw new Error("Room not found");
    }

    if (room.status !== "playing") {
      throw new Error("Game not in progress");
    }

    // Check if it's player's turn
    const currentPlayerId = room.turnOrder[room.currentTurnIndex];
    if (currentPlayerId !== args.playerId) {
      throw new Error("Not your turn");
    }

    // Get player and character data
    const player = room.players.find(p => p.playerId === args.playerId);
    if (!player || !player.characterId) {
      throw new Error("Player or character not found");
    }

    const character = await ctx.db
      .query("characters")
      .withIndex("by_character_id", (q) => q.eq("characterId", player.characterId!))
      .first();

    if (!character) {
      throw new Error("Character data not found");
    }

    // Check per-turn move limits
    if (player.hasMovedThisTurn) {
      throw new Error("You have already moved this turn");
    }

    // Validate movement
    const distance = Math.abs(args.toX - args.fromX) + Math.abs(args.toY - args.fromY);
    if (distance > character.movement) {
      throw new Error(`Movement exceeds limit (${character.movement})`);
    }

    // Check if destination is within bounds
    if (args.toX < 0 || args.toX >= room.gridSize || args.toY < 0 || args.toY >= room.gridSize) {
      throw new Error("Destination out of bounds");
    }

    // Check if destination is occupied
    const destinationOccupied = room.players.some(p => 
      p.position && 
      p.position.x === args.toX && 
      p.position.y === args.toY &&
      p.playerId !== args.playerId &&
      p.isAlive
    );

    if (destinationOccupied) {
      throw new Error("Destination occupied");
    }

    // Update player position + per-turn flags/snapshot
    const updatedPlayers = room.players.map(p => 
      p.playerId === args.playerId 
        ? { 
            ...p, 
            position: { x: args.toX, y: args.toY },
            previousPositionThisTurn: p.position ? { x: p.position.x, y: p.position.y } : undefined,
            hasMovedThisTurn: true,
          }
        : p
    );

    const updatedLog = [...room.gameLog, {
      timestamp: new Date().toISOString(),
      text: `Turno ${room.globalTurnCounter}, ${player.name}: Moveu de (${args.fromX},${args.fromY}) para (${args.toX},${args.toY})`,
    }];

    await ctx.db.patch(room._id, {
      players: updatedPlayers,
      gameLog: updatedLog,
    });

    return { success: true };
  },
});

export const undoMove = mutation({
  args: {
    roomId: v.string(),
    playerId: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_room_id", (q) => q.eq("roomId", args.roomId))
      .first();

    if (!room) throw new Error("Room not found");
    if (room.status !== "playing") throw new Error("Game not in progress");

    const currentPlayerId = room.turnOrder[room.currentTurnIndex];
    if (currentPlayerId !== args.playerId) throw new Error("Not your turn");

    const player = room.players.find(p => p.playerId === args.playerId);
    if (!player) throw new Error("Player not found");
    if (!player.previousPositionThisTurn) throw new Error("No move to undo");
    if (player.hasUndoneMoveThisTurn) throw new Error("You already undid a move this turn");

    // Revert to previous position, allow a new move
    const prev = player.previousPositionThisTurn;
    const updatedPlayers = room.players.map(p =>
      p.playerId === args.playerId
        ? {
            ...p,
            position: { x: prev.x, y: prev.y },
            previousPositionThisTurn: undefined,
            hasMovedThisTurn: false,
            hasUndoneMoveThisTurn: true,
          }
        : p
    );

    const updatedLog = [...room.gameLog, {
      timestamp: new Date().toISOString(),
      text: `Turno ${room.globalTurnCounter}, ${player.name}: Desfez movimento para (${prev.x},${prev.y})`,
    }];

    await ctx.db.patch(room._id, {
      players: updatedPlayers,
      gameLog: updatedLog,
    });

    return { success: true };
  },
});

export const rollDice = mutation({
  args: {
    roomId: v.string(),
    playerId: v.string(),
    rolls: v.array(v.object({
      faces: v.number(),
      count: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_room_id", (q) => q.eq("roomId", args.roomId))
      .first();

    if (!room) {
      throw new Error("Room not found");
    }

    // Check if it's player's turn
    const currentPlayerId = room.turnOrder[room.currentTurnIndex];
    if (currentPlayerId !== args.playerId) {
      throw new Error("Not your turn");
    }

    const player = room.players.find(p => p.playerId === args.playerId);
    if (!player) {
      throw new Error("Player not found");
    }

    // Validate dice types and limits
    const validFaces = [4, 6, 8, 10, 12, 20];
    const totalDice = args.rolls.reduce((sum, roll) => sum + roll.count, 0);
    
    if (totalDice > 50) {
      throw new Error("Too many dice (max 50)");
    }

    for (const roll of args.rolls) {
      if (!validFaces.includes(roll.faces) || roll.count <= 0) {
        throw new Error("Invalid dice configuration");
      }
    }

    // Roll dice
    const results: { [key: string]: number[] } = {};
    let total = 0;

    for (const roll of args.rolls) {
      const diceKey = `${roll.count}d${roll.faces}`;
      results[diceKey] = [];
      
      for (let i = 0; i < roll.count; i++) {
        const value = Math.floor(Math.random() * roll.faces) + 1;
        results[diceKey].push(value);
        total += value;
      }
    }

    // Format results for log
    const rollString = args.rolls.map(r => `${r.count}d${r.faces}`).join("+");
    const resultString = Object.entries(results)
      .map(([key, values]) => `[${values.join(",")}]`)
      .join(" + ");

    const updatedLog = [...room.gameLog, {
      timestamp: new Date().toISOString(),
      text: `Turno ${room.globalTurnCounter}, ${player.name}: Rolou ${rollString} -> ${resultString} = ${total}`,
    }];

    await ctx.db.patch(room._id, {
      gameLog: updatedLog,
    });

    return { success: true, results, total };
  },
});

export const updatePlayerStats = mutation({
  args: {
    roomId: v.string(),
    playerId: v.string(),
    currentHP: v.optional(v.number()),
    currentSP: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_room_id", (q) => q.eq("roomId", args.roomId))
      .first();

    if (!room) {
      throw new Error("Room not found");
    }

    const player = room.players.find(p => p.playerId === args.playerId);
    if (!player || !player.characterId) {
      throw new Error("Player or character not found");
    }

    const character = await ctx.db
      .query("characters")
      .withIndex("by_character_id", (q) => q.eq("characterId", player.characterId!))
      .first();

    if (!character) {
      throw new Error("Character data not found");
    }

    let updatedHP = player.currentHP;
    let updatedSP = player.currentSP;
    const logEntries = [];

    if (args.currentHP !== undefined) {
      if (args.currentHP < 0 || args.currentHP > character.maxHP) {
        throw new Error(`HP must be between 0 and ${character.maxHP}`);
      }
      updatedHP = args.currentHP;
      logEntries.push(`HP alterado para ${args.currentHP}`);
    }

    if (args.currentSP !== undefined) {
      if (args.currentSP < 0 || args.currentSP > character.maxSP) {
        throw new Error(`SP must be between 0 and ${character.maxSP}`);
      }
      updatedSP = args.currentSP;
      logEntries.push(`SP alterado para ${args.currentSP}`);
    }

    // Check if player died
    let playerDied = false;
    if (updatedHP !== undefined && updatedHP <= 0) {
      playerDied = true;
    }

    const updatedPlayers = room.players.map(p => 
      p.playerId === args.playerId 
        ? { 
            ...p, 
            currentHP: updatedHP, 
            currentSP: updatedSP,
            isAlive: !playerDied 
          }
        : p
    );

    let updatedTurnOrder = room.turnOrder;
    let updatedCurrentTurnIndex = room.currentTurnIndex;

    if (playerDied) {
      // Remove from turn order
      updatedTurnOrder = room.turnOrder.filter(id => id !== args.playerId);
      
      // Adjust current turn index if necessary
      const removedIndex = room.turnOrder.indexOf(args.playerId);
      if (removedIndex <= room.currentTurnIndex && updatedTurnOrder.length > 0) {
        updatedCurrentTurnIndex = Math.max(0, room.currentTurnIndex - 1);
        if (updatedCurrentTurnIndex >= updatedTurnOrder.length) {
          updatedCurrentTurnIndex = 0;
        }
      }

      logEntries.push(`HP caiu para 0 — jogador removido dos turnos (morto)`);
    }

    const updatedLog = [...room.gameLog];
    for (const entry of logEntries) {
      updatedLog.push({
        timestamp: new Date().toISOString(),
        text: `Turno ${room.globalTurnCounter}, ${player.name}: ${entry}`,
      });
    }

    await ctx.db.patch(room._id, {
      players: updatedPlayers,
      turnOrder: updatedTurnOrder,
      currentTurnIndex: updatedCurrentTurnIndex,
      gameLog: updatedLog,
    });

    return { success: true, playerDied };
  },
});

export const useSkill = mutation({
  args: {
    roomId: v.string(),
    playerId: v.string(),
    skillName: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_room_id", (q) => q.eq("roomId", args.roomId))
      .first();

    if (!room) throw new Error("Room not found");
    if (room.status !== "playing") throw new Error("Game not in progress");

    const currentPlayerId = room.turnOrder[room.currentTurnIndex];
    if (currentPlayerId !== args.playerId) throw new Error("Not your turn");

    const player = room.players.find((p) => p.playerId === args.playerId);
    if (!player || !player.characterId) throw new Error("Player or character not found");
    if (!player.isAlive) throw new Error("Player is dead");

    // Enforce one skill per turn
    if (player.hasUsedSkillThisTurn) throw new Error("You have already used a skill this turn");

    const character = await ctx.db
      .query("characters")
      .withIndex("by_character_id", (q) => q.eq("characterId", player.characterId!))
      .first();
    if (!character) throw new Error("Character data not found");

    const skill = character.skills.find((s) => s.name === args.skillName);
    if (!skill) throw new Error("Skill not found");

    const cooldowns = { ...(player.skillCooldowns ?? {}) };
    const remaining = cooldowns[skill.name] ?? 0;
    if (remaining > 0) throw new Error(`Skill on cooldown (${remaining} turn${remaining > 1 ? "s" : ""} left)`);

    const { amount, type } = parseCost(skill.cost);
    let updatedHP = player.currentHP ?? 0;
    let updatedSP = player.currentSP ?? 0;

    if (type === "SP") {
      if ((player.currentSP ?? 0) < amount) throw new Error("Not enough SP");
      updatedSP = (player.currentSP ?? 0) - amount;
    } else {
      if ((player.currentHP ?? 0) < amount) throw new Error("Not enough HP");
      updatedHP = (player.currentHP ?? 0) - amount;
    }

    const prevTurnOrder = room.turnOrder.slice();
    const prevCurrentTurnIndex = room.currentTurnIndex;

    // Apply cooldown
    const prevCooldownRemaining = cooldowns[skill.name] ?? 0;
    if (skill.cooldown > 0) {
      cooldowns[skill.name] = skill.cooldown;
    }

    // Handle death and turn order if HP <= 0
    let playerDied = false;
    let updatedTurnOrder = room.turnOrder.slice();
    let updatedCurrentTurnIndex = room.currentTurnIndex;

    if (updatedHP <= 0) {
      playerDied = true;
      updatedTurnOrder = updatedTurnOrder.filter((id) => id !== args.playerId);
      const removedIndex = room.turnOrder.indexOf(args.playerId);
      if (removedIndex <= room.currentTurnIndex && updatedTurnOrder.length > 0) {
        updatedCurrentTurnIndex = Math.max(0, room.currentTurnIndex - 1);
        if (updatedCurrentTurnIndex >= updatedTurnOrder.length) {
          updatedCurrentTurnIndex = 0;
        }
      }
    }

    const updatedPlayers = room.players.map((p) =>
      p.playerId === args.playerId
        ? {
            ...p,
            currentHP: updatedHP,
            currentSP: updatedSP,
            isAlive: updatedHP > 0,
            skillCooldowns: cooldowns,
            hasUsedSkillThisTurn: true,
            lastSkillUsedThisTurn: {
              name: skill.name,
              costType: type,
              costAmount: amount,
              prevCooldownRemaining,
              snapshot: {
                turnOrder: prevTurnOrder,
                currentTurnIndex: prevCurrentTurnIndex,
                playerHP: player.currentHP ?? 0,
                playerSP: player.currentSP ?? 0,
              },
            },
          }
        : p
    );

    const updatedLog = [...room.gameLog, {
      timestamp: new Date().toISOString(),
      text: `Turno ${room.globalTurnCounter}, ${player.name}: Usou ${skill.name} (Custo: ${skill.cost}${playerDied ? " — morreu" : ""})`,
    }];

    await ctx.db.patch(room._id, {
      players: updatedPlayers,
      turnOrder: updatedTurnOrder,
      currentTurnIndex: updatedCurrentTurnIndex,
      gameLog: updatedLog,
    });

    return { success: true, playerDied };
  },
});

export const undoSkillUse = mutation({
  args: {
    roomId: v.string(),
    playerId: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_room_id", (q) => q.eq("roomId", args.roomId))
      .first();

    if (!room) throw new Error("Room not found");
    if (room.status !== "playing") throw new Error("Game not in progress");

    const currentPlayerId = room.turnOrder[room.currentTurnIndex];
    if (currentPlayerId !== args.playerId) throw new Error("Not your turn");

    const player = room.players.find((p) => p.playerId === args.playerId);
    if (!player) throw new Error("Player not found");
    if (!player.hasUsedSkillThisTurn) throw new Error("No skill used to undo");
    if (player.hasUndoneSkillThisTurn) throw new Error("You already undid a skill this turn");
    if (!player.lastSkillUsedThisTurn) throw new Error("No skill snapshot to undo");

    const last = player.lastSkillUsedThisTurn;

    // Restore cooldown to previous value and refund resources
    const cooldowns = { ...(player.skillCooldowns ?? {}) };
    cooldowns[last.name] = last.prevCooldownRemaining;

    // Restore previous HP/SP and turn state from snapshot
    const updatedPlayers = room.players.map((p) =>
      p.playerId === args.playerId
        ? {
            ...p,
            currentHP: last.snapshot.playerHP,
            currentSP: last.snapshot.playerSP,
            isAlive: last.snapshot.playerHP > 0,
            skillCooldowns: cooldowns,
            hasUsedSkillThisTurn: false,
            hasUndoneSkillThisTurn: true,
            lastSkillUsedThisTurn: undefined,
          }
        : p
    );

    const updatedLog = [...room.gameLog, {
      timestamp: new Date().toISOString(),
      text: `Turno ${room.globalTurnCounter}, ${player.name}: Desfez uso de ${last.name}`,
    }];

    await ctx.db.patch(room._id, {
      players: updatedPlayers,
      turnOrder: last.snapshot.turnOrder,
      currentTurnIndex: last.snapshot.currentTurnIndex,
      gameLog: updatedLog,
    });

    return { success: true };
  },
});

export const endTurn = mutation({
  args: {
    roomId: v.string(),
    playerId: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_room_id", (q) => q.eq("roomId", args.roomId))
      .first();

    if (!room) throw new Error("Room not found");

    const currentPlayerId = room.turnOrder[room.currentTurnIndex];
    if (currentPlayerId !== args.playerId) throw new Error("Not your turn");

    const player = room.players.find(p => p.playerId === args.playerId);
    if (!player) throw new Error("Player not found");

    // Advance turn counters
    let nextTurnIndex = (room.currentTurnIndex + 1) % room.turnOrder.length;
    let newRoundNumber = room.roundNumber;
    let newGlobalTurnCounter = room.globalTurnCounter + 1;
    if (nextTurnIndex === 0) newRoundNumber++;

    const nextPlayerId = room.turnOrder[nextTurnIndex];
    const nextPlayer = room.players.find(p => p.playerId === nextPlayerId);

    let updatedPlayers = room.players;

    if (nextPlayer && nextPlayer.characterId) {
      const character = await ctx.db
        .query("characters")
        .withIndex("by_character_id", (q) => q.eq("characterId", nextPlayer.characterId!))
        .first();

      if (character) {
        updatedPlayers = room.players.map(p => {
          if (p.playerId === nextPlayerId) {
            // Start of turn: regen SP, decrement cooldowns, reset per-turn flags
            const nextCooldowns = { ...(p.skillCooldowns ?? {}) };
            for (const key of Object.keys(nextCooldowns)) {
              const v = nextCooldowns[key] ?? 0;
              nextCooldowns[key] = Math.max(0, v - 1);
            }
            return {
              ...p,
              currentSP: Math.min((p.currentSP ?? 0) + 1, character.maxSP),
              skillCooldowns: nextCooldowns,
              hasMovedThisTurn: false,
              hasUndoneMoveThisTurn: false,
              hasUsedSkillThisTurn: false,
              hasUndoneSkillThisTurn: false,
              previousPositionThisTurn: undefined,
              lastSkillUsedThisTurn: undefined,
            };
          }
          return p;
        });
      }
    }

    const updatedLog = [...room.gameLog, {
      timestamp: new Date().toISOString(),
      text: `Turno ${room.globalTurnCounter}, ${player.name}: Finalizou turno`,
    }];

    await ctx.db.patch(room._id, {
      currentTurnIndex: nextTurnIndex,
      roundNumber: newRoundNumber,
      globalTurnCounter: newGlobalTurnCounter,
      players: updatedPlayers,
      gameLog: updatedLog,
    });

    return { success: true };
  },
});