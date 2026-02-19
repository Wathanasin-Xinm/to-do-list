import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { resendVerificationEmail } from '../services/authService';
import { logoutUser } from '../services/authService';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const VerifyEmail = () => {
    const { user, refreshUser } = useAuth();
    const [resending, setResending] = useState(false);
    const [checking, setChecking] = useState(false);
    const navigate = useNavigate();

    const handleResend = async () => {
        setResending(true);
        try {
            await resendVerificationEmail();
            toast.success('ส่งอีเมลยืนยันแล้ว กรุณาตรวจสอบกล่องจดหมาย');
        } catch (err) {
            toast.error(err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
        }
        setResending(false);
    };

    const handleCheck = async () => {
        setChecking(true);
        try {
            await refreshUser();
            if (user?.emailVerified) {
                toast.success('ยืนยันอีเมลสำเร็จ!');
                navigate('/');
            } else {
                toast.warning('ยังไม่ได้ยืนยันอีเมล กรุณาตรวจสอบกล่องจดหมาย');
            }
        } catch {
            toast.error('เกิดข้อผิดพลาด');
        }
        setChecking(false);
    };

    const handleLogout = async () => {
        await logoutUser();
        navigate('/login');
    };

    return (
        <div className="verify-wrapper">
            <div className="glass-panel verify-card">
                <span className="verify-icon">📧</span>
                <h2>ยืนยันอีเมลของคุณ</h2>
                <p>
                    เราส่งลิงก์ยืนยันไปยัง <strong>{user?.email}</strong> แล้ว
                    กรุณาคลิกลิงก์ในอีเมลเพื่อยืนยันบัญชีก่อนใช้งาน
                </p>
                <div className="verify-actions">
                    <button className="btn" onClick={handleCheck} disabled={checking}>
                        {checking ? '⏳ กำลังตรวจสอบ...' : '✅ ยืนยันแล้ว — เข้าสู่ระบบ'}
                    </button>
                    <button
                        className="btn"
                        style={{ background: 'rgba(108,92,231,0.12)', color: 'var(--primary-color)' }}
                        onClick={handleResend}
                        disabled={resending}
                    >
                        {resending ? '⏳ กำลังส่ง...' : '📨 ส่งอีเมลยืนยันอีกครั้ง'}
                    </button>
                    <button
                        className="btn"
                        style={{ background: 'transparent', color: 'var(--danger-color)', border: '1.5px solid var(--danger-color)' }}
                        onClick={handleLogout}
                    >
                        ออกจากระบบ
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VerifyEmail;
