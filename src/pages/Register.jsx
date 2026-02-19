import React, { useState } from 'react';
import { registerUser, isAdminUsername, isAdminEmail } from '../services/authService';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';

const Register = () => {
    const [nickname, setNickname] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();

        if (!nickname.trim()) {
            toast.error('กรุณากรอกชื่อเล่น');
            return;
        }

        // Username restriction: must not contain "admin" in any form
        if (isAdminUsername(nickname.trim())) {
            toast.error('ชื่อเล่นต้องไม่มีคำว่า "admin"');
            return;
        }

        // Email restriction: local part must not start with "admin"
        if (isAdminEmail(email.trim())) {
            toast.error('ไม่สามารถใช้อีเมลที่ขึ้นต้นด้วย "admin" ได้');
            return;
        }

        setLoading(true);
        try {
            await registerUser(email.trim(), password, nickname.trim());
            toast.success('สร้างบัญชีสำเร็จ! กรุณายืนยันอีเมลก่อนใช้งาน');
            navigate('/verify-email');
        } catch (error) {
            if (error.code === 'auth/email-already-in-use') {
                toast.error('อีเมลนี้ถูกใช้แล้ว');
            } else {
                toast.error(error.message);
            }
        }
        setLoading(false);
    };

    return (
        <div className="auth-wrapper">
            <div className="glass-panel auth-card">
                <h2>📝 สมัครสมาชิก</h2>
                <form onSubmit={handleRegister} className="auth-form">
                    <input
                        type="text"
                        placeholder="ชื่อเล่น"
                        className="input-field"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        required
                    />
                    <input
                        type="email"
                        placeholder="อีเมล"
                        className="input-field"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <input
                        type="password"
                        placeholder="รหัสผ่าน (อย่างน้อย 6 ตัว)"
                        className="input-field"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                    />
                    <button type="submit" className="btn" disabled={loading}>
                        {loading ? '⏳ กำลังสร้างบัญชี...' : 'สมัครสมาชิก'}
                    </button>
                </form>
                <p style={{ marginTop: '1rem', fontSize: '0.9rem', textAlign: 'center' }}>
                    มีบัญชีอยู่แล้ว? <Link to="/login">เข้าสู่ระบบ</Link>
                </p>
            </div>
        </div>
    );
};

export default Register;
