import React, { useState } from 'react';
import { registerUser } from '../services/authService';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';

const Register = () => {
    const [nickname, setNickname] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        if (!nickname.trim()) {
            toast.error('กรุณากรอกชื่อเล่น');
            return;
        }
        try {
            await registerUser(email, password, nickname.trim());
            toast.success('สร้างบัญชีสำเร็จ!');
            navigate('/');
        } catch (error) {
            toast.error(error.message);
        }
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
                    <button type="submit" className="btn">สมัครสมาชิก</button>
                </form>
                <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
                    มีบัญชีอยู่แล้ว? <Link to="/login">เข้าสู่ระบบ</Link>
                </p>
            </div>
        </div>
    );
};

export default Register;
