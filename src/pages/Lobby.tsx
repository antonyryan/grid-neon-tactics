import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { Copy, Gamepad2, Plus, Users } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useMutation, useQuery } from "convex/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Lobby() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [gridSize, setGridSize] = useState<number>(8);
  const [roomIdToJoin, setRoomIdToJoin] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const createRoom = useMutation(api.rooms.createRoom);
  const seedCharacters = useMutation(api.characters.seedCharacters);
  const characters = useQuery(api.characters.getAllCharacters);
  const updateCharacter = useMutation(api.characters.updateCharacter);

  const [manageOpen, setManageOpen] = useState(false);
  const [edits, setEdits] = useState<Record<string, {
    name?: string;
    maxHP?: string;
    maxSP?: string;
    movement?: string;
    attack?: string;
    esquiva?: string;
    alcance?: string;
    placeholderImageURL?: string;
  }>>({});

  const setField = (id: string, field: string, value: string) => {
    setEdits(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [field]: value } }));
  };

  const saveCharacter = async (id: string) => {
    try {
      const e = edits[id] || {};
      const payload: any = { characterId: id };
      if (e.name !== undefined) payload.name = e.name;
      if (e.placeholderImageURL !== undefined) payload.placeholderImageURL = e.placeholderImageURL;
      if (e.maxHP !== undefined && e.maxHP !== "") payload.maxHP = parseInt(e.maxHP);
      if (e.maxSP !== undefined && e.maxSP !== "") payload.maxSP = parseInt(e.maxSP);
      if (e.movement !== undefined && e.movement !== "") payload.movement = parseInt(e.movement);
      if (e.attack !== undefined && e.attack !== "") payload.attack = parseInt(e.attack);
      if (e.esquiva !== undefined && e.esquiva !== "") payload.esquiva = parseInt(e.esquiva);
      if (e.alcance !== undefined && e.alcance !== "") payload.alcance = parseInt(e.alcance);

      await updateCharacter(payload);
      toast.success("Character updated");
      setEdits(prev => {
        const { [id]: _, ...rest } = prev;
        return rest;
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to update character");
    }
  };

  const handleCreateRoom = async () => {
    setIsCreating(true);
    try {
      // Ensure characters are seeded
      await seedCharacters();
      
      const playerId = localStorage.getItem("tacticsPlayerId") || 
        Math.random().toString(36).substring(2, 15);
      localStorage.setItem("tacticsPlayerId", playerId);
      
      const playerName = user?.name || `Player_${playerId.substring(0, 6)}`;
      
      const result = await createRoom({
        gridSize,
        creatorId: playerId,
        creatorName: playerName,
      });

      if (result.success) {
        toast.success("Room created successfully!");
        navigate(`/game/${result.roomId}`);
      }
    } catch (error) {
      toast.error("Failed to create room");
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = () => {
    if (!roomIdToJoin.trim()) {
      toast.error("Please enter a room ID");
      return;
    }
    navigate(`/game/${roomIdToJoin.toUpperCase()}`);
  };

  const copyRoomLink = (roomId: string) => {
    const link = `${window.location.origin}/game/${roomId}`;
    navigator.clipboard.writeText(link);
    toast.success("Room link copied to clipboard!");
  };

  return (
    <div className="min-h-screen bg-black text-cyan-400 font-mono relative overflow-hidden">
      {/* Cyberpunk background effects */}
      <div className="fixed inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/5 via-transparent to-pink-400/5" />
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `
            linear-gradient(90deg, transparent 98%, cyan 100%),
            linear-gradient(0deg, transparent 98%, cyan 100%)
          `,
          backgroundSize: '30px 30px'
        }} />
        
        {/* Animated scan lines */}
        <div className="absolute inset-0 opacity-20">
          <div className="h-full w-full bg-gradient-to-b from-transparent via-cyan-400/10 to-transparent animate-pulse" />
        </div>
        
        {/* Glitch effects */}
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-pink-400/5 blur-xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-24 h-24 bg-green-400/5 blur-xl animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h1 className="text-6xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-pink-400 to-green-400">
            CYBER TACTICS
          </h1>
          <div className="text-xl text-cyan-400/70 mb-2">
            // TACTICAL COMBAT SIMULATION //
          </div>
          <div className="text-sm text-pink-400/60 font-mono">
            &gt; NEURAL LINK ESTABLISHED &lt;
          </div>
        </motion.div>

        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Create Room */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="bg-black/50 border-cyan-400/30 backdrop-blur-sm hover:border-cyan-400/50 transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-cyan-400 flex items-center gap-2 text-xl">
                  <Plus className="h-6 w-6" />
                  CREATE BATTLE ROOM
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm text-cyan-400/70 block">
                    GRID SIZE CONFIGURATION
                  </label>
                  <Select value={gridSize.toString()} onValueChange={(value) => setGridSize(parseInt(value))}>
                    <SelectTrigger className="bg-black/30 border-cyan-400/30 text-cyan-400 hover:border-cyan-400/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-black border-cyan-400/30">
                      {Array.from({ length: 10 }, (_, i) => i + 6).map(size => (
                        <SelectItem key={size} value={size.toString()}>
                          {size}x{size} Grid
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-4 bg-cyan-400/5 border border-cyan-400/20 rounded">
                  <div className="text-xs text-cyan-400/70 space-y-1">
                    <div>• Minimum 2 players required</div>
                    <div>• Turn-based tactical combat</div>
                    <div>• Real-time synchronization</div>
                    <div>• Cyberpunk-themed characters</div>
                  </div>
                </div>

                <Button 
                  onClick={handleCreateRoom}
                  disabled={isCreating}
                  className="w-full bg-gradient-to-r from-cyan-600 to-pink-600 hover:from-cyan-700 hover:to-pink-700 text-black font-bold py-3 text-lg transition-all duration-300 transform hover:scale-105"
                >
                  {isCreating ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black mr-2" />
                      INITIALIZING...
                    </>
                  ) : (
                    <>
                      <Gamepad2 className="h-5 w-5 mr-2" />
                      DEPLOY BATTLE ROOM
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Join Room */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Card className="bg-black/50 border-pink-400/30 backdrop-blur-sm hover:border-pink-400/50 transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-pink-400 flex items-center gap-2 text-xl">
                  <Users className="h-6 w-6" />
                  JOIN EXISTING BATTLE
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm text-pink-400/70 block">
                    ROOM ACCESS CODE
                  </label>
                  <Input
                    type="text"
                    placeholder="Enter room ID (e.g., ABC123)"
                    value={roomIdToJoin}
                    onChange={(e) => setRoomIdToJoin(e.target.value.toUpperCase())}
                    className="bg-black/30 border-pink-400/30 text-pink-400 placeholder-pink-400/50 hover:border-pink-400/50 focus:border-pink-400"
                    maxLength={6}
                  />
                </div>

                <div className="p-4 bg-pink-400/5 border border-pink-400/20 rounded">
                  <div className="text-xs text-pink-400/70 space-y-1">
                    <div>• Enter the 6-character room code</div>
                    <div>• Join ongoing battles as spectator</div>
                    <div>• Real-time battle updates</div>
                    <div>• Cross-platform compatible</div>
                  </div>
                </div>

                <Button 
                  onClick={handleJoinRoom}
                  disabled={!roomIdToJoin.trim()}
                  className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-bold py-3 text-lg transition-all duration-300 transform hover:scale-105"
                >
                  <Users className="h-5 w-5 mr-2" />
                  CONNECT TO BATTLE
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Add Manage Characters trigger near the features or header */}
        <div className="max-w-4xl mx-auto mt-6 flex justify-center">
          <Dialog open={manageOpen} onOpenChange={setManageOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-cyan-400/40 text-cyan-300 hover:border-cyan-400">
                Editar Personagens
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl bg-black/80 border-cyan-400/30 text-cyan-300">
              <DialogHeader>
                <DialogTitle className="text-cyan-400">Gerenciar Personagens</DialogTitle>
              </DialogHeader>
              <ScrollArea className="h-[60vh] pr-2">
                <div className="space-y-4">
                  {characters?.map((c) => {
                    const e = edits[c.characterId] || {};
                    return (
                      <Card key={c.characterId} className="bg-black/40 border-cyan-400/20">
                        <CardHeader>
                          <CardTitle className="text-cyan-300 text-base">
                            {c.name} <span className="text-xs text-cyan-400/60">({c.characterId})</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-cyan-400/70">Nome</Label>
                            <Input
                              className="bg-black/30 border-cyan-400/30"
                              defaultValue={c.name}
                              onChange={(ev) => setField(c.characterId, "name", ev.target.value)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-cyan-400/70">Imagem (URL)</Label>
                            <Input
                              className="bg-black/30 border-cyan-400/30"
                              defaultValue={c.placeholderImageURL}
                              onChange={(ev) => setField(c.characterId, "placeholderImageURL", ev.target.value)}
                            />
                          </div>

                          <div>
                            <Label className="text-xs text-cyan-400/70">Max HP</Label>
                            <Input
                              type="number"
                              min={0}
                              className="bg-black/30 border-cyan-400/30"
                              defaultValue={c.maxHP}
                              onChange={(ev) => setField(c.characterId, "maxHP", ev.target.value)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-cyan-400/70">Max SP</Label>
                            <Input
                              type="number"
                              min={0}
                              className="bg-black/30 border-cyan-400/30"
                              defaultValue={c.maxSP}
                              onChange={(ev) => setField(c.characterId, "maxSP", ev.target.value)}
                            />
                          </div>

                          <div>
                            <Label className="text-xs text-cyan-400/70">Movimento</Label>
                            <Input
                              type="number"
                              min={0}
                              className="bg-black/30 border-cyan-400/30"
                              defaultValue={c.movement}
                              onChange={(ev) => setField(c.characterId, "movement", ev.target.value)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-cyan-400/70">Ataque</Label>
                            <Input
                              type="number"
                              min={0}
                              className="bg-black/30 border-cyan-400/30"
                              defaultValue={c.attack}
                              onChange={(ev) => setField(c.characterId, "attack", ev.target.value)}
                            />
                          </div>

                          <div>
                            <Label className="text-xs text-cyan-400/70">Esquiva</Label>
                            <Input
                              type="number"
                              min={0}
                              className="bg-black/30 border-cyan-400/30"
                              defaultValue={c.esquiva}
                              onChange={(ev) => setField(c.characterId, "esquiva", ev.target.value)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-cyan-400/70">Alcance</Label>
                            <Input
                              type="number"
                              min={0}
                              className="bg-black/30 border-cyan-400/30"
                              defaultValue={c.alcance}
                              onChange={(ev) => setField(c.characterId, "alcance", ev.target.value)}
                            />
                          </div>

                          <div className="md:col-span-2">
                            <Button
                              onClick={() => saveCharacter(c.characterId)}
                              className="w-full bg-gradient-to-r from-cyan-600 to-pink-600 hover:from-cyan-700 hover:to-pink-700 text-black font-bold"
                            >
                              Salvar
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {!characters && (
                    <div className="text-sm text-cyan-400/70">Carregando personagens...</div>
                  )}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>

        {/* Features Section */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-16 max-w-6xl mx-auto"
        >
          <h2 className="text-3xl font-bold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-400">
            COMBAT FEATURES
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: "TACTICAL MOVEMENT",
                description: "Grid-based movement system with strategic positioning",
                icon: "🎯",
                color: "cyan"
              },
              {
                title: "SKILL SYSTEM",
                description: "Unique abilities with cooldowns and resource management",
                icon: "⚡",
                color: "pink"
              },
              {
                title: "DICE MECHANICS",
                description: "D4 to D20 dice rolling for chance-based actions",
                icon: "🎲",
                color: "green"
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.8 + index * 0.1 }}
              >
                <Card className={`bg-black/30 border-${feature.color}-400/30 hover:border-${feature.color}-400/50 transition-all duration-300 transform hover:scale-105`}>
                  <CardContent className="p-6 text-center">
                    <div className="text-4xl mb-4">{feature.icon}</div>
                    <h3 className={`text-${feature.color}-400 font-bold mb-2`}>{feature.title}</h3>
                    <p className="text-sm text-gray-400">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.2 }}
          className="mt-16 text-center text-xs text-cyan-400/50"
        >
          <div className="mb-2">
            // NEURAL INTERFACE v2.077 //
          </div>
          <div>
            Powered by{" "}
            <a
              href="https://vly.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-pink-400 hover:text-pink-300 transition-colors underline"
            >
              vly.ai
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}