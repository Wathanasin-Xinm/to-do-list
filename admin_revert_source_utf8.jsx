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
} from '../services/adminService';
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
} from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy,
    useSortable,
    arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ΓöÇΓöÇΓöÇ Date Helpers ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
const formatDate = (val) => {
    if (!val) return 'ΓÇö';
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

// ΓöÇΓöÇΓöÇ Sortable Row Wrapper ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
const SortableRow = ({ id, children }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    return (
        <tr
            ref={setNodeRef}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
                opacity: isDragging ? 0.4 : 1,
            }}
        >
            <td style={{ width: '28px', cursor: 'grab', fontSize: '1.1rem', opacity: 0.4, userSelect: 'none' }}
                {...attributes} {...listeners} title="α╕Ñα╕▓α╕üα╣Çα╕₧α╕╖α╣êα╕¡α╣Çα╕úα╕╡α╕óα╕çα╕Ñα╕│α╕öα╕▒α╕Ü">
                Γá┐
            </td>
            {children}
        </tr>
    );
};

// ΓöÇΓöÇΓöÇ Modals ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
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
                <h3>Γ₧ò α╣Çα╕₧α╕┤α╣êα╕íα╕£α╕╣α╣ëα╣âα╕èα╣ëα╣âα╕½α╕íα╣ê</h3>
                <form className="modal-form" onSubmit={handleSubmit}>
                    <div>
                        <label className="modal-label">α╕èα╕╖α╣êα╕¡α╣Çα╕Ñα╣êα╕Ö</label>
                        <input className="input-field" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="α╕èα╕╖α╣êα╕¡α╣Çα╕Ñα╣êα╕Ö" />
                    </div>
                    <div>
                        <label className="modal-label">α╕¡α╕╡α╣Çα╕íα╕Ñ *</label>
                        <input className="input-field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" required />
                    </div>
                    <div>
                        <label className="modal-label">α╕úα╕½α╕▒α╕¬α╕£α╣êα╕▓α╕Ö * (α╕¡α╕óα╣êα╕▓α╕çα╕Öα╣ëα╕¡α╕ó 6 α╕òα╕▒α╕ºα╕¡α╕▒α╕üα╕⌐α╕ú)</label>
                        <input className="input-field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="α╕úα╕½α╕▒α╕¬α╕£α╣êα╕▓α╕Ö" required minLength={6} />
                    </div>
                    <div>
                        <label className="modal-label">α╕Üα╕ùα╕Üα╕▓α╕ù</label>
                        <select className="input-field" value={role} onChange={(e) => setRole(e.target.value)}>
                            <option value="user">user</option>
                            <option value="admin">admin</option>
                        </select>
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn btn-ghost" onClick={onClose}>α╕óα╕üα╣Çα╕Ñα╕┤α╕ü</button>
                        <button type="submit" className="btn" disabled={loading}>{loading ? 'ΓÅ│ α╕üα╕│α╕Ñα╕▒α╕çα╕¬α╕úα╣ëα╕▓α╕ç...' : 'Γ₧ò α╕¬α╕úα╣ëα╕▓α╕çα╕£α╕╣α╣ëα╣âα╕èα╣ë'}</button>
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
                <h3>Γ£Å∩╕Å α╣üα╕üα╣ëα╣äα╕éα╕£α╕╣α╣ëα╣âα╕èα╣ë</h3>
                <form className="modal-form" onSubmit={handleSubmit}>
                    <div>
                        <label className="modal-label">α╕èα╕╖α╣êα╕¡α╣Çα╕Ñα╣êα╕Ö</label>
                        <input className="input-field" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="α╕èα╕╖α╣êα╕¡α╣Çα╕Ñα╣êα╕Ö" />
                    </div>
                    <div>
                        <label className="modal-label">α╕¡α╕╡α╣Çα╕íα╕Ñ</label>
                        <input className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="α╕¡α╕╡α╣Çα╕íα╕Ñ" />
                    </div>
                    <div>
                        <label className="modal-label">α╕Üα╕ùα╕Üα╕▓α╕ù</label>
                        <select className="input-field" value={role} onChange={(e) => setRole(e.target.value)}>
                            <option value="user">user</option>
                            <option value="admin">admin</option>
                        </select>
                    </div>
                    <div>
                        <label className="modal-label">α╕úα╕½α╕▒α╕¬α╕£α╣êα╕▓α╕Öα╣âα╕½α╕íα╣ê (α╣Çα╕ºα╣ëα╕Öα╕ºα╣êα╕▓α╕çα╕ûα╣ëα╕▓α╣äα╕íα╣êα╕òα╣ëα╕¡α╕çα╕üα╕▓α╕úα╣Çα╕¢α╕Ñα╕╡α╣êα╕óα╕Ö)</label>
                        <input className="input-field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="α╕úα╕½α╕▒α╕¬α╕£α╣êα╕▓α╕Öα╣âα╕½α╕íα╣ê..." minLength={6} />
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn btn-ghost" onClick={onClose}>α╕óα╕üα╣Çα╕Ñα╕┤α╕ü</button>
                        <button type="submit" className="btn" disabled={loading}>{loading ? 'ΓÅ│ α╕üα╕│α╕Ñα╕▒α╕çα╕Üα╕▒α╕Öα╕ùα╕╢α╕ü...' : '≡ƒÆ╛ α╕Üα╕▒α╕Öα╕ùα╕╢α╕ü'}</button>
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
                <h3>Γ£Å∩╕Å α╣üα╕üα╣ëα╣äα╕éα╕çα╕▓α╕Ö</h3>
                <form className="modal-form" onSubmit={handleSubmit}>
                    <div>
                        <label className="modal-label">α╕èα╕╖α╣êα╕¡α╕çα╕▓α╕Ö</label>
                        <input className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="α╕èα╕╖α╣êα╕¡α╕çα╕▓α╕Ö" required />
                    </div>
                    <div>
                        <label className="modal-label">α╣Çα╕êα╣ëα╕▓α╕éα╕¡α╕ç</label>
                        <select className="input-field" value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
                            {users.map((u) => (
                                <option key={u.uid} value={u.uid}>{u.nickname || u.email}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="modal-label">α╕ºα╕▒α╕Öα╕äα╕úα╕Üα╕üα╕│α╕½α╕Öα╕ö</label>
                        <input type="date" className="input-field" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                    </div>
                    <label className="modal-check-label">
                        <input type="checkbox" checked={completed} onChange={(e) => setCompleted(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: 'var(--primary-color)' }} />
                        <span>α╣Çα╕¬α╕úα╣çα╕êα╣üα╕Ñα╣ëα╕º</span>
                    </label>
                    <div className="modal-actions">
                        <button type="button" className="btn btn-ghost" onClick={onClose}>α╕óα╕üα╣Çα╕Ñα╕┤α╕ü</button>
                        <button type="submit" className="btn" disabled={loading}>{loading ? 'ΓÅ│ α╕üα╕│α╕Ñα╕▒α╕çα╕Üα╕▒α╕Öα╕ùα╕╢α╕ü...' : '≡ƒÆ╛ α╕Üα╕▒α╕Öα╕ùα╕╢α╕ü'}</button>
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
                <h3>Γ₧ò α╣Çα╕₧α╕┤α╣êα╕íα╕çα╕▓α╕Ö</h3>
                <form className="modal-form" onSubmit={handleSubmit}>
                    <div>
                        <label className="modal-label">α╕èα╕╖α╣êα╕¡α╕çα╕▓α╕Ö</label>
                        <input className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="α╕èα╕╖α╣êα╕¡α╕çα╕▓α╕Ö..." autoFocus required />
                    </div>
                    <div>
                        <label className="modal-label">α╕íα╕¡α╕Üα╕½α╕íα╕▓α╕óα╣âα╕½α╣ë</label>
                        <select className="input-field" value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
                            {users.map((u) => (
                                <option key={u.uid} value={u.uid}>{u.nickname || u.email}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="modal-label">α╕ºα╕▒α╕Öα╕äα╕úα╕Üα╕üα╕│α╕½α╕Öα╕ö</label>
                        <input type="date" className="input-field" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn btn-ghost" onClick={onClose}>α╕óα╕üα╣Çα╕Ñα╕┤α╕ü</button>
                        <button type="submit" className="btn" disabled={loading}>{loading ? 'ΓÅ│ α╕üα╕│α╕Ñα╕▒α╕çα╣Çα╕₧α╕┤α╣êα╕í...' : 'Γ£à α╣Çα╕₧α╕┤α╣êα╕íα╕çα╕▓α╕Ö'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ΓöÇΓöÇΓöÇ Admin Panel ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
const PERIODS = [
    { key: 'all', label: 'α╕ùα╕▒α╣ëα╕çα╕½α╕íα╕ö' },
    { key: 'day', label: 'α╕úα╕▓α╕óα╕ºα╕▒α╕Ö' },
    { key: 'week', label: 'α╕úα╕▓α╕óα╕¬α╕▒α╕¢α╕öα╕▓α╕½α╣î' },
    { key: 'month', label: 'α╕úα╕▓α╕óα╣Çα╕öα╕╖α╕¡α╕Ö' },
    { key: 'year', label: 'α╕úα╕▓α╕óα╕¢α╕╡' },
];

const AdminPanel = () => {
    const [activeTab, setActiveTab] = useState('tasks');
    const [users, setUsers] = useState([]);
    const [tasks, setTasks] = useState([]);

    const [period, setPeriod] = useState('all');
    const [selectedUserIds, setSelectedUserIds] = useState([]);
    const [searchTask, setSearchTask] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    const [editingUser, setEditingUser] = useState(null);
    const [editingTask, setEditingTask] = useState(null);
    const [showAddTask, setShowAddTask] = useState(false);
    const [showAddUser, setShowAddUser] = useState(false);
    const [searchUser, setSearchUser] = useState('');

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    useEffect(() => {
        const unsub1 = subscribeToAllUsers(setUsers);
        const unsub2 = subscribeToAllTasksAdmin(setTasks);
        return () => { unsub1(); unsub2(); };
    }, []);

    const toggleUser = (uid) => setSelectedUserIds((prev) =>
        prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
    const selectAllUsers = () => setSelectedUserIds([]);
    const isAllSelected = selectedUserIds.length === 0;

    // ΓöÇΓöÇ Handlers: Users ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    const handleAddUser = async (data) => {
        try {
            await addUserAdmin(data);
            toast.success('α╕¬α╕úα╣ëα╕▓α╕çα╕£α╕╣α╣ëα╣âα╕èα╣ëα╕¬α╕│α╣Çα╕úα╣çα╕ê');
            setShowAddUser(false);
        } catch (err) {
            if (err.code === 'auth/email-already-in-use') {
                toast.error('α╕¡α╕╡α╣Çα╕íα╕Ñα╕Öα╕╡α╣ëα╕ûα╕╣α╕üα╣âα╕èα╣ëα╣üα╕Ñα╣ëα╕º');
            } else {
                toast.error('α╣Çα╕üα╕┤α╕öα╕éα╣ëα╕¡α╕£α╕┤α╕öα╕₧α╕Ñα╕▓α╕ö: ' + err.message);
            }
        }
    };

    const handleSaveUser = async (uid, data) => {
        try {
            await updateUserAdmin(uid, data);
            toast.success('α╕¡α╕▒α╕¢α╣Çα╕öα╕òα╕£α╕╣α╣ëα╣âα╕èα╣ëα╕¬α╕│α╣Çα╕úα╣çα╕ê');
            if (data.password) {
                toast.info('ΓÜá∩╕Å α╕üα╕▓α╕úα╣Çα╕¢α╕Ñα╕╡α╣êα╕óα╕Öα╕úα╕½α╕▒α╕¬α╕£α╣êα╕▓α╕Öα╕òα╣ëα╕¡α╕çα╣âα╕èα╣ë Firebase Admin SDK ΓÇö α╕Üα╕▒α╕Öα╕ùα╕╢α╕üα╕éα╣ëα╕¡α╕íα╕╣α╕Ñα╕¡α╕╖α╣êα╕Öα╣üα╕Ñα╣ëα╕º');
            }
            setEditingUser(null);
        } catch {
            toast.error('α╣Çα╕üα╕┤α╕öα╕éα╣ëα╕¡α╕£α╕┤α╕öα╕₧α╕Ñα╕▓α╕ö');
        }
    };

    const handleDeleteUser = async (u) => {
        if (!window.confirm(`α╕Ñα╕Üα╕£α╕╣α╣ëα╣âα╕èα╣ë "${u.nickname || u.email}" ?\n(α╕Ñα╕Üα╣Çα╕ëα╕₧α╕▓α╕░α╕éα╣ëα╕¡α╕íα╕╣α╕Ñα╣âα╕Ö Firestore)`)) return;
        try {
            await deleteUserAdmin(u.uid);
            toast.success('α╕Ñα╕Üα╕£α╕╣α╣ëα╣âα╕èα╣ëα╕¬α╕│α╣Çα╕úα╣çα╕ê');
        } catch {
            toast.error('α╣Çα╕üα╕┤α╕öα╕éα╣ëα╕¡α╕£α╕┤α╕öα╕₧α╕Ñα╕▓α╕ö');
        }
    };

    // ΓöÇΓöÇ Handlers: Tasks ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    const handleAddTask = async (data) => {
        try {
            await addTaskAdmin(data);
            toast.success('α╣Çα╕₧α╕┤α╣êα╕íα╕çα╕▓α╕Öα╕¬α╕│α╣Çα╕úα╣çα╕ê');
            setShowAddTask(false);
        } catch {
            toast.error('α╣Çα╕üα╕┤α╕öα╕éα╣ëα╕¡α╕£α╕┤α╕öα╕₧α╕Ñα╕▓α╕ö');
        }
    };

    const handleSaveTask = async (taskId, data) => {
        try {
            await updateTaskAdmin(taskId, data);
            toast.success('α╣üα╕üα╣ëα╣äα╕éα╕çα╕▓α╕Öα╕¬α╕│α╣Çα╕úα╣çα╕ê');
            setEditingTask(null);
        } catch {
            toast.error('α╣Çα╕üα╕┤α╕öα╕éα╣ëα╕¡α╕£α╕┤α╕öα╕₧α╕Ñα╕▓α╕ö');
        }
    };

    const handleDeleteTask = async (task) => {
        if (!window.confirm(`α╕Ñα╕Üα╕çα╕▓α╕Ö "${task.title}" ?`)) return;
        try {
            await deleteTaskAdmin(task.id);
            toast.success('α╕Ñα╕Üα╕çα╕▓α╕Öα╕¬α╕│α╣Çα╕úα╣çα╕ê');
        } catch {
            toast.error('α╣Çα╕üα╕┤α╕öα╕éα╣ëα╕¡α╕£α╕┤α╕öα╕₧α╕Ñα╕▓α╕ö');
        }
    };

    // ΓöÇΓöÇ Drag & Drop ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    const handleTaskDragEnd = useCallback(async ({ active, over }) => {
        if (!over || active.id === over.id) return;
        setTasks((prev) => {
            const oldIndex = prev.findIndex((t) => t.id === active.id);
            const newIndex = prev.findIndex((t) => t.id === over.id);
            const reordered = arrayMove(prev, oldIndex, newIndex);
            updateTaskOrderAdmin(reordered).catch(() => toast.error('α╣äα╕íα╣êα╕¬α╕▓α╕íα╕▓α╕úα╕ûα╕Üα╕▒α╕Öα╕ùα╕╢α╕üα╕üα╕▓α╕úα╣Çα╕úα╕╡α╕óα╕çα╕Ñα╕│α╕öα╕▒α╕Üα╣äα╕öα╣ë'));
            return reordered;
        });
    }, []);

    const handleUserDragEnd = useCallback(async ({ active, over }) => {
        if (!over || active.id === over.id) return;
        setUsers((prev) => {
            const oldIndex = prev.findIndex((u) => u.uid === active.id);
            const newIndex = prev.findIndex((u) => u.uid === over.id);
            const reordered = arrayMove(prev, oldIndex, newIndex);
            updateUserOrder(reordered).catch(() => toast.error('α╣äα╕íα╣êα╕¬α╕▓α╕íα╕▓α╕úα╕ûα╕Üα╕▒α╕Öα╕ùα╕╢α╕üα╕üα╕▓α╕úα╣Çα╕úα╕╡α╕óα╕çα╕Ñα╕│α╕öα╕▒α╕Üα╣äα╕öα╣ë'));
            return reordered;
        });
    }, []);

    // ΓöÇΓöÇ Filtered Tasks ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    const now = new Date();
    const filteredTasks = useMemo(() => {
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tasks, selectedUserIds, period, searchTask, filterStatus]);

    const filteredUsers = useMemo(() => {
        if (!searchUser) return users;
        return users.filter(
            (u) =>
                u.nickname?.toLowerCase().includes(searchUser.toLowerCase()) ||
                u.email?.toLowerCase().includes(searchUser.toLowerCase())
        );
    }, [users, searchUser]);

    const stats = [
        { label: 'α╕£α╕╣α╣ëα╣âα╕èα╣ëα╕ùα╕▒α╣ëα╕çα╕½α╕íα╕ö', value: users.length, icon: '≡ƒæÑ', color: '#6c5ce7' },
        { label: 'α╕çα╕▓α╕Öα╕ùα╕▒α╣ëα╕çα╕½α╕íα╕ö', value: tasks.length, icon: '≡ƒôï', color: '#0984e3' },
        { label: 'α╕çα╕▓α╕Öα╣Çα╕¬α╕úα╣çα╕êα╣üα╕Ñα╣ëα╕º', value: tasks.filter((t) => t.completed).length, icon: 'Γ£à', color: '#00b894' },
        { label: 'α╕çα╕▓α╕Öα╕äα╣ëα╕▓α╕çα╕¡α╕óα╕╣α╣ê', value: tasks.filter((t) => !t.completed).length, icon: 'ΓÅ│', color: '#e17055' },
    ];

    return (
        <div className="admin-layout">
            {/* Header */}
            <header className="admin-header-bar">
                <div className="admin-header-left">
                    <div className="admin-header-icon">≡ƒ¢í∩╕Å</div>
                    <div>
                        <h1 className="admin-header-title">Admin Panel</h1>
                        <p className="admin-header-sub">α╕êα╕▒α╕öα╕üα╕▓α╕úα╕úα╕░α╕Üα╕Ü To-Do List</p>
                    </div>
                </div>
                <Link to="/" className="btn btn-outline-white">ΓåÉ α╕üα╕Ñα╕▒α╕Ü Dashboard</Link>
            </header>

            <div className="admin-content">
                {/* Stat Cards */}
                <div className="admin-stats-grid">
                    {stats.map((s) => (
                        <div key={s.label} className="admin-stat-card">
                            <div className="admin-stat-icon" style={{ background: s.color + '20', color: s.color }}>{s.icon}</div>
                            <div className="admin-stat-value" style={{ color: s.color }}>{s.value}</div>
                            <div className="admin-stat-label">{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Tabs */}
                <div className="admin-tab-bar">
                    <button className={`admin-tab-btn${activeTab === 'tasks' ? ' active' : ''}`} onClick={() => setActiveTab('tasks')}>
                        ≡ƒôï α╕êα╕▒α╕öα╕üα╕▓α╕úα╕çα╕▓α╕Ö <span className="admin-tab-count">{tasks.length}</span>
                    </button>
                    <button className={`admin-tab-btn${activeTab === 'users' ? ' active' : ''}`} onClick={() => setActiveTab('users')}>
                        ≡ƒæÑ α╕êα╕▒α╕öα╕üα╕▓α╕úα╕£α╕╣α╣ëα╣âα╕èα╣ë <span className="admin-tab-count">{users.length}</span>
                    </button>
                </div>

                {/* Tasks Tab */}
                {activeTab === 'tasks' && (
                    <div className="admin-panel-body">
                        <div className="admin-filters-row">
                            <div className="admin-filter-group">
                                <span className="admin-filter-label">≡ƒôà α╕èα╣êα╕ºα╕çα╣Çα╕ºα╕Ñα╕▓</span>
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
                                <span className="admin-filter-label">≡ƒöû α╕¬α╕ûα╕▓α╕Öα╕░</span>
                                <div className="admin-period-tabs">
                                    {[['all', 'α╕ùα╕▒α╣ëα╕çα╕½α╕íα╕ö'], ['pending', 'ΓÅ│ α╕äα╣ëα╕▓α╕ç'], ['done', 'Γ£à α╣Çα╕¬α╕úα╣çα╕ê']].map(([k, label]) => (
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
                                    <span>≡ƒæñ α╕üα╕úα╕¡α╕çα╕£α╕╣α╣ëα╣âα╕èα╣ë</span>
                                    <button className="admin-checklist-all-btn" onClick={selectAllUsers}>
                                        {isAllSelected ? 'Γ£ô α╕ùα╕╕α╕üα╕äα╕Ö' : 'α╕ùα╕╕α╕üα╕äα╕Ö'}
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

                            {/* Task table */}
                            <div className="admin-task-main">
                                <div className="admin-toolbar">
                                    <input
                                        className="input-field"
                                        style={{ flex: 1, minWidth: '150px' }}
                                        placeholder="≡ƒöì α╕äα╣ëα╕Öα╕½α╕▓α╕çα╕▓α╕Ö..."
                                        value={searchTask}
                                        onChange={(e) => setSearchTask(e.target.value)}
                                    />
                                    <button className="btn" onClick={() => setShowAddTask(true)}>+ α╣Çα╕₧α╕┤α╣êα╕íα╕çα╕▓α╕Ö</button>
                                </div>

                                <div className="admin-result-info">
                                    {selectedUserIds.length > 0 && (
                                        <span className="admin-selection-badge">
                                            α╣Çα╕Ñα╕╖α╕¡α╕ü {selectedUserIds.length} α╕äα╕Ö ┬╖{' '}
                                            <button className="admin-clear-btn" onClick={selectAllUsers}>α╕Ñα╣ëα╕▓α╕ç</button>
                                        </span>
                                    )}
                                    <span className="admin-count-text">α╣üα╕¬α╕öα╕ç {filteredTasks.length} α╕úα╕▓α╕óα╕üα╕▓α╕ú</span>
                                    <span style={{ fontSize: '0.75rem', opacity: 0.5, marginLeft: '0.5rem' }}>Γá┐ α╕Ñα╕▓α╕üα╣Çα╕₧α╕╖α╣êα╕¡α╣Çα╕úα╕╡α╕óα╕ç</span>
                                </div>

                                <div className="admin-table-wrap">
                                    <DndContext
                                        sensors={sensors}
                                        collisionDetection={closestCenter}
                                        onDragEnd={handleTaskDragEnd}
                                    >
                                        <SortableContext items={filteredTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                                            <table className="admin-table">
                                                <thead>
                                                    <tr>
                                                        <th style={{ width: '28px' }}></th>
                                                        <th>α╕èα╕╖α╣êα╕¡α╕çα╕▓α╕Ö</th>
                                                        <th>α╣Çα╕êα╣ëα╕▓α╕éα╕¡α╕ç</th>
                                                        <th>α╕äα╕úα╕Üα╕üα╕│α╕½α╕Öα╕ö</th>
                                                        <th>α╕¬α╕ûα╕▓α╕Öα╕░</th>
                                                        <th>α╕êα╕▒α╕öα╕üα╕▓α╕ú</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredTasks.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={6} style={{ textAlign: 'center', opacity: 0.45, padding: '2.5rem' }}>
                                                                ≡ƒô¡ α╣äα╕íα╣êα╕íα╕╡α╕çα╕▓α╕Öα╣âα╕Öα╕èα╣êα╕ºα╕çα╕Öα╕╡α╣ë
                                                            </td>
                                                        </tr>
                                                    ) : filteredTasks.map((task) => (
                                                        <SortableRow key={task.id} id={task.id}>
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
                                                                    {task.ownerNickname || task.ownerEmail || 'ΓÇö'}
                                                                </div>
                                                            </td>
                                                            <td>{task.dueDate ? new Date(task.dueDate).toLocaleDateString('th-TH') : 'ΓÇö'}</td>
                                                            <td>
                                                                <span className={`admin-status-badge ${task.completed ? 'done' : 'pending'}`}>
                                                                    {task.completed ? 'Γ£à α╣Çα╕¬α╕úα╣çα╕ê' : 'ΓÅ│ α╕äα╣ëα╕▓α╕ç'}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                                    <button className="btn-icon" title="α╣üα╕üα╣ëα╣äα╕é" onClick={() => setEditingTask(task)}>Γ£Å∩╕Å</button>
                                                                    <button className="btn-icon" title="α╕Ñα╕Ü" style={{ color: 'var(--danger-color)' }} onClick={() => handleDeleteTask(task)}>≡ƒùæ∩╕Å</button>
                                                                </div>
                                                            </td>
                                                        </SortableRow>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </SortableContext>
                                    </DndContext>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Users Tab */}
                {activeTab === 'users' && (
                    <div className="admin-panel-body">
                        <div className="admin-toolbar">
                            <input
                                className="input-field"
                                style={{ flex: 1, minWidth: '150px' }}
                                placeholder="≡ƒöì α╕äα╣ëα╕Öα╕½α╕▓α╕£α╕╣α╣ëα╣âα╕èα╣ë..."
                                value={searchUser}
                                onChange={(e) => setSearchUser(e.target.value)}
                            />
                            <button className="btn" onClick={() => setShowAddUser(true)}>+ α╣Çα╕₧α╕┤α╣êα╕íα╕£α╕╣α╣ëα╣âα╕èα╣ë</button>
                        </div>

                        <div style={{ fontSize: '0.75rem', opacity: 0.5, marginBottom: '0.5rem', textAlign: 'right' }}>Γá┐ α╕Ñα╕▓α╕üα╣Çα╕₧α╕╖α╣êα╕¡α╣Çα╕úα╕╡α╕óα╕çα╕Ñα╕│α╕öα╕▒α╕Üα╕£α╕╣α╣ëα╣âα╕èα╣ë</div>

                        <div className="admin-table-wrap">
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleUserDragEnd}
                            >
                                <SortableContext items={filteredUsers.map((u) => u.uid)} strategy={verticalListSortingStrategy}>
                                    <table className="admin-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '28px' }}></th>
                                                <th>α╕£α╕╣α╣ëα╣âα╕èα╣ë</th>
                                                <th>α╕¡α╕╡α╣Çα╕íα╕Ñ</th>
                                                <th>α╕Üα╕ùα╕Üα╕▓α╕ù</th>
                                                <th>α╕çα╕▓α╕Ö</th>
                                                <th>α╕¬α╕íα╕▒α╕äα╕úα╣Çα╕íα╕╖α╣êα╕¡</th>
                                                <th>α╕êα╕▒α╕öα╕üα╕▓α╕ú</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredUsers.length === 0 ? (
                                                <tr>
                                                    <td colSpan={7} style={{ textAlign: 'center', opacity: 0.45, padding: '2.5rem' }}>
                                                        ≡ƒæñ α╣äα╕íα╣êα╕íα╕╡α╕£α╕╣α╣ëα╣âα╕èα╣ë
                                                    </td>
                                                </tr>
                                            ) : filteredUsers.map((u) => (
                                                <SortableRow key={u.uid} id={u.uid}>
                                                    <td>
                                                        <div className="admin-user-cell">
                                                            <span className="admin-user-avatar" style={{ background: u.color || '#6c5ce7' }}>
                                                                {(u.nickname || u.email || '?')[0].toUpperCase()}
                                                            </span>
                                                            <strong>{u.nickname || 'ΓÇö'}</strong>
                                                        </div>
                                                    </td>
                                                    <td style={{ fontSize: '0.82rem', opacity: 0.75 }}>{u.email}</td>
                                                    <td>
                                                        <span className={`admin-role-badge ${u.role === 'admin' ? 'admin' : 'user'}`}>{u.role}</span>
                                                    </td>
                                                    <td>
                                                        <span className="admin-task-count-pill">{tasks.filter((t) => t.ownerId === u.uid).length} α╕çα╕▓α╕Ö</span>
                                                    </td>
                                                    <td style={{ fontSize: '0.82rem' }}>{formatDate(u.createdAt)}</td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                            <button className="btn-icon" title="α╣üα╕üα╣ëα╣äα╕é" onClick={() => setEditingUser(u)}>Γ£Å∩╕Å</button>
                                                            <button className="btn-icon" title="α╕Ñα╕Ü" style={{ color: 'var(--danger-color)' }} onClick={() => handleDeleteUser(u)}>≡ƒùæ∩╕Å</button>
                                                        </div>
                                                    </td>
                                                </SortableRow>
                                            ))}
                                        </tbody>
                                    </table>
                                </SortableContext>
                            </DndContext>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            {showAddUser && <AddUserModal onClose={() => setShowAddUser(false)} onSave={handleAddUser} />}
            {editingUser && <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} onSave={handleSaveUser} />}
            {showAddTask && <AddTaskModal users={users} onClose={() => setShowAddTask(false)} onSave={handleAddTask} />}
            {editingTask && <EditTaskModal task={editingTask} users={users} onClose={() => setEditingTask(null)} onSave={handleSaveTask} />}
        </div>
    );
};

export default AdminPanel;
