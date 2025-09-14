import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const createRoom = mutation({
  args: {
    gridSize: v.number(),
    creatorId: v.string(),
    creatorName: v.string(),
  },
  handler: async (ctx, args) => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const room = await ctx.db.insert("rooms", {
      roomId,
      creatorId: args.creatorId,
      gridSize: args.gridSize,
      status: "waiting",
      players: [{
        playerId: args.creatorId,
        name: args.creatorName,
        isAlive: true,
        isCreator: true,
        socketConnected: true,
      }],
      turnOrder: [],
      currentTurnIndex: 0,
      roundNumber: 1,
      globalTurnCounter: 1,
      gameLog: [{
        timestamp: new Date().toISOString(),
        text: `Sala criada por ${args.creatorName}. Grid: ${args.gridSize}x${args.gridSize}`,
      }],
    });

    return { roomId, success: true };
  },
});

export const getRoomByRoomId = query({
  args: { roomId: v.string() },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_room_id", (q) => q.eq("roomId", args.roomId))
      .first();
    
    return room;
  },
});

export const joinRoom = mutation({
  args: {
    roomId: v.string(),
    playerId: v.string(),
    playerName: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_room_id", (q) => q.eq("roomId", args.roomId))
      .first();

    if (!room) {
      throw new Error("Room not found");
    }

    if (room.status !== "waiting") {
      throw new Error("Game already started");
    }

    // Check if player already in room
    const existingPlayer = room.players.find(p => p.playerId === args.playerId);
    if (existingPlayer) {
      return { success: true, message: "Already in room" };
    }

    const updatedPlayers = [...room.players, {
      playerId: args.playerId,
      name: args.playerName,
      isAlive: true,
      isCreator: false,
      socketConnected: true,
    }];

    const updatedLog = [...room.gameLog, {
      timestamp: new Date().toISOString(),
      text: `${args.playerName} entrou na sala`,
    }];

    await ctx.db.patch(room._id, {
      players: updatedPlayers,
      gameLog: updatedLog,
    });

    return { success: true };
  },
});

export const updatePlayerCharacter = mutation({
  args: {
    roomId: v.string(),
    playerId: v.string(),
    characterId: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_room_id", (q) => q.eq("roomId", args.roomId))
      .first();

    if (!room) {
      throw new Error("Room not found");
    }

    const updatedPlayers = room.players.map(player => 
      player.playerId === args.playerId 
        ? { ...player, characterId: args.characterId }
        : player
    );

    const playerName = room.players.find(p => p.playerId === args.playerId)?.name || "Unknown";
    const character = await ctx.db
      .query("characters")
      .withIndex("by_character_id", (q) => q.eq("characterId", args.characterId))
      .first();

    const updatedLog = [...room.gameLog, {
      timestamp: new Date().toISOString(),
      text: `${playerName} selecionou personagem: ${character?.name || args.characterId}`,
    }];

    await ctx.db.patch(room._id, {
      players: updatedPlayers,
      gameLog: updatedLog,
    });

    return { success: true };
  },
});

export const updatePlayerPosition = mutation({
  args: {
    roomId: v.string(),
    playerId: v.string(),
    x: v.number(),
    y: v.number(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_room_id", (q) => q.eq("roomId", args.roomId))
      .first();

    if (!room) {
      throw new Error("Room not found");
    }

    // Check if position is already taken
    const positionTaken = room.players.some(player => 
      player.position && 
      player.position.x === args.x && 
      player.position.y === args.y &&
      player.playerId !== args.playerId
    );

    if (positionTaken) {
      throw new Error("Position already taken");
    }

    const updatedPlayers = room.players.map(player => 
      player.playerId === args.playerId 
        ? { ...player, position: { x: args.x, y: args.y } }
        : player
    );

    const playerName = room.players.find(p => p.playerId === args.playerId)?.name || "Unknown";
    const updatedLog = [...room.gameLog, {
      timestamp: new Date().toISOString(),
      text: `${playerName} escolheu posição inicial: (${args.x}, ${args.y})`,
    }];

    await ctx.db.patch(room._id, {
      players: updatedPlayers,
      gameLog: updatedLog,
    });

    return { success: true };
  },
});

export const startGame = mutation({
  args: {
    roomId: v.string(),
    creatorId: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_room_id", (q) => q.eq("roomId", args.roomId))
      .first();

    if (!room) {
      throw new Error("Room not found");
    }

    if (room.creatorId !== args.creatorId) {
      throw new Error("Only creator can start game");
    }

    if (room.players.length < 2) {
      throw new Error("Need at least 2 players");
    }

    // Check if all players have selected character and position
    const allReady = room.players.every(p => p.characterId && p.position);
    if (!allReady) {
      throw new Error("All players must select character and position");
    }

    // Shuffle turn order (Fisher-Yates)
    const playerIds = room.players.map(p => p.playerId);
    for (let i = playerIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [playerIds[i], playerIds[j]] = [playerIds[j], playerIds[i]];
    }

    // Initialize HP/SP for all players
    const updatedPlayers = await Promise.all(room.players.map(async (player) => {
      if (player.characterId) {
        const character = await ctx.db
          .query("characters")
          .withIndex("by_character_id", (q) => q.eq("characterId", player.characterId!))
          .first();
        
        return {
          ...player,
          currentHP: character?.maxHP || 100,
          currentSP: character?.maxSP || 20,
        };
      }
      return player;
    }));

    const updatedLog = [...room.gameLog, {
      timestamp: new Date().toISOString(),
      text: `Turno 1, Partida iniciada! Ordem dos turnos: ${playerIds.map(id => 
        room.players.find(p => p.playerId === id)?.name || id
      ).join(", ")}`,
    }];

    await ctx.db.patch(room._id, {
      status: "playing",
      turnOrder: playerIds,
      currentTurnIndex: 0,
      globalTurnCounter: 1,
      roundNumber: 1,
      players: updatedPlayers,
      gameLog: updatedLog,
    });

    return { success: true };
  },
});
