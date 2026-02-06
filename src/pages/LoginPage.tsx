import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import bgImage from "../assets/bg.jpg";

// API base URL
const API_BASE_URL = "http://localhost:6060";
// const API_BASE_URL = "https://ort-digitalization.aequs.com:6060";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email,
        password,
      });

      if (response.data.success && response.data.user) {
        // Store user data in localStorage
        localStorage.setItem("user", JSON.stringify(response.data.user));
        localStorage.setItem("userEmail", response.data.user.email);
        localStorage.setItem("userTeam", response.data.user.team || "");
        localStorage.setItem("userRole", response.data.user.role || "user");

        // Redirect based on team
        const team = response.data.user.team?.toUpperCase();
        if (team === "OQC") {
          navigate("/oqcpage", { replace: true });
        } else if (team === "ORT") {
          navigate("/", { replace: true });
        } else {
          // Default redirect
          navigate("/", { replace: true });
        }
      } else {
        throw new Error(response.data.message || "Login failed");
      }
    } catch (err: any) {
      console.error("Login error:", err.response?.data || err.message);
      setError(err.response?.data?.message || "Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex relative overflow-hidden bg-slate-950">
      {/* Diagonal Background Image Section */}
      <div
        className="absolute inset-0 lg:clip-diagonal"
        style={{
          clipPath: window.innerWidth >= 1024 ? 'polygon(0 0, 65% 0, 50% 100%, 0 100%)' : 'none',
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${bgImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 via-slate-900/60 to-slate-950/80" />

        {/* Branding on Image */}
        <div className="hidden lg:flex absolute inset-0 items-center justify-start pl-16 xl:pl-24">
          <div className="max-w-xl space-y-6 animate-fadeIn">
            <div className="space-y-2">
              <h1 className="text-6xl xl:text-7xl font-bold text-white tracking-tight">
                AEQUS
              </h1>
              <div className="flex items-center space-x-3">
                <div className="h-1 w-12 bg-blue-500"></div>
                <p className="text-xl xl:text-2xl text-slate-200 font-light tracking-wide">
                  ecosystems of efficiency
                </p>
              </div>
            </div>
            <p className="text-slate-300 text-lg leading-relaxed max-w-md">
              Precision-engineered solutions for the modern enterprise.
              Access your command center.
            </p>
          </div>
        </div>
      </div>

      {/* Login Form Section */}
      <div className="relative z-10 w-full lg:w-auto lg:ml-auto lg:min-w-[45%] xl:min-w-[40%] flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md animate-slideIn">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center space-y-2 mb-8">
            <h1 className="text-4xl font-bold text-white">AEQUS</h1>
            <p className="text-slate-400 text-sm">ecosystems of efficiency</p>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-2xl shadow-2xl p-4 lg:p-10 space-y-6">
            {/* Header */}
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
                Welcome Back
              </h2>
              <p className="text-slate-600 text-sm">
                Sign in to your account to continue
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email Field */}
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-sm font-semibold text-slate-700"
                >
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 px-4 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-sm font-semibold text-slate-700"
                >
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 px-4 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  disabled={isLoading}
                  autoComplete="current-password"
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-sm text-red-700">
                    {error}
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 transition-all duration-200 group"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <span>Sign In</span>
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </div>
                )}
              </Button>
            </form>

            {/* Footer Links */}
            <div className="border-t border-slate-200 pt-6">
              <div className="text-center text-slate-600 text-sm">
                Contact administrator for account access
              </div>
            </div>
          </div>

          {/* Copyright */}
          <p className="text-center text-sm text-slate-400 mt-6">
            © {new Date().getFullYear()} AEQUS Systems. All rights reserved.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.8s ease-out;
        }

        .animate-slideIn {
          animation: slideIn 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}