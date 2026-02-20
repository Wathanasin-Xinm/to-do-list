import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import {
    subscribeToTasks,
    subscribeToAllTasks,
    addTask,
    toggleTaskCompletion,
    deleteTask,
    updateTask,
    updateTaskOrder,
    subscribeToCategories,
    addCategory,
} from '../services/taskService';
import { logoutUser } from '../services/authService';
import { toast } from 'react-toastify';
import { Doughnut } from 'react-chartjs-2';
import 'chart.js/auto';
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

const DEFAULT_CATEGORIES = [
    { name: '🚨 เร่งด่วน', color: '#c0392b' }, // Darker Red
    { name: '⚠️ จำเป็นต้องทำ', color: '#d35400' }, // Darker Orange
    { name: '📝 ต้องทำ', color: '#2980b9' }, // Darker Blue
    { name: '🍃 ทำก็ได้ไม่ทำก็ได้', color: '#27ae60' }, // Darker Green
    { name: '🧊 ไม่จำเป็นต้องทำ', color: '#7f8c8d' }, // Darker Gray
];

// ─── Date Helpers ─────────────────────────────────────────────────────────────
const isoToday = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const isoNow = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const getWeekStart = (date) => {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay());
    return d;
};

const addDays = (dateStr, n) => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
};

const addWeeks = (dateStr, n) => addDays(dateStr, n * 7);

const addMonths = (dateStr, n) => {
    const d = new Date(dateStr);
    d.setMonth(d.getMonth() + n);
    return d.toISOString().slice(0, 10);
};

const addYears = (dateStr, n) => {
    const d = new Date(dateStr);
    d.setFullYear(d.getFullYear() + n);
    return d.toISOString().slice(0, 10);
};

const getRangeForPeriod = (period, anchor) => {
    if (period === 'all') return null;
    const a = new Date(anchor);
    if (period === 'day') {
        return {
            start: new Date(a.getFullYear(), a.getMonth(), a.getDate(), 0, 0, 0),
            end: new Date(a.getFullYear(), a.getMonth(), a.getDate(), 23, 59, 59, 999),
        };
    }
    if (period === 'week') {
        const ws = getWeekStart(a);
        const we = new Date(ws); we.setDate(ws.getDate() + 6); we.setHours(23, 59, 59, 999);
        return { start: ws, end: we };
    }
    if (period === 'month') {
        return {
            start: new Date(a.getFullYear(), a.getMonth(), 1),
            end: new Date(a.getFullYear(), a.getMonth() + 1, 0, 23, 59, 59, 999),
        };
    }
    if (period === 'year') {
        return {
            start: new Date(a.getFullYear(), 0, 1),
            end: new Date(a.getFullYear(), 11, 31, 23, 59, 59, 999),
        };
    }
    return null;
};

const navigateAnchor = (period, anchor, dir) => {
    if (period === 'day') return addDays(anchor, dir);
    if (period === 'week') return addWeeks(anchor, dir);
    if (period === 'month') return addMonths(anchor, dir);
    if (period === 'year') return addYears(anchor, dir);
    return anchor;
};

const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const TH_MONTHS_FULL = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

const getPeriodLabel = (period, anchor) => {
    if (period === 'all') return 'ทุกช่วงเวลา';
    const d = new Date(anchor);
    const buddhistYear = d.getFullYear() + 543;
    if (period === 'day') return `${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${buddhistYear}`;
    if (period === 'week') {
        const ws = getWeekStart(d);
        const we = new Date(ws); we.setDate(ws.getDate() + 6);
        return `${ws.getDate()} ${TH_MONTHS[ws.getMonth()]} – ${we.getDate()} ${TH_MONTHS[we.getMonth()]} ${buddhistYear}`;
    }
    if (period === 'month') return `${TH_MONTHS_FULL[d.getMonth()]} ${buddhistYear}`;
    if (period === 'year') return `ปี ${buddhistYear}`;
    return '';
};

const PERIOD_LABELS = { all: 'ทั้งหมด', day: 'รายวัน', week: 'รายสัปดาห์', month: 'รายเดือน', year: 'รายปี' };

