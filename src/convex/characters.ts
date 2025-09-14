import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getAllCharacters = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("characters").collect();
  },
});

export const seedCharacters = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if characters already exist
    const existing = await ctx.db.query("characters").first();
    if (existing) {
      return { message: "Characters already seeded" };
    }

    const characters = [
      {
        characterId: "cyber_knight",
        name: "Cyber Knight",
        maxHP: 120,
        maxSP: 15,
        movement: 3,
        attack: 25,
        esquiva: 8,
        alcance: 1,
        placeholderImageURL: "/assets/cyber_knight.png",
        skills: [
          {
            name: "Plasma Strike",
            cost: "3 SP",
            cooldown: 2,
            range: 1,
            damage: "30-40",
            description: "A devastating plasma-enhanced melee attack"
          },
          {
            name: "Shield Boost",
            cost: "2 SP",
            cooldown: 3,
            range: 0,
            damage: "0",
            description: "Increases defense for 3 turns"
          },
          {
            name: "Charge",
            cost: "4 SP",
            cooldown: 4,
            range: 3,
            damage: "20-30",
            description: "Rush forward and attack with momentum"
          }
        ]
      },
      {
        characterId: "neon_assassin",
        name: "Neon Assassin",
        maxHP: 80,
        maxSP: 25,
        movement: 5,
        attack: 30,
        esquiva: 15,
        alcance: 1,
        placeholderImageURL: "/assets/neon_assassin.png",
        skills: [
          {
            name: "Shadow Step",
            cost: "4 SP",
            cooldown: 2,
            range: 0,
            damage: "0",
            description: "Teleport to any adjacent tile and gain stealth"
          },
          {
            name: "Poison Blade",
            cost: "3 SP",
            cooldown: 1,
            range: 1,
            damage: "25-35",
            description: "Attack that causes poison damage over time"
          },
          {
            name: "Critical Strike",
            cost: "6 SP",
            cooldown: 5,
            range: 1,
            damage: "50-70",
            description: "High damage attack with critical hit chance"
          }
        ]
      },
      {
        characterId: "data_mage",
        name: "Data Mage",
        maxHP: 70,
        maxSP: 35,
        movement: 2,
        attack: 20,
        esquiva: 5,
        alcance: 4,
        placeholderImageURL: "/assets/data_mage.png",
        skills: [
          {
            name: "Data Bolt",
            cost: "2 SP",
            cooldown: 0,
            range: 4,
            damage: "15-25",
            description: "Ranged energy attack"
          },
          {
            name: "System Hack",
            cost: "5 SP",
            cooldown: 3,
            range: 3,
            damage: "0",
            description: "Disable enemy skills for 2 turns"
          },
          {
            name: "Neural Storm",
            cost: "8 SP",
            cooldown: 6,
            range: 2,
            damage: "40-60",
            description: "Area attack affecting multiple enemies"
          }
        ]
      },
      {
        characterId: "tech_medic",
        name: "Tech Medic",
        maxHP: 90,
        maxSP: 30,
        movement: 3,
        attack: 15,
        esquiva: 10,
        alcance: 2,
        placeholderImageURL: "/assets/tech_medic.png",
        skills: [
          {
            name: "Nano Heal",
            cost: "3 SP",
            cooldown: 1,
            range: 2,
            damage: "0",
            description: "Restore 30-50 HP to target ally"
          },
          {
            name: "Stim Shot",
            cost: "4 SP",
            cooldown: 3,
            range: 2,
            damage: "0",
            description: "Boost ally movement and attack for 2 turns"
          },
          {
            name: "EMP Blast",
            cost: "6 SP",
            cooldown: 4,
            range: 2,
            damage: "20-30",
            description: "Electromagnetic pulse that damages and stuns"
          }
        ]
      },
      {
        characterId: "heavy_gunner",
        name: "Heavy Gunner",
        maxHP: 140,
        maxSP: 20,
        movement: 2,
        attack: 35,
        esquiva: 3,
        alcance: 3,
        placeholderImageURL: "/assets/heavy_gunner.png",
        skills: [
          {
            name: "Suppressing Fire",
            cost: "4 SP",
            cooldown: 2,
            range: 4,
            damage: "20-30",
            description: "Ranged attack that reduces enemy movement"
          },
          {
            name: "Rocket Launcher",
            cost: "7 SP",
            cooldown: 5,
            range: 5,
            damage: "45-65",
            description: "Explosive attack with area damage"
          },
          {
            name: "Defensive Stance",
            cost: "2 SP",
            cooldown: 3,
            range: 0,
            damage: "0",
            description: "Reduce incoming damage by 50% for 3 turns"
          }
        ]
      },
      {
        characterId: "drone_operator",
        name: "Drone Operator",
        maxHP: 85,
        maxSP: 28,
        movement: 4,
        attack: 22,
        esquiva: 12,
        alcance: 3,
        placeholderImageURL: "/assets/drone_operator.png",
        skills: [
          {
            name: "Deploy Drone",
            cost: "5 SP",
            cooldown: 4,
            range: 2,
            damage: "0",
            description: "Deploy a combat drone for 4 turns"
          },
          {
            name: "Scan Area",
            cost: "2 SP",
            cooldown: 2,
            range: 0,
            damage: "0",
            description: "Reveal enemy positions and stats"
          },
          {
            name: "Drone Strike",
            cost: "6 SP",
            cooldown: 3,
            range: 5,
            damage: "30-45",
            description: "Command drone to attack target"
          }
        ]
      }
    ];

    for (const character of characters) {
      await ctx.db.insert("characters", character);
    }

    return { message: "Characters seeded successfully" };
  },
});

