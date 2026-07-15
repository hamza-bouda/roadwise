import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Eye, EyeOff, CheckCircle, AlertCircle, Loader2, User, Mail, Lock, KeyRound } from 'lucide-react';
import { motion } from 'framer-motion';

const Profile = () => {
  const { user, updateUserName } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  // Check if name has been changed
  const isNameChanged = name !== user?.name;
  
  // Check if password fields have values
  const hasPasswordValues = currentPassword || newPassword || confirmPassword;

  // Validate password fields in real-time
  const validatePasswords = () => {
    const errors: string[] = [];
    
    if (newPassword && newPassword.length < 6) {
      errors.push('Le mot de passe doit contenir au moins 6 caractères');
    }
    
    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      errors.push('Les mots de passe ne correspondent pas');
    }
    
    if (currentPassword && newPassword && currentPassword === newPassword) {
      errors.push('Le nouveau mot de passe doit être différent de l\'actuel');
    }
    
    setPasswordErrors(errors);
    return errors.length === 0;
  };

  // Handle input changes with validation
  const handlePasswordChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
    setter(value);
    setTimeout(validatePasswords, 300); // Debounced validation
  };

  const handleSaveProfile = async () => {
    // Validate password fields if user wants to change password
    if (hasPasswordValues) {
      if (!currentPassword) {
        toast({
          title: 'Mot de passe actuel requis',
          description: 'Veuillez saisir votre mot de passe actuel pour des raisons de sécurité.',
          variant: 'destructive',
        });
        return;
      }

      if (!newPassword) {
        toast({
          title: 'Nouveau mot de passe requis',
          description: 'Veuillez saisir un nouveau mot de passe.',
          variant: 'destructive',
        });
        return;
      }

      if (!validatePasswords()) {
        toast({
          title: 'Erreur de validation',
          description: 'Veuillez corriger les erreurs dans le formulaire.',
          variant: 'destructive',
        });
        return;
      }
    }

    setIsSaving(true);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.email) {
        throw new Error('Utilisateur non connecté');
      }

      let updatesMade = false;

      // Update name first (doesn't require reauthentication)
      if (isNameChanged) {
        await updateUserName(name);
        updatesMade = true;
      }

      // Handle password update with reauthentication
      if (newPassword) {
        try {
          // Create credential with current password
          const credential = EmailAuthProvider.credential(
            currentUser.email,
            currentPassword
          );

          // Reauthenticate user
          await reauthenticateWithCredential(currentUser, credential);

          // Update password after successful reauthentication
          await updatePassword(currentUser, newPassword);
          updatesMade = true;

          toast({
            title: 'Mot de passe mis à jour',
            description: 'Votre mot de passe a été modifié avec succès. Vous allez être déconnecté pour des raisons de sécurité.',
            action: (
              <Button variant="outline" size="sm" onClick={() => auth.signOut()}>
                Se déconnecter maintenant
              </Button>
            ),
            duration: 5000,
          });

          // Clear all password fields
          clearPasswordFields();

          // Wait 5 seconds so user sees the toast before logging out
          setTimeout(() => {
            auth.signOut();
          }, 5000);
        } catch (authError: any) {
          if (authError.code === 'auth/wrong-password' || authError.code === 'auth/invalid-credential') {
            toast({
              title: 'Erreur d\'authentification',
              description: 'Le mot de passe actuel est incorrect.',
              variant: 'destructive',
            });
          } else if (authError.code === 'auth/too-many-requests') {
            toast({
              title: 'Trop de tentatives',
              description: 'Trop de tentatives échouées. Veuillez réessayer plus tard.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Erreur',
              description: authError.message || 'Erreur lors de la mise à jour du mot de passe',
              variant: 'destructive',
            });
          }
          return; // Don't continue with name update if password update failed
        }
      } else if (updatesMade) {
        // Only name was updated
        toast({
          title: 'Profil mis à jour',
          description: 'Vos informations personnelles ont été mises à jour.',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Erreur lors de la mise à jour',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const clearPasswordFields = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordErrors([]);
  };

  const PasswordInput = ({ 
    value, 
    onChange, 
    placeholder, 
    showPassword, 
    setShowPassword,
    id,
    label
  }: {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    showPassword: boolean;
    setShowPassword: (show: boolean) => void;
    id: string;
    label: string;
  }) => (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-gray-700 dark:text-gray-100">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type={showPassword ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 pr-10"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
          onClick={() => setShowPassword(!showPassword)}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4 text-gray-500" />
          ) : (
            <Eye className="h-4 w-4 text-gray-500" />
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-8"
      >
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-800 dark:text-gray-100">Profil</h2>
            <p className="text-muted-foreground mt-2">
              Gérez vos informations personnelles et votre sécurité
            </p>
          </div>
        </div>

        <Card className="shadow-sm border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
          <CardHeader className="pb-4 border-b border-gray-100 dark:border-gray-700">
            <CardTitle className="text-xl font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <User className="h-5 w-5 text-blue-500" />
              Informations personnelles
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300">
              Gérez vos informations de compte et vos paramètres de sécurité
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-gray-700 dark:text-gray-100 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Nom
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                  />
                  {isNameChanged && (
                    <div className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400">
                      <CheckCircle className="h-4 w-4" />
                      <span>Modifications non enregistrées</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700 dark:text-gray-100 flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    defaultValue={user?.email}
                    readOnly
                    className="cursor-not-allowed bg-muted dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    L'adresse email ne peut pas être modifiée
                  </p>
                </div>
              </div>

              {/* Password Change Section */}
              <div className="pt-6 space-y-6">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">Changer le mot de passe</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <PasswordInput
                    value={currentPassword}
                    onChange={(value) => handlePasswordChange(setCurrentPassword, value)}
                    placeholder="Mot de passe actuel"
                    showPassword={showCurrentPassword}
                    setShowPassword={setShowCurrentPassword}
                    id="current-password"
                    label="Mot de passe actuel"
                  />

                  <PasswordInput
                    value={newPassword}
                    onChange={(value) => handlePasswordChange(setNewPassword, value)}
                    placeholder="Nouveau mot de passe (min. 6 caractères)"
                    showPassword={showNewPassword}
                    setShowPassword={setShowNewPassword}
                    id="new-password"
                    label="Nouveau mot de passe"
                  />

                  <PasswordInput
                    value={confirmPassword}
                    onChange={(value) => handlePasswordChange(setConfirmPassword, value)}
                    placeholder="Confirmer le nouveau mot de passe"
                    showPassword={showConfirmPassword}
                    setShowPassword={setShowConfirmPassword}
                    id="confirm-password"
                    label="Confirmation du mot de passe"
                  />
                </div>

                {/* Password validation feedback */}
                {passwordErrors.length > 0 && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-2">
                      <AlertCircle className="h-5 w-5" />
                      <span className="font-medium">Problèmes à corriger:</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-red-600 dark:text-red-300 text-sm">
                      {passwordErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Password strength indicator */}
                {newPassword.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Force du mot de passe</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {newPassword.length}/6 caractères minimum
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          newPassword.length >= 6 ? 'bg-green-500' : 
                          newPassword.length >= 4 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min((newPassword.length / 6) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {hasPasswordValues && (
                  <div className="flex gap-3">
                    <Button 
                      variant="outline"
                      onClick={clearPasswordFields}
                      className="text-gray-600 border-gray-300 hover:bg-gray-50 dark:text-gray-400 dark:border-gray-600 dark:hover:bg-gray-700"
                    >
                      Annuler
                    </Button>
                    <div className="text-xs text-gray-500 dark:text-gray-400 self-center">
                      Vous modifiez votre mot de passe
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <Button 
                onClick={handleSaveProfile} 
                disabled={isSaving || (!isNameChanged && !hasPasswordValues)}
                className="bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 min-w-40"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  'Enregistrer les modifications'
                )}
              </Button>
              
              {!isNameChanged && !hasPasswordValues && (
                <p className="text-sm text-gray-500 dark:text-gray-400 self-center">
                  Aucune modification à enregistrer
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Profile;