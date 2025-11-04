import React, { useState, useEffect } from 'react';
import { db, doc, updateDoc, addDoc, collection } from '../services/firebase';
import { Project } from '../types';

interface ProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveSuccess: () => void;
    initialData: Partial<Project> | null;
    companyId: string;
    inputStyle: string;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({ isOpen, onClose, onSaveSuccess, initialData, companyId, inputStyle }) => {
    const [project, setProject] = useState<Partial<Project>>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setProject(initialData || { status: 'planning', startDate: new Date().toISOString().split('T')[0] });
        }
    }, [isOpen, initialData]);
    
    if (!isOpen || !project) return null;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!project.name) return;
        setSaving(true);
        const { id, ...data } = project;
        try {
            if (id) {
                await updateDoc(doc(db, 'companies', companyId, 'projects', id), data);
            } else {
                await addDoc(collection(db, 'companies', companyId, 'projects'), data);
            }
            onSaveSuccess();
            onClose();
        } catch (error) {
            console.error("Error saving project:", error);
        } finally {
            setSaving(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg">
                <h3 className="font-bold text-lg mb-4">{project.id ? 'تعديل مشروع' : 'إضافة مشروع'}</h3>
                <form onSubmit={handleSave} className="space-y-4">
                    <input type="text" placeholder="اسم المشروع" value={project.name || ''} onChange={e => setProject(p => ({...p, name: e.target.value}))} className={inputStyle} required />
                    <textarea placeholder="وصف المشروع" value={project.description || ''} onChange={e => setProject(p => ({...p, description: e.target.value}))} className={inputStyle} />
                    <div className="grid grid-cols-2 gap-4">
                        <input type="date" value={project.startDate || ''} onChange={e => setProject(p => ({...p, startDate: e.target.value}))} className={inputStyle} />
                        <input type="date" value={project.endDate || ''} onChange={e => setProject(p => ({...p, endDate: e.target.value}))} className={inputStyle} />
                    </div>
                    <input type="number" placeholder="الميزانية" value={project.budget || ''} onChange={e => setProject(p => ({...p, budget: parseFloat(e.target.value)}))} className={inputStyle} />
                    <select value={project.status || 'planning'} onChange={e => setProject(p => ({...p, status: e.target.value as any}))} className={inputStyle}>
                        <option value="planning">تخطيط</option>
                        <option value="in-progress">قيد التنفيذ</option>
                        <option value="completed">مكتمل</option>
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
