import React, { useState, useEffect } from 'react';
import { db, addDoc, collection, getDocs, query } from '../services/firebase';
import { Payroll, Payslip, Employee, Reward, Penalty } from '../types';

interface RunPayrollModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRunSuccess: () => void;
    companyId: string;
    payrolls: Payroll[];
    employees: Employee[];
    inputStyle: string;
}
export const RunPayrollModal: React.FC<RunPayrollModalProps> = ({ isOpen, onClose, onRunSuccess, companyId, payrolls, employees, inputStyle }) => {
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setYear(new Date().getFullYear());
            setMonth(new Date().getMonth() + 1);
        }
    }, [isOpen]);

    if (!isOpen) return null;
    
    const handleRunPayroll = async (e: React.FormEvent) => {
        e.preventDefault();
        if (payrolls.some(p => p.year === year && p.month === month)) {
            alert("تم إنشاء مسير رواتب لهذا الشهر بالفعل.");
            return;
        }
        setProcessing(true);
        try {
            const rewardsCol = collection(db, 'companies', companyId, 'rewards');
            const penaltiesCol = collection(db, 'companies', companyId, 'penalties');
            const monthRewards = await getDocs(query(rewardsCol));
            const monthPenalties = await getDocs(query(penaltiesCol));
            const payslips: Payslip[] = employees.map(emp => {
                const empRewards = monthRewards.docs.map(d => d.data() as Reward).filter(r => r.employeeId === emp.id && new Date(r.date).getFullYear() === year && new Date(r.date).getMonth() + 1 === month);
                const empPenalties = monthPenalties.docs.map(d => d.data() as Penalty).filter(p => p.employeeId === emp.id && p.type === 'deduction' && new Date(p.date).getFullYear() === year && new Date(p.date).getMonth() + 1 === month);
                const totalRewards = empRewards.reduce((sum, r) => sum + (r.amount || 0), 0);
                const totalDeductions = empPenalties.reduce((sum, p) => sum + (p.amount || 0), 0);
                return {
                    employeeId: emp.id, employeeName: emp.name, baseSalary: emp.salary,
                    rewards: empRewards.map(r => ({reason: r.reason, amount: r.amount || 0})),
                    penalties: empPenalties.map(p => ({reason: p.reason, amount: p.amount || 0})),
                    totalRewards, totalDeductions, netSalary: emp.salary + totalRewards - totalDeductions,
                };
            });
            const totalNetPayable = payslips.reduce((sum, p) => sum + p.netSalary, 0);
            await addDoc(collection(db, 'companies', companyId, 'payrolls'), {
                month, year, status: 'draft', payslips, totalNetPayable, createdAt: new Date().toISOString(),
            });
            alert(`تم إنشاء مسير رواتب شهر ${month}/${year} بنجاح.`);
            onRunSuccess();
            onClose();
        } catch(error) {
            console.error("Error running payroll:", error);
            alert("حدث خطأ أثناء إنشاء مسير الرواتب.");
        } finally {
            setProcessing(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="font-bold text-lg mb-4">إنشاء مسير رواتب جديد</h3>
                <form onSubmit={handleRunPayroll}>
                    <div className="space-y-4">
                       <input type="number" placeholder="السنة" value={year} onChange={e => setYear(parseInt(e.target.value))} className={inputStyle} required />
                       <input type="number" placeholder="الشهر" value={month} onChange={e => setMonth(parseInt(e.target.value))} className={inputStyle} required min="1" max="12" />
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="bg-gray-200 py-2 px-4 rounded-lg">إلغاء</button>
                        <button type="submit" disabled={processing} className="bg-blue-600 text-white py-2 px-4 rounded-lg disabled:opacity-50">
                            {processing ? 'جاري المعالجة...' : 'إنشاء'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
