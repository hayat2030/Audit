import React, { useState, useEffect } from 'react';
import { db, doc, updateDoc, addDoc, collection } from '../services/firebase';
import { FixedAsset } from '../types';

interface AssetModalProps {
     isOpen: boolean;
    onClose: () => void;
    onSaveSuccess: () => void;
    initialData: Partial<FixedAsset> | null;
    companyId: string;
    inputStyle: string;
}
export const AssetModal: React.FC<AssetModalProps> = ({ isOpen, onClose, onSaveSuccess, initialData, companyId, inputStyle }) => {
    const [asset, setAsset] = useState<Partial<FixedAsset> | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setAsset(initialData);
    }, [initialData]);

    if (!isOpen || !asset) return null;
    
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const { id, ...data } = asset;
        try {
            if(id) {
                 await updateDoc(doc(db, 'companies', companyId, 'assets', id), data);
            } else {
                 await addDoc(collection(db, 'companies', companyId, 'assets'), { ...data, status: 'active' });
            }
            onSaveSuccess();
            onClose();
        } catch (error) { console.error(error); } finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg">
                <h3 className="font-bold text-lg mb-4">إضافة أصل</h3>
                <form onSubmit={handleSave} className="space-y-4">
                   <input type="text" placeholder="اسم الأصل" value={asset.name || ''} onChange={e => setAsset(p=>({...p, name: e.target.value}))} className={inputStyle} required />
                   <input type="date" value={asset.purchaseDate || ''} onChange={e => setAsset(p=>({...p, purchaseDate: e.target.value}))} className={inputStyle} />
                   <input type="number" step="0.01" placeholder="سعر الشراء" value={asset.purchasePrice || ''} onChange={e => setAsset(p=>({...p, purchasePrice: parseFloat(e.target.value)}))} className={inputStyle} required />
                   <input type="number" step="0.01" placeholder="نسبة الإهلاك السنوية %" value={asset.depreciationRate || ''} onChange={e => setAsset(p=>({...p, depreciationRate: parseFloat(e.target.value)}))} className={inputStyle} required />
                   <input type="number" placeholder="العمر الافتراضي (سنوات)" value={asset.usefulLife || ''} onChange={e => setAsset(p=>({...p, usefulLife: parseFloat(e.target.value)}))} className={inputStyle} required />
                   <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="bg-gray-200 py-2 px-4 rounded-lg">إلغاء</button><button type="submit" disabled={saving} className="bg-blue-600 text-white py-2 px-4 rounded-lg disabled:opacity-50">{saving ? '...' : 'حفظ'}</button></div>
                </form>
            </div>
        </div>
    );
};
