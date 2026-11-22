import { Route, Routes } from 'react-router-dom';
import Layout from '../components/layout/Layout.jsx';
import AdminDashboard from '../pages/admin/Dashboard.jsx';
import Checkout from '../pages/Checkout.jsx';
import Home from '../pages/Home.jsx';
import Login from '../pages/Login.jsx';
import MyBookings from '../pages/MyBookings.jsx';
import NotFound from '../pages/NotFound.jsx';
import PartnerDashboard from '../pages/partner/Dashboard.jsx';
import PropertyDetails from '../pages/PropertyDetails.jsx';
import Signup from '../pages/Signup.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';

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
        <Route
          path="partner"
          element={
            <ProtectedRoute roles={['partner']}>
              <PartnerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
