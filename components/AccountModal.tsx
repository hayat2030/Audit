import React, { useState, useEffect } from 'react';
import { db, doc, updateDoc, addDoc, collection } from '../services/firebase';
import { Account, AccountType } from '../types';

interface AccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveSuccess: () => void;
    initialData: Partial<Account> | null;
    accounts: Account[];
    companyId: string;
    inputStyle: string;
    generateNewCode: (parentId: string | null, type: AccountType) => string;
}

export const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose, onSaveSuccess, initialData, accounts, companyId, inputStyle, generateNewCode }) => {
    const [currentAccount, setCurrentAccount] = useState<Partial<Account> | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen && initialData) {
            if (!initialData.id) {
                const newCode = generateNewCode(initialData.parentId || null, initialData.type || 'asset');
                setCurrentAccount({ ...initialData, code: newCode });
            } else {
                setCurrentAccount(initialData);
            }
        }
    }, [isOpen, initialData, generateNewCode]);

    if (!isOpen || !currentAccount) return null;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentAccount.name || !currentAccount.code || !currentAccount.type) return;
        setSaving(true);
        const { id, ...data } = currentAccount;
        try {
            if (id) {
                await updateDoc(doc(db, 'companies', companyId, 'accounts', id), data);
            } else {
                await addDoc(collection(db, 'companies', companyId, 'accounts'), { ...data, balance: 0 });
            }
            onSaveSuccess();
            onClose();
        } catch (error) { 
            console.error(error); 
        } finally { 
            setSaving(false); 
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg">
                <h3 className="font-bold text-lg mb-4">{currentAccount.id ? 'تعديل حساب' : 'إضافة حساب'}</h3>
                <form onSubmit={handleSave}>
                    <div className="space-y-4">
                        <input type="text" placeholder="اسم الحساب" value={currentAccount.name || ''} onChange={e => setCurrentAccount(p => ({...p, name: e.target.value}))} className={inputStyle} required />
                        <select value={currentAccount.type || 'asset'} onChange={e => {
                            const newType = e.target.value as AccountType;
                            const newCode = generateNewCode(currentAccount.parentId || null, newType);
                            setCurrentAccount(p => ({...p, type: newType, code: newCode}));
                        }} className={inputStyle} required>
                            <option value="asset">أصل</option>
                            <option value="liability">التزام</option>
                            <option value="equity">حقوق ملكية</option>
                            <option value="revenue">إيراد</option>
                            <option value="expense">مصروف</option>
                        </select>
                        <select value={currentAccount.parentId || ''} onChange={e => {
                            const newParentId = e.target.value || null;
                            const newCode = generateNewCode(newParentId, currentAccount.type || 'asset');
                            setCurrentAccount(p => ({...p, parentId: newParentId, code: newCode}));
                        }} className={inputStyle}>
                            <option value="">-- حساب رئيسي (لا يوجد) --</option>
                            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>)}
                        </select>
                         <input type="text" placeholder="كود الحساب" value={currentAccount.code || ''} onChange={e => setCurrentAccount(p => ({...p, code: e.target.value}))} className={inputStyle} required />
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="bg-gray-200 py-2 px-4 rounded-lg">إلغاء</button>
                        <button type="submit" disabled={saving} className="bg-blue-600 text-white py-2 px-4 rounded-lg disabled:opacity-50">{saving ? '...' : 'حفظ'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
