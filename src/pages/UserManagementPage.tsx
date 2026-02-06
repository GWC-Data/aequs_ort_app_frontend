import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Users,
  UserPlus,
  Edit,
  Trash2,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Shield,
  UserCog,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Toast } from "@/components/ui/toast";
import { Toaster } from "@/components/ui/toaster";


// API base URL
const API_BASE_URL = "http://localhost:6060";
// const API_BASE_URL = "http://172.16.106.44:6060";

interface User {
  _id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  role: "Admin" | "Engineer" | "Operator";
  team: "OQC" | "ORT" | "ALL";
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export function UserManagementPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [currentUserTeam, setCurrentUserTeam] = useState<"OQC" | "ORT" | "ALL">("ALL");
  const usersPerPage = 10;

  // New user form state
  const [newUser, setNewUser] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phoneNumber: "",
    role: "Engineer" as "Admin" | "Engineer" | "Operator",
    team: "OQC" as "OQC" | "ORT",
  });

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editUser, setEditUser] = useState<User | null>(null);

  // Check authentication
  useEffect(() => {
    const user = localStorage.getItem("user");
    if (!user) {
      navigate("/login");
      return;
    }

    const userData = JSON.parse(user);
    if (userData.role !== "Admin") {
      toast.error("Only administrators can access user management");
      navigate("/");
    } else {
      // Set the current admin user's team
      setCurrentUserTeam(userData.team || "ALL");
      // Set the default team for new users
      if (userData.team !== "ALL") {
        setNewUser(prev => ({
          ...prev,
          team: userData.team
        }));
      }
    }
  }, [navigate]);

  // Fetch users
  useEffect(() => {
    if (currentUserTeam) {
      fetchUsers();
    }
  }, [currentUserTeam]);

  // Filter users
  useEffect(() => {
    let filtered = users;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.phoneNumber.includes(searchTerm)
      );
    }

    // Role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter((user) => user.role === roleFilter);
    }

    // Team filter
    if (teamFilter !== "all") {
      filtered = filtered.filter((user) => user.team === teamFilter);
    }

    setFilteredUsers(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [users, searchTerm, roleFilter, teamFilter]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/users`);
      console.log("Fetched users:", response.data);
      
      if (response.data && response.data.Users && Array.isArray(response.data.Users)) {
        // Map the response to match your User interface
        const usersData = response.data.Users.map((user: any) => ({
          _id: user.id,  // Map 'id' to '_id' for consistency
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          role: user.role,
          team: user.team,
          isActive: user.isActive !== false, // Default to true if not specified
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }));
        
        // Filter based on current admin's team
        const filteredByTeam = currentUserTeam === "ALL" 
          ? usersData 
          : usersData.filter((user: User) => user.team === currentUserTeam);
        
        console.log("Filtered users by team:", filteredByTeam);
        setUsers(filteredByTeam);
      } else {
        console.error("Unexpected response format:", response.data);
        throw new Error("Invalid response format");
      }
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!newUser.firstName || !newUser.lastName || !newUser.email ||
      !newUser.password || !newUser.confirmPassword || !newUser.phoneNumber) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (newUser.password !== newUser.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newUser.password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newUser.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    const phoneRegex = /^\+?[\d\s-]{10,}$/;
    if (!phoneRegex.test(newUser.phoneNumber)) {
      toast.error("Please enter a valid phone number");
      return;
    }

    setIsCreating(true);

    try {
      const userData = {
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        password: newUser.password,
        phoneNumber: newUser.phoneNumber,
        role: newUser.role,
        team: newUser.team
      };

      const response = await axios.post(`${API_BASE_URL}/users`, userData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200 || response.status === 201) {
        toast.success("User created successfully!");
        setIsCreateDialogOpen(false);
        
        // Reset form with admin's team as default
        setNewUser({
          firstName: "",
          lastName: "",
          email: "",
          password: "",
          confirmPassword: "",
          phoneNumber: "",
          role: "Engineer",
          team: currentUserTeam !== "ALL" ? currentUserTeam : "OQC"
        });
        
        // Refresh user list
        fetchUsers();
      }
    } catch (error: any) {
      console.error("Error creating user:", error);
      if (error.response?.status === 409) {
        toast.error("Email already registered. Please use a different email.");
      } else {
        toast.error("Failed to create user. Please try again.");
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser || !editUser._id) return;

    // Validation
    if (!editUser.firstName || !editUser.lastName || !editUser.email || !editUser.phoneNumber) {
      toast.error("Please fill in all required fields");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editUser.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    const phoneRegex = /^\+?[\d\s-]{10,}$/;
    if (!phoneRegex.test(editUser.phoneNumber)) {
      toast.error("Please enter a valid phone number");
      return;
    }

    setIsCreating(true);

    try {
      const userData = {
        firstName: editUser.firstName,
        lastName: editUser.lastName,
        email: editUser.email,
        phoneNumber: editUser.phoneNumber,
        role: editUser.role,
        team: editUser.team
      };

      const response = await axios.put(`${API_BASE_URL}/users/${editUser._id}`, userData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200) {
        toast.success("User updated successfully!");
        setIsEditDialogOpen(false);
        setEditUser(null);
        fetchUsers();
      }
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast.error("Failed to update user. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser || !selectedUser._id) return;

    try {
      const response = await axios.delete(`${API_BASE_URL}/users/${selectedUser._id}`);
      if (response.status === 200) {
        toast.success("User deleted successfully!");
        setIsDeleteDialogOpen(false);
        setSelectedUser(null);
        fetchUsers();
      }
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user. Please try again.");
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setNewUser(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEditInputChange = (field: string, value: string) => {
    if (editUser) {
      setEditUser(prev => ({
        ...prev!,
        [field]: value
      }));
    }
  };

  const openEditDialog = (user: User) => {
    setEditUser({ ...user });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  // Pagination
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  // Role badge styling
  const getRoleBadge = (role: string) => {
    switch (role) {
      case "Admin":
        return <Badge className="bg-purple-500 hover:bg-purple-600"><Shield className="h-3 w-3 mr-1" /> Admin</Badge>;
      case "Engineer":
        return <Badge className="bg-blue-500 hover:bg-blue-600"><UserCog className="h-3 w-3 mr-1" /> Engineer</Badge>;
      case "Operator":
        return <Badge className="bg-green-500 hover:bg-green-600"><User className="h-3 w-3 mr-1" /> Operator</Badge>;
      default:
        return <Badge>{role}</Badge>;
    }
  };

  // Team badge styling
  const getTeamBadge = (team: string) => {
    switch (team) {
      case "OQC":
        return <Badge variant="outline" className="border-orange-500 text-orange-500">OQC</Badge>;
      case "ORT":
        return <Badge variant="outline" className="border-teal-500 text-teal-500">ORT</Badge>;
      case "ALL":
        return <Badge variant="outline" className="border-purple-500 text-purple-500">ALL</Badge>;
      default:
        return <Badge variant="outline">{team}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Users className="h-8 w-8 text-blue-600" />
                User Management
              </h1>
              <p className="text-gray-600 mt-1">
                Manage system users and permissions
                {currentUserTeam !== "ALL" && (
                  <span className="ml-2 text-sm font-medium">
                    ({currentUserTeam} Team)
                  </span>
                )}
              </p>
            </div>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <UserPlus className="h-5 w-5 mr-2" />
                  Create New User
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                  <DialogDescription>
                    Add a new user to the system. All fields are required.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateUser}>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name *</Label>
                        <Input
                          id="firstName"
                          value={newUser.firstName}
                          onChange={(e) => handleInputChange('firstName', e.target.value)}
                          placeholder="Enter first name"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name *</Label>
                        <Input
                          id="lastName"
                          value={newUser.lastName}
                          onChange={(e) => handleInputChange('lastName', e.target.value)}
                          placeholder="Enter last name"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newUser.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="Enter email address"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phoneNumber">Phone Number *</Label>
                      <Input
                        id="phoneNumber"
                        value={newUser.phoneNumber}
                        onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                        placeholder="Enter phone number"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="role">Role *</Label>
                        <Select
                          value={newUser.role}
                          onValueChange={(value: "Admin" | "Engineer" | "Operator") => handleInputChange('role', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Admin">Admin</SelectItem>
                            <SelectItem value="Engineer">Engineer</SelectItem>
                            <SelectItem value="Operator">Operator</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="team">Team *</Label>
                        <Select
                          value={newUser.team}
                          onValueChange={(value: "OQC" | "ORT") => handleInputChange('team', value)}
                          disabled={currentUserTeam !== "ALL"}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select team" />
                          </SelectTrigger>
                          <SelectContent>
                            {currentUserTeam === "ALL" ? (
                              <>
                                <SelectItem value="OQC">OQC</SelectItem>
                                <SelectItem value="ORT">ORT</SelectItem>
                              </>
                            ) : currentUserTeam === "OQC" ? (
                              <SelectItem value="OQC">OQC</SelectItem>
                            ) : (
                              <SelectItem value="ORT">ORT</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="password">Password *</Label>
                        <Input
                          id="password"
                          type="password"
                          value={newUser.password}
                          onChange={(e) => handleInputChange('password', e.target.value)}
                          placeholder="Enter password"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password *</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={newUser.confirmPassword}
                          onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                          placeholder="Confirm password"
                          required
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isCreating}>
                      {isCreating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create User"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search Users
              </Label>
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filter by Role
              </Label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Engineer">Engineer</SelectItem>
                  <SelectItem value="Operator">Operator</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filter by Team
              </Label>
              <Select value={teamFilter} onValueChange={setTeamFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All teams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  {currentUserTeam === "ALL" && (
                    <>
                      <SelectItem value="OQC">OQC</SelectItem>
                      <SelectItem value="ORT">ORT</SelectItem>
                      <SelectItem value="ALL">ALL</SelectItem>
                    </>
                  )}
                  {currentUserTeam === "OQC" && (
                    <SelectItem value="OQC">OQC</SelectItem>
                  )}
                  {currentUserTeam === "ORT" && (
                    <SelectItem value="ORT">ORT</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Loading users...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-16">
              <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || roleFilter !== "all" || teamFilter !== "all"
                  ? "Try changing your filters or search term"
                  : "No users have been created yet"}
              </p>
              {!searchTerm && roleFilter === "all" && teamFilter === "all" && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <UserPlus className="h-5 w-5 mr-2" />
                  Create Your First User
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentUsers.map((user) => (
                      <TableRow key={user._id}>
                        <TableCell>
                          <div className="font-medium">
                            {user.firstName} {user.lastName}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-gray-600">{user.email}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-gray-600">{user.phoneNumber}</div>
                        </TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>{getTeamBadge(user.team)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={user.isActive === false ? "destructive" : "default"}
                            className={user.isActive === false ? "bg-red-100 text-red-800 hover:bg-red-100" : ""}
                          >
                            {user.isActive === false ? "Inactive" : "Active"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(user)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => openDeleteDialog(user)}
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <div className="text-sm text-gray-500">
                    Showing {indexOfFirstUser + 1} to {Math.min(indexOfLastUser, filteredUsers.length)} of {filteredUsers.length} users
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            className="w-8 h-8 p-0"
                            onClick={() => setCurrentPage(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information. All fields are required.
            </DialogDescription>
          </DialogHeader>
          {editUser && (
            <form onSubmit={handleUpdateUser}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="editFirstName">First Name *</Label>
                    <Input
                      id="editFirstName"
                      value={editUser.firstName}
                      onChange={(e) => handleEditInputChange('firstName', e.target.value)}
                      placeholder="John"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editLastName">Last Name *</Label>
                    <Input
                      id="editLastName"
                      value={editUser.lastName}
                      onChange={(e) => handleEditInputChange('lastName', e.target.value)}
                      placeholder="Doe"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editEmail">Email Address *</Label>
                  <Input
                    id="editEmail"
                    type="email"
                    value={editUser.email}
                    onChange={(e) => handleEditInputChange('email', e.target.value)}
                    placeholder="john.doe@example.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editPhoneNumber">Phone Number *</Label>
                  <Input
                    id="editPhoneNumber"
                    value={editUser.phoneNumber}
                    onChange={(e) => handleEditInputChange('phoneNumber', e.target.value)}
                    placeholder="+1 234 567 8900"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="editRole">Role *</Label>
                    <Select
                      value={editUser.role}
                      onValueChange={(value: "Admin" | "Engineer" | "Operator") => handleEditInputChange('role', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Admin">Admin</SelectItem>
                        <SelectItem value="Engineer">Engineer</SelectItem>
                        <SelectItem value="Operator">Operator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editTeam">Team *</Label>
                    <Select
                      value={editUser.team}
                      onValueChange={(value: "OQC" | "ORT" | "ALL") => handleEditInputChange('team', value)}
                      disabled={currentUserTeam !== "ALL"}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select team" />
                      </SelectTrigger>
                      <SelectContent>
                        {currentUserTeam === "ALL" ? (
                          <>
                            <SelectItem value="OQC">OQC</SelectItem>
                            <SelectItem value="ORT">ORT</SelectItem>
                            <SelectItem value="ALL">ALL</SelectItem>
                          </>
                        ) : currentUserTeam === "OQC" ? (
                          <SelectItem value="OQC">OQC</SelectItem>
                        ) : (
                          <SelectItem value="ORT">ORT</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update User"
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user
              account for {selectedUser?.firstName} {selectedUser?.lastName} ({selectedUser?.email}).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
