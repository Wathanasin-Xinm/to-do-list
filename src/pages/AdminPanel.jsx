import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import {
    subscribeToAllUsers,
    updateUserAdmin,
    deleteUserAdmin,
    subscribeToAllTasksAdmin,
    addTaskAdmin,
    updateTaskAdmin,
    deleteTaskAdmin,
} from '../services/adminService';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (val) => {
    if (!val) return '—';
    if (val?.toDate) return val.toDate().toLocaleDateString('th-TH');
    return new Date(val).toLocaleDateString('th-TH');
};

// ─── Edit User Modal ──────────────────────────────────────────────────────────
const EditUserModal = ({ user, onClose, onSave }) => {
    const [nickname, setNickname] = useState(user.nickname || '');
    const [email, setEmail] = useState(user.email || '');
    const [role, setRole] = useState(user.role || 'user');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(user.uid, { nickname, email, role });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                <h3>✏️ แก้ไขผู้ใช้</h3>
                <form className="modal-form" onSubmit={handleSubmit}>
                    <div>
                        <label style={{ fontSize: '0.82rem', opacity: 0.7, display: 'block', marginBottom: '0.3rem' }}>ชื่อเล่น</label>
                        <input className="input-field" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="ชื่อเล่น" />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.82rem', opacity: 0.7, display: 'block', marginBottom: '0.3rem' }}>อีเมล</label>
                        <input className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="อีเมล" />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.82rem', opacity: 0.7, display: 'block', marginBottom: '0.3rem' }}>บทบาท</label>
                        <select className="input-field" value={role} onChange={(e) => setRole(e.target.value)}>
                            <option value="user">user</option>
                            <option value="admin">admin</option>
                        </select>
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn" style={{ background: '#b2bec3' }} onClick={onClose}>ยกเลิก</button>
                        <button type="submit" className="btn">บันทึก</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─── Edit Task Modal ──────────────────────────────────────────────────────────
const EditTaskModal = ({ task, users, onClose, onSave }) => {
    const [title, setTitle] = useState(task.title || '');
    const [dueDate, setDueDate] = useState(task.dueDate || '');
    const [completed, setCompleted] = useState(task.completed || false);
    const [ownerId, setOwnerId] = useState(task.ownerId || '');

    const handleSubmit = (e) => {
        e.preventDefault();
        const owner = users.find((u) => u.uid === ownerId);
        onSave(task.id, {
            title,
            dueDate,
            completed,
            ownerId,
            ownerEmail: owner?.email || task.ownerEmail,
            ownerNickname: owner?.nickname || task.ownerNickname,
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                <h3>✏️ แก้ไขงาน</h3>
                <form className="modal-form" onSubmit={handleSubmit}>
                    <div>
                        <label style={{ fontSize: '0.82rem', opacity: 0.7, display: 'block', marginBottom: '0.3rem' }}>ชื่องาน</label>
                        <input className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ชื่องาน" required />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.82rem', opacity: 0.7, display: 'block', marginBottom: '0.3rem' }}>เจ้าของ</label>
                        <select className="input-field" value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
                            {users.map((u) => (
                                <option key={u.uid} value={u.uid}>{u.nickname || u.email}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: '0.82rem', opacity: 0.7, display: 'block', marginBottom: '0.3rem' }}>วันครบกำหนด</label>
                        <input type="date" className="input-field" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                        <input type="checkbox" checked={completed} onChange={(e) => setCompleted(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: 'var(--primary-color)' }} />
                        เสร็จแล้ว
                    </label>
                    <div className="modal-actions">
                        <button type="button" className="btn" style={{ background: '#b2bec3' }} onClick={onClose}>ยกเลิก</button>
                        <button type="submit" className="btn">บันทึก</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─── Add Task Modal ───────────────────────────────────────────────────────────
const AddTaskModal = ({ users, onClose, onSave }) => {
    const [title, setTitle] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [ownerId, setOwnerId] = useState(users[0]?.uid || '');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title.trim()) return;
        const owner = users.find((u) => u.uid === ownerId);
        onSave({
            title: title.trim(),
            dueDate,
            ownerId,
            ownerEmail: owner?.email || '',
            ownerNickname: owner?.nickname || '',
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                <h3>➕ เพิ่มงาน</h3>
                <form className="modal-form" onSubmit={handleSubmit}>
                    <div>
                        <label style={{ fontSize: '0.82rem', opacity: 0.7, display: 'block', marginBottom: '0.3rem' }}>ชื่องาน</label>
                        <input className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ชื่องาน..." autoFocus required />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.82rem', opacity: 0.7, display: 'block', marginBottom: '0.3rem' }}>มอบหมายให้</label>
                        <select className="input-field" value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
                            {users.map((u) => (
                                <option key={u.uid} value={u.uid}>{u.nickname || u.email}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: '0.82rem', opacity: 0.7, display: 'block', marginBottom: '0.3rem' }}>วันครบกำหนด</label>
                        <input type="date" className="input-field" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn" style={{ background: '#b2bec3' }} onClick={onClose}>ยกเลิก</button>
                        <button type="submit" className="btn">เพิ่มงาน</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─── Admin Panel ──────────────────────────────────────────────────────────────
const AdminPanel = () => {
    const { userData } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' | 'users'
    const [users, setUsers] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [filterUserId, setFilterUserId] = useState('all');
    const [editingUser, setEditingUser] = useState(null);
    const [editingTask, setEditingTask] = useState(null);
    const [showAddTask, setShowAddTask] = useState(false);
    const [searchTask, setSearchTask] = useState('');

    useEffect(() => {
        const unsub1 = subscribeToAllUsers(setUsers);
        const unsub2 = subscribeToAllTasksAdmin(setTasks);
        return () => { unsub1(); unsub2(); };
    }, []);

    // ── Handlers: Users ──────────────────────────────────────────────────────
    const handleSaveUser = async (uid, data) => {
        try {
            await updateUserAdmin(uid, data);
            toast.success('อัปเดตผู้ใช้สำเร็จ');
            setEditingUser(null);
        } catch {
            toast.error('เกิดข้อผิดพลาด');
        }
    };

    const handleDeleteUser = async (user) => {
        if (!window.confirm(`ลบผู้ใช้ "${user.nickname || user.email}" ?`)) return;
        try {
            await deleteUserAdmin(user.uid);
            toast.success('ลบผู้ใช้สำเร็จ (Firestore เท่านั้น)');
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
    const filteredTasks = tasks.filter((t) => {
        const matchUser = filterUserId === 'all' || t.ownerId === filterUserId;
        const matchSearch = !searchTask || t.title.toLowerCase().includes(searchTask.toLowerCase());
        return matchUser && matchSearch;
    });

    return (
        <div className="container">
            {/* Header */}
            <header className="dashboard-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <h1 style={{ margin: 0, fontSize: '1.4rem' }}>🛡️ Admin Panel</h1>
                    <span className="badge badge-admin">admin</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <Link to="/" className="btn" style={{ background: 'rgba(108,92,231,0.15)', color: 'var(--primary-color)', textDecoration: 'none' }}>
                        ← Dashboard
                    </Link>
                </div>
            </header>

            {/* Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {[
                    { label: 'ผู้ใช้ทั้งหมด', value: users.length, icon: '👥' },
                    { label: 'งานทั้งหมด', value: tasks.length, icon: '📋' },
                    { label: 'งานเสร็จแล้ว', value: tasks.filter((t) => t.completed).length, icon: '✅' },
                    { label: 'งานค้างอยู่', value: tasks.filter((t) => !t.completed).length, icon: '⏳' },
                ].map((s) => (
                    <div key={s.label} className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem' }}>{s.icon}</div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--primary-color)' }}>{s.value}</div>
                        <div style={{ fontSize: '0.78rem', opacity: 0.65 }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="admin-tabs">
                <button className={`admin-tab${activeTab === 'tasks' ? ' active' : ''}`} onClick={() => setActiveTab('tasks')}>
                    📋 จัดการงาน ({tasks.length})
                </button>
                <button className={`admin-tab${activeTab === 'users' ? ' active' : ''}`} onClick={() => setActiveTab('users')}>
                    👥 จัดการผู้ใช้ ({users.length})
                </button>
            </div>

            {/* ── Tasks Tab ── */}
            {activeTab === 'tasks' && (
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    {/* Toolbar */}
                    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <input
                            className="input-field"
                            style={{ flex: 1, minWidth: '160px' }}
                            placeholder="🔍 ค้นหางาน..."
                            value={searchTask}
                            onChange={(e) => setSearchTask(e.target.value)}
                        />
                        <select
                            className="input-field"
                            style={{ flex: 1, minWidth: '140px' }}
                            value={filterUserId}
                            onChange={(e) => setFilterUserId(e.target.value)}
                        >
                            <option value="all">👥 ทุกคน</option>
                            {users.map((u) => (
                                <option key={u.uid} value={u.uid}>{u.nickname || u.email}</option>
                            ))}
                        </select>
                        <button className="btn" onClick={() => setShowAddTask(true)}>+ เพิ่มงาน</button>
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
                                    <tr><td colSpan={5} style={{ textAlign: 'center', opacity: 0.5, padding: '2rem' }}>ไม่มีงาน</td></tr>
                                ) : filteredTasks.map((task) => (
                                    <tr key={task.id}>
                                        <td style={{ maxWidth: '220px' }}>
                                            <span style={{ textDecoration: task.completed ? 'line-through' : 'none', opacity: task.completed ? 0.6 : 1 }}>
                                                {task.title}
                                            </span>
                                        </td>
                                        <td>{task.ownerNickname || task.ownerEmail || '—'}</td>
                                        <td>{task.dueDate ? new Date(task.dueDate).toLocaleDateString('th-TH') : '—'}</td>
                                        <td>
                                            <span className={`badge ${task.completed ? 'badge-user' : 'badge-admin'}`}>
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
            )}

            {/* ── Users Tab ── */}
            {activeTab === 'users' && (
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <div className="admin-table-wrap">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>ชื่อเล่น</th>
                                    <th>อีเมล</th>
                                    <th>บทบาท</th>
                                    <th>สมัครเมื่อ</th>
                                    <th>จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.length === 0 ? (
                                    <tr><td colSpan={5} style={{ textAlign: 'center', opacity: 0.5, padding: '2rem' }}>ไม่มีผู้ใช้</td></tr>
                                ) : users.map((u) => (
                                    <tr key={u.uid}>
                                        <td><strong>{u.nickname || '—'}</strong></td>
                                        <td style={{ fontSize: '0.82rem', opacity: 0.8 }}>{u.email}</td>
                                        <td>
                                            <span className={`badge ${u.role === 'admin' ? 'badge-admin' : 'badge-user'}`}>
                                                {u.role}
                                            </span>
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

            {/* Modals */}
            {editingUser && <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} onSave={handleSaveUser} />}
            {editingTask && <EditTaskModal task={editingTask} users={users} onClose={() => setEditingTask(null)} onSave={handleSaveTask} />}
            {showAddTask && <AddTaskModal users={users} onClose={() => setShowAddTask(false)} onSave={handleAddTask} />}
        </div>
    );
};

export default AdminPanel;
