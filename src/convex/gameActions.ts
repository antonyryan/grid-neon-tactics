import { v } from "convex/values";
import { mutation } from "./_generated/server";

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

    // Update player position
    const updatedPlayers = room.players.map(p => 
      p.playerId === args.playerId 
        ? { ...p, position: { x: args.toX, y: args.toY } }
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

    // Advance to next turn
    let nextTurnIndex = (room.currentTurnIndex + 1) % room.turnOrder.length;
    let newRoundNumber = room.roundNumber;
    let newGlobalTurnCounter = room.globalTurnCounter + 1;

    // Check if we completed a round
    if (nextTurnIndex === 0) {
      newRoundNumber++;
    }

    // Regenerate SP for next player
    const nextPlayerId = room.turnOrder[nextTurnIndex];
    const nextPlayer = room.players.find(p => p.playerId === nextPlayerId);
    
    let updatedPlayers = room.players;
    if (nextPlayer && nextPlayer.characterId) {
      const character = await ctx.db
        .query("characters")
        .withIndex("by_character_id", (q) => q.eq("characterId", nextPlayer.characterId!))
        .first();

      if (character) {
        updatedPlayers = room.players.map(p => 
          p.playerId === nextPlayerId 
            ? { 
                ...p, 
                currentSP: Math.min((p.currentSP || 0) + 1, character.maxSP)
              }
            : p
        );
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
