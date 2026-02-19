import React, { useState } from 'react';
import { resetPassword } from '../services/authService';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email.trim()) return;
        setLoading(true);
        try {
            await resetPassword(email.trim());
            setSent(true);
            toast.success('ส่งลิงก์รีเซ็ตรหัสผ่านแล้ว กรุณาตรวจสอบอีเมล');
        } catch (err) {
            if (err.code === 'auth/user-not-found') {
                toast.error('ไม่มีบัญชีที่ใช้อีเมลนี้');
            } else {
                toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่');
            }
        }
        setLoading(false);
    };

    return (
        <div className="forgot-wrapper">
            <div className="glass-panel forgot-card">
                <h2>🔑 ลืมรหัสผ่าน</h2>
                {sent ? (
                    <>
                        <p>✅ ส่งลิงก์รีเซ็ตรหัสผ่านไปยัง <strong>{email}</strong> แล้ว<br />
                        กรุณาตรวจสอบกล่องจดหมาย (และโฟลเดอร์ Spam)</p>
                        <Link to="/login" className="btn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                            กลับหน้าเข้าสู่ระบบ
                        </Link>
                    </>
                ) : (
                    <>
                        <p>กรอกอีเมลที่ลงทะเบียนไว้ เราจะส่งลิงก์สำหรับรีเซ็ตรหัสผ่านให้</p>
                        <form className="forgot-form" onSubmit={handleSubmit}>
                            <input
                                type="email"
                                className="input-field"
                                placeholder="อีเมลของคุณ"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoFocus
                            />
                            <button type="submit" className="btn" disabled={loading}>
                                {loading ? '⏳ กำลังส่ง...' : '📨 ส่งลิงก์รีเซ็ต'}
                            </button>
                        </form>
                        <p style={{ marginTop: '1rem', fontSize: '0.85rem', textAlign: 'center' }}>
                            <Link to="/login" style={{ color: 'var(--primary-color)' }}>← กลับหน้าเข้าสู่ระบบ</Link>
                        </p>
                    </>
                )}
            </div>
        </div>
    );
};

export default ForgotPassword;
