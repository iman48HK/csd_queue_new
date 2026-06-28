import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Shield, BarChart3, Megaphone, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  { icon: Shield, label: "Queue Calling Management" },
  { icon: Megaphone, label: "Public Announcements" },
  { icon: BarChart3, label: "Realtime Queue Statistics" },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-gray-100 py-6 px-4">
      <div className="w-full max-w-4xl flex rounded-2xl shadow-2xl overflow-hidden min-h-0">
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-primary/80" />
          <div className="relative z-10 flex flex-col justify-center items-center w-full px-10 py-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <div className="mb-4 w-24 h-24 mx-auto rounded-full bg-white/15 flex items-center justify-center text-white text-3xl font-bold">
                CSD
              </div>
              <h1 className="text-2xl xl:text-3xl font-bold text-white leading-tight mb-2">
                Welcome Back!
              </h1>
              <p className="text-white/80 text-sm max-w-xs mx-auto leading-relaxed">
                Smart Visit Management System — queue management for correctional facilities.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-6 space-y-3 w-full max-w-xs"
            >
              {features.map(({ icon: Icon, label }, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2.5 border border-white/10"
                >
                  <div className="w-8 h-8 rounded-md bg-white/15 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-white/90 text-sm font-medium">{label}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 sm:px-10 py-8 bg-white overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="w-full max-w-sm"
          >
            <div className="mb-5">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                Smart Visit Management System
              </h2>
              <p className="text-primary font-semibold text-base mt-1">Queue Admin</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" size="lg" className="w-full h-10 mt-1">
                <LogIn className="w-5 h-5 mr-2" />
                Login
              </Button>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
