import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
    updateUserOrder,
    updateTaskOrderAdmin,
    subscribeToAllCategories,
} from '../services/adminService';
import {
    addCategory,
    updateCategory,
    deleteCategory,
} from '../services/taskService';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import ReactDOM from 'react-dom';

const arrayMove = (array, from, to) => {
    const newArray = array.slice();
    newArray.splice(to < 0 ? newArray.length + to : to, 0, newArray.splice(from, 1)[0]);
    return newArray;
};

const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

const getExpiresAtMs = (task) => {
    if (!task.expiresAt) return null;
    return new Date(task.expiresAt).getTime();
};

const getExpirationStatus = (task, nowMs) => {
    const exAt = getExpiresAtMs(task);
    if (!exAt) return null;
    const diffMs = exAt - nowMs;
    if (diffMs <= 0) return 'expired';
    return 'active';
};

const formatFullThaiDateTime = (ms) => {
    const d = new Date(ms);
    const day = d.getDate();
    const month = TH_MONTHS[d.getMonth()];
    const year = d.getFullYear() + 543;
    const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    return `${day} ${month} ${year} ${time}`;
};

const formatTimeRemaining = (ms) => {
    if (ms <= 0) return '0 นาที';
    const totalMin = Math.floor(ms / (1000 * 60));
    const days = Math.floor(totalMin / (60 * 24));
    const hours = Math.floor((totalMin % (60 * 24)) / 60);
    const mins = totalMin % 60;

    let parts = [];
    if (days > 0) parts.push(`${days} วัน`);
    if (hours > 0) parts.push(`${hours} ชม.`);
    if (mins > 0 || parts.length === 0) parts.push(`${mins} นาที`);
    
    return parts.join(' ');
};

const ExpirationBadge = ({ task, nowMs }) => {
    const status = getExpirationStatus(task, nowMs);
    if (!status) return null;

    const exAt = getExpiresAtMs(task);

    if (status === 'expired') {
        return (
            <div className={`expire-badge expire-badge--expired`} style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>
                🔴 หมดเมื่อ {formatFullThaiDateTime(exAt)}
            </div>
        );
    }
    
    const remaining = exAt - nowMs;
    return (
        <div className={`expire-badge expire-badge--countdown`} style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>
            ⏳ จะหมดเวลาในอีก {formatTimeRemaining(remaining)}
        </div>
    );
};

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
        dt.setDate(dt.getDate() - dt.getDay());
        dt.setHours(0, 0, 0, 0);
        return dt;
    };
    return startOfWeek(d1).getTime() === startOfWeek(d2).getTime();
};

const isSameMonth = (d1, d2) =>
    d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();

const isSameYear = (d1, d2) => d1.getFullYear() === d2.getFullYear();

// ─── Admin Row Wrapper ────────────────────────────────────────────────────────
const AdminRow = ({ id, index, children, provided, snapshot }) => {
    const child = (
        <tr
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={`${snapshot.isDragging ? 'dragging-row' : ''}`}
            style={{
                ...provided.draggableProps.style,
            }}
        >
            <td className="drag-handle" {...provided.dragHandleProps} title="ลากเพื่อเรียงลำดับ">⠿</td>
            {children}
        </tr>
    );

    if (snapshot.isDragging) {
        return ReactDOM.createPortal(
            <table className="admin-table" style={{ width: '100%', tableLayout: 'fixed' }}>
                <tbody>{child}</tbody>
            </table>,
            document.body
        );
    }
    return child;
};

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

