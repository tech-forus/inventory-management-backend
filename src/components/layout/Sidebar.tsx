import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Warehouse,
  Library,
  FileText,
  Shield,
  Settings,
  User,
  HelpCircle,
  AlertTriangle,
  Cpu,
  LogOut,
  Square,
  ArrowRightSquare,
  TrendingUp
} from 'lucide-react';
import { useSidebar } from '../../contexts/SidebarContext';

// Types
interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path?: string;
  children?: MenuItem[];
  badge?: number;
  permission?: string;
  roles?: string[];
  showPlusIcon?: boolean;
}

interface User {
  id?: number;
  companyId?: string;
  companyName?: string;
  email?: string;
  fullName?: string;
  phone?: string;
  role?: string;
  permissions?: string[];
}

// Permission checking utilities
const hasPermission = (user: User | null, permission?: string): boolean => {
  if (!user) return false;
  // Super admin and admin have all permissions
  if (user.role === 'super_admin' || user.role === 'admin') return true;
  if (!permission) return true;
  return user.permissions?.includes(permission) || false;
};


// Menu Item Component
interface MenuItemProps {
  item: MenuItem;
  isActive: boolean;
  user: User | null;
  isSettings?: boolean;
}

const MenuItemComponent: React.FC<MenuItemProps> = ({
  item,
  isActive,
  user,
  isSettings = false
}) => {
  const isVisible =
    (!item.permission || hasPermission(user, item.permission)) &&
    (!item.roles || item.roles.includes(user?.role || ''));

  if (!isVisible || !item.path) return null;

  return (
    <Link
      to={item.path}
      className={`
        relative px-3 py-[10.5px] flex items-center gap-3 group
        ${isActive 
          ? 'bg-indigo-600 text-white' 
          : isSettings 
            ? 'bg-slate-700/50 text-white' 
            : 'text-white hover:bg-slate-700/30'
        }
        transition-all duration-200
        cursor-pointer rounded-lg
      `}
    >
      <item.icon className={`w-[15px] h-[15px] flex-shrink-0 ${isActive ? 'text-blue-400' : 'text-white'}`} />
      <span className={`text-[10.5px] font-semibold leading-[1.4] uppercase tracking-wider truncate ${isActive ? 'text-white' : 'text-white'}`}>
        {item.label}
      </span>
      {isActive && (
        <div className="absolute right-[9px] w-1.5 h-1.5 bg-white rounded-full"></div>
      )}
    </Link>
  );
};

// Main Sidebar Component
const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isOpen, toggleSidebar } = useSidebar();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Load user from storage
    const userData = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('access');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('access');
    navigate('/login');
  };

  // Check if user is user/sales role
  const isUserOrSales = user?.role === 'user' || user?.role === 'sales';

  // Menu configuration organized by sections
  const menuSections = isUserOrSales
    ? [
      // Simplified menu for user/sales role
      {
        title: 'MAIN',
        items: [
          {
            id: 'sku',
            label: 'SKU MANAGEMENT',
            icon: Cpu,
            path: '/app/sku',
          },
        ],
      },
      {
        title: 'ACCOUNT',
        items: [
          {
            id: 'settings',
            label: 'SETTINGS',
            icon: Settings,
            path: '/app/settings',
          },
          {
            id: 'profile',
            label: 'PROFILE',
            icon: User,
            path: '/app/profile',
          },
          {
            id: 'help',
            label: 'HELP & SUPPORT',
            icon: HelpCircle,
            path: '/app/help',
          },
        ],
      },
    ]
    : [
      // Full menu for admin/super_admin roles
      {
        title: 'MAIN',
        items: [
          {
            id: 'dashboard',
            label: 'DASHBOARD',
            icon: LayoutDashboard,
            path: '/app/dashboard',
          },
        ],
      },
      {
        title: 'OPERATIONS',
        items: [
          {
            id: 'sku',
            label: 'SKU MANAGEMENT',
            icon: Cpu,
            path: '/app/sku',
            permission: 'sku.view',
          },
          {
            id: 'inventory',
            label: 'INVENTORY',
            icon: Warehouse,
            path: '/app/inventory',
            permission: 'inventory.view',
            roles: ['admin', 'super_admin'],
          },
          {
            id: 'library',
            label: 'LIBRARY',
            icon: Library,
            path: '/app/library',
            roles: ['admin', 'super_admin'],
          },
          {
            id: 'finance',
            label: 'FINANCE',
            icon: TrendingUp,
            path: '/app/finance',
            roles: ['admin', 'super_admin'],
          },
        ],
      },
      {
        title: 'ANALYTICS',
        items: [
          {
            id: 'reports',
            label: 'REPORTS',
            icon: FileText,
            path: '/app/reports',
            permission: 'reports.view',
          },
          {
            id: 'rejected-items',
            label: 'REJECTED/SHORT ITEMS',
            icon: AlertTriangle,
            path: '/app/rejected-items',
            permission: 'inventory.view',
            roles: ['admin', 'super_admin'],
          },
        ],
      },
      {
        title: 'ACTIONS',
        items: [
          {
            id: 'access-control',
            label: 'ACCESS CONTROL',
            icon: Shield,
            path: '/app/access-control',
            roles: ['super_admin'],
          },
          {
            id: 'settings',
            label: 'SETTINGS',
            icon: Settings,
            path: '/app/settings',
          },
        ],
      },
      {
        title: 'ACCOUNT',
        items: [
          {
            id: 'profile',
            label: 'PROFILE',
            icon: User,
            path: '/app/profile',
          },
          {
            id: 'help',
            label: 'HELP & SUPPORT',
            icon: HelpCircle,
            path: '/app/help',
          },
        ],
      },
    ];

  // Helper function to check if path is active (including sub-routes)
  const isPathActive = (path: string): boolean => {
    if (path === '/app/dashboard') {
      return location.pathname === '/app/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Sidebar */}
      <div className={`w-[216px] h-screen bg-slate-900 flex flex-col fixed left-0 top-0 overflow-hidden transition-transform duration-300 z-40 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Logo Area */}
        <div className="p-[18px] border-b border-slate-700/50">
          <div className="flex items-center gap-[9px]">
            <div className="w-[30px] h-[30px] bg-indigo-600 rounded-lg flex items-center justify-center">
              <Square className="w-[18px] h-[18px] text-white" />
            </div>
            <span className="text-[15px] font-black leading-[1.2] text-white tracking-tight">Forusbiz</span>
          </div>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto py-[18px] px-3">
          <nav className="space-y-1.5">
            {menuSections.map((section) => {
              // Filter visible items for this section
              const visibleItems = section.items.filter((item: MenuItem) => {
                const isVisible =
                  (!item.permission || hasPermission(user, item.permission)) &&
                  (!item.roles || item.roles.includes(user?.role || ''));
                return isVisible && item.path;
              });

              // Don't render section if no visible items
              if (visibleItems.length === 0) return null;

              return (
                <div key={section.title} className="space-y-1.5">
                  {/* Section Items */}
                  {visibleItems.map((item) => (
                    <MenuItemComponent
                      key={item.id}
                      item={item}
                      isActive={isPathActive(item.path || '')}
                      user={user}
                      isSettings={item.id === 'settings'}
                    />
                  ))}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Logout Button */}
        <div className="p-3 border-t border-slate-700/50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-[9px] px-3 py-[9px] text-white hover:bg-slate-700/30 transition-all duration-200 rounded-lg group"
          >
            <LogOut className="w-[15px] h-[15px]" />
            <span className="text-[10.5px] font-semibold leading-[1.4] uppercase tracking-wider">Logout</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
