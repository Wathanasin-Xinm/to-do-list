import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import {
    subscribeToAllUsers,
    updateUserAdmin,
    deleteUserAdmin,
    addUserAdmin,
    subscribeToAllTasksAdmin,
    addTaskAdmin,
    updateTaskAdmin,
    deleteTaskAdmin,
} from '../services/adminService';

// ─── Date Helpers ─────────────────────────────────────────────────────────────
const formatDate = (val) => {
    if (!val) return '—';
    if (val?.toDate) return val.toDate().toLocaleDateString('th-TH');
    return new Date(val).toLocaleDateString('th-TH');
};

const getTaskDate = (task) => {
    if (!task.dueDate) return null;
    return new Date(task.dueDate);
};

const isSameDay = (d1, d2) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

const isSameWeek = (d1, d2) => {
    const startOfWeek = (d) => {
        const dt = new Date(d);
        const day = dt.getDay();
        dt.setDate(dt.getDate() - day);
        dt.setHours(0, 0, 0, 0);
        return dt;
    };
    return startOfWeek(d1).getTime() === startOfWeek(d2).getTime();
};

const isSameMonth = (d1, d2) =>
    d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();

const isSameYear = (d1, d2) => d1.getFullYear() === d2.getFullYear();

// ─── Modals ───────────────────────────────────────────────────────────────────

