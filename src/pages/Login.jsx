import React, { useState } from 'react';
import { loginUser } from '../services/authService';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { auth } from '../services/firebase';

// Admin shortcut: maps to real Firebase credentials
const ADMIN_EMAIL = 'admin@todoapp.local';
const ADMIN_PASSWORD = 'admin1'; // Firebase min 6 chars; user types 'admin'

const Login = () => {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Allow shorthand: username "admin" with password "admin"
            const isAdmin = identifier.trim() === 'admin';
            const email = isAdmin ? ADMIN_EMAIL : identifier.trim();
            const pwd = isAdmin && password === 'admin' ? ADMIN_PASSWORD : password;

            await loginUser(email, pwd);
            const user = auth.currentUser;

            // Admin account bypasses email verification
            const isAdminAccount = user?.email === ADMIN_EMAIL;

            if (!isAdminAccount && !user?.emailVerified) {
                navigate('/verify-email');
                return;
            }

            toast.success('ยินดีต้อนรับกลับมา!');
            navigate('/');
        } catch (error) {
            toast.error('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
        }
        setLoading(false);
    };

    return (
        <div className="auth-wrapper">
            <div className="glass-panel auth-card">
                <h2>🔐 เข้าสู่ระบบ</h2>
                <form onSubmit={handleLogin} className="auth-form">
                    <input
                        type="text"
                        placeholder="อีเมล หรือ username"
                        className="input-field"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        required
                        autoComplete="username"
                    />
                    <input
                        type="password"
                        placeholder="รหัสผ่าน"
                        className="input-field"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                    />
                    <button type="submit" className="btn" disabled={loading}>
                        {loading ? '⏳ กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                    </button>
                </form>
                <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', textAlign: 'center' }}>
                    <Link to="/forgot-password" style={{ color: 'var(--primary-color)', opacity: 0.8 }}>
                        ลืมรหัสผ่าน?
                    </Link>
                </div>
                <p style={{ marginTop: '0.75rem', fontSize: '0.9rem', textAlign: 'center' }}>
                    ยังไม่มีบัญชี? <Link to="/register">สมัครสมาชิก</Link>
                </p>
            </div>
        </div>
    );
};

export default Login;
