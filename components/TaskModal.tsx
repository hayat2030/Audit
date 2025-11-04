import React, { useState, useEffect } from 'react';
import { db, doc, updateDoc, addDoc, collection } from '../services/firebase';
import { Task, Project, Employee } from '../types';

interface TaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveSuccess: () => void;
    initialData: Partial<Task> | null;
    companyId: string;
    projects: Project[];
    employees: Employee[];
    inputStyle: string;
}

export const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, onSaveSuccess, initialData, companyId, projects, employees, inputStyle }) => {
    const [task, setTask] = useState<Partial<Task>>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setTask(initialData || { status: 'todo', dueDate: new Date().toISOString().split('T')[0] });
        }
    }, [isOpen, initialData]);

    if (!isOpen || !task) return null;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!task.name || !task.projectId) return;
        setSaving(true);
        
        const projectName = projects.find(p => p.id === task.projectId)?.name || '';
        const assigneeName = employees.find(e => e.id === task.assigneeId)?.name || '';
        
        // FIX: The original destructuring can cause a TypeScript error with strict settings
        // because `id` is not guaranteed to exist on a Partial<Task>.
        // This refactoring is more type-safe.
        const { id, ...restOfTask } = task;
        const data = { ...restOfTask, projectName, assigneeName };
        try {
            if (id) {
                await updateDoc(doc(db, 'companies', companyId, 'tasks', id), data);
            } else {
                await addDoc(collection(db, 'companies', companyId, 'tasks'), data);
            }
            onSaveSuccess();
            onClose();
        } catch (error) {
            console.error("Error saving task:", error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg">
                <h3 className="font-bold text-lg mb-4">{task.id ? 'تعديل مهمة' : 'إضافة مهمة'}</h3>
                <form onSubmit={handleSave} className="space-y-4">
                    <input type="text" placeholder="اسم المهمة" value={task.name || ''} onChange={e => setTask(p => ({...p, name: e.target.value}))} className={inputStyle} required />
                    <select value={task.projectId || ''} onChange={e => setTask(p => ({...p, projectId: e.target.value}))} className={inputStyle} required>
                        <option value="" disabled>اختر المشروع</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <textarea placeholder="وصف المهمة" value={task.description || ''} onChange={e => setTask(p => ({...p, description: e.target.value}))} className={inputStyle} />
                    <div className="grid grid-cols-2 gap-4">
                        <select value={task.assigneeId || ''} onChange={e => setTask(p => ({...p, assigneeId: e.target.value}))} className={inputStyle}>
                            <option value="">-- تعيين لموظف --</option>
                            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                        <input type="date" value={task.dueDate || ''} onChange={e => setTask(p => ({...p, dueDate: e.target.value}))} className={inputStyle} />
                    </div>
                    <select value={task.status || 'todo'} onChange={e => setTask(p => ({...p, status: e.target.value as any}))} className={inputStyle}>
                        <option value="todo">مطلوبة</option>
                        <option value="in-progress">قيد التنفيذ</option>
                        <option value="done">منجزة</option>
                    </select>
                     <div className="mt-6 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="bg-gray-200 py-2 px-4 rounded-lg">إلغاء</button>
                        <button type="submit" disabled={saving} className="bg-blue-600 text-white py-2 px-4 rounded-lg disabled:opacity-50">{saving ? '...' : 'حفظ'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
