import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { Menu } from 'lucide-react'
import Sidebar from './components/layout/Sidebar'
import { SidebarProvider, useSidebar } from './contexts/SidebarContext'

// Lazy load all components for code splitting and faster initial load
const LandingPage = lazy(() => import('./components/LandingPage'))
const RegistrationPage = lazy(() => import('./pages/RegistrationPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const SetPasswordPage = lazy(() => import('./pages/SetPasswordPage'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const SKUManagementPage = lazy(() => import('./pages/SKUManagementPage'))
const SKUCreatePage = lazy(() => import('./pages/SKUCreatePage'))
const SKUDetailPage = lazy(() => import('./pages/SKUDetailPage'))
const SKUMostSellingPage = lazy(() => import('./pages/SKUMostSellingPage'))
const SKUSlowMovingPage = lazy(() => import('./pages/SKUSlowMovingPage'))
const SKUNonMovablePage = lazy(() => import('./pages/SKUNonMovablePage'))
const InventoryPage = lazy(() => import('./pages/InventoryPage'))
const IncomingInventoryPage = lazy(() => import('./pages/IncomingInventoryPage'))
const OutgoingInventoryPage = lazy(() => import('./pages/OutgoingInventoryPage'))
const ItemHistoryPage = lazy(() => import('./pages/ItemHistoryPage'))
const InvoiceHistoryPage = lazy(() => import('./pages/InvoiceHistoryPage'))
const RejectedItemReportPage = lazy(() => import('./pages/RejectedItemReportPage'))
const ReportsPage = lazy(() => import('./pages/ReportsPage'))
const FinancePage = lazy(() => import('./pages/FinancePage'))
const LibraryPage = lazy(() => import('./pages/LibraryPage'))
const AddManageCategoriesPage = lazy(() => import('./pages/AddManageCategoriesPage'))
const AccessControlPage = lazy(() => import('./pages/AccessControlPage'))
const InviteUserPage = lazy(() => import('./pages/InviteUserPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const HelpSupportPage = lazy(() => import('./pages/HelpSupportPage'))
const SystemTestPage = lazy(() => import('./pages/SystemTestPage'))

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
)

// Layout component with Sidebar
const AppLayout = ({ children, hideDefaultHeader }: { children: React.ReactNode; hideDefaultHeader?: boolean }) => {
  const { isOpen, toggleSidebar } = useSidebar();
  
  return (
    <div className="flex h-screen bg-bg-light">
      <Sidebar />
      <div className={`flex-1 overflow-auto transition-all duration-300 ${isOpen ? 'ml-[216px]' : 'ml-0'} relative bg-bg-light`}>
        {/* Top Navigation Bar with Hamburger - Hidden if hideDefaultHeader is true */}
        {!hideDefaultHeader && (
          <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
            <div className="flex items-center justify-between px-4 py-3">
              {/* Hamburger Button - Always visible */}
            <button
              onClick={toggleSidebar}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200 flex items-center justify-center"
                aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
            >
                <Menu className="w-5 h-5 text-gray-700" />
            </button>
              
              {/* Right side can be used for search, user menu, etc. */}
              <div className="flex items-center gap-3">
                {/* Placeholder for future elements like search, notifications, user menu */}
              </div>
            </div>
          </div>
        )}
        
        <div>
          {children}
        </div>
      </div>
    </div>
  )
}

// Helper function for inline authentication check (best practice)
function requireAuth(element: React.ReactNode) {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  return token ? element : <Navigate to="/login" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <SidebarProvider>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/register" element={<RegistrationPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/set-password/:token" element={<SetPasswordPage />} />
          {/* Redirect not-authorized to SKU Management page (old route, no longer used) */}
          <Route path="/not-authorized" element={<Navigate to="/app/sku" replace />} />
          {/* Legacy dashboard route (no longer public): redirect to protected dashboard */}
          <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
          {/* New app routes with sidebar - inline auth check */}
          <Route path="/app/dashboard" element={requireAuth(
            <AppLayout hideDefaultHeader={true}>
              <Dashboard />
            </AppLayout>
          )} />
          {/* SKU Management Routes - inline auth check */}
          <Route path="/app/sku" element={requireAuth(
            <AppLayout>
              <SKUManagementPage />
            </AppLayout>
          )} />
          <Route path="/app/sku/create" element={requireAuth(
            <AppLayout>
              <SKUCreatePage />
            </AppLayout>
          )} />
          <Route path="/app/sku/analytics/most-selling" element={requireAuth(
            <AppLayout>
              <SKUMostSellingPage />
            </AppLayout>
          )} />
          <Route path="/app/sku/analytics/slow-moving" element={requireAuth(
            <AppLayout>
              <SKUSlowMovingPage />
            </AppLayout>
          )} />
          <Route path="/app/sku/analytics/non-movable" element={requireAuth(
            <AppLayout>
              <SKUNonMovablePage />
            </AppLayout>
          )} />
          <Route path="/app/sku/:id" element={requireAuth(
            <AppLayout>
              <SKUDetailPage />
            </AppLayout>
          )} />
          {/* Inventory Routes - inline auth check */}
          <Route path="/app/inventory" element={requireAuth(
            <AppLayout>
              <InventoryPage />
            </AppLayout>
          )} />
          <Route path="/app/inventory/incoming" element={requireAuth(
            <AppLayout>
              <IncomingInventoryPage />
            </AppLayout>
          )} />
          <Route path="/app/inventory/outgoing" element={requireAuth(
            <AppLayout>
              <OutgoingInventoryPage />
            </AppLayout>
          )} />
          <Route path="/app/inventory/:id/history" element={requireAuth(
            <AppLayout>
              <ItemHistoryPage />
            </AppLayout>
          )} />
          <Route path="/app/invoice/:invoiceNumber/:skuCode/history" element={requireAuth(
            <AppLayout>
              <InvoiceHistoryPage />
            </AppLayout>
          )} />
          <Route path="/app/rejected-items" element={requireAuth(
            <AppLayout>
              <RejectedItemReportPage />
            </AppLayout>
          )} />
          {/* Reports Route - inline auth check */}
          <Route path="/app/reports" element={requireAuth(
            <AppLayout>
              <ReportsPage />
            </AppLayout>
          )} />
          {/* Finance Route - inline auth check */}
          <Route path="/app/finance" element={requireAuth(
            <AppLayout>
              <FinancePage />
            </AppLayout>
          )} />
          {/* Library Route - inline auth check */}
          <Route path="/app/library" element={requireAuth(
            <AppLayout>
              <LibraryPage />
            </AppLayout>
          )} />
          <Route path="/app/library/categories/manage" element={requireAuth(
            <AppLayout>
              <AddManageCategoriesPage />
            </AppLayout>
          )} />
          {/* Access Control Route - inline auth check */}
          <Route path="/app/access-control" element={requireAuth(
            <AppLayout>
              <AccessControlPage />
            </AppLayout>
          )} />
          {/* Invite User Route - inline auth check */}
          <Route path="/app/invite-user" element={requireAuth(
            <AppLayout>
              <InviteUserPage />
            </AppLayout>
          )} />
          {/* Profile Route - inline auth check */}
          <Route path="/app/profile" element={requireAuth(
            <AppLayout>
              <ProfilePage />
            </AppLayout>
          )} />
          {/* Settings Route - inline auth check */}
          <Route path="/app/settings" element={requireAuth(
            <AppLayout>
              <SettingsPage />
            </AppLayout>
          )} />
          {/* Help & Support Route - inline auth check */}
          <Route path="/app/help" element={requireAuth(
            <AppLayout>
              <HelpSupportPage />
            </AppLayout>
          )} />
          {/* System Test Route - inline auth check */}
          <Route path="/app/system-test" element={requireAuth(
            <AppLayout>
              <SystemTestPage />
            </AppLayout>
          )} />
        </Routes>
        </Suspense>
      </SidebarProvider>
    </BrowserRouter>
  )
}

export default App

