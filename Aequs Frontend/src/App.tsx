// import { Toaster } from "@/components/ui/toaster";
// import { Toaster as Sonner } from "@/components/ui/sonner";
// import { TooltipProvider } from "@/components/ui/tooltip";
// import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// import {
//   BrowserRouter,
//   Routes,
//   Route,
//   Outlet,
//   Navigate,
// } from "react-router-dom";
// import { SidebarProvider } from "@/components/ui/sidebar";
// import { AppSidebar } from "@/components/AppSidebar";
// import { Navbar } from "@/components/Navbar";
// import OqcformPage from "./pages/OqcFormPage";
// import Settings from "./pages/Settings";
// import NotFound from "./pages/NotFound";
// import DefaultForm from "./pages/final_testing";
// import PlanningModule from "./pages/planning/PlanningPage";
// import ORTLabPage from "./pages/ORTLabPage";
// import Home from "./pages/Home";
// import TestingPartsTable from "./pages/TestingPartsTable";
// import { LoginPage } from "./pages/LoginPage";
// import { UserManagementPage } from "./pages/UserManagementPage";

// const queryClient = new QueryClient();

// // Helper to check if user is admin
// function isAdmin() {
//   const user = localStorage.getItem("user");
//   if (!user) return false;
  
//   try {
//     const userData = JSON.parse(user);
//     return userData.role?.toLowerCase() === "admin";
//   } catch {
//     return localStorage.getItem("userRole")?.toLowerCase() === "admin";
//   }
// }

// // Helper to get user team
// function getUserTeam() {
//   const user = localStorage.getItem("user");
//   if (!user) return null;
  
//   try {
//     const userData = JSON.parse(user);
//     return userData.team?.toUpperCase();
//   } catch {
//     return localStorage.getItem("userTeam")?.toUpperCase();
//   }
// }

// // Protected Route Wrapper - checks if user is logged in
// function ProtectedLayout() {
//   const user = localStorage.getItem("user");

//   // If no user in localStorage, redirect to login
//   if (!user) {
//     return <Navigate to="/login" replace />;
//   }

//   // If user exists, render the dashboard layout
//   return <DashboardLayout />;
// }

// // Admin-only route guard
// function AdminRoute({ children }: { children: React.ReactElement }) {
//   if (!isAdmin()) {
//     // Redirect non-admin users to their team's home page
//     const team = getUserTeam();
//     if (team === "OQC") {
//       return <Navigate to="/oqcpage" replace />;
//     } else if (team === "ORT") {
//       return <Navigate to="/" replace />;
//     }
//     return <Navigate to="/" replace />;
//   }
//   return children;
// }

// // ORT Team route guard
// // function ORTRoute({ children }: { children: React.ReactElement }) {
// //   const team = getUserTeam();
// //   if (team !== "ORT") {
// //     return <Navigate to="/oqcpage" replace />;
// //   }
// //   return children;
// // }

// // OQC Team route guard
// // function OQCRoute({ children }: { children: React.ReactElement }) {
// //   const team = getUserTeam();
// //   if (team !== "OQC") {
// //     return <Navigate to="/" replace />;
// //   }
// //   return children;
// // }


// // ORT Team route guard
// function ORTRoute({ children }: { children: React.ReactElement }) {
//   const team = getUserTeam();
//   if (team !== "ORT" && team !== "ALL") {
//     return <Navigate to="/oqcpage" replace />;
//   }
//   return children;
// }

// // OQC Team route guard
// function OQCRoute({ children }: { children: React.ReactElement }) {
//   const team = getUserTeam();
//   if (team !== "OQC" && team !== "ALL") {
//     return <Navigate to="/" replace />;
//   }
//   return children;
// }

// // Dashboard Layout Component with Sidebar and Navbar
// function DashboardLayout() {
//   return (
//     <SidebarProvider defaultOpen={true}>
//       <div className="flex min-h-screen w-full overflow-hidden">
//         <AppSidebar />
//         <div className="flex flex-1 flex-col overflow-hidden">
//           <Navbar />
//           <main className="flex-1 overflow-hidden bg-gray-50">
//             {/* Outlet renders the matched child route */}
//             <Outlet />
//           </main>
//         </div>
//       </div>
//     </SidebarProvider>
//   );
// }

