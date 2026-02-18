import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import {
    subscribeToTasks,
    subscribeToAllTasks,
    addTask,
    toggleTaskCompletion,
    deleteTask,
    updateTask
} from '../services/taskService';
import { logoutUser } from '../services/authService';
import { toast } from 'react-toastify';
import { Doughnut } from 'react-chartjs-2';
import 'chart.js/auto';

// ─── Date Helpers ─────────────────────────────────────────────────────────────
const isoToday = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
        const start = new Date(a.getFullYear(), a.getMonth(), a.getDate(), 0, 0, 0);
        const end = new Date(a.getFullYear(), a.getMonth(), a.getDate(), 23, 59, 59, 999);
        return { start, end };
    }
    if (period === 'week') {
        const ws = getWeekStart(a);
        const we = new Date(ws); we.setDate(ws.getDate() + 6); we.setHours(23, 59, 59, 999);
        return { start: ws, end: we };
    }
    if (period === 'month') {
        const start = new Date(a.getFullYear(), a.getMonth(), 1);
        const end = new Date(a.getFullYear(), a.getMonth() + 1, 0, 23, 59, 59, 999);
        return { start, end };
    }
    if (period === 'year') {
        const start = new Date(a.getFullYear(), 0, 1);
        const end = new Date(a.getFullYear(), 11, 31, 23, 59, 59, 999);
        return { start, end };
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
    if (period === 'day') {
        return `${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${buddhistYear}`;
    }
    if (period === 'week') {
        const ws = getWeekStart(d);
        const we = new Date(ws); we.setDate(ws.getDate() + 6);
        return `${ws.getDate()} ${TH_MONTHS[ws.getMonth()]} – ${we.getDate()} ${TH_MONTHS[we.getMonth()]} ${buddhistYear}`;
    }
    if (period === 'month') {
        return `${TH_MONTHS_FULL[d.getMonth()]} ${buddhistYear}`;
    }
    if (period === 'year') {
        return `ปี ${buddhistYear}`;
    }
    return '';
};

const PERIOD_LABELS = {
    all: 'ทั้งหมด',
    day: 'รายวัน',
    week: 'รายสัปดาห์',
    month: 'รายเดือน',
    year: 'รายปี',
};

// ─── Edit Modal ───────────────────────────────────────────────────────────────
const EditModal = ({ task, onClose, onSave }) => {
    const [title, setTitle] = useState(task.title || '');
    const [dueDate, setDueDate] = useState(task.dueDate || '');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title.trim()) return;
        onSave(task.id, { title: title.trim(), dueDate });
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
                    <input
                        type="date"
                        className="input-field"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                    />
                    <div className="modal-actions">
                        <button type="button" className="btn" style={{ background: '#b2bec3' }} onClick={onClose}>ยกเลิก</button>
                        <button type="submit" className="btn">บันทึก</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
