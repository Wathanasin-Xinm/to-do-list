import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';
import Setup from './pages/Setup';
import NotFound from './pages/NotFound';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import Profile from './pages/Profile';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Admin shortcut credentials — must match what's in Login.jsx
const ADMIN_EMAIL = 'admin@todoapp.local';

const PrivateRoute = ({ children }) => {
    const { user, loading } = useAuth();
    if (loading) return <div className="flex-center" style={{ height: '100vh' }}>กำลังโหลด...</div>;
    if (!user) return <Navigate to="/login" />;

    // Allow admin account bypass (admin@todoapp.local does not need email verification)
    const isAdminAccount = user.email === ADMIN_EMAIL;
    if (!isAdminAccount && !user.emailVerified) return <Navigate to="/verify-email" />;

    return children;
};

const AdminRoute = ({ children }) => {
    const { user, userData, loading } = useAuth();
    if (loading) return <div className="flex-center" style={{ height: '100vh' }}>กำลังโหลด...</div>;
    if (!user) return <Navigate to="/login" />;
    if (userData?.role !== 'admin') return <Navigate to="/" />;
    return children;
};

function App() {
    return (
        <Router>
            <AuthProvider>
                <div className="app-container">
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/setup" element={<Setup />} />
                        <Route path="/verify-email" element={<VerifyEmail />} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route
                            path="/profile"
                            element={
                                <PrivateRoute>
                                    <Profile />
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/"
                            element={
                                <PrivateRoute>
                                    <Dashboard />
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/admin"
                            element={
                                <AdminRoute>
                                    <AdminPanel />
                                </AdminRoute>
                            }
                        />
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                    <ToastContainer position="bottom-right" theme="colored" />
                </div>
            </AuthProvider>
        </Router>
    );
}

export default App;
