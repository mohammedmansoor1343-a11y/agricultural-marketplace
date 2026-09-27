import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import DashboardLayout from "./layouts/DashboardLayout";
import { GlobalToasts, GlassOverlay } from "./components/common/ui";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";

import FarmerDashboard from "./pages/farmer/FarmerDashboard";
import MyProduce from "./pages/farmer/MyProduce";
import AddProduce from "./pages/farmer/AddProduce";
import FarmerLots from "./pages/farmer/FarmerLots";
import FarmerOrders from "./pages/farmer/FarmerOrders";
import FarmerPayments from "./pages/farmer/FarmerPayments";
import PriceTrends from "./pages/farmer/PriceTrends";
import FarmerTrust from "./pages/farmer/FarmerTrust";
import ProfilePage from "./pages/shared/ProfilePage";

import BuyerDashboard from "./pages/buyer/BuyerDashboard";
import Marketplace from "./pages/buyer/Marketplace";
import BuyerLots from "./pages/buyer/BuyerLots";
import BuyerOrders from "./pages/buyer/BuyerOrders";
import BuyerDeliveries from "./pages/buyer/BuyerDeliveries";
import BuyerPayments from "./pages/buyer/BuyerPayments";

import DriverDashboard from "./pages/driver/DriverDashboard";
import AvailableJobs from "./pages/driver/AvailableJobs";
import MyDeliveries from "./pages/driver/MyDeliveries";
import VehicleDetails from "./pages/driver/VehicleDetails";
import DriverEarnings from "./pages/driver/DriverEarnings";
import DeliveryHistory from "./pages/driver/DeliveryHistory";

import CoordinatorDashboard from "./pages/coordinator/CoordinatorDashboard";
import RegisterFarmer from "./pages/coordinator/RegisterFarmer";
import FarmerDirectory from "./pages/coordinator/FarmerDirectory";
import AddProduceForFarmer from "./pages/coordinator/AddProduceForFarmer";
import VerifyProduce from "./pages/coordinator/VerifyProduce";
import VerificationHistory from "./pages/coordinator/VerificationHistory";

import AdminDashboard from "./pages/admin/AdminDashboard";
import UserManagement from "./pages/admin/UserManagement";
import ProduceManagement from "./pages/admin/ProduceManagement";
import AdminLots from "./pages/admin/AdminLots";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminDeliveries from "./pages/admin/AdminDeliveries";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminTrust from "./pages/admin/AdminTrust";
import AdminReports from "./pages/admin/AdminReports";
import AdminSettings from "./pages/admin/AdminSettings";

import type { Role } from "./types";

function Protected({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user, booting } = useApp();
  if (booting) return <GlassOverlay title="Loading..." />;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to={`/${user.role}`} replace />;
  return <>{children}</>;
}

function Dash({ role, children }: { role: Role; children: ReactNode }) {
  return (
    <Protected roles={[role]}>
      <DashboardLayout>{children}</DashboardLayout>
    </Protected>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <GlobalToasts />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Farmer */}
          <Route path="/farmer" element={<Dash role="farmer"><FarmerDashboard /></Dash>} />
          <Route path="/farmer/produce" element={<Dash role="farmer"><MyProduce /></Dash>} />
          <Route path="/farmer/produce/add" element={<Dash role="farmer"><AddProduce /></Dash>} />
          <Route path="/farmer/lots" element={<Dash role="farmer"><FarmerLots /></Dash>} />
          <Route path="/farmer/marketplace" element={<Dash role="farmer"><Marketplace /></Dash>} />
          <Route path="/farmer/orders" element={<Dash role="farmer"><FarmerOrders /></Dash>} />
          <Route path="/farmer/payments" element={<Dash role="farmer"><FarmerPayments /></Dash>} />
          <Route path="/farmer/trends" element={<Dash role="farmer"><PriceTrends /></Dash>} />
          <Route path="/farmer/trust" element={<Dash role="farmer"><FarmerTrust /></Dash>} />
          <Route path="/farmer/profile" element={<Dash role="farmer"><ProfilePage /></Dash>} />

          {/* Buyer */}
          <Route path="/buyer" element={<Dash role="buyer"><BuyerDashboard /></Dash>} />
          <Route path="/buyer/marketplace" element={<Dash role="buyer"><Marketplace /></Dash>} />
          <Route path="/buyer/lots" element={<Dash role="buyer"><BuyerLots /></Dash>} />
          <Route path="/buyer/orders" element={<Dash role="buyer"><BuyerOrders /></Dash>} />
          <Route path="/buyer/deliveries" element={<Dash role="buyer"><BuyerDeliveries /></Dash>} />
          <Route path="/buyer/payments" element={<Dash role="buyer"><BuyerPayments /></Dash>} />
          <Route path="/buyer/profile" element={<Dash role="buyer"><ProfilePage /></Dash>} />

          {/* Driver */}
          <Route path="/driver" element={<Dash role="driver"><DriverDashboard /></Dash>} />
          <Route path="/driver/jobs" element={<Dash role="driver"><AvailableJobs /></Dash>} />
          <Route path="/driver/deliveries" element={<Dash role="driver"><MyDeliveries /></Dash>} />
          <Route path="/driver/vehicle" element={<Dash role="driver"><VehicleDetails /></Dash>} />
          <Route path="/driver/earnings" element={<Dash role="driver"><DriverEarnings /></Dash>} />
          <Route path="/driver/history" element={<Dash role="driver"><DeliveryHistory /></Dash>} />
          <Route path="/driver/profile" element={<Dash role="driver"><ProfilePage /></Dash>} />

          {/* Coordinator */}
          <Route path="/coordinator" element={<Dash role="coordinator"><CoordinatorDashboard /></Dash>} />
          <Route path="/coordinator/register-farmer" element={<Dash role="coordinator"><RegisterFarmer /></Dash>} />
          <Route path="/coordinator/farmers" element={<Dash role="coordinator"><FarmerDirectory /></Dash>} />
          <Route path="/coordinator/add-produce" element={<Dash role="coordinator"><AddProduceForFarmer /></Dash>} />
          <Route path="/coordinator/verify" element={<Dash role="coordinator"><VerifyProduce /></Dash>} />
          <Route path="/coordinator/verification-history" element={<Dash role="coordinator"><VerificationHistory /></Dash>} />
          <Route path="/coordinator/profile" element={<Dash role="coordinator"><ProfilePage /></Dash>} />

          {/* Admin */}
          <Route path="/admin" element={<Dash role="admin"><AdminDashboard /></Dash>} />
          <Route path="/admin/users" element={<Dash role="admin"><UserManagement /></Dash>} />
          <Route path="/admin/listings" element={<Dash role="admin"><ProduceManagement /></Dash>} />
          <Route path="/admin/lots" element={<Dash role="admin"><AdminLots /></Dash>} />
          <Route path="/admin/orders" element={<Dash role="admin"><AdminOrders /></Dash>} />
          <Route path="/admin/deliveries" element={<Dash role="admin"><AdminDeliveries /></Dash>} />
          <Route path="/admin/payments" element={<Dash role="admin"><AdminPayments /></Dash>} />
          <Route path="/admin/trust" element={<Dash role="admin"><AdminTrust /></Dash>} />
          <Route path="/admin/reports" element={<Dash role="admin"><AdminReports /></Dash>} />
          <Route path="/admin/settings" element={<Dash role="admin"><AdminSettings /></Dash>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
