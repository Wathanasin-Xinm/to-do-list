import React, { useState, useEffect, useCallback } from 'react';
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
    if (diffMs <= 60 * 60 * 1000) return 'countdown'; // within last 1 hour
    return 'active';
};

const formatCountdown = (ms) => {
    if (ms <= 0) return '00:00';
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

// ─── Expiration Badge ─────────────────────────────────────────────────────────
const ExpirationBadge = ({ task, nowMs }) => {
    const status = getExpirationStatus(task, nowMs);
    if (!status) return null;

    if (status === 'expired') {
        return (
            <span className="expire-badge expire-badge--expired">🔴 หมดเวลา</span>
        );
    }
    if (status === 'countdown') {
        const remaining = getExpiresAtMs(task) - nowMs;
        return (
            <span className="expire-badge expire-badge--countdown">
                ⏳ {formatCountdown(remaining)}
            </span>
        );
    }
    return null;
};

// ─── Edit Modal ───────────────────────────────────────────────────────────────
const EditModal = ({ task, onClose, onSave }) => {
    const [title, setTitle] = useState(task.title || '');
    const [dueDate, setDueDate] = useState(task.dueDate || '');
    const [dueTime, setDueTime] = useState(task.dueTime || '');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title.trim()) return;
        onSave(task.id, { title: title.trim(), dueDate, dueTime });
    };

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
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input type="date" className="input-field" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={{ flex: 1 }} />
                        <input type="time" className="input-field" value={dueTime} onChange={(e) => setDueTime(e.target.value)} style={{ flex: 1 }} />
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
const SortableTaskItem = ({ task, nowMs, onToggle, onDelete, onEdit }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    };

    return (
        <li
            ref={setNodeRef}
            style={style}
            className={`task-item${task.completed ? ' completed' : ''}`}
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
                />
                <div className="task-info">
                    <div className={`task-title${task.completed ? ' done' : ''}`}>
                        {task.title}
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

    // Tick clock every second for countdown
    useEffect(() => {
        const timer = setInterval(() => setNowMs(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Auto-delete expired Mode-B tasks (check every 30 s)
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
        let unsubscribe;
        if (userData?.role === 'admin') {
            unsubscribe = subscribeToAllTasks(setTasks);
        } else {
            unsubscribe = subscribeToTasks(user, setTasks);
        }
        return () => unsubscribe && unsubscribe();
    }, [user, userData]);

    const handlePeriodChange = (p) => { setPeriod(p); setAnchor(isoToday()); };
    const handleNavigate = (dir) => setAnchor((prev) => navigateAnchor(period, prev, dir));
    const handleToday = () => setAnchor(isoToday());

    // ── Add Task ───────────────────────────────────────────────────────────────
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
                expiresAt,
                expirationMode: timeLimited ? expirationMode : null,
            }, user);
            setNewTaskTitle('');
            setNewTaskDate('');
            setNewTaskTime('');
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

    // ── Drag & Drop ────────────────────────────────────────────────────────────
    const handleDragStart = ({ active }) => setActiveId(active.id);

    const handleDragEnd = useCallback(async ({ active, over }) => {
        setActiveId(null);
        if (!over || active.id === over.id) return;

        setTasks((prev) => {
            const oldIndex = prev.findIndex((t) => t.id === active.id);
            const newIndex = prev.findIndex((t) => t.id === over.id);
            const reordered = arrayMove(prev, oldIndex, newIndex);
            // Persist only the visible reordering
            updateTaskOrder(reordered).catch(() => toast.error('ไม่สามารถบันทึกการเรียงลำดับได้'));
            return reordered;
        });
    }, []);

    // ── Filtering ──────────────────────────────────────────────────────────────
    const range = getRangeForPeriod(period, anchor);

    // Date-range filtered (used for BOTH list and graph)
    const periodFiltered = tasks.filter((task) => {
        if (!range) return true;
        if (!task.dueDate) return false;
        const due = new Date(task.dueDate);
        return due >= range.start && due <= range.end;
    });

    // Graph always shows total of periodFiltered (ignores status filter)
    const graphTasks = periodFiltered;

    // List further filtered by status
    const filteredTasks = periodFiltered.filter((task) => {
        if (filter === 'completed') return task.completed;
        if (filter === 'active') return !task.completed;
        return true;
    });

    // ── Analytics (graph always based on total, not filtered) ─────────────────
    const graphCompleted = graphTasks.filter((t) => t.completed).length;
    const graphTotal = graphTasks.length;
    const chartData = {
        labels: ['เสร็จแล้ว', 'ยังค้างอยู่'],
        datasets: [{
            data: [graphCompleted, graphTotal - graphCompleted],
            backgroundColor: ['#00b894', '#dfe6e9'],
            borderWidth: 0,
        }],
    };

    const displayName = userData?.nickname || user?.email || '';
    const isToday = anchor === isoToday();
    const activeTask = tasks.find((t) => t.id === activeId);

    return (
        <div className="container">
            {/* Header */}
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
                    <Link to="/profile" className="btn" style={{ background: 'rgba(255,255,255,0.08)', textDecoration: 'none' }}>
                        👤 โปรไฟล์
                    </Link>
                    <button onClick={logoutUser} className="btn" style={{ background: 'var(--danger-color)' }}>
                        ออกจากระบบ
                    </button>
                </div>
            </header>

            <div className="dashboard-grid">
                {/* ── Task Section ── */}
                <section className="glass-panel" style={{ padding: '1.5rem' }}>
                    {/* Add Task Form */}
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
                            <button type="submit" className="btn">+ เพิ่ม</button>
                        </div>

                        {/* Time-limited toggle */}
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
                                    <span style={{ fontSize: '0.82rem', opacity: 0.7 }}>โหมด:</span>
                                    <label className="expire-mode-option">
                                        <input type="radio" name="expMode" value="A" checked={expirationMode === 'A'} onChange={() => setExpirationMode('A')} />
                                        <span>A — แสดงสถานะ "หมดเวลา"</span>
                                    </label>
                                    <label className="expire-mode-option">
                                        <input type="radio" name="expMode" value="B" checked={expirationMode === 'B'} onChange={() => setExpirationMode('B')} />
                                        <span>B — นับถอยหลัง แล้วลบอัตโนมัติ</span>
                                    </label>
                                </div>
                            </div>
                        )}
                    </form>

                    {/* Period Tabs */}
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

                    {/* Date Navigator */}
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

                    {/* Status Filter */}
                    <div className="filter-tabs">
                        {[['all', 'ทั้งหมด'], ['active', 'ค้างอยู่'], ['completed', 'เสร็จแล้ว']].map(([key, label]) => (
                            <button
                                key={key}
                                className={`filter-tab${filter === key ? ' active' : ''}`}
                                onClick={() => setFilter(key)}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* Task List */}
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

                {/* ── Analytics Section ── */}
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

            {/* Edit Modal */}
            {editingTask && (
                <EditModal
                    task={editingTask}
                    onClose={() => setEditingTask(null)}
                    onSave={handleSaveEdit}
                />
            )}
        </div>
    );
};

export default Dashboard;
