import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // Game rooms
    rooms: defineTable({
      roomId: v.string(),
      creatorId: v.string(),
      gridSize: v.number(),
      status: v.union(v.literal("waiting"), v.literal("playing"), v.literal("finished")),
      players: v.array(v.object({
        playerId: v.string(),
        name: v.string(),
        characterId: v.optional(v.string()),
        position: v.optional(v.object({ x: v.number(), y: v.number() })),
        isAlive: v.boolean(),
        isCreator: v.boolean(),
        socketConnected: v.boolean(),
        currentHP: v.optional(v.number()),
        currentSP: v.optional(v.number()),
        // Add per-skill cooldown map: { [skillName]: remainingTurns }
        skillCooldowns: v.optional(v.record(v.string(), v.number())),

        // NEW: per-turn control flags and snapshots
        hasMovedThisTurn: v.optional(v.boolean()),
        hasUndoneMoveThisTurn: v.optional(v.boolean()),
        hasUsedSkillThisTurn: v.optional(v.boolean()),
        hasUndoneSkillThisTurn: v.optional(v.boolean()),
        previousPositionThisTurn: v.optional(v.object({ x: v.number(), y: v.number() })),
        lastSkillUsedThisTurn: v.optional(v.object({
          name: v.string(),
          costType: v.union(v.literal("HP"), v.literal("SP")),
          costAmount: v.number(),
          prevCooldownRemaining: v.number(),
          snapshot: v.object({
            turnOrder: v.array(v.string()),
            currentTurnIndex: v.number(),
            playerHP: v.number(),
            playerSP: v.number(),
          }),
        })),
      })),
      turnOrder: v.array(v.string()),
      currentTurnIndex: v.number(),
      roundNumber: v.number(),
      globalTurnCounter: v.number(),
      gameLog: v.array(v.object({
        timestamp: v.string(),
        text: v.string(),
      })),
    }).index("by_room_id", ["roomId"]),

    // Game characters (static data)
    characters: defineTable({
      characterId: v.string(),
      name: v.string(),
      maxHP: v.number(),
      maxSP: v.number(),
      movement: v.number(),
      attack: v.number(),
      esquiva: v.number(),
      alcance: v.number(),
      placeholderImageURL: v.string(),
      skills: v.array(v.object({
        name: v.string(),
        cost: v.string(), // "X HP" or "X SP"
        cooldown: v.number(),
        range: v.number(),
        damage: v.string(),
        description: v.string(),
      })),
    }).index("by_character_id", ["characterId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;