import React, { useState, useEffect, useMemo } from 'react';
import { db, addDoc, collection } from '../services/firebase';
import { Customer, SalesInvoice, SalesInvoiceItem } from '../types';

interface SalesInvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveSuccess: () => void;
    customers: Customer[];
    companyId: string;
    inputStyle: string;
}

export const SalesInvoiceModal: React.FC<SalesInvoiceModalProps> = ({ isOpen, onClose, onSaveSuccess, customers, companyId, inputStyle }) => {
    const [invoice, setInvoice] = useState<Partial<SalesInvoice>>({
        date: new Date().toISOString().split('T')[0],
        status: 'draft',
        items: [{ description: '', quantity: 1, unitPrice: 0, total: 0 }]
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!isOpen) {
             setInvoice({
                date: new Date().toISOString().split('T')[0],
                status: 'draft',
                items: [{ description: '', quantity: 1, unitPrice: 0, total: 0 }]
            });
        }
    }, [isOpen]);
    
    const totalAmount = useMemo(() => {
        return invoice.items?.reduce((sum, item) => sum + (item.total || 0), 0) || 0;
    }, [invoice.items]);

    if (!isOpen) return null;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!invoice.customerId || !invoice.items || invoice.items.length === 0) return;
        setSaving(true);
        const customerName = customers.find(c => c.id === invoice.customerId)?.name || '';
        const invoiceData: Omit<SalesInvoice, 'id'> = {
            ...invoice,
            customerId: invoice.customerId,
            customerName: customerName,
            date: invoice.date || new Date().toISOString().split('T')[0],
            items: invoice.items,
            totalAmount: totalAmount,
            status: 'draft',
        };

        try {
            await addDoc(collection(db, 'companies', companyId, 'salesInvoices'), invoiceData);
            onSaveSuccess();
            onClose();
        } catch (error) {
            console.error("Error saving invoice:", error);
        } finally {
            setSaving(false);
        }
    };
    
    const handleItemChange = (index: number, field: keyof SalesInvoiceItem, value: any) => {
        const newItems = [...(invoice.items || [])];
        const item = { ...newItems[index] };
        (item as any)[field] = value;

        if (field === 'quantity' || field === 'unitPrice') {
            item.total = (item.quantity || 0) * (item.unitPrice || 0);
        }
        newItems[index] = item;
        setInvoice(p => ({ ...p, items: newItems }));
    };

    const addItem = () => {
        const newItems = [...(invoice.items || []), { description: '', quantity: 1, unitPrice: 0, total: 0 }];
        setInvoice(p => ({ ...p, items: newItems }));
    };

    const removeItem = (index: number) => {
        const newItems = (invoice.items || []).filter((_, i) => i !== index);
        setInvoice(p => ({ ...p, items: newItems }));
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <h3 className="font-bold text-lg mb-4">إضافة فاتورة مبيعات</h3>
                <form onSubmit={handleSave}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                         <select value={invoice.customerId || ''} onChange={e => setInvoice(p => ({ ...p, customerId: e.target.value }))} className={inputStyle} required>
                            <option value="" disabled>اختر العميل</option>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <input type="date" value={invoice.date || ''} onChange={e => setInvoice(p => ({ ...p, date: e.target.value }))} className={inputStyle} />
                    </div>
                    
                    <div className="space-y-2">
                        {invoice.items?.map((item, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <input type="text" placeholder="الوصف" value={item.description} onChange={e => handleItemChange(index, 'description', e.target.value)} className={inputStyle} style={{flex: 3}} required />
                                <input type="number" placeholder="الكمية" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', parseFloat(e.target.value))} className={inputStyle} style={{flex: 1}} />
                                <input type="number" step="0.01" placeholder="سعر الوحدة" value={item.unitPrice} onChange={e => handleItemChange(index, 'unitPrice', parseFloat(e.target.value))} className={inputStyle} style={{flex: 1}} />
                                <input type="text" placeholder="الإجمالي" value={item.total.toFixed(2)} className={`${inputStyle} bg-gray-200`} style={{flex: 1}} readOnly />
                                <button type="button" onClick={() => removeItem(index)} className="bg-red-500 text-white p-2 rounded-lg text-xs">-</button>
                            </div>
                        ))}
                    </div>
                    <button type="button" onClick={addItem} className="mt-2 text-sm text-blue-600">+ إضافة بند</button>

                    <div className="mt-4 border-t pt-2 flex justify-end font-bold text-lg">
                        <span>الإجمالي: {totalAmount.toFixed(2)}</span>
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="bg-gray-200 py-2 px-4 rounded-lg">إلغاء</button>
                        <button type="submit" disabled={saving} className="bg-blue-600 text-white py-2 px-4 rounded-lg disabled:opacity-50">{saving ? '...' : 'حفظ كمسودة'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