const Dashboard = () => {
    const { user, userData } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskDate, setNewTaskDate] = useState('');
    const [filter, setFilter] = useState('all');
    const [period, setPeriod] = useState('all');
    const [anchor, setAnchor] = useState(isoToday()); // ISO date string used as navigation anchor
    const [editingTask, setEditingTask] = useState(null);

    useEffect(() => {
        let unsubscribe;
        if (userData?.role === 'admin') {
            unsubscribe = subscribeToAllTasks(setTasks);
        } else {
            unsubscribe = subscribeToTasks(user, setTasks);
        }
        return () => unsubscribe && unsubscribe();
    }, [user, userData]);

    // Reset anchor to today when period changes
    const handlePeriodChange = (p) => {
        setPeriod(p);
        setAnchor(isoToday());
    };

    const handleNavigate = (dir) => {
        setAnchor((prev) => navigateAnchor(period, prev, dir));
    };

    const handleToday = () => setAnchor(isoToday());

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;
        try {
            await addTask({
                title: newTaskTitle.trim(),
                description: '',
                dueDate: newTaskDate || isoToday(), // Default to today if no date selected
                ownerNickname: userData?.nickname || '',
            }, user);
            setNewTaskTitle('');
            setNewTaskDate('');
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

    // ── Filtering ─────────────────────────────────────────────────────────────
    const range = getRangeForPeriod(period, anchor);

    const periodFiltered = tasks.filter((task) => {
        if (!range) return true;
        if (!task.dueDate) return false;
        const due = new Date(task.dueDate);
        return due >= range.start && due <= range.end;
    });

    const filteredTasks = periodFiltered.filter((task) => {
        if (filter === 'completed') return task.completed;
        if (filter === 'active') return !task.completed;
        return true;
    });

    // ── Analytics ─────────────────────────────────────────────────────────────
    const completedCount = filteredTasks.filter((t) => t.completed).length;
    const totalCount = filteredTasks.length;
    const chartData = {
        labels: ['เสร็จแล้ว', 'ยังค้างอยู่'],
        datasets: [{
            data: [completedCount, totalCount - completedCount],
            backgroundColor: ['#00b894', '#dfe6e9'],
            borderWidth: 0,
        }],
    };

    const displayName = userData?.nickname || user?.email || '';
    const isToday = anchor === isoToday();

    const formatDueDate = (dateStr) => {
        if (!dateStr) return null;
        const d = new Date(dateStr);
        return `${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
    };

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
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {userData?.role === 'admin' && (
                        <Link to="/admin" className="btn" style={{ background: 'rgba(108,92,231,0.15)', color: 'var(--primary-color)', textDecoration: 'none' }}>
                            🛡️ Admin
                        </Link>
                    )}
                    <button onClick={logoutUser} className="btn" style={{ background: 'var(--danger-color)' }}>
                        ออกจากระบบ
                    </button>
                </div>
            </header>

            <div className="dashboard-grid">
                {/* ── Task Section ── */}
                <section className="glass-panel" style={{ padding: '1.5rem' }}>
                    {/* Add Task Form */}
                    <form onSubmit={handleAdd} className="add-task-form">
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
                        <button type="submit" className="btn">+ เพิ่ม</button>
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

                    {/* Date Navigator (hidden for 'all') */}
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
                            {period !== 'all'
                                ? `ไม่มีงานใน${PERIOD_LABELS[period]}นี้`
                                : 'ยังไม่มีงาน — เพิ่มงานแรกของคุณ!'}
                        </div>
                    ) : (
                        <ul className="task-list">
                            {filteredTasks.map((task) => (
                                <li key={task.id} className={`task-item${task.completed ? ' completed' : ''}`}>
                                    <div className="task-left">
                                        <input
                                            type="checkbox"
                                            className="task-checkbox"
                                            checked={task.completed}
                                            onChange={() => handleToggle(task.id, task.completed)}
                                        />
                                        <div className="task-info">
                                            <div className={`task-title${task.completed ? ' done' : ''}`}>
                                                {task.title}
                                            </div>
                                            <div className="task-meta">
                                                {task.ownerNickname || task.ownerEmail}
                                                {task.dueDate && (
                                                    <span style={{ marginLeft: '0.5rem' }}>
                                                        📅 {formatDueDate(task.dueDate)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="task-actions">
                                        <button className="btn-icon" title="แก้ไข" onClick={() => setEditingTask(task)}>✏️</button>
                                        <button className="btn-icon" title="ลบ" style={{ color: 'var(--danger-color)' }} onClick={() => handleDelete(task)}>🗑️</button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                {/* ── Analytics Section ── */}
                <aside className="glass-panel analytics-panel">
                    <h3>📊 สถิติ</h3>
                    <div className="analytics-chart-wrap" style={{ position: 'relative', height: '190px' }}>
                        <Doughnut data={chartData} options={{ maintainAspectRatio: false }} />
                    </div>
                    <div className="analytics-stats">
                        <p>งานทั้งหมด: <strong>{totalCount}</strong></p>
                        <p>เสร็จแล้ว: <strong>{completedCount}</strong></p>
                        <p>
                            อัตราความสำเร็จ:{' '}
                            <strong>{totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%</strong>
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
