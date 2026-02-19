import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateUserProfile, isAdminUsername } from '../services/authService';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const Profile = () => {
    const { user, userData, refreshUser } = useAuth();
    const navigate = useNavigate();

    const [nickname, setNickname] = useState(userData?.nickname || '');
    const [savingNick, setSavingNick] = useState(false);

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [savingPwd, setSavingPwd] = useState(false);

    const handleNickname = async (e) => {
        e.preventDefault();
        if (!nickname.trim()) return;
        if (isAdminUsername(nickname.trim())) {
            toast.error('ชื่อเล่นต้องไม่มีคำว่า "admin"');
            return;
        }
        setSavingNick(true);
        try {
            await updateUserProfile(user.uid, { nickname: nickname.trim() });
            await refreshUser();
            toast.success('อัปเดตชื่อเล่นสำเร็จ');
        } catch (err) {
            toast.error(err.message || 'เกิดข้อผิดพลาด');
        }
        setSavingNick(false);
    };

    const handlePassword = async (e) => {
        e.preventDefault();
        if (!currentPassword) { toast.error('กรุณากรอกรหัสผ่านปัจจุบัน'); return; }
        if (!newPassword) { toast.error('กรุณากรอกรหัสผ่านใหม่'); return; }
        if (newPassword.length < 6) { toast.error('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร'); return; }
        if (newPassword !== confirmPassword) { toast.error('รหัสผ่านใหม่ไม่ตรงกัน'); return; }
        setSavingPwd(true);
        try {
            await updateUserProfile(user.uid, { newPassword, currentPassword });
            toast.success('เปลี่ยนรหัสผ่านสำเร็จ');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                toast.error('รหัสผ่านปัจจุบันไม่ถูกต้อง');
            } else {
                toast.error(err.message || 'เกิดข้อผิดพลาด');
            }
        }
        setSavingPwd(false);
    };

    return (
        <div className="profile-wrapper">
            <Link to="/" className="profile-back-link profile-back-link--fixed">← กลับ Dashboard</Link>
            <div className="glass-panel profile-card">

                <h2>👤 โปรไฟล์ของคุณ</h2>

                <div style={{ marginBottom: '0.5rem', fontSize: '0.88rem', opacity: 0.55 }}>
                    {user?.email}
                    {userData?.role === 'admin' && (
                        <span style={{ marginLeft: '0.5rem', color: 'var(--primary-color)', fontWeight: 600 }}>🛡️ admin</span>
                    )}
                </div>

                {/* Nickname Section */}
                <div className="profile-section">
                    <h3>✏️ ชื่อเล่น</h3>
                    <form onSubmit={handleNickname} style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <input
                            type="text"
                            className="input-field"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            placeholder="ชื่อเล่น"
                            style={{ flex: 1, minWidth: '140px' }}
                        />
                        <button type="submit" className="btn" disabled={savingNick}>
                            {savingNick ? '⏳...' : '💾 บันทึก'}
                        </button>
                    </form>
                </div>

                {/* Password Section */}
                <div className="profile-section">
                    <h3>🔒 เปลี่ยนรหัสผ่าน</h3>
                    <form onSubmit={handlePassword} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <input
                            type="password"
                            className="input-field"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="รหัสผ่านปัจจุบัน"
                            autoComplete="current-password"
                        />
                        <input
                            type="password"
                            className="input-field"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="รหัสผ่านใหม่ (อย่างน้อย 6 ตัว)"
                            minLength={6}
                            autoComplete="new-password"
                        />
                        <input
                            type="password"
                            className="input-field"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="ยืนยันรหัสผ่านใหม่"
                            autoComplete="new-password"
                        />
                        <button type="submit" className="btn" disabled={savingPwd}>
                            {savingPwd ? '⏳ กำลังเปลี่ยน...' : '🔑 เปลี่ยนรหัสผ่าน'}
                        </button>
                    </form>
                </div>
            </div>{/* end glass-panel */}
        </div>
    );
};

export default Profile;
