import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { 
  Cpu, 
  Dices, 
  Heart, 
  Loader2, 
  Move, 
  Play, 
  Plus, 
  Settings, 
  Shield, 
  Sword, 
  Users, 
  Zap 
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { useMutation, useQuery } from "convex/react";

interface DiceRoll {
  faces: number;
  count: number;
}

export default function Game() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [playerId, setPlayerId] = useState<string>("");
  const [selectedCharacter, setSelectedCharacter] = useState<string>("");
  const [selectedPosition, setSelectedPosition] = useState<{x: number, y: number} | null>(null);
  const [diceRolls, setDiceRolls] = useState<DiceRoll[]>([]);
  const [newHP, setNewHP] = useState<string>("");
  const [newSP, setNewSP] = useState<string>("");
  const [selectedTile, setSelectedTile] = useState<{x: number, y: number} | null>(null);

  // Convex queries and mutations
  const room = useQuery(api.rooms.getRoomByRoomId, roomId ? { roomId } : "skip");
  const characters = useQuery(api.characters.getAllCharacters);
  const joinRoom = useMutation(api.rooms.joinRoom);
  const updateCharacter = useMutation(api.rooms.updatePlayerCharacter);
  const updatePosition = useMutation(api.rooms.updatePlayerPosition);
  const startGame = useMutation(api.rooms.startGame);
  const movePlayer = useMutation(api.gameActions.movePlayer);
  const rollDice = useMutation(api.gameActions.rollDice);
  const updateStats = useMutation(api.gameActions.updatePlayerStats);
  const endTurn = useMutation(api.gameActions.endTurn);
  const useSkill = useMutation(api.gameActions.useSkill);

  // Initialize player ID
  useEffect(() => {
    let id = localStorage.getItem("tacticsPlayerId");
    if (!id) {
      id = Math.random().toString(36).substring(2, 15);
      localStorage.setItem("tacticsPlayerId", id);
    }
    setPlayerId(id);
  }, []);

  // Auto-join room when player ID is ready
  useEffect(() => {
    if (playerId && roomId && room && !room.players.find(p => p.playerId === playerId)) {
      const playerName = user?.name || `Player_${playerId.substring(0, 6)}`;
      joinRoom({ roomId, playerId, playerName }).catch(console.error);
    }
  }, [playerId, roomId, room, joinRoom, user]);

  if (!roomId) {
    navigate("/");
    return null;
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className="text-cyan-400 font-mono">Loading room...</p>
        </div>
      </div>
    );
  }

  const currentPlayer = room.players.find(p => p.playerId === playerId);
  const isCreator = currentPlayer?.isCreator || false;
  const currentTurnPlayer = room.turnOrder[room.currentTurnIndex];
  const isMyTurn = currentTurnPlayer === playerId;
  const canStart = room.status === "waiting" && room.players.length >= 2 && 
    room.players.every(p => p.characterId && p.position);

  // Helper: derive cooldown remaining for a skill
  const getSkillCooldown = (skillName: string) => {
    const cooldowns = (currentPlayer as any)?.skillCooldowns as Record<string, number> | undefined;
    return cooldowns?.[skillName] ?? 0;
  };

  const canUseSkill = (cost: string) => {
    const parts = cost.trim().toUpperCase().split(/\s+/);
    const amount = parseInt(parts[0] ?? "0", 10);
    const type = parts[1] === "HP" ? "HP" : "SP";
    if (isNaN(amount) || amount <= 0) return true;
    if (!currentPlayer) return false;
    if (type === "SP") return (currentPlayer.currentSP ?? 0) >= amount;
    return (currentPlayer.currentHP ?? 0) >= amount;
  };

  const handleCharacterSelect = async (characterId: string) => {
    if (!roomId || !playerId) return;
    try {
      await updateCharacter({ roomId, playerId, characterId });
      setSelectedCharacter(characterId);
      toast.success("Character selected!");
    } catch (error) {
      toast.error("Failed to select character");
    }
  };

  const handlePositionSelect = async (x: number, y: number) => {
    if (!roomId || !playerId || room.status !== "waiting") return;
    try {
      await updatePosition({ roomId, playerId, x, y });
      setSelectedPosition({ x, y });
      toast.success("Position selected!");
    } catch (error) {
      toast.error("Position already taken or invalid");
    }
  };

  const handleStartGame = async () => {
    if (!roomId || !playerId) return;
    try {
      await startGame({ roomId, creatorId: playerId });
      toast.success("Game started!");
    } catch (error) {
      toast.error("Failed to start game");
    }
  };

  const handleMove = async (toX: number, toY: number) => {
    if (!roomId || !playerId || !currentPlayer?.position || !isMyTurn) return;
    try {
      await movePlayer({
        roomId,
        playerId,
        fromX: currentPlayer.position.x,
        fromY: currentPlayer.position.y,
        toX,
        toY,
      });
      toast.success("Moved successfully!");
      setSelectedTile(null);
    } catch (error) {
      toast.error("Invalid move");
    }
  };

  const handleRollDice = async () => {
    if (!roomId || !playerId || diceRolls.length === 0) return;
    try {
      const result = await rollDice({ roomId, playerId, rolls: diceRolls });
      toast.success(`Rolled total: ${result.total}`);
      setDiceRolls([]);
    } catch (error) {
      toast.error("Failed to roll dice");
    }
  };

  const handleUpdateStats = async () => {
    if (!roomId || !playerId) return;
    try {
      const updates: any = {};
      if (newHP) updates.currentHP = parseInt(newHP);
      if (newSP) updates.currentSP = parseInt(newSP);
      
      await updateStats({ roomId, playerId, ...updates });
      toast.success("Stats updated!");
      setNewHP("");
      setNewSP("");
    } catch (error) {
      toast.error("Failed to update stats");
    }
  };

  const handleEndTurn = async () => {
    if (!roomId || !playerId) return;
    try {
      await endTurn({ roomId, playerId });
      toast.success("Turn ended!");
    } catch (error) {
      toast.error("Failed to end turn");
    }
  };

  const handleUseSkill = async (skillName: string) => {
    if (!roomId || !playerId) return;
    try {
      await useSkill({ roomId, playerId, skillName });
      toast.success(`${skillName} used!`);
    } catch (error: any) {
      toast.error(error?.message || "Failed to use skill");
    }
  };

  const addDiceRoll = (faces: number) => {
    setDiceRolls(prev => {
      const existing = prev.find(r => r.faces === faces);
      if (existing) {
        return prev.map(r => r.faces === faces ? { ...r, count: r.count + 1 } : r);
      }
      return [...prev, { faces, count: 1 }];
    });
  };

  const removeDiceRoll = (faces: number) => {
    setDiceRolls(prev => {
      return prev.map(r => r.faces === faces ? { ...r, count: Math.max(0, r.count - 1) } : r)
        .filter(r => r.count > 0);
    });
  };

  const renderGrid = () => {
    const grid = [];
    for (let y = 0; y < room.gridSize; y++) {
      for (let x = 0; x < room.gridSize; x++) {
        const player = room.players.find(p => p.position?.x === x && p.position?.y === y && p.isAlive);
        const isSelected = selectedTile?.x === x && selectedTile?.y === y;
        const isCurrentPlayer = player?.playerId === playerId;
        const canMoveHere = room.status === "playing" && isMyTurn && !player && selectedTile;
        const canSelectPosition = room.status === "waiting" && currentPlayer && !player;

        grid.push(
          <motion.div
            key={`${x}-${y}`}
            className={`
              relative aspect-square border border-cyan-400/30 cursor-pointer
              transition-all duration-200 hover:border-cyan-400
              ${isSelected ? "border-cyan-400 bg-cyan-400/20" : ""}
              ${player ? "bg-gradient-to-br from-pink-500/20 to-purple-500/20" : ""}
              ${isCurrentPlayer ? "ring-2 ring-cyan-400" : ""}
              ${canMoveHere ? "bg-green-400/20 hover:bg-green-400/30" : ""}
              ${canSelectPosition ? "hover:bg-cyan-400/10" : ""}
            `}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (room.status === "waiting" && canSelectPosition) {
                handlePositionSelect(x, y);
              } else if (room.status === "playing") {
                if (isMyTurn && player?.playerId === playerId) {
                  setSelectedTile({ x, y });
                } else if (isMyTurn && selectedTile && !player) {
                  handleMove(x, y);
                }
              }
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-cyan-400/5 to-transparent" />
            
            {/* Grid coordinates */}
            <div className="absolute top-0 left-0 text-xs text-cyan-400/50 font-mono p-1">
              {x},{y}
            </div>

            {/* Player indicator */}
            {player && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="absolute inset-2 flex items-center justify-center">
                    <div className={`
                      w-8 h-8 rounded-full border-2 flex items-center justify-center
                      ${isCurrentPlayer ? "border-cyan-400 bg-cyan-400/20" : "border-pink-400 bg-pink-400/20"}
                      font-mono text-xs font-bold
                    `}>
                      {player.name.substring(0, 2).toUpperCase()}
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-black border-cyan-400/30 text-cyan-400 max-w-xs">
                  {(() => {
                    const character = characters?.find(c => c.characterId === player.characterId);
                    const cds = (player as any)?.skillCooldowns as Record<string, number> | undefined;
                    return (
                      <div className="space-y-2">
                        <div className="font-bold text-cyan-300">
                          {player.name}{character ? ` — ${character.name}` : ""}
                        </div>
                        <div className="text-xs text-cyan-400/70">
                          HP: {player.currentHP ?? "-"}{character ? `/${character.maxHP}` : ""} • SP: {player.currentSP ?? "-"}{character ? `/${character.maxSP}` : ""}
                        </div>
                        {character && (
                          <div className="space-y-1">
                            <div className="text-xs text-cyan-400/70">Skills & Cooldowns</div>
                            {character.skills.map(skill => {
                              const cd = cds?.[skill.name] ?? 0;
                              return (
                                <div key={skill.name} className="flex items-center justify-between text-xs">
                                  <span>{skill.name}</span>
                                  <span className={`${cd > 0 ? "text-yellow-400" : "text-green-400"}`}>
                                    {cd > 0 ? `CD: ${cd}` : "Ready"}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </TooltipContent>
              </Tooltip>
            )}

            {/* Scan lines effect */}
            <div className="absolute inset-0 opacity-20 pointer-events-none">
              <div className="h-full w-full bg-gradient-to-b from-transparent via-cyan-400/10 to-transparent animate-pulse" />
            </div>
          </motion.div>
        );
      }
    }
    return grid;
  };

  return (
    <div className="min-h-screen bg-black text-cyan-400 font-mono">
      {/* Cyberpunk background effects */}
      <div className="fixed inset-0 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/5 via-transparent to-pink-400/5" />
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(90deg, transparent 98%, cyan 100%),
            linear-gradient(0deg, transparent 98%, cyan 100%)
          `,
          backgroundSize: '20px 20px'
        }} />
      </div>

      <div className="relative z-10 container mx-auto p-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-3xl font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-400">
            CYBER TACTICS
          </h1>
          <div className="text-center text-sm">
            Room: <span className="text-pink-400">{roomId}</span> | 
            Grid: <span className="text-green-400">{room.gridSize}x{room.gridSize}</span> |
            Turn: <span className="text-yellow-400">{room.globalTurnCounter}</span> |
            Round: <span className="text-purple-400">{room.roundNumber}</span>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Game Board */}
          <div className="lg:col-span-2">
            <Card className="bg-black/50 border-cyan-400/30">
              <CardHeader>
                <CardTitle className="text-cyan-400 flex items-center gap-2">
                  <Cpu className="h-5 w-5" />
                  Battle Grid
                  {isMyTurn && (
                    <span className="text-green-400 text-sm animate-pulse">YOUR TURN</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TooltipProvider>
                  <div 
                    className="grid gap-1 p-4 bg-black/30 rounded border border-cyan-400/20"
                    style={{ gridTemplateColumns: `repeat(${room.gridSize}, 1fr)` }}
                  >
                    {renderGrid()}
                  </div>
                </TooltipProvider>
              </CardContent>
            </Card>
          </div>

          {/* Side Panel */}
          <div className="lg:col-span-2 space-y-4">
            {/* Game Status */}
            <Card className="bg-black/50 border-cyan-400/30">
              <CardHeader>
                <CardTitle className="text-cyan-400 flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Players ({room.players.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {room.players.map((player, index) => {
                    const character = characters?.find(c => c.characterId === player.characterId);
                    const isCurrent = room.turnOrder[room.currentTurnIndex] === player.playerId;
                    
                    return (
                      <div 
                        key={player.playerId}
                        className={`
                          p-2 rounded border flex items-center justify-between
                          ${isCurrent ? "border-green-400 bg-green-400/10" : "border-cyan-400/30"}
                          ${!player.isAlive ? "opacity-50" : ""}
                        `}
                      >
                        <div>
                          <div className="font-bold">
                            {player.name}
                            {player.isCreator && <span className="text-yellow-400 ml-1">★</span>}
                            {!player.isAlive && <span className="text-red-400 ml-1">💀</span>}
                          </div>
                          {character && (
                            <div className="text-xs text-cyan-400/70">
                              {character.name} | HP: {player.currentHP}/{character.maxHP} | SP: {player.currentSP}/{character.maxSP}
                            </div>
                          )}
                        </div>
                        {isCurrent && <Play className="h-4 w-4 text-green-400" />}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Pre-game Setup */}
            {room.status === "waiting" && (
              <Card className="bg-black/50 border-cyan-400/30">
                <CardHeader>
                  <CardTitle className="text-cyan-400 flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Setup
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Character Selection */}
                  <div>
                    <label className="text-sm text-cyan-400/70 mb-2 block">Select Character:</label>
                    <Select value={selectedCharacter} onValueChange={handleCharacterSelect}>
                      <SelectTrigger className="bg-black/30 border-cyan-400/30">
                        <SelectValue placeholder="Choose your character" />
                      </SelectTrigger>
                      <SelectContent className="bg-black border-cyan-400/30">
                        {characters?.map(char => (
                          <SelectItem key={char.characterId} value={char.characterId}>
                            <div className="flex items-center gap-2">
                              <span>{char.name}</span>
                              <span className="text-xs text-cyan-400/70">
                                HP:{char.maxHP} SP:{char.maxSP} MOV:{char.movement}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="text-sm text-cyan-400/70">
                    Click on the grid to select your starting position
                  </div>

                  {isCreator && (
                    <Button 
                      onClick={handleStartGame}
                      disabled={!canStart}
                      className="w-full bg-green-600 hover:bg-green-700 text-black font-bold"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      START GAME
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Game Actions */}
            {room.status === "playing" && (
              <Tabs defaultValue="actions" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-black/30">
                  <TabsTrigger value="actions">Actions</TabsTrigger>
                  <TabsTrigger value="dice">Dice</TabsTrigger>
                  <TabsTrigger value="stats">Stats</TabsTrigger>
                </TabsList>

                <TabsContent value="actions" className="space-y-4">
                  <Card className="bg-black/50 border-cyan-400/30">
                    <CardContent className="p-4 space-y-2">
                      <Button 
                        onClick={handleEndTurn}
                        disabled={!isMyTurn}
                        className="w-full bg-red-600 hover:bg-red-700 text-white"
                      >
                        End Turn
                      </Button>
                      
                      {currentPlayer && characters && (
                        <TooltipProvider>
                          {characters.find(c => c.characterId === currentPlayer.characterId)?.skills.map((skill, index) => {
                            const cd = getSkillCooldown(skill.name);
                            const enoughResource = canUseSkill(skill.cost);
                            const disabled = !isMyTurn || cd > 0 || !enoughResource;
                            return (
                              <Tooltip key={index}>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    className="w-full border-cyan-400/30 hover:border-cyan-400 flex justify-between"
                                    disabled={disabled}
                                    onClick={() => handleUseSkill(skill.name)}
                                  >
                                    <span>{skill.name}</span>
                                    <span className="text-xs text-cyan-400/70">
                                      {cd > 0 ? `CD: ${cd}` : `Cost: ${skill.cost}`}
                                    </span>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-black border-cyan-400/30 text-cyan-400">
                                  <div className="space-y-1">
                                    <div className="font-bold">{skill.name}</div>
                                    <div>Cost: {skill.cost}</div>
                                    <div>Cooldown: {skill.cooldown} turns</div>
                                    <div>Range: {skill.range}</div>
                                    <div>Damage: {skill.damage}</div>
                                    <div className="text-xs">{skill.description}</div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            );
                          })}
                        </TooltipProvider>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="dice" className="space-y-4">
                  <Card className="bg-black/50 border-cyan-400/30">
                    <CardHeader>
                      <CardTitle className="text-cyan-400 flex items-center gap-2">
                        <Dices className="h-5 w-5" />
                        Dice Roller
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-3 gap-2">
                        {[4, 6, 8, 10, 12, 20].map(faces => (
                          <Button
                            key={faces}
                            variant="outline"
                            size="sm"
                            onClick={() => addDiceRoll(faces)}
                            disabled={!isMyTurn}
                            className="border-cyan-400/30 hover:border-cyan-400"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            d{faces}
                          </Button>
                        ))}
                      </div>

                      {diceRolls.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-sm text-cyan-400/70">Selected:</div>
                          {diceRolls.map(roll => (
                            <div key={roll.faces} className="flex items-center justify-between">
                              <span>{roll.count}d{roll.faces}</span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeDiceRoll(roll.faces)}
                                className="border-red-400/30 hover:border-red-400"
                              >
                                Remove
                              </Button>
                            </div>
                          ))}
                          <Button 
                            onClick={handleRollDice}
                            disabled={!isMyTurn}
                            className="w-full bg-purple-600 hover:bg-purple-700"
                          >
                            <Dices className="h-4 w-4 mr-2" />
                            Roll Dice
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="stats" className="space-y-4">
                  <Card className="bg-black/50 border-cyan-400/30">
                    <CardHeader>
                      <CardTitle className="text-cyan-400 flex items-center gap-2">
                        <Heart className="h-5 w-5" />
                        Character Stats
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {currentPlayer && characters && (
                        <>
                          {(() => {
                            const character = characters.find(c => c.characterId === currentPlayer.characterId);
                            return character ? (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <div className="text-cyan-400/70">HP</div>
                                    <div className="text-lg">{currentPlayer.currentHP}/{character.maxHP}</div>
                                  </div>
                                  <div>
                                    <div className="text-cyan-400/70">SP</div>
                                    <div className="text-lg">{currentPlayer.currentSP}/{character.maxSP}</div>
                                  </div>
                                  <div>
                                    <div className="text-cyan-400/70">Attack</div>
                                    <div>{character.attack}</div>
                                  </div>
                                  <div>
                                    <div className="text-cyan-400/70">Defense</div>
                                    <div>{character.esquiva}</div>
                                  </div>
                                  <div>
                                    <div className="text-cyan-400/70">Movement</div>
                                    <div>{character.movement}</div>
                                  </div>
                                  <div>
                                    <div className="text-cyan-400/70">Range</div>
                                    <div>{character.alcance}</div>
                                  </div>
                                </div>

                                <Separator className="bg-cyan-400/30" />

                                <div className="space-y-2">
                                  <div className="flex gap-2">
                                    <Input
                                      type="number"
                                      placeholder="New HP"
                                      value={newHP}
                                      onChange={(e) => setNewHP(e.target.value)}
                                      max={character.maxHP}
                                      min={0}
                                      className="bg-black/30 border-cyan-400/30"
                                    />
                                    <Input
                                      type="number"
                                      placeholder="New SP"
                                      value={newSP}
                                      onChange={(e) => setNewSP(e.target.value)}
                                      max={character.maxSP}
                                      min={0}
                                      className="bg-black/30 border-cyan-400/30"
                                    />
                                  </div>
                                  <Button 
                                    onClick={handleUpdateStats}
                                    disabled={!newHP && !newSP}
                                    className="w-full bg-blue-600 hover:bg-blue-700"
                                  >
                                    Update Stats
                                  </Button>
                                </div>

                                {/* Skills & Cooldowns */}
                                <Separator className="bg-cyan-400/30" />
                                <div className="space-y-2">
                                  <div className="text-sm text-cyan-400/70">Skills & Cooldowns</div>
                                  <div className="space-y-1">
                                    {character.skills.map((skill) => {
                                      const cd = getSkillCooldown(skill.name);
                                      return (
                                        <div key={skill.name} className="flex items-center justify-between text-sm">
                                          <span>{skill.name}</span>
                                          <span className={`${cd > 0 ? "text-yellow-400" : "text-green-400"}`}>
                                            {cd > 0 ? `CD: ${cd}` : "Ready"}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            ) : null;
                          })()}
                        </>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}

            {/* Game Log */}
            <Card className="bg-black/50 border-cyan-400/30">
              <CardHeader>
                <CardTitle className="text-cyan-400 text-sm">Game Log</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48">
                  <div className="space-y-1 text-xs">
                    {room.gameLog.map((entry, index) => (
                      <div key={index} className="text-cyan-400/70 font-mono">
                        {entry.text}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}