// const App = () => (
//   <QueryClientProvider client={queryClient}>
//     <TooltipProvider>
//       <Toaster />
//       <Sonner />
//       <BrowserRouter>
//         <Routes>
//           {/* Public Login Route - No Sidebar/Navbar */}
//           <Route path="/login" element={<LoginPage />} />

//           {/* Protected Dashboard Routes - With Sidebar/Navbar */}
//           <Route element={<ProtectedLayout />}>
//             {/* ORT Team Routes */}
//             <Route 
//               path="/" 
//               element={
//                 <ORTRoute>
//                   <Home />
//                 </ORTRoute>
//               } 
//             />
//             <Route 
//               path="/ort-lab-form" 
//               element={
//                 <ORTRoute>
//                   <ORTLabPage />
//                 </ORTRoute>
//               } 
//             />
//             <Route 
//               path="/settings" 
//               element={
//                 <ORTRoute>
//                   <Settings />
//                 </ORTRoute>
//               } 
//             />
//             <Route 
//               path="/form-default/:id?" 
//               element={
//                 <ORTRoute>
//                   <DefaultForm />
//                 </ORTRoute>
//               } 
//             />
//             <Route 
//               path="/planning-detail" 
//               element={
//                 <ORTRoute>
//                   <PlanningModule />
//                 </ORTRoute>
//               } 
//             />
//             <Route 
//               path="/testing-table" 
//               element={
//                 <ORTRoute>
//                   <TestingPartsTable />
//                 </ORTRoute>
//               } 
//             />

//             {/* OQC Team Routes */}
//             <Route 
//               path="/oqcpage" 
//               element={
//                 <OQCRoute>
//                   <OqcformPage />
//                 </OQCRoute>
//               } 
//             />

//             {/* Admin Only Route - Accessible by Admin from any team */}
//             <Route 
//               path="/users" 
//               element={
//                 <AdminRoute>
//                   <UserManagementPage />
//                 </AdminRoute>
//               }
//             />
//           </Route>

//           {/* 404 Not Found Route */}
//           <Route path="*" element={<NotFound />} />
//         </Routes>
//       </BrowserRouter>
//     </TooltipProvider>
//   </QueryClientProvider>
// );

// export default App;

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Routes,
  Route,
  Outlet,
  Navigate,
} from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Navbar } from "@/components/Navbar";
import OqcformPage from "./pages/OqcFormPage";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import DefaultForm from "./pages/final_testing";
import PlanningModule from "./pages/planning/PlanningPage";
import ORTLabPage from "./pages/ORTLabPage";
import Home from "./pages/Home";
import TestingPartsTable from "./pages/TestingPartsTable";
import { LoginPage } from "./pages/LoginPage";
import { UserManagementPage } from "./pages/UserManagementPage";
import ConfigurationPage from "./pages/ConfigurationPage";
 
const queryClient = new QueryClient();
 
// Helper to check if user is admin
function isAdmin() {
  const user = localStorage.getItem("user");
  if (!user) return false;
 
  try {
    const userData = JSON.parse(user);
    return userData.role?.toLowerCase() === "admin";
  } catch {
    return localStorage.getItem("userRole")?.toLowerCase() === "admin";
  }
}
 
// Helper to get user team
function getUserTeam() {
  const user = localStorage.getItem("user");
  if (!user) return null;
 
  try {
    const userData = JSON.parse(user);
    return userData.team?.toUpperCase();
  } catch {
    return localStorage.getItem("userTeam")?.toUpperCase();
  }
}
 
function getUserRole() {
  const user = localStorage.getItem("user");
  if (!user) return null;
  try {
    const userData = JSON.parse(user);
    return userData.role?.toLowerCase();
  } catch {
    return localStorage.getItem("userRole")?.toLowerCase();
  }
}
 
// Protected Route Wrapper - checks if user is logged in
function ProtectedLayout() {
  const user = localStorage.getItem("user");
 
  // If no user in localStorage, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }
 
  // If user exists, render the dashboard layout
  return <DashboardLayout />;
}
 
