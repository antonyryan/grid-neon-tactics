import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { Gamepad2, Loader2, Zap } from "lucide-react";
import { useNavigate } from "react-router";

export default function Landing() {
  const navigate = useNavigate();
  const { isLoading, isAuthenticated, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className="text-cyan-400 font-mono">Initializing neural link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-cyan-400 font-mono relative overflow-hidden">
      {/* Cyberpunk background effects */}
      <div className="fixed inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 via-transparent to-pink-400/10" />
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `
            linear-gradient(90deg, transparent 98%, cyan 100%),
            linear-gradient(0deg, transparent 98%, cyan 100%)
          `,
          backgroundSize: '50px 50px'
        }} />
        
        {/* Animated elements */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-pink-400/5 blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-green-400/5 blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-cyan-400/5 blur-2xl animate-pulse delay-500" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="text-center mb-16"
        >
          <div className="flex justify-center mb-8">
            <motion.img
              src="./logo.svg"
              alt="Cyber Tactics Logo"
              width={120}
              height={120}
              className="rounded-lg cursor-pointer filter drop-shadow-lg"
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/")}
            />
          </div>
          
          <motion.h1
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-7xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-pink-400 to-green-400"
          >
            CYBER TACTICS
          </motion.h1>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-2xl text-cyan-400/80 mb-4"
          >
            // NEURAL COMBAT SIMULATION //
          </motion.div>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="text-lg text-gray-400 max-w-2xl mx-auto mb-8"
          >
            Enter the digital battlefield where strategy meets cyberpunk aesthetics. 
            Command your squad in turn-based tactical combat across neon-lit grids.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Button
              onClick={() => navigate("/lobby")}
              size="lg"
              className="bg-gradient-to-r from-cyan-600 to-pink-600 hover:from-cyan-700 hover:to-pink-700 text-black font-bold px-8 py-4 text-xl transition-all duration-300 transform hover:scale-105"
            >
              <Gamepad2 className="h-6 w-6 mr-2" />
              {isAuthenticated ? "ENTER COMBAT" : "START MISSION"}
            </Button>
            
            {!isAuthenticated && (
              <Button
                onClick={() => navigate("/auth")}
                variant="outline"
                size="lg"
                className="border-cyan-400/50 text-cyan-400 hover:bg-cyan-400/10 px-8 py-4 text-xl"
              >
                <Zap className="h-6 w-6 mr-2" />
                NEURAL LINK
              </Button>
            )}
          </motion.div>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1 }}
          className="max-w-6xl mx-auto"
        >
          <h2 className="text-4xl font-bold text-center mb-12 text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-400">
            COMBAT SYSTEMS
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: "TACTICAL GRID",
                description: "Navigate cyberpunk battlefields on customizable grids from 6x6 to 15x15",
                icon: "🎯",
                color: "from-cyan-400 to-blue-400"
              },
              {
                title: "NEURAL CHARACTERS",
                description: "Choose from 6 unique cyber-enhanced warriors with distinct abilities",
                icon: "🤖",
                color: "from-pink-400 to-purple-400"
              },
              {
                title: "SKILL MATRIX",
                description: "Master 3 unique skills per character with cooldowns and resource costs",
                icon: "⚡",
                color: "from-green-400 to-teal-400"
              },
              {
                title: "QUANTUM DICE",
                description: "Roll D4 to D20 dice for chance-based combat mechanics",
                icon: "🎲",
                color: "from-yellow-400 to-orange-400"
              },
              {
                title: "REAL-TIME SYNC",
                description: "Experience seamless multiplayer with instant battle updates",
                icon: "🌐",
                color: "from-purple-400 to-pink-400"
              },
              {
                title: "TURN WARFARE",
                description: "Strategic turn-based combat with movement and action phases",
                icon: "⚔️",
                color: "from-red-400 to-pink-400"
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.2 + index * 0.1 }}
                className="group"
              >
                <div className="bg-black/50 border border-cyan-400/30 rounded-lg p-6 hover:border-cyan-400/50 transition-all duration-300 transform hover:scale-105 hover:bg-black/70">
                  <div className="text-5xl mb-4 text-center">{feature.icon}</div>
                  <h3 className={`text-xl font-bold mb-3 text-center bg-gradient-to-r ${feature.color} bg-clip-text text-transparent`}>
                    {feature.title}
                  </h3>
                  <p className="text-gray-400 text-center text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 2 }}
          className="text-center mt-20"
        >
          <div className="bg-gradient-to-r from-cyan-400/10 to-pink-400/10 border border-cyan-400/30 rounded-lg p-8 max-w-4xl mx-auto">
            <h3 className="text-3xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-400">
              READY FOR COMBAT?
            </h3>
            <p className="text-gray-400 mb-6 text-lg">
              Join the neural battlefield and prove your tactical supremacy in the cyberpunk arena.
            </p>
            <Button
              onClick={() => navigate("/lobby")}
              size="lg"
              className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-bold px-12 py-4 text-xl transition-all duration-300 transform hover:scale-110"
            >
              <Gamepad2 className="h-6 w-6 mr-2" />
              DEPLOY NOW
            </Button>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 2.5 }}
          className="mt-20 text-center text-xs text-cyan-400/50"
        >
          <div className="mb-2">
            // NEURAL INTERFACE v2.077 - TACTICAL COMBAT DIVISION //
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