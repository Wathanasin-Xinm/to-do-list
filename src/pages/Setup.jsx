import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { registerUser, loginUser } from '../services/authService';
import { db } from '../services/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';

const ADMIN_EMAIL = 'admin@todoapp.local';
const ADMIN_PASSWORD = 'admin1'; // Firebase requires min 6 chars; login page maps 'admin' → 'admin1'

const Setup = () => {
    const [done, setDone] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSetup = async () => {
        setLoading(true);
        try {
            let uid;

            try {
                // Try to create new admin account
                const userCred = await registerUser(ADMIN_EMAIL, ADMIN_PASSWORD, 'Admin', 'admin');
                uid = userCred?.uid;
                toast.success('สร้างบัญชี Admin สำเร็จ!');
            } catch (err) {
                if (err.code === 'auth/email-already-in-use') {
                    // Account exists — log in to get UID, then ensure Firestore doc has role=admin
                    toast.info('บัญชี Admin มีอยู่แล้ว — กำลังอัปเดต role...');
                    const cred = await loginUser(ADMIN_EMAIL, ADMIN_PASSWORD);
                    uid = cred.user.uid;

                    // Ensure the Firestore user doc has role: 'admin'
                    const userRef = doc(db, 'users', uid);
                    const snap = await getDoc(userRef);
                    if (!snap.exists() || snap.data().role !== 'admin') {
                        await setDoc(userRef, {
                            uid,
                            email: ADMIN_EMAIL,
                            nickname: 'Admin',
                            role: 'admin',
                            color: '#6c5ce7',
                            createdAt: new Date().toISOString(),
                        }, { merge: true });
                        toast.success('อัปเดต role เป็น admin สำเร็จ!');
                    }
                } else {
                    throw err;
                }
            }

            setDone(true);
        } catch (err) {
            console.error(err);
            toast.error(`เกิดข้อผิดพลาด: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-wrapper">
            <div className="glass-panel auth-card">
                <h2>⚙️ ตั้งค่าระบบ</h2>
                {done ? (
                    <>
                        <p style={{ color: 'var(--success-color)', fontWeight: 600, fontSize: '1.1rem' }}>
                            ✅ บัญชี Admin พร้อมใช้งาน
                        </p>
                        <div style={{
                            background: 'rgba(108,92,231,0.08)',
                            border: '1.5px solid rgba(108,92,231,0.2)',
                            borderRadius: '10px',
                            padding: '1rem',
                            margin: '1rem 0',
                            textAlign: 'left',
                            fontSize: '0.9rem',
                        }}>
                            <p style={{ margin: '0 0 0.4rem' }}>🔑 <strong>Username:</strong> admin</p>
                            <p style={{ margin: 0 }}>🔑 <strong>Password:</strong> admin</p>
                        </div>
                        <Link to="/login" className="btn" style={{ display: 'block', textDecoration: 'none', textAlign: 'center' }}>
                            ไปหน้าเข้าสู่ระบบ →
                        </Link>
                    </>
                ) : (
                    <>
                        <p style={{ fontSize: '0.9rem', opacity: 0.75, marginBottom: '1.25rem' }}>
                            กดปุ่มด้านล่างเพื่อสร้าง (หรืออัปเดต) บัญชีผู้ดูแลระบบ
                        </p>
                        <button
                            className="btn"
                            onClick={handleSetup}
                            disabled={loading}
                            style={{ width: '100%', fontSize: '1rem', padding: '0.85rem' }}
                        >
                            {loading ? '⏳ กำลังดำเนินการ...' : '🛡️ สร้าง / อัปเดตบัญชี Admin'}
                        </button>
                        <p style={{ marginTop: '1.25rem', fontSize: '0.85rem' }}>
                            <Link to="/login">← กลับหน้าเข้าสู่ระบบ</Link>
                        </p>
                    </>
                )}
            </div>
        </div>
    );
};

export default Setup;