export const updateCharacter = mutation({
  args: {
    characterId: v.string(),
    name: v.optional(v.string()),
    maxHP: v.optional(v.number()),
    maxSP: v.optional(v.number()),
    movement: v.optional(v.number()),
    attack: v.optional(v.number()),
    esquiva: v.optional(v.number()),
    alcance: v.optional(v.number()),
    placeholderImageURL: v.optional(v.string()),
    skills: v.optional(
      v.array(
        v.object({
          name: v.string(),
          cost: v.string(),
          cooldown: v.number(),
          range: v.number(),
          damage: v.string(),
          description: v.string(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const character = await ctx.db
      .query("characters")
      .withIndex("by_character_id", (q) => q.eq("characterId", args.characterId))
      .first();

    if (!character) {
      throw new Error("Character not found");
    }

    // Basic validation for non-negative numbers where applicable
    const toPatch: Record<string, unknown> = {};
    if (args.name !== undefined) toPatch.name = args.name;
    if (args.placeholderImageURL !== undefined) toPatch.placeholderImageURL = args.placeholderImageURL;
    if (args.skills !== undefined) toPatch.skills = args.skills;

    const numericFields = [
      ["maxHP", args.maxHP],
      ["maxSP", args.maxSP],
      ["movement", args.movement],
      ["attack", args.attack],
      ["esquiva", args.esquiva],
      ["alcance", args.alcance],
    ] as const;

    for (const [key, value] of numericFields) {
      if (value !== undefined) {
        if (value < 0) {
          throw new Error(`${key} must be >= 0`);
        }
        toPatch[key] = value;
      }
    }

    await ctx.db.patch(character._id, toPatch);
    return { success: true };
  },
});

export const createCharacter = mutation({
  args: {
    characterId: v.string(),
    name: v.string(),
    maxHP: v.number(),
    maxSP: v.number(),
    movement: v.number(),
    attack: v.number(),
    esquiva: v.number(),
    alcance: v.number(),
    placeholderImageURL: v.optional(v.string()),
    skills: v.optional(
      v.array(
        v.object({
          name: v.string(),
          cost: v.string(),
          cooldown: v.number(),
          range: v.number(),
          damage: v.string(),
          description: v.string(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const exists = await ctx.db
      .query("characters")
      .withIndex("by_character_id", (q) => q.eq("characterId", args.characterId))
      .first();
    if (exists) {
      throw new Error("CharacterId already exists");
    }

    await ctx.db.insert("characters", {
      characterId: args.characterId,
      name: args.name,
      maxHP: args.maxHP,
      maxSP: args.maxSP,
      movement: args.movement,
      attack: args.attack,
      esquiva: args.esquiva,
      alcance: args.alcance,
      placeholderImageURL: args.placeholderImageURL ?? "",
      skills:
        args.skills ??
        [
          {
            name: "New Skill",
            cost: "0 SP",
            cooldown: 0,
            range: 0,
            damage: "0",
            description: "",
          },
        ],
    });

    return { success: true };
  },
});