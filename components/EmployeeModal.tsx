import React, { useState, useEffect } from 'react';
import { db, doc, updateDoc, addDoc, collection } from '../services/firebase';
import { Employee } from '../types';

interface EmployeeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveSuccess: () => void;
    initialData: Partial<Employee>;
    companyId: string;
    inputStyle: string;
}
export const EmployeeModal: React.FC<EmployeeModalProps> = ({ isOpen, onClose, onSaveSuccess, initialData, companyId, inputStyle }) => {
    const [employee, setEmployee] = useState<Partial<Employee>>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setEmployee(initialData);
    }, [initialData]);

    if (!isOpen) return null;
    
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!employee.name || !employee.position || !employee.salary) return;
        setSaving(true);
        const data = {
            ...employee,
            hireDate: employee.hireDate || new Date().toISOString().split('T')[0],
            status: employee.status || 'active',
        };
        try {
            if (data.id) {
                const { id, ...updateData } = data;
                await updateDoc(doc(db, 'companies', companyId, 'employees', id), updateData);
            } else {
                await addDoc(collection(db, 'companies', companyId, 'employees'), data);
            }
            onSaveSuccess();
            onClose();
        } catch (error) { console.error(error); } finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg">
                <h3 className="font-bold text-lg mb-4">{employee.id ? 'تعديل' : 'إضافة'} موظف</h3>
                <form onSubmit={handleSave} className="space-y-4">
                    <input type="text" placeholder="اسم الموظف" value={employee.name || ''} onChange={e => setEmployee(p=>({...p, name: e.target.value}))} className={inputStyle} required />
                    <input type="text" placeholder="المنصب الوظيفي" value={employee.position || ''} onChange={e => setEmployee(p=>({...p, position: e.target.value}))} className={inputStyle} required />
                    <input type="number" placeholder="الراتب" value={employee.salary || ''} onChange={e => setEmployee(p=>({...p, salary: parseFloat(e.target.value)}))} className={inputStyle} required />
                    <input type="date" value={employee.hireDate || ''} onChange={e => setEmployee(p=>({...p, hireDate: e.target.value}))} className={inputStyle} />
                    <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="bg-gray-200 py-2 px-4 rounded-lg">إلغاء</button><button type="submit" disabled={saving} className="bg-blue-600 text-white py-2 px-4 rounded-lg disabled:opacity-50">{saving ? '...' : 'حفظ'}</button></div>
                </form>
            </div>
        </div>
    );
};
