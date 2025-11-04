import React, { useState, useEffect } from 'react';
import { db, doc, updateDoc, addDoc, collection } from '../services/firebase';
import { Customer } from '../types';

interface CustomerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveSuccess: () => void;
    initialData: Partial<Customer> | null;
    companyId: string;
    inputStyle: string;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({ isOpen, onClose, onSaveSuccess, initialData, companyId, inputStyle }) => {
    const [customer, setCustomer] = useState<Partial<Customer> | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setCustomer(initialData || {});
        }
    }, [isOpen, initialData]);

    if (!isOpen || !customer) return null;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!customer.name) return;
        setSaving(true);
        const { id, ...data } = customer;
        try {
            if (id) {
                await updateDoc(doc(db, 'companies', companyId, 'customers', id), data);
            } else {
                await addDoc(collection(db, 'companies', companyId, 'customers'), data);
            }
            onSaveSuccess();
            onClose();
        } catch (error) {
            console.error("Error saving customer:", error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg">
                <h3 className="font-bold text-lg mb-4">{customer.id ? 'تعديل عميل' : 'إضافة عميل'}</h3>
                <form onSubmit={handleSave} className="space-y-4">
                    <input type="text" placeholder="اسم العميل" value={customer.name || ''} onChange={e => setCustomer(p => ({ ...p, name: e.target.value }))} className={inputStyle} required />
                    <input type="email" placeholder="البريد الإلكتروني" value={customer.email || ''} onChange={e => setCustomer(p => ({ ...p, email: e.target.value }))} className={inputStyle} />
                    <input type="text" placeholder="الهاتف" value={customer.phone || ''} onChange={e => setCustomer(p => ({ ...p, phone: e.target.value }))} className={inputStyle} />
                    <input type="text" placeholder="العنوان" value={customer.address || ''} onChange={e => setCustomer(p => ({ ...p, address: e.target.value }))} className={inputStyle} />
                    <div className="mt-6 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="bg-gray-200 py-2 px-4 rounded-lg">إلغاء</button>
                        <button type="submit" disabled={saving} className="bg-blue-600 text-white py-2 px-4 rounded-lg disabled:opacity-50">{saving ? '...' : 'حفظ'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