const EditTaskModal = ({ task, users, categories, onClose, onSave }) => {
    const [title, setTitle] = useState(task.title || '');
    const [dueDate, setDueDate] = useState(task.dueDate || '');
    const [completed, setCompleted] = useState(task.completed || false);
    const [ownerId, setOwnerId] = useState(task.ownerId || '');
    const [categoryId, setCategoryId] = useState(task.categoryId || '');
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
            categoryId,
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
                        <label className="modal-label">หมวดหมู่</label>
                        <select className="input-field" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                            <option value="">ไม่มีหมวดหมู่</option>
                            {categories.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
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

const AddTaskModal = ({ users, categories, onClose, onSave }) => {
    const [title, setTitle] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [ownerId, setOwnerId] = useState(users[0]?.uid || '');
    const [categoryId, setCategoryId] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim()) return;
        setLoading(true);
        const owner = users.find((u) => u.uid === ownerId);
        await onSave({ title: title.trim(), dueDate, ownerId, categoryId, ownerEmail: owner?.email || '', ownerNickname: owner?.nickname || '' });
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
                        <label className="modal-label">หมวดหมู่</label>
                        <select className="input-field" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                            <option value="">ไม่มีหมวดหมู่</option>
                            {categories.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
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

const CategoryModal = ({ category, onClose, onSave }) => {
    const [name, setName] = useState(category?.name || '');
    const [color, setColor] = useState(category?.color || '#6c5ce7');
    const [loading, setLoading] = useState(false);

    const colors = ['#68962c', '#d63031', '#00b894', '#0984e3', '#fdcb6e', '#e17055', '#6c5ce7', '#00cec9', '#fab1a0', '#a29bfe'];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setLoading(true);
        await onSave(category?.id, { name: name.trim(), color });
        setLoading(false);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                <h3>{category ? '✏️ แก้ไขหมวดหมู่' : '➕ เพิ่มหมวดหมู่'}</h3>
                <form className="modal-form" onSubmit={handleSubmit}>
                    <div>
                        <label className="modal-label">ชื่อหมวดหมู่</label>
                        <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อหมวดหมู่..." autoFocus required />
                    </div>
                    <div>
                        <label className="modal-label">เลือกสี</label>
                        <div className="category-color-picker">
                            {colors.map((c) => (
                                <div
                                    key={c}
                                    className={`color-option ${color === c ? 'active' : ''}`}
                                    style={{ background: c }}
                                    onClick={() => setColor(c)}
                                />
                            ))}
                        </div>
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

// ─── Admin Panel ──────────────────────────────────────────────────────────────
const PERIODS = [
    { key: 'all', label: 'ทั้งหมด' },
    { key: 'day', label: 'รายวัน' },
    { key: 'week', label: 'รายสัปดาห์' },
    { key: 'month', label: 'รายเดือน' },
    { key: 'year', label: 'รายปี' },
];

const AdminPanel = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('tasks');
    const [users, setUsers] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [categories, setCategories] = useState([]);

    const [period, setPeriod] = useState('all');
    const [selectedUserIds, setSelectedUserIds] = useState([]);
    const [searchTask, setSearchTask] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    const [editingUser, setEditingUser] = useState(null);
    const [editingTask, setEditingTask] = useState(null);
    const [showAddTask, setShowAddTask] = useState(false);
    const [showAddUser, setShowAddUser] = useState(false);
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [searchUser, setSearchUser] = useState('');
    const [nowMs, setNowMs] = useState(Date.now());

    // ── Timer ─────────────────────────────────────────────────────────────
    useEffect(() => {
        const timer = setInterval(() => setNowMs(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    // ── Filtered Tasks ─────────────────────────────────────────────────────────
    const filteredTasks = useMemo(() => {
        const now = new Date(nowMs);
        return tasks.filter((t) => {
            const matchUser = selectedUserIds.length === 0 || selectedUserIds.includes(t.ownerId);
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
            const matchSearch = !searchTask || t.title.toLowerCase().includes(searchTask.toLowerCase());
            const matchStatus =
                filterStatus === 'all' ||
                (filterStatus === 'done' && t.completed) ||
                (filterStatus === 'pending' && !t.completed);
            return matchUser && matchPeriod && matchSearch && matchStatus;
        });
    }, [tasks, selectedUserIds, period, searchTask, filterStatus, nowMs]);

    const filteredUsers = useMemo(() => {
        if (!searchUser) return users;
        return users.filter(
            (u) =>
                u.nickname?.toLowerCase().includes(searchUser.toLowerCase()) ||
                u.email?.toLowerCase().includes(searchUser.toLowerCase())
        );
    }, [users, searchUser]);

    useEffect(() => {
        const unsub1 = subscribeToAllUsers((uArr) => setUsers(uArr));
        const unsub2 = subscribeToAllTasksAdmin((tArr) => setTasks(tArr));
        const unsub3 = subscribeToAllCategories(setCategories);
        return () => { unsub1(); unsub2(); unsub3(); };
    }, []);

    const toggleUser = (uid) => setSelectedUserIds((prev) =>
        prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
    const selectAllUsers = () => setSelectedUserIds([]);
    const isAllSelected = selectedUserIds.length === 0;

    // ── Handlers: Users ────────────────────────────────────────────────────────
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
            setEditingUser(null);
        } catch {
            toast.error('เกิดข้อผิดพลาด');
        }
    };

    const handleDeleteUser = async (u) => {
        if (!window.confirm(`ลบผู้ใช้ "${u.nickname || u.email}" ?\n(ลบเฉพาะข้อมูลใน Firestore)`)) return;
        try {
            await deleteUserAdmin(u.uid);
            toast.success('ลบผู้ใช้สำเร็จ');
        } catch {
            toast.error('เกิดข้อผิดพลาด');
        }
    };

    // ── Handlers: Tasks ────────────────────────────────────────────────────────
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

    // ── Handlers: Categories ───────────────────────────────────────────────────
    const handleAddCategory = async (data) => {
        try {
            await addCategory(data, user);
            toast.success('เพิ่มหมวดหมู่สำเร็จ');
            setShowAddCategory(false);
        } catch {
            toast.error('เกิดข้อผิดพลาด');
        }
    };

    const handleSaveCategory = async (categoryId, data) => {
        try {
            await updateCategory(categoryId, data);
            toast.success('อัปเดตหมวดหมู่สำเร็จ');
            setEditingCategory(null);
        } catch {
            toast.error('เกิดข้อผิดพลาด');
        }
    };

    const handleDeleteCategory = async (cat) => {
        if (!window.confirm(`ลบหมวดหมู่ "${cat.name}" ?`)) return;
        try {
            await deleteCategory(cat.id);
            toast.success('ลบหมวดหมู่สำเร็จ');
        } catch {
            toast.error('เกิดข้อผิดพลาด');
        }
    };

    const onTaskDragEnd = (result) => {
        if (!result.destination) return;
        
        const oldIndex = result.source.index;
        const newIndex = result.destination.index;
        if (oldIndex === newIndex) return;

        setTasks((prev) => {
            const oldTaskId = filteredTasks[oldIndex].id;
            const newTaskId = filteredTasks[newIndex].id;
            const finalFullList = arrayMove(prev, prev.findIndex(t => t.id === oldTaskId), prev.findIndex(t => t.id === newTaskId));
            updateTaskOrderAdmin(finalFullList).catch(() => toast.error('ไม่สามารถบันทึกการเรียงลำดับได้'));
            return finalFullList;
        });
    };

    const onUserDragEnd = (result) => {
        if (!result.destination) return;
        
        const oldIndex = result.source.index;
        const newIndex = result.destination.index;
        if (oldIndex === newIndex) return;

        setUsers((prev) => {
            const oldUserId = filteredUsers[oldIndex].uid;
            const newUserId = filteredUsers[newIndex].uid;
            const finalFullList = arrayMove(prev, prev.findIndex(u => u.uid === oldUserId), prev.findIndex(u => u.uid === newUserId));
            updateUserOrder(finalFullList).catch(() => toast.error('ไม่สามารถบันทึกการเรียงลำดับได้'));
            return finalFullList;
        });
    };

    const stats = [
        { label: 'ผู้ใช้ทั้งหมด', value: users.length, icon: '👥', color: '#6c5ce7' },
        { label: 'งานทั้งหมด', value: tasks.length, icon: '📋', color: '#0984e3' },
        { label: 'งานเสร็จแล้ว', value: tasks.filter((t) => t.completed).length, icon: '✅', color: '#00b894' },
        { label: 'งานค้างอยู่', value: tasks.filter((t) => !t.completed).length, icon: '⏳', color: '#e17055' },
    ];

    const activeTask = tasks.find((t) => t.id === activeId);
    const activeUser = users.find((u) => u.uid === activeId);

    return (
        <div className="admin-layout">
            <header className="admin-header-bar">
                <div className="admin-header-left">
                    <div className="admin-header-icon">🛡️</div>
                    <div>
                        <h1 className="admin-header-title">Admin Panel</h1>
                        <p className="admin-header-sub">จัดการระบบ To-Do List</p>
                    </div>
                </div>
                <Link to="/" className="btn btn-outline-white">← กลับ Dashboard</Link>
            </header>

            <div className="admin-content">
                <div className="admin-stats-grid">
                    {stats.map((s) => (
                        <div key={s.label} className="admin-stat-card">
                            <div className="admin-stat-icon" style={{ background: s.color + '20', color: s.color }}>{s.icon}</div>
                            <div className="admin-stat-value" style={{ color: s.color }}>{s.value}</div>
                            <div className="admin-stat-label">{s.label}</div>
                        </div>
                    ))}
                </div>

                <div className="admin-tab-bar">
                    <button className={`admin-tab-btn${activeTab === 'tasks' ? ' active' : ''}`} onClick={() => setActiveTab('tasks')}>
                        📋 จัดการงาน <span className="admin-tab-count">{tasks.length}</span>
                    </button>
                    <button className={`admin-tab-btn${activeTab === 'users' ? ' active' : ''}`} onClick={() => setActiveTab('users')}>
                        👥 จัดการผู้ใช้ <span className="admin-tab-count">{users.length}</span>
                    </button>
                    <button className={`admin-tab-btn${activeTab === 'categories' ? ' active' : ''}`} onClick={() => setActiveTab('categories')}>
                        🏷️ หมวดหมู่ <span className="admin-tab-count">{categories.length}</span>
                    </button>
                </div>

                {activeTab === 'tasks' && (
                    <div className="admin-panel-body">
                        <div className="admin-filters-row">
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
                                                <span className="admin-checklist-dot" style={{ background: u.color || '#6c5ce7' }} />
                                                <span className="admin-checklist-name">{u.nickname || u.email}</span>
                                                <span className="admin-checklist-count">
                                                    {tasks.filter((t) => t.ownerId === u.uid).length}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

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
                                    <span style={{ fontSize: '0.75rem', opacity: 0.5, marginLeft: '0.5rem' }}>⠿ ลากเพื่อเรียง</span>
                                </div>

                                <div className="admin-table-wrap">
                                    <DragDropContext onDragEnd={onTaskDragEnd}>
                                        <Droppable droppableId="adminTasks">
                                            {(provided) => (
                                                <table className="admin-table" {...provided.droppableProps} ref={provided.innerRef}>
                                                    <thead>
                                                        <tr>
                                                            <th style={{ width: '28px' }}></th>
                                                            <th>ชื่องาน</th>
                                                            <th className="hide-mobile">เจ้าของ</th>
                                                            <th className="hide-mobile">ครบกำหนด</th>
                                                            <th>สถานะ</th>
                                                            <th>จัดการ</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {filteredTasks.length === 0 ? (
                                                            <tr>
                                                                <td colSpan={6} style={{ textAlign: 'center', opacity: 0.45, padding: '2.5rem' }}>
                                                                    📭 ไม่มีงานในช่วงนี้
                                                                </td>
                                                            </tr>
                                                        ) : (
                                                            filteredTasks.map((task, index) => (
                                                                <Draggable key={task.id} draggableId={task.id} index={index}>
                                                                    {(dragProvided, dragSnapshot) => (
                                                                        <AdminRow
                                                                            id={task.id}
                                                                            index={index}
                                                                            provided={dragProvided}
                                                                            snapshot={dragSnapshot}
                                                                        >
                                                                            <td style={{ maxWidth: '220px' }}>
                                                                                <span style={{ textDecoration: task.completed ? 'line-through' : 'none', opacity: task.completed ? 0.55 : 1 }}>
                                                                                    {task.title}
                                                                                    {task.expirationMode === 'B' && !task.completed && (
                                                                                        <span style={{ fontSize: '0.7rem', background: '#d6303120', color: '#d63031', padding: '1px 4px', borderRadius: '4px', marginLeft: '0.4rem', border: '1px solid #d6303140' }}>
                                                                                            🗑️ ลบอัตโนมัติ
                                                                                        </span>
                                                                                    )}
                                                                                    <ExpirationBadge task={task} nowMs={nowMs} />
                                                                                </span>
                                                                            </td>
                                                                            <td className="hide-mobile">
                                                                                <div className="admin-owner-cell">
                                                                                    <span
                                                                                        className="admin-owner-dot"
                                                                                        style={{ background: users.find((u) => u.uid === task.ownerId)?.color || '#6c5ce7' }}
                                                                                    />
                                                                                    {task.ownerNickname || task.ownerEmail || '—'}
                                                                                </div>
                                                                            </td>
                                                                            <td className="hide-mobile">{task.dueDate ? new Date(task.dueDate).toLocaleDateString('th-TH') : '—'}</td>
                                                                            <td>
                                                                                <span className={`admin-status-badge ${task.completed ? 'done' : 'pending'}`}>
                                                                                    {task.completed ? '✅ เสร็จ' : '⏳ ค้าง'}
                                                                                </span>
                                                                            </td>
                                                                            <td>
                                                                                <div className="task-actions">
                                                                                    <button className="btn-icon" title="แก้ไข" onClick={() => setEditingTask(task)}>✏️</button>
                                                                                    <button className="btn-icon" title="ลบ" style={{ color: 'var(--danger-color)' }} onClick={() => handleDeleteTask(task)}>🗑️</button>
                                                                                </div>
                                                                            </td>
                                                                        </AdminRow>
                                                                    )}
                                                                </Draggable>
                                                            ))
                                                        )}
                                                        {provided.placeholder}
                                                    </tbody>
                                                </table>
                                            )}
                                        </Droppable>
                                    </DragDropContext>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

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

                        <div style={{ fontSize: '0.75rem', opacity: 0.5, marginBottom: '0.5rem', textAlign: 'right' }}>⠿ ลากเพื่อเรียงลำดับผู้ใช้</div>

                        <div className="admin-table-wrap">
                            <DragDropContext onDragEnd={onUserDragEnd}>
                                <Droppable droppableId="adminUsers">
                                    {(provided) => (
                                        <table className="admin-table" {...provided.droppableProps} ref={provided.innerRef}>
                                            <thead>
                                                <tr>
                                                    <th style={{ width: '28px' }}></th>
                                                    <th>ผู้ใช้</th>
                                                    <th className="hide-mobile">อีเมล</th>
                                                    <th>บทบาท</th>
                                                    <th className="hide-mobile">งาน</th>
                                                    <th className="hide-tablet">สมัครเมื่อ</th>
                                                    <th>จัดการ</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredUsers.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={7} style={{ textAlign: 'center', opacity: 0.45, padding: '2.5rem' }}>
                                                            👤 ไม่มีผู้ใช้
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    filteredUsers.map((u, index) => (
                                                        <Draggable key={u.uid} draggableId={u.uid} index={index}>
                                                            {(dragProvided, dragSnapshot) => (
                                                                <AdminRow
                                                                    id={u.uid}
                                                                    index={index}
                                                                    provided={dragProvided}
                                                                    snapshot={dragSnapshot}
                                                                >
                                                                    <td>
                                                                        <div className="admin-user-cell">
                                                                            <span className="admin-user-avatar" style={{ background: u.color || '#6c5ce7' }}>
                                                                                {(u.nickname || u.email || '?')[0].toUpperCase()}
                                                                            </span>
                                                                            <strong>{u.nickname || '—'}</strong>
                                                                        </div>
                                                                    </td>
                                                                    <td className="hide-mobile" style={{ fontSize: '0.82rem', opacity: 0.75 }}>{u.email}</td>
                                                                    <td>
                                                                        <span className={`admin-role-badge ${u.role === 'admin' ? 'admin' : 'user'}`}>{u.role}</span>
                                                                    </td>
                                                                    <td className="hide-mobile">
                                                                        <span className="admin-task-count-pill">{tasks.filter((t) => t.ownerId === u.uid).length} งาน</span>
                                                                    </td>
                                                                    <td className="hide-tablet" style={{ fontSize: '0.82rem' }}>{formatDate(u.createdAt)}</td>
                                                                    <td>
                                                                        <div className="task-actions">
                                                                            <button className="btn-icon" title="แก้ไข" onClick={() => setEditingUser(u)}>✏️</button>
                                                                            <button className="btn-icon" title="ลบ" style={{ color: 'var(--danger-color)' }} onClick={() => handleDeleteUser(u)}>🗑️</button>
                                                                        </div>
                                                                    </td>
                                                                </AdminRow>
                                                            )}
                                                        </Draggable>
                                                    ))
                                                )}
                                                {provided.placeholder}
                                            </tbody>
                                        </table>
                                    )}
                                </Droppable>
                            </DragDropContext>
                        </div>
                    </div>
                )}

                {activeTab === 'categories' && (
                    <div className="admin-panel-body">
                        <div className="admin-toolbar">
                            <input
                                className="input-field"
                                style={{ flex: 1, minWidth: '150px' }}
                                placeholder="🔍 ค้นหาหมวดหมู่..."
                                value={searchUser}
                                onChange={(e) => setSearchUser(e.target.value)}
                            />
                            <button className="btn" onClick={() => setShowAddCategory(true)}>+ เพิ่มหมวดหมู่</button>
                        </div>

                        <div className="admin-table-wrap">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>สี</th>
                                        <th>ชื่อหมวดหมู่</th>
                                        <th>จำนวนงาน</th>
                                        <th>จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {categories.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} style={{ textAlign: 'center', opacity: 0.45, padding: '2.5rem' }}>
                                                🏷️ ไม่มีหมวดหมู่
                                            </td>
                                        </tr>
                                    ) : categories.map((cat) => (
                                        <tr key={cat.id}>
                                            <td>
                                                <div className="category-dot" style={{ background: cat.color, width: '20px', height: '20px' }} />
                                            </td>
                                            <td><strong>{cat.name}</strong></td>
                                            <td>
                                                <span className="admin-task-count-pill">
                                                    {tasks.filter((t) => t.categoryId === cat.id).length} งาน
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                    <button className="btn-icon" title="แก้ไข" onClick={() => setEditingCategory(cat)}>✏️</button>
                                                    <button className="btn-icon" title="ลบ" style={{ color: 'var(--danger-color)' }} onClick={() => handleDeleteCategory(cat)}>🗑️</button>
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

            {showAddUser && <AddUserModal onClose={() => setShowAddUser(false)} onSave={handleAddUser} />}
            {editingUser && <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} onSave={handleSaveUser} />}
            {showAddTask && <AddTaskModal users={users} categories={categories} onClose={() => setShowAddTask(false)} onSave={handleAddTask} />}
            {editingTask && <EditTaskModal task={editingTask} users={users} categories={categories} onClose={() => setEditingTask(null)} onSave={handleSaveTask} />}
            {showAddCategory && <CategoryModal onClose={() => setShowAddCategory(false)} onSave={handleAddCategory} />}
            {editingCategory && <CategoryModal category={editingCategory} onClose={() => setEditingCategory(null)} onSave={handleSaveCategory} />}
        </div>
    );
};

export default AdminPanel;