const formatDueDate = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return `${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
};

// ─── Expiration Helper ────────────────────────────────────────────────────────
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

// ─── Expiration Badge ─────────────────────────────────────────────────────────
const ExpirationBadge = ({ task, nowMs }) => {
    const status = getExpirationStatus(task, nowMs);
    if (!status) return null;

    const exAt = getExpiresAtMs(task);

    if (status === 'expired') {
        return (
            <span className="expire-badge expire-badge--expired" title={`หมดเมื่อ ${formatFullThaiDateTime(exAt)}`}>
                🔴 หมดเมื่อ {formatFullThaiDateTime(exAt)}
            </span>
        );
    }
    
    // active status
    const remaining = exAt - nowMs;
    return (
        <span className="expire-badge expire-badge--countdown">
            ⏳ จะหมดเวลาในอีก {formatTimeRemaining(remaining)}
        </span>
    );
};

// ─── Edit Modal ───────────────────────────────────────────────────────────────
const EditModal = ({ task, categories, onClose, onSave }) => {
    const [title, setTitle] = useState(task.title || '');
    const [dueDate, setDueDate] = useState(task.dueDate || '');
    const [dueTime, setDueTime] = useState(task.dueTime || '');
    const [categoryId, setCategoryId] = useState(task.categoryId || '');
    
    const [isTimeLimited, setIsTimeLimited] = useState(!!task.expiresAt);
    const [expiresAtDate, setExpiresAtDate] = useState('');
    const [expiresAtTime, setExpiresAtTime] = useState('');
    const [expirationMode, setExpirationMode] = useState(task.expirationMode || 'A');

    useEffect(() => {
        if (task.expiresAt) {
            const d = new Date(task.expiresAt);
            setExpiresAtDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
            setExpiresAtTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
        }
    }, [task]);

    const isExpired = useMemo(() => {
        if (!task.expiresAt) return false;
        return new Date(task.expiresAt).getTime() <= Date.now();
    }, [task]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isExpired) return;
        if (!title.trim()) return;

        let finalExpiresAt = null;
        if (isTimeLimited && expiresAtDate && expiresAtTime) {
            finalExpiresAt = new Date(`${expiresAtDate}T${expiresAtTime}`).toISOString();
        }

        onSave(task.id, { 
            title: title.trim(), 
            dueDate, 
            dueTime, 
            categoryId,
            expiresAt: isTimeLimited ? finalExpiresAt : null,
            expirationMode: isTimeLimited ? expirationMode : null
        });
    };

    if (isExpired) {
        return (
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                    <h3>🔴 งานนี้หมดเวลาแล้ว</h3>
                    <p style={{marginBottom: '1rem'}}>ไม่สามารถแก้ไขรายละเอียดได้ คุณสามารถลบงานนี้ได้เท่านั้น</p>
                    <div className="modal-actions">
                         <button type="button" className="btn" onClick={onClose}>ปิด</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                <h3>✏️ แก้ไขงาน</h3>
                <form className="modal-form" onSubmit={handleSubmit}>
                    <input
                        className="input-field"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="ชื่องาน..."
                        autoFocus
                    />
                    <select className="input-field" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                        <option value="">ไม่มีหมวดหมู่</option>
                        {categories.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input type="date" className="input-field" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={{ flex: 1 }} />
                        <input type="time" className="input-field" value={dueTime} onChange={(e) => setDueTime(e.target.value)} style={{ flex: 1 }} />
                    </div>

                    <div style={{marginTop: '0.5rem', borderTop: '1px solid #eee', paddingTop: '0.5rem'}}>
                        <label className="expire-toggle-label">
                            <input
                                type="checkbox"
                                checked={isTimeLimited}
                                onChange={(e) => setIsTimeLimited(e.target.checked)}
                                style={{ accentColor: 'var(--primary-color)' }}
                            />
                            <span>⏱ ตั้งเวลาหมดอายุ</span>
                        </label>

                        {isTimeLimited && (
                            <div className="expire-fields">
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                                    <input
                                        type="date"
                                        className="input-field"
                                        value={expiresAtDate}
                                        onChange={(e) => setExpiresAtDate(e.target.value)}
                                        required={isTimeLimited}
                                        style={{ flex: 1 }}
                                    />
                                    <input
                                        type="time"
                                        className="input-field"
                                        value={expiresAtTime}
                                        onChange={(e) => setExpiresAtTime(e.target.value)}
                                        required={isTimeLimited}
                                        style={{ flex: 1 }}
                                    />
                                </div>
                                <div className="expire-mode-row">
                                    <label className="expire-mode-option">
                                        <input type="radio" value="A" checked={expirationMode === 'A'} onChange={() => setExpirationMode('A')} />
                                        <span>A — แจ้งเตือน</span>
                                    </label>
                                    <label className="expire-mode-option">
                                        <input type="radio" value="B" checked={expirationMode === 'B'} onChange={() => setExpirationMode('B')} />
                                        <span>B — ลบอัตโนมัติ</span>
                                    </label>
                                </div>
                            </div>
                        )}
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

// ─── Sortable Task Item ───────────────────────────────────────────────────────
const SortableTaskItem = ({ task, categories, nowMs, onToggle, onDelete, onEdit }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
    const category = categories?.find(c => c.id === task.categoryId);
    const isExpired = getExpirationStatus(task, nowMs) === 'expired';

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    };

    return (
        <li
            ref={setNodeRef}
            style={style}
            className={`task-item${task.completed ? ' completed' : ''} ${isExpired ? ' expired-item' : ''}`}
        >
            <span
                className="drag-handle"
                {...attributes}
                {...listeners}
                title="ลากเพื่อเรียงลำดับ"
            >⠿</span>
            <div className="task-left">
                <input
                    type="checkbox"
                    className="task-checkbox"
                    checked={task.completed}
                    onChange={() => onToggle(task.id, task.completed)}
                    disabled={isExpired && !task.completed}
                    title={isExpired && !task.completed ? "งานหมดเวลาแล้ว" : ""}
                />
                <div className="task-info">
                    <div className={`task-title${task.completed ? ' done' : ''}`}>
                        {task.title}
                        {category && (
                            <span className="category-tag" style={{ background: category.color + '20', color: category.color, border: `1px solid ${category.color}40` }}>
                                <span className="category-dot" style={{ background: category.color }} />
                                {category.name}
                            </span>
                        )}
                        {task.expirationMode === 'B' && !task.completed && (
                            <span className="category-tag" style={{ background: '#d6303120', color: '#d63031', border: `1px solid #d6303140` }}>
                                🗑️ ลบอัตโนมัติ
                            </span>
                        )}
                        <ExpirationBadge task={task} nowMs={nowMs} />
                    </div>
                    <div className="task-meta">
                        {task.ownerNickname || task.ownerEmail}
                        {task.dueDate && (
                            <span style={{ marginLeft: '0.5rem' }}>
                                📅 {formatDueDate(task.dueDate)}
                                {task.dueTime && ` ${task.dueTime}`}
                            </span>
                        )}
                    </div>
                </div>
            </div>
            <div className="task-actions">
                <button className="btn-icon" title="แก้ไข" onClick={() => onEdit(task)}>✏️</button>
                <button className="btn-icon" title="ลบ" style={{ color: 'var(--danger-color)' }} onClick={() => onDelete(task)}>🗑️</button>
            </div>
        </li>
    );
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
const Dashboard = () => {
    const { user, userData } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskDate, setNewTaskDate] = useState('');
    const [newTaskTime, setNewTaskTime] = useState('');
    const [newCategoryId, setNewCategoryId] = useState('');
    const [categories, setCategories] = useState([]);
    const [categoryFilters, setCategoryFilters] = useState([]);
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const [timeLimited, setTimeLimited] = useState(false);
    const [expirationDate, setExpirationDate] = useState('');
    const [expirationTime, setExpirationTime] = useState('');
    const [expirationMode, setExpirationMode] = useState('A');
    const [filter, setFilter] = useState('all');
    const [period, setPeriod] = useState('all');
    const [anchor, setAnchor] = useState(isoToday());
    const [editingTask, setEditingTask] = useState(null);
    const [activeId, setActiveId] = useState(null);
    const [nowMs, setNowMs] = useState(Date.now());

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    // ── Filtering & Analytics ──────────────────────────────────────────────────
    const range = useMemo(() => getRangeForPeriod(period, anchor), [period, anchor]);

    const periodFiltered = useMemo(() => {
        return tasks.filter((task) => {
            if (!range) return true;
            if (!task.dueDate) return false;
            const due = new Date(task.dueDate);
            return due >= range.start && due <= range.end;
        });
    }, [tasks, range]);

    const graphTasks = periodFiltered;

    const filteredTasks = useMemo(() => {
        return periodFiltered.filter((task) => {
            const isExpired = getExpirationStatus(task, nowMs) === 'expired';
            
            let matchStatus = true;
            if (filter === 'active') matchStatus = !task.completed && !isExpired;
            else if (filter === 'completed') matchStatus = task.completed;
            else if (filter === 'expired') matchStatus = isExpired && !task.completed;
            
            let matchCategory = true;
            if (categoryFilters.length > 0) {
                const hasNoCategory = !task.categoryId;
                const isUncategorizedSelected = categoryFilters.includes('uncategorized');
                if (hasNoCategory) matchCategory = isUncategorizedSelected;
                else matchCategory = categoryFilters.includes(task.categoryId);
            }
            
            return matchStatus && matchCategory;
        });
    }, [periodFiltered, filter, categoryFilters, nowMs]);

    const graphExpired = useMemo(() => graphTasks.filter((t) => !t.completed && getExpirationStatus(t, nowMs) === 'expired').length, [graphTasks, nowMs]);
    const graphCompleted = useMemo(() => graphTasks.filter((t) => t.completed).length, [graphTasks]);
    const graphTotal = graphTasks.length;
    const graphActive = graphTotal - graphCompleted - graphExpired;

    // Tick clock every second for countdown
    useEffect(() => {
        const timer = setInterval(() => setNowMs(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Auto-delete expired Mode-B tasks
    useEffect(() => {
        const check = async () => {
            const now = Date.now();
            const toDelete = tasks.filter((t) => {
                if (t.expirationMode !== 'B' || !t.expiresAt) return false;
                return new Date(t.expiresAt).getTime() <= now;
            });
            for (const t of toDelete) {
                try { await deleteTask(t.id); } catch { /* ignore */ }
            }
        };
        check();
        const interval = setInterval(check, 30000);
        return () => clearInterval(interval);
    }, [tasks]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsCategoryDropdownOpen(false);
            }
        };
        if (isCategoryDropdownOpen) document.addEventListener('mousedown', handleClickOutside);
        else document.removeEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isCategoryDropdownOpen]);

    useEffect(() => {
        let unsubscribe;
        if (userData?.role === 'admin') {
            unsubscribe = subscribeToAllTasks(setTasks);
        } else {
            unsubscribe = subscribeToTasks(user, setTasks);
        }
        const unsubCat = subscribeToCategories(user, setCategories);
        return () => {
            unsubscribe && unsubscribe();
            unsubCat();
        };
    }, [user, userData]);

    // Seed default categories
    useEffect(() => {
        const timer = setTimeout(() => {
            if (user && categories.length === 0) {
                 DEFAULT_CATEGORIES.forEach(c => addCategory(c, user));
            }
        }, 2000);
        return () => clearTimeout(timer);
    }, [user, categories.length]);

    const handlePeriodChange = (p) => { setPeriod(p); setAnchor(isoToday()); };
    const handleNavigate = (dir) => setAnchor((prev) => navigateAnchor(period, prev, dir));
    const handleToday = () => setAnchor(isoToday());

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;

        let expiresAt = null;
        if (timeLimited && expirationDate && expirationTime) {
            expiresAt = new Date(`${expirationDate}T${expirationTime}`).toISOString();
        }

        try {
            await addTask({
                title: newTaskTitle.trim(),
                description: '',
                dueDate: newTaskDate || isoToday(),
                dueTime: newTaskTime || isoNow(),
                ownerNickname: userData?.nickname || '',
                categoryId: newCategoryId,
                expiresAt,
                expirationMode: timeLimited ? expirationMode : null,
            }, user);
            setNewTaskTitle('');
            setNewTaskDate('');
            setNewTaskTime('');
            setNewCategoryId('');
            setTimeLimited(false);
            setExpirationDate('');
            setExpirationTime('');
            toast.success('เพิ่มงานสำเร็จ');
        } catch {
            toast.error('เกิดข้อผิดพลาดในการเพิ่มงาน');
        }
    };

    const handleToggle = async (taskId, status) => {
        try { await toggleTaskCompletion(taskId, status); }
        catch { toast.error('ไม่มีสิทธิ์แก้ไขงานนี้'); }
    };

    const handleDelete = async (taskData) => {
        try {
            await deleteTask(taskData.id);
            toast.success('ลบงานสำเร็จ');
        } catch {
            toast.error('ไม่มีสิทธิ์ลบงานนี้');
        }
    };

    const handleSaveEdit = async (taskId, data) => {
        try {
            await updateTask(taskId, data);
            toast.success('แก้ไขงานสำเร็จ');
            setEditingTask(null);
        } catch {
            toast.error('เกิดข้อผิดพลาดในการแก้ไข');
        }
    };

    // ── Drag & Drop Handlers for @dnd-kit ──
    const handleDragStart = ({ active }) => setActiveId(active.id);

    const handleDragEnd = useCallback(async ({ active, over }) => {
        setActiveId(null);
        if (!over || active.id === over.id) return;

        setTasks((prev) => {
            const oldIndex = prev.findIndex((t) => t.id === active.id);
            const newIndex = prev.findIndex((t) => t.id === over.id);
            const reordered = arrayMove(prev, oldIndex, newIndex);
            updateTaskOrder(reordered).catch(() => toast.error('ไม่สามารถบันทึกการเรียงลำดับได้'));
            return reordered;
        });
    }, []);

    const chartData = {
        labels: ['เสร็จแล้ว', 'ยังค้างอยู่', 'หมดเวลา'],
        datasets: [{
            data: [graphCompleted, graphActive, graphExpired],
            backgroundColor: ['#00b894', '#bedbf5e3', '#ff7675'],
            borderWidth: 0,
        }],
    };

    const displayName = userData?.nickname || user?.email || '';
    const isToday = anchor === isoToday();
    const activeTask = tasks.find((t) => t.id === activeId);

    return (
        <div className="container">
            <header className="dashboard-header">
                <div>
                    <h1>📋 สวัสดี, {displayName}!</h1>
                    <div style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '0.15rem' }}>
                        {userData?.role === 'admin' ? '🛡️ ผู้ดูแลระบบ' : '👤 ผู้ใช้ทั่วไป'}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {userData?.role === 'admin' && (
                        <Link to="/admin" className="btn" style={{ background: 'rgba(108,92,231,0.15)', color: 'var(--primary-color)', textDecoration: 'none' }}>
                            🛡️ Admin
                        </Link>
                    )}
                    <Link to="/profile" className="btn" style={{ background: 'rgba(59, 184, 147, 1)', textDecoration: 'none' }}>
                        👤 โปรไฟล์
                    </Link>
                    <button onClick={logoutUser} className="btn" style={{ background: 'var(--danger-color)' }}>
                        ออกจากระบบ
                    </button>
                </div>
            </header>

            <div className="dashboard-grid">
                <section className="glass-panel" style={{ padding: '1.5rem' }}>
                    <form onSubmit={handleAdd} className="add-task-form-wrap">
                        <div className="add-task-row">
                            <input
                                className="input-field"
                                value={newTaskTitle}
                                onChange={(e) => setNewTaskTitle(e.target.value)}
                                placeholder="เพิ่มงานใหม่..."
                            />
                            <input
                                type="date"
                                className="add-task-date"
                                value={newTaskDate}
                                onChange={(e) => setNewTaskDate(e.target.value)}
                                title="วันครบกำหนด"
                            />
                            <input
                                type="time"
                                className="add-task-date"
                                value={newTaskTime}
                                onChange={(e) => setNewTaskTime(e.target.value)}
                                title="เวลาครบกำหนด"
                            />
                            <select
                                className="add-task-date"
                                value={newCategoryId}
                                onChange={(e) => setNewCategoryId(e.target.value)}
                                style={{ width: 'auto', minWidth: '100px' }}
                            >
                                <option value="">🏷️ หมวดหมู่</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            <button type="submit" className="btn">+ เพิ่ม</button>
                        </div>

                        <label className="expire-toggle-label">
                            <input
                                type="checkbox"
                                checked={timeLimited}
                                onChange={(e) => setTimeLimited(e.target.checked)}
                                style={{ accentColor: 'var(--primary-color)' }}
                            />
                            <span>⏱ ตั้งเวลาหมดอายุ</span>
                        </label>

                        {timeLimited && (
                            <div className="expire-fields">
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                                    <input
                                        type="date"
                                        className="input-field"
                                        value={expirationDate}
                                        onChange={(e) => setExpirationDate(e.target.value)}
                                        required={timeLimited}
                                        style={{ flex: 1, minWidth: '130px' }}
                                        placeholder="วันหมดอายุ"
                                    />
                                    <input
                                        type="time"
                                        className="input-field"
                                        value={expirationTime}
                                        onChange={(e) => setExpirationTime(e.target.value)}
                                        required={timeLimited}
                                        style={{ flex: 1, minWidth: '100px' }}
                                    />
                                </div>
                                <div className="expire-mode-row">
                                    <label className="expire-mode-option">
                                        <input type="radio" value="A" checked={expirationMode === 'A'} onChange={() => setExpirationMode('A')} />
                                        <span>A — แจ้งเตือน</span>
                                    </label>
                                    <label className="expire-mode-option">
                                        <input type="radio" value="B" checked={expirationMode === 'B'} onChange={() => setExpirationMode('B')} />
                                        <span>B — ลบอัตโนมัติ</span>
                                    </label>
                                </div>
                            </div>
                        )}
                    </form>

                    <div className="period-tabs">
                        {Object.entries(PERIOD_LABELS).map(([key, label]) => (
                            <button
                                key={key}
                                className={`period-tab${period === key ? ' active' : ''}`}
                                onClick={() => handlePeriodChange(key)}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {period !== 'all' && (
                        <div className="date-navigator">
                            <button className="date-nav-btn" onClick={() => handleNavigate(-1)} title="ก่อนหน้า">‹</button>
                            <span className="date-nav-label">{getPeriodLabel(period, anchor)}</span>
                            <button className="date-nav-btn" onClick={() => handleNavigate(1)} title="ถัดไป">›</button>
                            {!isToday && (
                                <button className="date-nav-today" onClick={handleToday}>วันนี้</button>
                            )}
                        </div>
                    )}

                    <div className="filter-tabs">
                        {[['all', 'ทั้งหมด'], ['active', 'ค้างอยู่'], ['completed', 'เสร็จแล้ว'], ['expired', 'หมดเวลา']].map(([key, label]) => (
                            <button
                                key={key}
                                className={`filter-tab${filter === key ? ' active' : ''}`}
                                onClick={() => setFilter(key)}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    <div className="category-filter-bar-wrap" ref={dropdownRef}>
                        <div 
                            className="category-filter-summary" 
                            onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                        >
                            <span className="filter-icon">🏷️</span>
                            <span className="filter-label">
                                {categoryFilters.length === 0 
                                    ? 'หมวดหมู่ทั้งหมด' 
                                    : `เลือกอยู่ ${categoryFilters.length} หมวดหมู่`}
                            </span>
                            <span className={`dropdown-arrow ${isCategoryDropdownOpen ? 'open' : ''}`}>▼</span>
                        </div>
                        
                        {isCategoryDropdownOpen && (
                            <div className="category-dropdown-content">
                                <label className={`dropdown-item ${categoryFilters.length === 0 ? 'active' : ''}`}>
                                    <input 
                                        type="checkbox" 
                                        checked={categoryFilters.length === 0}
                                        onChange={() => setCategoryFilters([])}
                                    />
                                    <span>ทั้งหมด</span>
                                </label>
                                <label className={`dropdown-item ${categoryFilters.includes('uncategorized') ? 'active' : ''}`}>
                                    <input 
                                        type="checkbox" 
                                        checked={categoryFilters.includes('uncategorized')}
                                        onChange={() => {
                                            setCategoryFilters(prev => 
                                                prev.includes('uncategorized') 
                                                    ? prev.filter(id => id !== 'uncategorized') 
                                                    : [...prev, 'uncategorized']
                                            );
                                        }}
                                    />
                                    <span>ไม่มีหมวดหมู่</span>
                                </label>
                                {categories.map(cat => (
                                    <label key={cat.id} className={`dropdown-item ${categoryFilters.includes(cat.id) ? 'active' : ''}`}>
                                        <input 
                                            type="checkbox" 
                                            checked={categoryFilters.includes(cat.id)}
                                            onChange={() => {
                                                setCategoryFilters(prev => 
                                                    prev.includes(cat.id) 
                                                        ? prev.filter(id => id !== cat.id) 
                                                        : [...prev, cat.id]
                                                );
                                            }}
                                        />
                                        <div className="category-dot" style={{ background: cat.color }} />
                                        <span>{cat.name}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {filteredTasks.length === 0 ? (
                        <div className="empty-state">
                            {period !== 'all' ? `ไม่มีงานใน${PERIOD_LABELS[period]}นี้` : 'ยังไม่มีงาน — เพิ่มงานแรกของคุณ!'}
                        </div>
                    ) : (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext items={filteredTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                                <ul className="task-list">
                                    {filteredTasks.map((task) => (
                                        <SortableTaskItem
                                            key={task.id}
                                            task={task}
                                            categories={categories}
                                            nowMs={nowMs}
                                            onToggle={handleToggle}
                                            onDelete={handleDelete}
                                            onEdit={setEditingTask}
                                        />
                                    ))}
                                </ul>
                            </SortableContext>
                            <DragOverlay>
                                {activeTask ? (
                                    <li className="task-item drag-overlay">
                                        <span className="drag-handle">⠿</span>
                                        <div className="task-info">
                                            <div className="task-title">{activeTask.title}</div>
                                        </div>
                                    </li>
                                ) : null}
                            </DragOverlay>
                        </DndContext>
                    )}
                </section>

                <aside className="glass-panel analytics-panel">
                    <h3>📊 สถิติ</h3>
                    <div className="analytics-chart-wrap" style={{ position: 'relative', height: '190px' }}>
                        <Doughnut data={chartData} options={{ maintainAspectRatio: false }} />
                    </div>
                    <div className="analytics-stats">
                        <p>งานทั้งหมด: <strong>{graphTotal}</strong></p>
                        <p>เสร็จแล้ว: <strong>{graphCompleted}</strong></p>
                        <p>
                            อัตราความสำเร็จ:{' '}
                            <strong>{graphTotal > 0 ? Math.round((graphCompleted / graphTotal) * 100) : 0}%</strong>
                        </p>
                        {period !== 'all' && (
                            <p style={{ fontSize: '0.78rem', opacity: 0.55, marginTop: '0.5rem' }}>
                                📅 {getPeriodLabel(period, anchor)}
                            </p>
                        )}
                    </div>
                </aside>
            </div>

            {editingTask && (
                <EditModal
                    task={editingTask}
                    categories={categories}
                    onClose={() => setEditingTask(null)}
                    onSave={handleSaveEdit}
                />
            )}
        </div>
    );
};

export default Dashboard;
