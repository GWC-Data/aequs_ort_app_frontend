// import {
//   Home,
//   List,
//   LogOut,
//   Check,
//   PenTool,
//   Settings,
//   Gauge,
//   Flag,
//   Calendar,
//   Backpack,
//   ReceiptText,
//   ScanBarcode,
//   Ticket,
//   TicketCheckIcon,
//   ClipboardMinus,
//   TestTubeIcon,
// } from "lucide-react";
// import { NavLink } from "@/components/NavLink";
// import { useLocation, useNavigate } from "react-router-dom";
// import Logo from "../assets/logo.png";
// import SmallLogo from "../assets/small_logo.png";

// import {
//   Sidebar,
//   SidebarContent,
//   SidebarGroup,
//   SidebarGroupContent,
//   SidebarMenu,
//   SidebarMenuButton,
//   SidebarMenuItem,
//   useSidebar,
//   SidebarFooter,
// } from "@/components/ui/sidebar";

// const navigationItems = [
//   { title: "Home", url: "/", icon: Home },
//   { title: "OQC Form", url: "/oqcpage", icon: List },
//   { title: "ORT Lab", url: "/ort-lab-form", icon: Backpack },
//   { title: "Test Allocation", url: "/settings", icon: TestTubeIcon },
//   { title: "Planning Dashboard", url: "/planning-detail", icon: Calendar },
//   { title: "Testing", url: "/form-default", icon: Settings },

// ];

// export function AppSidebar() {
//   const { open } = useSidebar();
//   const navigate = useNavigate();
//   const location = useLocation();
//   const currentPath = location.pathname;

//   const isActive = (path: string) => currentPath === path;

//   const handleLogout = () => {
//     localStorage.removeItem("isAuthenticated");
//     localStorage.removeItem("userEmail");
//     navigate("/login");
//   };

//   return (
//     <Sidebar collapsible="icon" className="border-r border-sidebar-border">
//       <SidebarContent>
//         <div className="px-4 py-2">
//           <h1
//             className={`font-bold transition-all duration-300 ${open ? "text-2xl" : "text-lg"}`}
//           >
//             {open ? (
//               <img src={Logo} alt="" className="w-48 h-20" />
//             ) : (
//               <img src={SmallLogo} alt="" className="w-20 h-8 object-full" />
//             )}
//           </h1>
//         </div>

//         <SidebarGroup>
//           <SidebarGroupContent>
//             <SidebarMenu>
//               {navigationItems.map((item) => (
//                 <SidebarMenuItem key={item.title}>
//                   <SidebarMenuButton
//                     asChild
//                     className={`transition-all duration-300 ${isActive(item.url)
//                         ? "bg-[#e0413a] text-white hover:bg-[#e0413a] hover:text-white font-semibold"
//                         : "hover:bg-[#e0413a] hover:text-white"
//                       }`}
//                   >
//                     <NavLink to={item.url} end>
//                       <item.icon className="h-20 w-20" />
//                       <span>{item.title}</span>
//                     </NavLink>
//                   </SidebarMenuButton>
//                 </SidebarMenuItem>
//               ))}
//             </SidebarMenu>
//           </SidebarGroupContent>
//         </SidebarGroup>
//       </SidebarContent>

//       <SidebarFooter>
//         <SidebarMenu>
//           <SidebarMenuItem>
//             <SidebarMenuButton
//               className="hover:bg-[#e0413a] hover:text-destructive-foreground transition-all duration-300 hover:text-white"
//               onClick={handleLogout}
//             >
//               <LogOut className="h-5 w-5" />
//               <span>Logout</span>
//             </SidebarMenuButton>
//           </SidebarMenuItem>
//         </SidebarMenu>
//       </SidebarFooter>
//     </Sidebar>
//   );
// }


import {
  Home,
  List,
  LogOut,
  Settings,
  Calendar,
  Backpack,
  TestTubeIcon,
  Users,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import Logo from "../assets/logo.png";
import SmallLogo from "../assets/small_logo.png";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
  SidebarFooter,
} from "@/components/ui/sidebar";

