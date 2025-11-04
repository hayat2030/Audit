import React, { useState, useEffect } from 'react';
import { db, doc, collection, setDoc, getDocs, query, where, limit, updateDoc } from '../services/firebase';
import { CompanyMember } from '../types';

interface InviteMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    companyId: string;
    currentMembers: CompanyMember[];
    inputStyle: string;
}
export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({ isOpen, onClose, companyId, currentMembers, inputStyle }) => {
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<'member' | 'owner'>('member');
    const [inviting, setInviting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setInviteEmail('');
            setInviteRole('member');
            setError('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!inviteEmail) { setError('Please enter an email.'); return; }
        setInviting(true);
        try {
            const userQuery = query(collection(db, 'users'), where('email', '==', inviteEmail), limit(1));
            const userSnapshot = await getDocs(userQuery);
            if (userSnapshot.empty) {
                setError('المستخدم بهذا البريد الإلكتروني غير موجود. يرجى الطلب منه التسجيل أولاً.');
                setInviting(false); return;
            }
            const invitedUserDoc = userSnapshot.docs[0];
            const invitedUserId = invitedUserDoc.id;
            const invitedUserData = invitedUserDoc.data();
            if (invitedUserData.companyId) {
                setError('هذا المستخدم ينتمي بالفعل إلى شركة أخرى.');
                setInviting(false); return;
            }
            if (currentMembers.some(m => m.uid === invitedUserId)) {
                 setError('هذا المستخدم هو بالفعل عضو في الشركة.');
                 setInviting(false); return;
            }
            await setDoc(doc(db, 'companies', companyId, 'members', invitedUserId), { email: inviteEmail, role: inviteRole });
            await updateDoc(doc(db, 'users', invitedUserId), { companyId: companyId, role: inviteRole });
            onClose();
        } catch (err: any) {
            console.error("Error inviting member:", err);
            setError(err.message || 'فشل في دعوة العضو.');
        } finally {
            setInviting(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="font-bold text-lg mb-4">دعوة عضو جديد</h3>
                <form onSubmit={handleInvite}>
                    <div className="space-y-4">
                        <input type="email" placeholder="البريد الإلكتروني للعضو" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className={inputStyle} required />
                        <select value={inviteRole} onChange={e => setInviteRole(e.target.value as any)} className={inputStyle}>
                            <option value="member">عضو</option>
                            <option value="owner">مالك</option>
                        </select>
                        {error && <p className="text-sm text-red-500">{error}</p>}
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="bg-gray-200 py-2 px-4 rounded-lg">إلغاء</button>
                        <button type="submit" disabled={inviting} className="bg-blue-600 text-white py-2 px-4 rounded-lg disabled:opacity-50">
                            {inviting ? 'جاري الإرسال...' : 'إرسال دعوة'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
