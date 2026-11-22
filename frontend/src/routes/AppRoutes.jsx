import { lazy, Suspense } from 'react';
import { Outlet, Route, Routes } from 'react-router-dom';
import Layout from '../components/layout/Layout.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import Checkout from '../pages/Checkout.jsx';
import Home from '../pages/Home.jsx';
import Login from '../pages/Login.jsx';
import MyBookings from '../pages/MyBookings.jsx';
import NotFound from '../pages/NotFound.jsx';
import PropertyDetails from '../pages/PropertyDetails.jsx';
import Signup from '../pages/Signup.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';

const PartnerDashboard = lazy(() => import('../pages/partner/Dashboard.jsx'));
const Manage = lazy(() => import('../pages/partner/Manage.jsx'));
const PropertyForm = lazy(() => import('../pages/partner/PropertyForm.jsx'));
const AdminDashboard = lazy(() => import('../pages/admin/Dashboard.jsx'));
const Review = lazy(() => import('../pages/admin/Review.jsx'));

function DashboardRoutes({ role }) {
  return <ProtectedRoute roles={[role]}><Suspense fallback={<Spinner />}><Outlet /></Suspense></ProtectedRoute>;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="properties/:id" element={<PropertyDetails />} />
        <Route
          path="checkout"
          element={
            <ProtectedRoute>
              <Checkout />
            </ProtectedRoute>
          }
        />
        <Route
          path="checkout/:bookingId"
          element={
            <ProtectedRoute>
              <Checkout />
            </ProtectedRoute>
          }
        />
        <Route
          path="bookings"
          element={
            <ProtectedRoute>
              <MyBookings />
            </ProtectedRoute>
          }
        />
        <Route path="login" element={<Login />} />
        <Route path="signup" element={<Signup />} />
        <Route path="partner" element={<DashboardRoutes role="partner" />}>
          <Route index element={<PartnerDashboard />} />
          <Route path="properties/new" element={<PropertyForm />} />
          <Route path="properties/:id/edit" element={<PropertyForm />} />
          <Route path="properties/:id" element={<Manage />} />
        </Route>
        <Route path="admin" element={<DashboardRoutes role="admin" />}>
          <Route index element={<AdminDashboard />} />
          <Route path="properties/:id" element={<Review />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