// Admin-only route guard - ONLY for team "ALL"
function AdminRoute({ children }: { children: React.ReactElement }) {
  const team = getUserTeam();
 
  // User Management is ONLY accessible by admin with team "ALL"
  if (!isAdmin() || team !== "ALL") {
    // Redirect to appropriate page based on team
    if (team === "OQC") {
      return <Navigate to="/oqcpage" replace />;
    } else if (team === "ORT") {
      return <Navigate to="/" replace />;
    }
    return <Navigate to="/" replace />;
  }
  return children;
}
 
// ORT Team route guard
// function ORTRoute({ children }: { children: React.ReactElement }) {
//   const team = getUserTeam();
//   if (team !== "ORT" && team !== "ALL") {
//     return <Navigate to="/oqcpage" replace />;
//   }
//   return children;
// }
 
function ORTRoute({ children }: { children: React.ReactElement }) {
  const team = getUserTeam();
  const role = getUserRole(); // ADD
 
  if (role === "general") return <Navigate to="/" replace />; // ADD
 
  if (team !== "ORT" && team !== "ALL") {
    return <Navigate to="/oqcpage" replace />;
  }
  return children;
}
 
// OQC Team route guard
// function OQCRoute({ children }: { children: React.ReactElement }) {
//   const team = getUserTeam();
//   if (team !== "OQC" && team !== "ALL") {
//     return <Navigate to="/" replace />;
//   }
//   return children;
// }
 
function OQCRoute({ children }: { children: React.ReactElement }) {
  const team = getUserTeam();
  const role = getUserRole(); // ADD
 
  if (role === "general") return <Navigate to="/" replace />; // ADD
 
  if (team !== "OQC" && team !== "ALL") {
    return <Navigate to="/" replace />;
  }
  return children;
}
 
// Dashboard Layout Component with Sidebar and Navbar
function DashboardLayout() {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full overflow-hidden">
        <AppSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Navbar />
          <main className="flex-1 overflow-hidden bg-gray-50">
            {/* Outlet renders the matched child route */}
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
 
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public Login Route - No Sidebar/Navbar */}
          <Route path="/login" element={<LoginPage />} />
 
          {/* Protected Dashboard Routes - With Sidebar/Navbar */}
          <Route element={<ProtectedLayout />}>
            {/* ORT Team Routes */}
            {/* <Route
              path="/"
              element={
                <ORTRoute>
                  <Home />
                </ORTRoute>
              }
            /> */}
            <Route
              path="/"
              element={(() => {
                const role = getUserRole();
                const team = getUserTeam();
                if (role === "general") return <Home />; // ADD - bypass team check
                if (team !== "ORT" && team !== "ALL")
                  return <Navigate to="/oqcpage" replace />;
                return <Home />;
              })()}
            />
            <Route
              path="/ort-lab-form"
              element={
                <ORTRoute>
                  <ORTLabPage />
                </ORTRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ORTRoute>
                  <Settings />
                </ORTRoute>
              }
            />
            <Route
              path="/form-default/:id?"
              element={
                <ORTRoute>
                  <DefaultForm />
                </ORTRoute>
              }
            />
            <Route
              path="/planning-detail"
              element={
                <ORTRoute>
                  <PlanningModule />
                </ORTRoute>
              }
            />
            <Route
              path="/testing-table"
              element={
                <ORTRoute>
                  <TestingPartsTable />
                </ORTRoute>
              }
            />
            {/* Admin Only Route - Configuration Page */}
            <Route
              path="/configuration"
              element={
                <AdminRoute>
                  <ConfigurationPage />
                </AdminRoute>
              }
            />
 
            {/* OQC Team Routes */}
            <Route
              path="/oqcpage"
              element={
                <OQCRoute>
                  <OqcformPage />
                </OQCRoute>
              }
            />
 
            {/* Admin Only Route - ONLY accessible by admin with team "ALL" */}
            <Route
              path="/users"
              element={
                <AdminRoute>
                  <UserManagementPage />
                </AdminRoute>
              }
            />
          </Route>
 
          {/* 404 Not Found Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);
 
export default App;
 
 