const AddUserModal = ({ onClose, onSave }) => {
    const [nickname, setNickname] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('user');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email || !password) return;
        setLoading(true);
        await onSave({ nickname, email, password, role });
        setLoading(false);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                <h3>➕ เพิ่มผู้ใช้ใหม่</h3>
                <form className="modal-form" onSubmit={handleSubmit}>
                    <div>
                        <label className="modal-label">ชื่อเล่น</label>
                        <input className="input-field" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="ชื่อเล่น" />
                    </div>
                    <div>
                        <label className="modal-label">อีเมล *</label>
                        <input className="input-field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" required />
                    </div>
                    <div>
                        <label className="modal-label">รหัสผ่าน * (อย่างน้อย 6 ตัวอักษร)</label>
                        <input className="input-field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="รหัสผ่าน" required minLength={6} />
                    </div>
                    <div>
                        <label className="modal-label">บทบาท</label>
                        <select className="input-field" value={role} onChange={(e) => setRole(e.target.value)}>
                            <option value="user">user</option>
                            <option value="admin">admin</option>
                        </select>
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
                        <button type="submit" className="btn" disabled={loading}>{loading ? '⏳ กำลังสร้าง...' : '➕ สร้างผู้ใช้'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const EditUserModal = ({ user, onClose, onSave }) => {
    const [nickname, setNickname] = useState(user.nickname || '');
    const [email, setEmail] = useState(user.email || '');
    const [role, setRole] = useState(user.role || 'user');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        await onSave(user.uid, { nickname, email, role, password });
        setLoading(false);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                <h3>✏️ แก้ไขผู้ใช้</h3>
                <form className="modal-form" onSubmit={handleSubmit}>
                    <div>
                        <label className="modal-label">ชื่อเล่น</label>
                        <input className="input-field" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="ชื่อเล่น" />
                    </div>
                    <div>
                        <label className="modal-label">อีเมล</label>
                        <input className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="อีเมล" />
                    </div>
                    <div>
                        <label className="modal-label">บทบาท</label>
                        <select className="input-field" value={role} onChange={(e) => setRole(e.target.value)}>
                            <option value="user">user</option>
                            <option value="admin">admin</option>
                        </select>
                    </div>
                    <div>
                        <label className="modal-label">รหัสผ่านใหม่ (เว้นว่างถ้าไม่ต้องการเปลี่ยน)</label>
                        <input className="input-field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="รหัสผ่านใหม่..." minLength={6} />
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
                        <button type="submit" className="btn" disabled={loading}>{loading ? '⏳ กำลังบันทึก...' : '💾 บันทึก'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const EditTaskModal = ({ task, users, onClose, onSave }) => {
    const [title, setTitle] = useState(task.title || '');
    const [dueDate, setDueDate] = useState(task.dueDate || '');
    const [completed, setCompleted] = useState(task.completed || false);
    const [ownerId, setOwnerId] = useState(task.ownerId || '');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const owner = users.find((u) => u.uid === ownerId);
        await onSave(task.id, {
            title,
            dueDate,
            completed,
            ownerId,
            ownerEmail: owner?.email || task.ownerEmail,
            ownerNickname: owner?.nickname || task.ownerNickname,
        });
        setLoading(false);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                <h3>✏️ แก้ไขงาน</h3>
                <form className="modal-form" onSubmit={handleSubmit}>
                    <div>
                        <label className="modal-label">ชื่องาน</label>
                        <input className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ชื่องาน" required />
                    </div>
                    <div>
                        <label className="modal-label">เจ้าของ</label>
                        <select className="input-field" value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
                            {users.map((u) => (
                                <option key={u.uid} value={u.uid}>{u.nickname || u.email}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="modal-label">วันครบกำหนด</label>
                        <input type="date" className="input-field" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                    </div>
                    <label className="modal-check-label">
                        <input type="checkbox" checked={completed} onChange={(e) => setCompleted(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: 'var(--primary-color)' }} />
                        <span>เสร็จแล้ว</span>
                    </label>
                    <div className="modal-actions">
                        <button type="button" className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
                        <button type="submit" className="btn" disabled={loading}>{loading ? '⏳ กำลังบันทึก...' : '💾 บันทึก'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const AddTaskModal = ({ users, onClose, onSave }) => {
    const [title, setTitle] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [ownerId, setOwnerId] = useState(users[0]?.uid || '');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim()) return;
        setLoading(true);
        const owner = users.find((u) => u.uid === ownerId);
        await onSave({ title: title.trim(), dueDate, ownerId, ownerEmail: owner?.email || '', ownerNickname: owner?.nickname || '' });
        setLoading(false);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                <h3>➕ เพิ่มงาน</h3>
                <form className="modal-form" onSubmit={handleSubmit}>
                    <div>
                        <label className="modal-label">ชื่องาน</label>
                        <input className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ชื่องาน..." autoFocus required />
                    </div>
                    <div>
                        <label className="modal-label">มอบหมายให้</label>
                        <select className="input-field" value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
                            {users.map((u) => (
                                <option key={u.uid} value={u.uid}>{u.nickname || u.email}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="modal-label">วันครบกำหนด</label>
                        <input type="date" className="input-field" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
                        <button type="submit" className="btn" disabled={loading}>{loading ? '⏳ กำลังเพิ่ม...' : '✅ เพิ่มงาน'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─── Admin Panel ──────────────────────────────────────────────────────────────
const PERIODS = [
    { key: 'all', label: 'ทั้งหมด' },
    { key: 'day', label: 'รายวัน' },
    { key: 'week', label: 'รายสัปดาห์' },
    { key: 'month', label: 'รายเดือน' },
    { key: 'year', label: 'รายปี' },
];

const AdminPanel = () => {
    const [activeTab, setActiveTab] = useState('tasks');
    const [users, setUsers] = useState([]);
    const [tasks, setTasks] = useState([]);

    // Task filters
    const [period, setPeriod] = useState('all');
    const [selectedUserIds, setSelectedUserIds] = useState([]); // empty = all
    const [searchTask, setSearchTask] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'done' | 'pending'

    // Modals
    const [editingUser, setEditingUser] = useState(null);
    const [editingTask, setEditingTask] = useState(null);
    const [showAddTask, setShowAddTask] = useState(false);
    const [showAddUser, setShowAddUser] = useState(false);

    // User search
    const [searchUser, setSearchUser] = useState('');

    useEffect(() => {
        const unsub1 = subscribeToAllUsers(setUsers);
        const unsub2 = subscribeToAllTasksAdmin(setTasks);
        return () => { unsub1(); unsub2(); };
    }, []);

    // ── Toggle user selection ────────────────────────────────────────────────
    const toggleUser = (uid) => {
        setSelectedUserIds((prev) =>
            prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
        );
    };

    const selectAllUsers = () => setSelectedUserIds([]);
    const isAllSelected = selectedUserIds.length === 0;

    // ── Handlers: Users ──────────────────────────────────────────────────────
    const handleAddUser = async (data) => {
        try {
            await addUserAdmin(data);
            toast.success('สร้างผู้ใช้สำเร็จ');
            setShowAddUser(false);
        } catch (err) {
            if (err.code === 'auth/email-already-in-use') {
                toast.error('อีเมลนี้ถูกใช้แล้ว');
            } else {
                toast.error('เกิดข้อผิดพลาด: ' + err.message);
            }
        }
    };

    const handleSaveUser = async (uid, data) => {
        try {
            await updateUserAdmin(uid, data);
            toast.success('อัปเดตผู้ใช้สำเร็จ');
            if (data.password) {
                toast.info('⚠️ การเปลี่ยนรหัสผ่านต้องใช้ Firebase Admin SDK — บันทึกข้อมูลอื่นแล้ว');
            }
            setEditingUser(null);
        } catch {
            toast.error('เกิดข้อผิดพลาด');
        }
    };

    const handleDeleteUser = async (user) => {
        if (!window.confirm(`ลบผู้ใช้ "${user.nickname || user.email}" ?\n(ลบเฉพาะข้อมูลใน Firestore)`)) return;
        try {
            await deleteUserAdmin(user.uid);
            toast.success('ลบผู้ใช้สำเร็จ');
        } catch {
            toast.error('เกิดข้อผิดพลาด');
        }
    };

    // ── Handlers: Tasks ──────────────────────────────────────────────────────
    const handleAddTask = async (data) => {
        try {
            await addTaskAdmin(data);
            toast.success('เพิ่มงานสำเร็จ');
            setShowAddTask(false);
        } catch {
            toast.error('เกิดข้อผิดพลาด');
        }
    };

    const handleSaveTask = async (taskId, data) => {
        try {
            await updateTaskAdmin(taskId, data);
            toast.success('แก้ไขงานสำเร็จ');
            setEditingTask(null);
        } catch {
            toast.error('เกิดข้อผิดพลาด');
        }
    };

    const handleDeleteTask = async (task) => {
        if (!window.confirm(`ลบงาน "${task.title}" ?`)) return;
        try {
            await deleteTaskAdmin(task.id);
            toast.success('ลบงานสำเร็จ');
        } catch {
            toast.error('เกิดข้อผิดพลาด');
        }
    };

    // ── Filtered Tasks ───────────────────────────────────────────────────────
    const now = new Date();
    const filteredTasks = useMemo(() => {
        return tasks.filter((t) => {
            // User filter (multi-select, empty = all)
            const matchUser = selectedUserIds.length === 0 || selectedUserIds.includes(t.ownerId);

            // Period filter
            let matchPeriod = true;
            if (period !== 'all') {
                const taskDate = getTaskDate(t);
                if (!taskDate) {
                    matchPeriod = false;
                } else if (period === 'day') {
                    matchPeriod = isSameDay(taskDate, now);
                } else if (period === 'week') {
                    matchPeriod = isSameWeek(taskDate, now);
                } else if (period === 'month') {
                    matchPeriod = isSameMonth(taskDate, now);
                } else if (period === 'year') {
                    matchPeriod = isSameYear(taskDate, now);
                }
            }

            // Search
            const matchSearch = !searchTask || t.title.toLowerCase().includes(searchTask.toLowerCase());

            // Status
            const matchStatus =
                filterStatus === 'all' ||
                (filterStatus === 'done' && t.completed) ||
                (filterStatus === 'pending' && !t.completed);

            return matchUser && matchPeriod && matchSearch && matchStatus;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tasks, selectedUserIds, period, searchTask, filterStatus]);

    // ── Filtered Users (search) ───────────────────────────────────────────────
    const filteredUsers = useMemo(() => {
        if (!searchUser) return users;
        return users.filter(
            (u) =>
                u.nickname?.toLowerCase().includes(searchUser.toLowerCase()) ||
                u.email?.toLowerCase().includes(searchUser.toLowerCase())
        );
    }, [users, searchUser]);

    // ── Stats ─────────────────────────────────────────────────────────────────
    const stats = [
        { label: 'ผู้ใช้ทั้งหมด', value: users.length, icon: '👥', color: '#6c5ce7' },
        { label: 'งานทั้งหมด', value: tasks.length, icon: '📋', color: '#0984e3' },
        { label: 'งานเสร็จแล้ว', value: tasks.filter((t) => t.completed).length, icon: '✅', color: '#00b894' },
        { label: 'งานค้างอยู่', value: tasks.filter((t) => !t.completed).length, icon: '⏳', color: '#e17055' },
    ];

    return (
        <div className="admin-layout">
            {/* ── Header ── */}
            <header className="admin-header-bar">
                <div className="admin-header-left">
                    <div className="admin-header-icon">🛡️</div>
                    <div>
                        <h1 className="admin-header-title">Admin Panel</h1>
                        <p className="admin-header-sub">จัดการระบบ To-Do List</p>
                    </div>
                </div>
                <Link to="/" className="btn btn-outline-white">
                    ← กลับ Dashboard
                </Link>
            </header>

            <div className="admin-content">
                {/* ── Stat Cards ── */}
                <div className="admin-stats-grid">
                    {stats.map((s) => (
                        <div key={s.label} className="admin-stat-card">
                            <div className="admin-stat-icon" style={{ background: s.color + '20', color: s.color }}>{s.icon}</div>
                            <div className="admin-stat-value" style={{ color: s.color }}>{s.value}</div>
                            <div className="admin-stat-label">{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* ── Tabs ── */}
                <div className="admin-tab-bar">
                    <button className={`admin-tab-btn${activeTab === 'tasks' ? ' active' : ''}`} onClick={() => setActiveTab('tasks')}>
                        📋 จัดการงาน
                        <span className="admin-tab-count">{tasks.length}</span>
                    </button>
                    <button className={`admin-tab-btn${activeTab === 'users' ? ' active' : ''}`} onClick={() => setActiveTab('users')}>
                        👥 จัดการผู้ใช้
                        <span className="admin-tab-count">{users.length}</span>
                    </button>
                </div>

                {/* ── Tasks Tab ── */}
                {activeTab === 'tasks' && (
                    <div className="admin-panel-body">
                        {/* Filters row */}
                        <div className="admin-filters-row">
                            {/* Period tabs */}
                            <div className="admin-filter-group">
                                <span className="admin-filter-label">📅 ช่วงเวลา</span>
                                <div className="admin-period-tabs">
                                    {PERIODS.map((p) => (
                                        <button
                                            key={p.key}
                                            className={`admin-period-tab${period === p.key ? ' active' : ''}`}
                                            onClick={() => setPeriod(p.key)}
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Status filter */}
                            <div className="admin-filter-group">
                                <span className="admin-filter-label">🔖 สถานะ</span>
                                <div className="admin-period-tabs">
                                    {[['all', 'ทั้งหมด'], ['pending', '⏳ ค้าง'], ['done', '✅ เสร็จ']].map(([k, label]) => (
                                        <button
                                            key={k}
                                            className={`admin-period-tab${filterStatus === k ? ' active' : ''}`}
                                            onClick={() => setFilterStatus(k)}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="admin-task-body">
                            {/* User checklist sidebar */}
                            <div className="admin-user-checklist">
                                <div className="admin-checklist-header">
                                    <span>👤 กรองผู้ใช้</span>
                                    <button className="admin-checklist-all-btn" onClick={selectAllUsers}>
                                        {isAllSelected ? '✓ ทุกคน' : 'ทุกคน'}
                                    </button>
                                </div>
                                <div className="admin-checklist-items">
                                    {users.map((u) => {
                                        const checked = selectedUserIds.includes(u.uid);
                                        return (
                                            <label key={u.uid} className={`admin-checklist-item${checked ? ' checked' : ''}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => toggleUser(u.uid)}
                                                    style={{ accentColor: 'var(--primary-color)' }}
                                                />
                                                <span
                                                    className="admin-checklist-dot"
                                                    style={{ background: u.color || '#6c5ce7' }}
                                                />
                                                <span className="admin-checklist-name">{u.nickname || u.email}</span>
                                                <span className="admin-checklist-count">
                                                    {tasks.filter((t) => t.ownerId === u.uid).length}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Task table */}
                            <div className="admin-task-main">
                                <div className="admin-toolbar">
                                    <input
                                        className="input-field"
                                        style={{ flex: 1, minWidth: '150px' }}
                                        placeholder="🔍 ค้นหางาน..."
                                        value={searchTask}
                                        onChange={(e) => setSearchTask(e.target.value)}
                                    />
                                    <button className="btn" onClick={() => setShowAddTask(true)}>+ เพิ่มงาน</button>
                                </div>

                                <div className="admin-result-info">
                                    {selectedUserIds.length > 0 && (
                                        <span className="admin-selection-badge">
                                            เลือก {selectedUserIds.length} คน ·{' '}
                                            <button className="admin-clear-btn" onClick={selectAllUsers}>ล้าง</button>
                                        </span>
                                    )}
                                    <span className="admin-count-text">แสดง {filteredTasks.length} รายการ</span>
                                </div>

                                <div className="admin-table-wrap">
                                    <table className="admin-table">
                                        <thead>
                                            <tr>
                                                <th>ชื่องาน</th>
                                                <th>เจ้าของ</th>
                                                <th>ครบกำหนด</th>
                                                <th>สถานะ</th>
                                                <th>จัดการ</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredTasks.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} style={{ textAlign: 'center', opacity: 0.45, padding: '2.5rem' }}>
                                                        📭 ไม่มีงานในช่วงนี้
                                                    </td>
                                                </tr>
                                            ) : filteredTasks.map((task) => (
                                                <tr key={task.id}>
                                                    <td style={{ maxWidth: '220px' }}>
                                                        <span style={{ textDecoration: task.completed ? 'line-through' : 'none', opacity: task.completed ? 0.55 : 1 }}>
                                                            {task.title}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className="admin-owner-cell">
                                                            <span
                                                                className="admin-owner-dot"
                                                                style={{ background: users.find((u) => u.uid === task.ownerId)?.color || '#6c5ce7' }}
                                                            />
                                                            {task.ownerNickname || task.ownerEmail || '—'}
                                                        </div>
                                                    </td>
                                                    <td>{task.dueDate ? new Date(task.dueDate).toLocaleDateString('th-TH') : '—'}</td>
                                                    <td>
                                                        <span className={`admin-status-badge ${task.completed ? 'done' : 'pending'}`}>
                                                            {task.completed ? '✅ เสร็จ' : '⏳ ค้าง'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                            <button className="btn-icon" title="แก้ไข" onClick={() => setEditingTask(task)}>✏️</button>
                                                            <button className="btn-icon" title="ลบ" style={{ color: 'var(--danger-color)' }} onClick={() => handleDeleteTask(task)}>🗑️</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Users Tab ── */}
                {activeTab === 'users' && (
                    <div className="admin-panel-body">
                        <div className="admin-toolbar">
                            <input
                                className="input-field"
                                style={{ flex: 1, minWidth: '150px' }}
                                placeholder="🔍 ค้นหาผู้ใช้..."
                                value={searchUser}
                                onChange={(e) => setSearchUser(e.target.value)}
                            />
                            <button className="btn" onClick={() => setShowAddUser(true)}>+ เพิ่มผู้ใช้</button>
                        </div>

                        <div className="admin-table-wrap">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>ผู้ใช้</th>
                                        <th>อีเมล</th>
                                        <th>บทบาท</th>
                                        <th>งาน</th>
                                        <th>สมัครเมื่อ</th>
                                        <th>จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} style={{ textAlign: 'center', opacity: 0.45, padding: '2.5rem' }}>
                                                👤 ไม่มีผู้ใช้
                                            </td>
                                        </tr>
                                    ) : filteredUsers.map((u) => (
                                        <tr key={u.uid}>
                                            <td>
                                                <div className="admin-user-cell">
                                                    <span className="admin-user-avatar" style={{ background: u.color || '#6c5ce7' }}>
                                                        {(u.nickname || u.email || '?')[0].toUpperCase()}
                                                    </span>
                                                    <strong>{u.nickname || '—'}</strong>
                                                </div>
                                            </td>
                                            <td style={{ fontSize: '0.82rem', opacity: 0.75 }}>{u.email}</td>
                                            <td>
                                                <span className={`admin-role-badge ${u.role === 'admin' ? 'admin' : 'user'}`}>{u.role}</span>
                                            </td>
                                            <td>
                                                <span className="admin-task-count-pill">{tasks.filter((t) => t.ownerId === u.uid).length} งาน</span>
                                            </td>
                                            <td style={{ fontSize: '0.82rem' }}>{formatDate(u.createdAt)}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                    <button className="btn-icon" title="แก้ไข" onClick={() => setEditingUser(u)}>✏️</button>
                                                    <button className="btn-icon" title="ลบ" style={{ color: 'var(--danger-color)' }} onClick={() => handleDeleteUser(u)}>🗑️</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Modals ── */}
            {showAddUser && <AddUserModal onClose={() => setShowAddUser(false)} onSave={handleAddUser} />}
            {editingUser && <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} onSave={handleSaveUser} />}
            {showAddTask && <AddTaskModal users={users} onClose={() => setShowAddTask(false)} onSave={handleAddTask} />}
            {editingTask && <EditTaskModal task={editingTask} users={users} onClose={() => setEditingTask(null)} onSave={handleSaveTask} />}
        </div>
    );
};

export default AdminPanel;
