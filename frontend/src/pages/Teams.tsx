import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchTeams, createTeam, deleteTeam, fetchUsers, createUser, assignUserToTeam, deleteUser } from "@/services/dataService";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Users, ArrowLeft, UserPlus, Search, Filter, X, UserCheck, UserX, Shield, Wrench, BarChart3, ChevronRight } from "lucide-react";
import { User, Team } from "@/types/index";
import { motion, AnimatePresence } from "framer-motion";

const Teams = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [newTeamName, setNewTeamName] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<"ADMIN" | "TECHNICIAN">("TECHNICIAN");
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [openTeamDialog, setOpenTeamDialog] = useState(false);
  const [openUserDialog, setOpenUserDialog] = useState(false);
  const [viewTeamId, setViewTeamId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<string | null>(null);
  const [deleteUserConfirmOpen, setDeleteUserConfirmOpen] = useState<string | null>(null);

  const { data: teams = [], isLoading: teamsLoading, error: teamsError } = useQuery<Team[]>({
    queryKey: ["teams"],
    queryFn: fetchTeams,
  });

  const { data: users = [], isLoading: usersLoading, error: usersError } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });

  // Filter users
  const technicians = users.filter(user => user.role === "TECHNICIAN");
  const admins = users.filter(user => user.role === "ADMIN");

  const createTeamMutation = useMutation({
    mutationFn: createTeam,
    onMutate: async ({ name }: { name: string }) => {
      await queryClient.cancelQueries({ queryKey: ["teams"] });
      const previousTeams = queryClient.getQueryData<Team[]>(["teams"]) || [];
      const optimisticTeam: Team = {
        id: `temp-${Date.now()}`,
        name,
        members: 0,
      };
      queryClient.setQueryData(["teams"], [...previousTeams, optimisticTeam]);
      return { previousTeams };
    },
    onSuccess: (newTeam: Team) => {
      queryClient.setQueryData(["teams"], (old: Team[] = []) =>
        old.map(team => (team.id.startsWith("temp-") ? newTeam : team))
      );
      setNewTeamName('');
      setOpenTeamDialog(false);
      toast({ 
        title: "Équipe créée", 
        description: `L'équipe a été créée avec succès.`,
        duration: 3000
      });
    },
    onError: (error: any, _variables: any, context: any) => {
      queryClient.setQueryData(["teams"], context.previousTeams);
      toast({ 
        title: "Erreur", 
        description: error.message || "Échec de la création de l\"équipe.", 
        variant: "destructive",
        duration: 5000
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
  });

  const deleteTeamMutation = useMutation({
    mutationFn: deleteTeam,
    onMutate: async (teamId: string) => {
      await queryClient.cancelQueries({ queryKey: ["teams"] });
      const previousTeams = queryClient.getQueryData<Team[]>(["teams"]) || [];
      queryClient.setQueryData(["teams"], previousTeams.filter(team => team.id !== teamId));
      return { previousTeams };
    },
    onSuccess: () => {
      setDeleteConfirmOpen(null);
      toast({ 
        title: "Équipe supprimée", 
        description: "L'équipe a été supprimée avec succès.",
        duration: 3000
      });
    },
    onError: (error: any, _variables: any, context: any) => {
      queryClient.setQueryData(["teams"], context.previousTeams);
      toast({ 
        title: "Erreur", 
        description: error.message || "Échec de la suppression de l'équipe.", 
        variant: "destructive",
        duration: 5000
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["teams", "users"] });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: createUser,
    onMutate: async (newUser: Omit<User, "id">) => {
      await queryClient.cancelQueries({ queryKey: ["users"] });
      const previousUsers = queryClient.getQueryData<User[]>(["users"]) || [];
      const optimisticUser: User = {
        id: `temp-${Date.now()}`,
        ...newUser,
      };
      queryClient.setQueryData(["users"], [...previousUsers, optimisticUser]);
      return { previousUsers };
    },
    onSuccess: (newUser: User) => {
      queryClient.setQueryData(["users"], (old: User[] = []) =>
        old.map(user => (user.id === newUser.id ? newUser : user))
      );
      setNewUserName('');
      setNewUserEmail('');
      setNewUserRole("TECHNICIAN");
      setOpenUserDialog(false);
      toast({ 
        title: "Utilisateur créé", 
        description: `L'utilisateur "${newUser.name}" a été créé avec succès.`,
        duration: 3000
      });
    },
    onError: (error: any, _variables: any, context: any) => {
      queryClient.setQueryData(["users"], context.previousUsers);
      toast({ 
        title: "Erreur", 
        description: error.message || "Échec de la création de l'utilisateur.", 
        variant: "destructive",
        duration: 5000
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: deleteUser,
    onMutate: async (userId: string) => {
      await queryClient.cancelQueries({ queryKey: ["users"] });
      const previousUsers = queryClient.getQueryData<User[]>(["users"]) || [];
      queryClient.setQueryData(["users"], previousUsers.filter(user => user.id !== userId));
      return { previousUsers };
    },
    onSuccess: () => {
      setDeleteUserConfirmOpen(null);
      toast({ 
        title: "Utilisateur supprimé", 
        description: "L'utilisateur a été supprimé avec succès.",
        duration: 3000
      });
    },
    onError: (error: any, _variables: any, context: any) => {
      queryClient.setQueryData(["users"], context.previousUsers);
      toast({ 
        title: "Erreur", 
        description: error.message || "Échec de la suppression de l'utilisateur.", 
        variant: "destructive",
        duration: 5000
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const assignUserMutation = useMutation({
    mutationFn: ({ userId, teamId }: { userId: string; teamId: string | null }) => assignUserToTeam(userId, teamId),
    onMutate: async ({ userId, teamId }: { userId: string; teamId: string | null }) => {
      await queryClient.cancelQueries({ queryKey: ["users"] });
      const previousUsers = queryClient.getQueryData<User[]>(["users"]) || [];
      const previousTeams = queryClient.getQueryData<Team[]>(["teams"]) || [];
      
      queryClient.setQueryData(["users"], (old: User[] = []) =>
        old.map(user => (user.id === userId ? { ...user, teamId } : user))
      );
      
      if (teamId) {
        queryClient.setQueryData(["teams"], (old: Team[] = []) =>
          old.map(team => (team.id === teamId ? { ...team, members: (team.members || 0) + 1 } : team))
        );
      }
      
      return { previousUsers, previousTeams };
    },
    onSuccess: (data, variables) => {
      const userName = users.find(u => u.id === variables.userId)?.name || "Utilisateur";
      const teamName = variables.teamId ? teams.find(t => t.id === variables.teamId)?.name : "aucune équipe";
      
      toast({ 
        title: "Assignation réussie", 
        description: `${userName} a été assigné à ${teamName}.`,
        duration: 3000
      });
    },
    onError: (error: any, _variables: any, context: any) => {
      queryClient.setQueryData(["users"], context.previousUsers);
      queryClient.setQueryData(["teams"], context.previousTeams);
      toast({ 
        title: "Erreur", 
        description: error.message || "Échec de l'assignation.", 
        variant: "destructive",
        duration: 5000
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["users", "teams"] });
    },
  });

  const handleCreateTeam = () => {
    if (!newTeamName.trim()) {
      toast({ 
        title: "Erreur", 
        description: "Le nom de l'équipe est requis.", 
        variant: "destructive",
        duration: 3000
      });
      return;
    }
    createTeamMutation.mutate({ name: newTeamName });
  };

  const handleCreateUser = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!newUserName.trim()) {
      toast({ 
        title: "Erreur", 
        description: "Le nom de l'utilisateur est requis.", 
        variant: "destructive",
        duration: 3000
      });
      return;
    }
    if (!newUserEmail.trim() || !emailRegex.test(newUserEmail)) {
      toast({ 
        title: "Erreur", 
        description: "Veuillez entrer une adresse email valide.", 
        variant: "destructive",
        duration: 3000
      });
      return;
    }
    createUserMutation.mutate({
      name: newUserName,
      email: newUserEmail,
      role: newUserRole,
      teamId: null,
      createdAt: new Date().toISOString(),
    });
  };

  const filteredUsers = selectedTeamId 
    ? users.filter(user => user.teamId === selectedTeamId) 
    : users;
  
  const searchedUsers = searchQuery 
    ? filteredUsers.filter(user => 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : filteredUsers;
  
  const selectedTeam = teams.find(team => team.id === viewTeamId) || null;
  const teamTechnicians = viewTeamId 
    ? technicians.filter(technician => technician.teamId === viewTeamId) 
    : [];

  // Calculate stats for cards
  const stats = {
    totalTeams: teams.length,
    totalUsers: users.length,
    technicians: technicians.length,
    admins: admins.length,
    unassignedTechnicians: technicians.filter(t => !t.teamId).length,
  };

  if (teamsError || usersError) {
    return (
      <div className="max-w-7xl mx-auto p-6 min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <Users className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-semibold mb-2">Erreur de chargement</h3>
              <p className="text-muted-foreground mb-4">
                {teamsError?.message || usersError?.message || "Une erreur est survenue lors du chargement des données."}
              </p>
              <Button onClick={() => queryClient.refetchQueries({ queryKey: ["teams", "users"] })}>
                Réessayer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 min-h-screen">
      <AnimatePresence mode="wait">
        <motion.div
          key={viewTeamId ? `team-details-${viewTeamId}` : "teams-view"}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {/* Team Details View */}
         {viewTeamId && selectedTeam ? (
          <div className="space-y-6">
            <div className="flex items-center gap-4 mb-6">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setViewTeamId(null)}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour
              </Button>
              <div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{selectedTeam.name}</h2>
                <p className="text-muted-foreground">
                  Détails de l'équipe et de ses techniciens
                </p>
              </div>
            </div>

            <div className="grid gap-6">
              <Card className="shadow-sm border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-500" />
                    Informations de l'équipe
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Nom</span>
                    <span className="text-gray-800 dark:text-gray-100">{selectedTeam.name}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Techniciens</span>
                    <Badge variant={selectedTeam.members > 0 ? "default" : "secondary"}>
                      {selectedTeam.members || 0} {selectedTeam.members === 1 ? "technicien" : "techniciens"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Statut</span>
                    <Badge variant={selectedTeam.members > 0 ? "default" : "secondary"}>
                      {selectedTeam.members > 0 ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="h-5 w-5 text-orange-500" />
                    Techniciens de l'équipe ({teamTechnicians.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {teamTechnicians.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="text-gray-700 dark:text-gray-100">Technicien</TableHead>
                          <TableHead className="text-gray-700 dark:text-gray-100">Email</TableHead>
                          <TableHead className="text-right text-gray-700 dark:text-gray-100">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {teamTechnicians.map((technician) => (
                          <TableRow key={technician.id} className="hover:bg-muted/30 transition-colors">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                                  <Wrench className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <span className="font-medium text-gray-800 dark:text-gray-100">{technician.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{technician.email}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  assignUserMutation.mutate({
                                    userId: technician.id,
                                    teamId: null,
                                  });
                                }}
                                disabled={assignUserMutation.isPending}
                                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                              >
                                <UserX className="h-4 w-4 mr-1" />
                                Retirer
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <UserX className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>Aucun technicien dans cette équipe</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
            /* Main Teams View */
            <>
              {/* Header Section */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight text-gray-800 dark:text-gray-100">Gestion des équipes</h2>
                  <p className="text-muted-foreground mt-2">
                    Gérez vos équipes et utilisateurs
                  </p>
                </div>
                <div className="flex gap-2">
                 
                  <Dialog open={openTeamDialog} onOpenChange={setOpenTeamDialog}>
                    <DialogTrigger asChild>
                      <Button className="gap-2">
                        <Plus className="h-4 w-4" /> Nouvelle équipe
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md bg-white dark:bg-gray-800 border-0">
                      <DialogHeader>
                        <DialogTitle className="text-gray-800 dark:text-gray-100">Créer une équipe</DialogTitle>
                        <DialogDescription>
                          Ajouter une nouvelle équipe à votre organisation
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <Input
                          value={newTeamName}
                          onChange={(e) => setNewTeamName(e.target.value)}
                          placeholder="Nom de l'équipe"
                          className="focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                          onKeyDown={(e) => e.key === "Enter" && handleCreateTeam()}
                        />
                      </div>
                      <DialogFooter>
                        <Button
                          onClick={handleCreateTeam}
                          disabled={createTeamMutation.isPending || !newTeamName.trim()}
                          className="w-full"
                        >
                          {createTeamMutation.isPending ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Création...
                            </>
                          ) : "Créer l'équipe"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Dialog open={openUserDialog} onOpenChange={setOpenUserDialog}>
                    <DialogTrigger asChild>
                      <Button className="gap-2">
                        <UserPlus className="h-4 w-4" /> Nouvel utilisateur
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md bg-white dark:bg-gray-800 border-0">
                      <DialogHeader>
                        <DialogTitle className="text-gray-800 dark:text-gray-100">Créer un utilisateur</DialogTitle>
                        <DialogDescription>
                          Ajouter un nouvel utilisateur administrateur ou technicien
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <Input
                          value={newUserName}
                          onChange={(e) => setNewUserName(e.target.value)}
                          placeholder="Nom complet"
                          className="focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                        />
                        <Input
                          value={newUserEmail}
                          onChange={(e) => setNewUserEmail(e.target.value)}
                          placeholder="Adresse email"
                          type="email"
                          className="focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                        />
                        <Select
                          value={newUserRole}
                          onValueChange={(value) => setNewUserRole(value as "ADMIN" | "TECHNICIAN")}
                        >
                          <SelectTrigger className="focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100">
                            <SelectValue placeholder="Sélectionner un rôle" />
                          </SelectTrigger>
                          <SelectContent className="bg-white dark:bg-gray-800">
                            <SelectItem value="ADMIN" className="text-gray-700 dark:text-gray-100 flex items-center">
                              <Shield className="h-4 w-4 mr-2" /> Admin
                            </SelectItem>
                            <SelectItem value="TECHNICIAN" className="text-gray-700 dark:text-gray-100 flex items-center">
                              <Wrench className="h-4 w-4 mr-2" /> Technicien
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <DialogFooter>
                        <Button
                          onClick={handleCreateUser}
                          disabled={createUserMutation.isPending || !newUserName.trim() || !newUserEmail.trim()}
                          className="w-full"
                        >
                          {createUserMutation.isPending ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Création...
                            </>
                          ) : "Créer l'utilisateur"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card className="shadow-sm hover:shadow-md transition-shadow border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">Équipes</CardTitle>
                    <Users className="h-5 w-5 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-gray-800 dark:text-gray-100">{stats.totalTeams}</div>
                    <p className="text-sm text-muted-foreground">Total des équipes</p>
                  </CardContent>
                </Card>

                <Card className="shadow-sm hover:shadow-md transition-shadow border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">Utilisateurs</CardTitle>
                    <UserCheck className="h-5 w-5 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-gray-800 dark:text-gray-100">{stats.totalUsers}</div>
                    <p className="text-sm text-muted-foreground">Total des utilisateurs</p>
                  </CardContent>
                </Card>

                <Card className="shadow-sm hover:shadow-md transition-shadow border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">Techniciens</CardTitle>
                    <Wrench className="h-5 w-5 text-orange-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-gray-800 dark:text-gray-100">{stats.technicians}</div>
                    <p className="text-sm text-muted-foreground">Techniciens actifs</p>
                  </CardContent>
                </Card>

                <Card className="shadow-sm hover:shadow-md transition-shadow border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">Administrateurs</CardTitle>
                    <Shield className="h-5 w-5 text-purple-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-gray-800 dark:text-gray-100">{stats.admins}</div>
                    <p className="text-sm text-muted-foreground">Administrateurs système</p>
                  </CardContent>
                </Card>
              </div>

              {/* Tabs Navigation */}
              <Tabs defaultValue="teams" className="mb-6 pt-3">
                <TabsList className="bg-white dark:bg-gray-800 shadow-sm p-1">
                  <TabsTrigger value="teams" className="data-[state=active]:bg-blue-100 dark:data-[state=active]:bg-blue-900 rounded-md px-4 py-2">
                    <Users className="h-4 w-4 mr-2" /> Équipes
                  </TabsTrigger>
                  <TabsTrigger value="users" className="data-[state=active]:bg-blue-100 dark:data-[state=active]:bg-blue-900 rounded-md px-4 py-2">
                    <UserCheck className="h-4 w-4 mr-2" /> Utilisateurs
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="teams" className="mt-6">
                  {teamsLoading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full rounded-lg" />
                      ))}
                    </div>
                  ) : teams.length ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {teams.map((team) => (
                        <motion.div
                          key={team.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                          className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-4 border-0 hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => setViewTeamId(team.id)}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-100">{team.name}</h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                {team.members || 0} {team.members === 1 ? "technicien" : "techniciens"}
                              </p>
                            </div>
                            <Badge variant={team.members > 0 ? "default" : "secondary"} className="ml-2">
                              {team.members > 0 ? "Active" : "Vide"}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center mt-4">
                            <Button variant="ghost" size="sm" className="text-blue-600 dark:text-blue-400 flex items-center gap-1">
                              Voir détails <ChevronRight className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmOpen(team.id);
                              }}
                              disabled={deleteTeamMutation.isPending || (team.members || 0) > 0}
                              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                              title={team.members > 0 ? "Impossible de supprimer une équipe avec des techniciens" : "Supprimer l'équipe"}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-8 bg-white dark:bg-gray-800 shadow-sm rounded-lg border-0">
                      <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Aucune équipe</h3>
                      <p className="text-muted-foreground mb-4">
                        Commencez par créer votre première équipe pour organiser vos techniciens.
                      </p>
                      <Button onClick={() => setOpenTeamDialog(true)}>
                        <Plus className="h-4 w-4 mr-2" /> Créer une équipe
                      </Button>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="users" className="mt-6">
                  <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher un utilisateur..."
                        className="pl-8 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      {searchQuery && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1 h-7 w-7 p-0"
                          onClick={() => setSearchQuery('')}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <Select
                      value={selectedTeamId || "all"}
                      onValueChange={(value) => setSelectedTeamId(value === "all" ? null : value)}
                    >
                      <SelectTrigger className="w-[180px] focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Filtrer par équipe" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-gray-800">
                        <SelectItem value="all" className="text-gray-700 dark:text-gray-100">Tous les utilisateurs</SelectItem>
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={team.id} className="text-gray-700 dark:text-gray-100">
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {usersLoading ? (
                    <div className="space-y-4">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full rounded-lg" />
                      ))}
                    </div>
                  ) : searchedUsers.length ? (
                    <div className="overflow-x-auto bg-white dark:bg-gray-800 shadow-sm rounded-lg border-0">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="text-gray-700 dark:text-gray-100">Utilisateur</TableHead>
                            <TableHead className="text-gray-700 dark:text-gray-100">Rôle</TableHead>
                            <TableHead className="text-gray-700 dark:text-gray-100">Équipe</TableHead>
                            <TableHead className="text-right text-gray-700 dark:text-gray-100">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {searchedUsers.map((user) => (
                            <TableRow key={user.id} className="hover:bg-muted/30 transition-colors">
                              <TableCell>
                                <div>
                                  <div className="font-medium text-gray-800 dark:text-gray-100">{user.name}</div>
                                  <div className="text-sm text-muted-foreground">{user.email}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={user.role === "ADMIN" ? "default" : "secondary"} className="flex items-center w-min">
                                  {user.role === "ADMIN" ? (
                                    <Shield className="h-3 w-3 mr-1" />
                                  ) : (
                                    <Wrench className="h-3 w-3 mr-1" />
                                  )}
                                  {user.role === "ADMIN" ? "Admin" : "Technicien"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={user.teamId || "none"}
                                  onValueChange={(value) =>
                                    assignUserMutation.mutate({
                                      userId: user.id,
                                      teamId: value === "none" ? null : value,
                                    })
                                  }
                                  disabled={user.role === "ADMIN"}
                                >
                                  <SelectTrigger className="w-40 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100">
                                    <SelectValue placeholder="Sélectionner une équipe" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-white dark:bg-gray-800">
                                    <SelectItem value="none" className="text-gray-700 dark:text-gray-100">
                                      <UserX className="h-4 w-4 mr-2 inline" /> Aucune équipe
                                    </SelectItem>
                                    {teams.map((team) => (
                                      <SelectItem key={team.id} value={team.id} className="text-gray-700 dark:text-gray-100">
                                        <Users className="h-4 w-4 mr-2 inline" /> {team.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      assignUserMutation.mutate({
                                        userId: user.id,
                                        teamId: null,
                                      });
                                    }}
                                    disabled={assignUserMutation.isPending || !user.teamId || user.role === "ADMIN"}
                                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                                    title={user.role === "ADMIN" ? "Les administrateurs ne peuvent pas être assignés à des équipes" : "Retirer de l'équipe"}
                                  >
                                    <UserX className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setDeleteUserConfirmOpen(user.id)}
                                    disabled={deleteUserMutation.isPending || !!user.teamId}
                                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                                    title={user.teamId ? "Impossible de supprimer un utilisateur assigné à une équipe" : "Supprimer l'utilisateur"}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center p-8 bg-white dark:bg-gray-800 shadow-sm rounded-lg border-0">
                      <UserCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                        {searchQuery ? "Aucun utilisateur trouvé" : "Aucun utilisateur"}
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        {searchQuery
                          ? "Aucun utilisateur ne correspond à votre recherche."
                          : "Commencez par créer votre premier utilisateur."}
                      </p>
                      <Button onClick={() => setOpenUserDialog(true)}>
                        <UserPlus className="h-4 w-4 mr-2" /> Créer un utilisateur
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Delete Team Confirmation Dialog */}
      <Dialog open={!!deleteConfirmOpen} onOpenChange={(open) => !open && setDeleteConfirmOpen(null)}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-gray-800 border-0">
          <DialogHeader>
            <DialogTitle className="text-gray-800 dark:text-gray-100">Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer cette équipe ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(null)}
              disabled={deleteTeamMutation.isPending}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmOpen && deleteTeamMutation.mutate(deleteConfirmOpen)}
              disabled={deleteTeamMutation.isPending}
            >
              {deleteTeamMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Suppression...
                </>
              ) : (
                "Supprimer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={!!deleteUserConfirmOpen} onOpenChange={(open) => !open && setDeleteUserConfirmOpen(null)}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-gray-800 border-0">
          <DialogHeader>
            <DialogTitle className="text-gray-800 dark:text-gray-100">Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteUserConfirmOpen(null)}
              disabled={deleteUserMutation.isPending}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteUserConfirmOpen && deleteUserMutation.mutate(deleteUserConfirmOpen)}
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Suppression...
                </>
              ) : (
                "Supprimer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Teams;