// Get user role from localStorage
const getUserRole = () => {
  const user = localStorage.getItem("user");
  if (!user) return null;

  try {
    const userData = JSON.parse(user);
    return userData.role?.toLowerCase() || localStorage.getItem("userRole")?.toLowerCase();
  } catch {
    return localStorage.getItem("userRole")?.toLowerCase();
  }
};

// Get user team from localStorage
const getUserTeam = () => {
  const user = localStorage.getItem("user");
  if (!user) return null;

  try {
    const userData = JSON.parse(user);
    return userData.team?.toUpperCase() || localStorage.getItem("userTeam")?.toUpperCase();
  } catch {
    return localStorage.getItem("userTeam")?.toUpperCase();
  }
};

export function AppSidebar() {
  const { open } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const userRole = getUserRole();
  const userTeam = getUserTeam();

  // Define navigation items based on team
  const getNavigationItems = () => {
   
    if ( userTeam == "ALL") {
      // ORT Team Navigation
      const items = [
        { title: "Home", url: "/", icon: Home },
        { title: "OQC Form", url: "/oqcpage", icon: List },
        { title: "ORT Lab", url: "/ort-lab-form", icon: Backpack },
        { title: "Test Allocation", url: "/settings", icon: TestTubeIcon },
        { title: "Planning Dashboard", url: "/planning-detail", icon: Calendar },
        // { title: "Testing", url: "/form-default", icon: Settings },
      ];

     

      // Add User Management only for admin
      if (userRole === "admin") {
        items.push({ title: "User Management", url: "/users", icon: Users });
      }

      return items;
    }
    else if (userTeam === "ORT" || userTeam == "ALL") {
      // ORT Team Navigation
      const items = [
        { title: "Home", url: "/", icon: Home },
        { title: "ORT Lab", url: "/ort-lab-form", icon: Backpack },
        { title: "Test Allocation", url: "/settings", icon: TestTubeIcon },
        { title: "Planning Dashboard", url: "/planning-detail", icon: Calendar },
        // { title: "Testing", url: "/form-default", icon: Settings },
      ];

     

      // Add User Management only for admin
      if (userRole === "admin") {
        items.push({ title: "User Management", url: "/users", icon: Users });
      }

      return items;
    } 
    else if (userTeam === "OQC" || userTeam == "ALL") {
      // OQC Team Navigation
      const items = [
        { title: "OQC Form", url: "/oqcpage", icon: List },
      ];

      // Add User Management only for admin
      if (userRole === "admin" || userTeam == "ALL") {
        items.push({ title: "User Management", url: "/users", icon: Users });
      }

      return items;
    }

    // Default navigation if no team
    return [
      { title: "Home", url: "/", icon: Home },
    ];
  };

  const navigationItems = getNavigationItems();

  const isActive = (path: string) => {
    if (path === "/form-default") {
      return currentPath.startsWith("/form-default");
    }
    return currentPath === path;
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userTeam");
    localStorage.removeItem("userRole");
    navigate("/login");
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent>
        <div className="px-4 py-2">
          <h1
            className={`font-bold transition-all duration-300 ${open ? "text-2xl" : "text-lg"}`}
          >
            {open ? (
              <img src={Logo} alt="" className="w-48 h-20" />
            ) : (
              <img src={SmallLogo} alt="" className="w-20 h-8 object-full" />
            )}
          </h1>
        </div>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className={`transition-all duration-300 ${isActive(item.url)
                      ? "bg-[#e0413a] text-white hover:bg-[#e0413a] hover:text-white font-semibold"
                      : "hover:bg-[#e0413a] hover:text-white"
                      }`}
                  >
                    <NavLink to={item.url} end>
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="hover:bg-[#e0413a] hover:text-destructive-foreground transition-all duration-300 hover:text-white"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
