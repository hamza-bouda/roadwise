import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await login(email, password);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthenticated) {
    return <Navigate to="/" />;
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-7xl mx-auto"
      >
        <Card className="mx-auto w-full max-w-md sm:max-w-lg md:max-w-3xl lg:max-w-4xl border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 overflow-hidden">
          <div className="flex flex-col md:flex-row">
            {/* Left side - Branding */}
            <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 flex-col justify-center items-center p-8 text-white">
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="p-4 rounded-full bg-white/10 backdrop-blur-sm">
                  <img src="/favicon.ico" className="h-16 w-16" alt="RoadWise Logo" />
                </div>
                <div className="space-y-3">
                  <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">RoadWise Manager</h2>
                  <p className="text-sm lg:text-base text-blue-100 opacity-90">
                    Système de gestion intelligent pour l'entretien routier
                  </p>
                </div>
                <div className="w-full max-w-xs mt-8">
                  <div className="grid grid-cols-3 gap-2 opacity-80">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="aspect-square rounded-lg bg-white/10 backdrop-blur-sm"></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right side - Login Form */}
            <div className="w-full md:w-1/2 p-6 sm:p-8">
              <CardHeader className="space-y-1 flex flex-col items-center text-center px-0 pt-0">
                {/* Mobile logo */}
                <div className="md:hidden p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                  <img src="/favicon.ico" className="h-10 w-10 text-blue-600 dark:text-blue-400" alt="RoadWise Logo" />
                </div>
                
                <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-800 dark:text-gray-100">
                  RoadWise Manager
                </CardTitle>
                <CardDescription className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
                  Connectez-vous à votre tableau de bord administrateur
                </CardDescription>
              </CardHeader>
              
              <CardContent className="px-0">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="email" className="text-gray-700 dark:text-gray-100">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@roadwise.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor="password" className="text-gray-700 dark:text-gray-100">
                      Mot de passe
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-medium"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Connexion en cours...
                      </div>
                    ) : (
                      'Se connecter'
                    )}
                  </Button>
                </form>
              </CardContent>
              
              <CardFooter className="flex justify-center px-0 pb-0">
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center">
                  Utilisateurs démo: admin@roadwise.com / admin123
                </p>
              </CardFooter>
            </div>
          </div>
        </Card>
        
        {/* Footer note */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} RoadWise Manager. Tous droits réservés.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;