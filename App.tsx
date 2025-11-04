import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    AccountModal, AssetModal, CustodyModal, EmployeeModal, ExpenseModal, InviteMemberModal, JournalEntryModal, RunPayrollModal,
    CustomerModal, SalesInvoiceModal, ReceiptVoucherModal, ProjectModal, TaskModal
} from './components/modals';
import {
    BuildingLibraryIcon, BuildingOfficeIcon, BriefcaseIcon, CalendarDaysIcon, ClipboardDocumentListIcon, ClockIcon, CogIcon, CreditCardIcon, CurrencyDollarIcon,
    DocumentTextIcon, ExclamationTriangleIcon, FolderIcon, HomeIcon, IdentificationIcon, LogoutIcon, PlusIcon, ReceiptPercentIcon, ScaleIcon, ShoppingCartIcon, SparklesIcon,
    UserGroupIcon, UserPlusIcon, UsersIcon
} from './components/Icons';
import Spinner, { FullPageSpinner } from './components/Spinner';
import {
    auth,
    addDoc,
    collection,
    createUserWithEmailAndPassword,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    limit,
    onAuthStateChanged,
    onSnapshot,
    query,
    setDoc,
    signInWithEmailAndPassword,
    signOut,
    updateDoc,
    where,
    writeBatch,
    db
} from './services/firebase';
import {
    Account, AccountType, AppUser, AttendanceRecord, Candidate, Company, CompanyMember, Custody, Customer, Department, Employee, Expense, FixedAsset,
    JobOpening, JournalEntry, JournalEntryItem, LeaveRequest, PageContent, Payroll, Payslip, Penalty, PricingPlan, Program, Project, ReceiptVoucher, Reward,
    SalesInvoice, SalesInvoiceItem, Tax, Task
} from './types';


// --- Type Definition ---
interface JobPosition {
    id: string;
    title: string;
}

// --- AUTH HOOK ---
const useAuth = () => {
    const [user, setUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubscribeDoc: (() => void) | null = null;

        const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
            if (unsubscribeDoc) {
                unsubscribeDoc();
                unsubscribeDoc = null;
            }

            if (firebaseUser) {
                const userDocRef = doc(db, "users", firebaseUser.uid);
                unsubscribeDoc = onSnapshot(userDocRef, (userDoc) => {
                    if (userDoc.exists()) {
                        setUser({ uid: firebaseUser.uid, email: firebaseUser.email, ...userDoc.data() } as AppUser);
                    }
                    setLoading(false);
                }, (error) => {
                    console.error("Firestore snapshot error:", error);
                    setUser(null);
                    setLoading(false);
                });
            } else {
                setUser(null);
                setLoading(false);
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeDoc) {
                unsubscribeDoc();
            }
        };
    }, []);

    return { user, loading };
};


// --- PUBLIC PAGE COMPONENTS ---

const PublicHeader: React.FC = () => {
    const navigateTo = (path: string) => window.location.hash = path;
    return (
        <header className="bg-white shadow-sm">
            <nav className="flex items-center justify-between p-6 lg:px-8" aria-label="Global">
                <div className="flex lg:flex-1">
                    <button onClick={() => navigateTo('/')} className="-m-1.5 p-1.5">
                        <h1 className="text-2xl font-bold text-blue-600">اوديت</h1>
                    </button>
                </div>
                <div className="hidden lg:flex lg:gap-x-12">
                    <button onClick={() => navigateTo('/about')} className="text-sm font-semibold leading-6 text-gray-900">عن المنصة</button>
                    <button onClick={() => navigateTo('/pricing')} className="text-sm font-semibold leading-6 text-gray-900">الاشتراكات</button>
                    <button onClick={() => navigateTo('/programs')} className="text-sm font-semibold leading-6 text-gray-900">البرامج</button>
                    <button onClick={() => navigateTo('/contact')} className="text-sm font-semibold leading-6 text-gray-900">اتصل بنا</button>
                </div>
                <div className="lg:flex lg:flex-1 lg:justify-end">
                    <button onClick={() => navigateTo('/login')} className="text-sm font-semibold leading-6 text-gray-900">
                        تسجيل الدخول <span aria-hidden="true">&rarr;</span>
                    </button>
                </div>
            </nav>
        </header>
    );
};

const PublicPageLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="bg-gray-50 min-h-screen">
        <PublicHeader />
        <main>{children}</main>
    </div>
);


const LandingPage: React.FC = () => {
    const navigateTo = (path: string) => {
        window.location.hash = path;
    };
    
    return (
        <PublicPageLayout>
             <div className="relative isolate px-6 pt-14 lg:px-8">
                <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56">
                    <div className="text-center">
                        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
                            منصة اوديت لإدارة أعمالك بذكاء
                        </h1>
                        <p className="mt-6 text-lg leading-8 text-gray-600">
                            كل ما تحتاجه لإدارة شركتك في مكان واحد. من الحسابات والموارد البشرية إلى إدارة المشاريع، نوفر لك الأدوات اللازمة للنجاح.
                        </p>
                        <div className="mt-10 flex items-center justify-center gap-x-6">
                            <button
                                onClick={() => navigateTo('/register')}
                                className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                            >
                                ابدأ الآن مجانًا لمدة 14 يومًا
                            </button>
                            <a href="#/about" className="text-sm font-semibold leading-6 text-gray-900">
                                اعرف المزيد <span aria-hidden="true">→</span>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </PublicPageLayout>
    );
};

const PublicPage: React.FC<{ pageId: string }> = ({ pageId }) => {
    const [pageContent, setPageContent] = useState<PageContent | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchContent = async () => {
            setLoading(true);
            const docRef = doc(db, 'pages', pageId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setPageContent({ id: docSnap.id, ...docSnap.data() } as PageContent);
            } else {
                setPageContent({ id: pageId, title: 'الصفحة غير موجودة', content: 'لم يتم العثور على محتوى لهذه الصفحة.' });
            }
            setLoading(false);
        };
        fetchContent();
    }, [pageId]);

    return (
        <PublicPageLayout>
            <div className="mx-auto max-w-4xl px-6 py-12 lg:px-8">
                {loading ? (
                    <div className="text-center py-20"><Spinner /></div>
                ) : (
                    <div className="bg-white p-8 rounded-lg shadow-md">
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl mb-6 text-center">{pageContent?.title}</h1>
                        <div className="prose lg:prose-xl max-w-none text-gray-700" style={{ whiteSpace: 'pre-wrap' }}>
                            {pageContent?.content}
                        </div>
                    </div>
                )}
            </div>
        </PublicPageLayout>
    );
};

const PricingPage: React.FC = () => {
    const navigateTo = (path: string) => window.location.hash = path;
    const [plans, setPlans] = useState<PricingPlan[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPlans = async () => {
            setLoading(true);
            const plansSnapshot = await getDocs(collection(db, 'pricingPlans'));
            if (plansSnapshot.empty) {
                console.warn("Pricing plans not found in Firestore.");
            } else {
                const plansData = plansSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PricingPlan));
                const order = ['basic', 'professional', 'enterprise'];
                plansData.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
                setPlans(plansData);
            }
            setLoading(false);
        };
        fetchPlans();
    }, []);

    const CheckIcon: React.FC<{className?: string}> = ({className}) => (
      <svg className={className || "h-6 w-5 flex-none text-blue-600"} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.052-.143z" clipRule="evenodd" />
      </svg>
    );

    if (loading) {
        return (
            <PublicPageLayout>
                <div className="py-40"><Spinner/></div>
            </PublicPageLayout>
        );
    }
    
    if (plans.length === 0) {
        return (
             <PublicPageLayout>
                <div className="text-center py-20">
                    <p>خطط الاشتراك غير متاحة حالياً.</p>
                </div>
            </PublicPageLayout>
        )
    }

    const basicPlan = plans.find(p => p.id === 'basic');
    const professionalPlan = plans.find(p => p.id === 'professional');
    const enterprisePlan = plans.find(p => p.id === 'enterprise');
  
    return (
      <PublicPageLayout>
        <div className="bg-gray-50 py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl sm:text-center">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">أسعار بسيطة وشفافة</h2>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                اختر الخطة التي تناسب حجم شركتك واحتياجاتها. جميع الخطط تأتي مع دعم فني متميز.
              </p>
            </div>
            
            {basicPlan && (
                <div className="mx-auto mt-16 max-w-2xl rounded-3xl ring-1 ring-gray-200 sm:mt-20 lg:mx-0 lg:flex lg:max-w-none">
                <div className="p-8 sm:p-10 lg:flex-auto">
                    <h3 className="text-2xl font-bold tracking-tight text-gray-900">{basicPlan.name}</h3>
                    <p className="mt-6 text-base leading-7 text-gray-600">{basicPlan.description}</p>
                    <div className="mt-10 flex items-center gap-x-4">
                    <h4 className="flex-none text-sm font-semibold leading-6 text-blue-600">الميزات الرئيسية</h4>
                    <div className="h-px flex-auto bg-gray-100"></div>
                    </div>
                    <ul role="list" className="mt-8 grid grid-cols-1 gap-4 text-sm leading-6 text-gray-600 sm:grid-cols-2 sm:gap-6">
                        {basicPlan.features.map((feature, i) => (
                            <li key={i} className="flex gap-x-3"><CheckIcon />{feature}</li>
                        ))}
                    </ul>
                </div>
                <div className="-mt-2 p-2 lg:mt-0 lg:w-full lg:max-w-md lg:flex-shrink-0">
                    <div className="rounded-2xl bg-white py-10 text-center ring-1 ring-inset ring-gray-900/5 lg:flex lg:flex-col lg:justify-center lg:py-16">
                    <div className="mx-auto max-w-xs px-8">
                        <p className="text-base font-semibold text-gray-600">تبدأ من</p>
                        <p className="mt-6 flex items-baseline justify-center gap-x-2">
                        <span className="text-5xl font-bold tracking-tight text-gray-900">{basicPlan.currency}{basicPlan.price}</span>
                        <span className="text-sm font-semibold leading-6 tracking-wide text-gray-600">{basicPlan.pricePeriod}</span>
                        </p>
                        <button onClick={() => navigateTo(basicPlan.ctaLink)} className="mt-10 block w-full rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                            {basicPlan.ctaText}
                        </button>
                        <p className="mt-6 text-xs leading-5 text-gray-600">{basicPlan.disclaimer || 'الفواتير تصدر شهرياً. يمكنك الإلغاء في أي وقت.'}</p>
                    </div>
                    </div>
                </div>
                </div>
            )}
  
            <div className="isolate mx-auto mt-10 grid max-w-md grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-2">
                {professionalPlan && (
                     <div className="rounded-3xl p-8 ring-1 ring-gray-200 bg-white">
                        <h3 className="text-2xl font-bold tracking-tight text-gray-900">{professionalPlan.name}</h3>
                        <p className="mt-6 text-base leading-7 text-gray-600">{professionalPlan.description}</p>
                        <p className="mt-8 flex items-baseline justify-start gap-x-2">
                            <span className="text-5xl font-bold tracking-tight text-gray-900">{professionalPlan.currency}{professionalPlan.price}</span>
                            <span className="text-sm font-semibold leading-6 tracking-wide text-gray-600">{professionalPlan.pricePeriod}</span>
                        </p>
                        <button onClick={() => navigateTo(professionalPlan.ctaLink)} className="mt-8 block w-full rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                            {professionalPlan.ctaText}
                        </button>
                        <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-gray-600">
                            {professionalPlan.features.map((feature, i) => (
                                <li key={i} className="flex gap-x-3"><CheckIcon /> {feature}</li>
                            ))}
                        </ul>
                    </div>
                )}
  
                {enterprisePlan && (
                     <div className="rounded-3xl p-8 ring-1 ring-gray-200 bg-white">
                        <h3 className="text-2xl font-bold tracking-tight text-gray-900">{enterprisePlan.name}</h3>
                        <p className="mt-6 text-base leading-7 text-gray-600">{enterprisePlan.description}</p>
                        <p className="mt-8 flex items-baseline justify-start gap-x-2">
                            {enterprisePlan.price === 'مخصصة' ? (
                                <span className="text-4xl font-bold tracking-tight text-gray-900">{enterprisePlan.price}</span>
                            ) : (
                                <>
                                    <span className="text-4xl font-bold tracking-tight text-gray-900">{enterprisePlan.currency}{enterprisePlan.price}</span>
                                    {enterprisePlan.pricePeriod && <span className="text-sm font-semibold leading-6 tracking-wide text-gray-600">{enterprisePlan.pricePeriod}</span>}
                                </>
                            )}
                        </p>
                        <button onClick={() => navigateTo(enterprisePlan.ctaLink)} className="mt-8 block w-full rounded-md bg-gray-800 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-800">
                           {enterprisePlan.ctaText}
                        </button>
                        <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-gray-600">
                             {enterprisePlan.features.map((feature, i) => (
                                <li key={i} className="flex gap-x-3"><CheckIcon /> {feature}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
  
          </div>
        </div>
      </PublicPageLayout>
    );
  };

const AuthPage: React.FC<{ isLogin: boolean }> = ({ isLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const inputStyle = "bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-blue-600 focus:border-blue-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500";


    const navigateTo = (path: string) => {
        window.location.hash = path;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
                window.location.hash = '/dashboard';
            } else {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                
                const usersQuery = query(collection(db, 'users'), limit(1));
                const usersSnapshot = await getDocs(usersQuery);
                const role = usersSnapshot.docs.length === 0 ? 'admin' : 'owner';
                
                const trialEndsAt = role === 'owner' 
                    ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).getTime() 
                    : undefined;

                await setDoc(doc(db, "users", user.uid), {
                    email: user.email,
                    role: role,
                    ...(trialEndsAt && { trialEndsAt }),
                });
                window.location.hash = '/dashboard';
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="flex flex-col items-center justify-center px-6 py-8 mx-auto md:h-screen lg:py-0">
            <button onClick={() => navigateTo('/')} className="flex items-center mb-6 text-2xl font-semibold text-gray-900 dark:text-white">
                 <h1 className="text-3xl font-bold text-blue-600">اوديت</h1>
            </button>
            <div className="w-full bg-white rounded-lg shadow dark:border md:mt-0 sm:max-w-md xl:p-0 dark:bg-gray-800 dark:border-gray-700">
                <div className="p-6 space-y-4 md:space-y-6 sm:p-8">
                    <h1 className="text-xl font-bold leading-tight tracking-tight text-gray-900 md:text-2xl dark:text-white">
                        {isLogin ? 'تسجيل الدخول إلى حسابك' : 'إنشاء حساب جديد'}
                    </h1>
                    <form className="space-y-4 md:space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label htmlFor="email" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white text-right">البريد الإلكتروني</label>
                            <input type="email" name="email" id="email" value={email} onChange={e => setEmail(e.target.value)} className={inputStyle} placeholder="name@company.com" required />
                        </div>
                        <div>
                            <label htmlFor="password" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white text-right">كلمة المرور</label>
                            <input type="password" name="password" id="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className={inputStyle} required />
                        </div>
                        {error && <p className="text-sm text-red-500">{error}</p>}
                        <button type="submit" disabled={loading} className="w-full text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 disabled:opacity-50">
                            {loading ? 'جاري...' : (isLogin ? 'تسجيل الدخول' : 'إنشاء حساب')}
                        </button>
                        <p className="text-sm font-light text-gray-500 dark:text-gray-400">
                            {isLogin ? 'لا تملك حسابًا؟' : 'هل لديك حساب بالفعل؟'}
                            <button type="button" onClick={() => navigateTo(isLogin ? '/register' : '/login')} className="font-medium text-blue-600 hover:underline dark:text-blue-500 ms-1 bg-transparent border-none p-0 cursor-pointer">
                                {isLogin ? 'إنشاء حساب' : 'تسجيل الدخول'}
                            </button>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
};

// --- DASHBOARD & COMPANY SETUP COMPONENTS ---

const Dashboard: React.FC<{ user: AppUser, company: Company | null, loadingCompany: boolean, onCompanyCreated: () => void }> = ({ user, company, loadingCompany, onCompanyCreated }) => {
    if (loadingCompany) return <FullPageSpinner />;
    
    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">لوحة التحكم</h1>
            {company ? (
                <CompanyDashboard company={company} user={user} />
            ) : (
                <CreateCompanyForm user={user} onCompanyCreated={onCompanyCreated} />
            )}
        </div>
    );
};

const industries = [
    'شركة تجارية', 'شركة استيراد وتصدير', 'شركة ادارة المدارس', 'شركة ادارة السناتر التعليمية',
    'شركة ادارة المستشفيات', 'شركة ادارة الفنادق', 'شركات السياحة والسفر', 'شركات الشحن والتوزيع',
    'شركات الرحلات', 'شركات المقاولات', 'شركات الاستثمار العقاري', 'شركات ادارة المطاعم والكافيهات', 'أخرى'
];

const CreateCompanyForm: React.FC<{ user: AppUser, onCompanyCreated: () => void }> = ({ user, onCompanyCreated }) => {
    const [companyName, setCompanyName] = useState('');
    const [industry, setIndustry] = useState('');
    const [programs, setPrograms] = useState<Program[]>([]);
    const [selectedPrograms, setSelectedPrograms] = useState<string[]>(['hr', 'accounting', 'sales', 'projects']);
    const [loading, setLoading] = useState(false);
    const inputStyle = "bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-600 focus:border-blue-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500";


    useEffect(() => {
        const fetchPrograms = async () => {
            const defaultPrograms = [
                 { id: 'accounting', name: 'برنامج الحسابات', description: 'إدارة شاملة لحسابات الشركة والفواتير والمصروفات.' },
                 { id: 'hr', name: 'برنامج الموارد البشرية', description: 'إدارة الموظفين، الرواتب، الإجازات، والتوظيف.' },
                 { id: 'sales', name: 'برنامج المبيعات', description: 'إدارة العملاء، الفواتير، والتحصيلات.' },
                 { id: 'projects', name: 'برنامج إدارة المشاريع', description: 'تخطيط وتتبع المشاريع والمهام.' }
            ];
            
            for (const prog of defaultPrograms) {
                const progDoc = doc(db, 'programs', prog.id);
                if (!(await getDoc(progDoc)).exists()) {
                    await setDoc(progDoc, prog);
                }
            }
            
            const programsSnapshot = await getDocs(collection(db, 'programs'));
            const programsList = programsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Program));
            setPrograms(programsList);
        };
        fetchPrograms();
    }, []);

    const handleCreateCompany = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const companyRef = await addDoc(collection(db, "companies"), {
                name: companyName,
                industry: industry,
                ownerId: user.uid,
                programs: selectedPrograms,
                subscriptionPlan: 'trial',
            });

            await updateDoc(doc(db, "users", user.uid), { companyId: companyRef.id });

            await setDoc(doc(db, 'companies', companyRef.id, 'members', user.uid), {
                email: user.email,
                role: 'owner'
            });
            
            onCompanyCreated();
        } catch (error) {
            console.error("Error creating company:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4">إنشاء شركة جديدة</h2>
            <p className="text-gray-600 mb-6">أهلاً بك في اوديت. لقد بدأت فترتك التجريبية المجانية لمدة 14 يومًا. قم بإعداد شركتك الأولى للاستفادة منها.</p>
            <form onSubmit={handleCreateCompany}>
                <div className="mb-4">
                    <label htmlFor="companyName" className="block text-gray-700 font-bold mb-2 text-right">اسم الشركة</label>
                    <input
                        type="text"
                        id="companyName"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className={inputStyle}
                        required
                    />
                </div>
                <div className="mb-6">
                    <label htmlFor="industry" className="block text-gray-700 font-bold mb-2 text-right">نشاط الشركة</label>
                     <select
                        id="industry"
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                        className={inputStyle}
                        required
                    >
                        <option value="" disabled>-- اختر نشاط الشركة --</option>
                        {industries.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                    </select>
                </div>
               
                <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                    {loading ? 'جاري الإنشاء...' : 'إنشاء الشركة والمتابعة'}
                </button>
            </form>
        </div>
    );
};

const TrialExpiredBlocker: React.FC = () => (
    <div className="text-center bg-white p-8 rounded-lg shadow-md max-w-2xl mx-auto mt-10">
        <h2 className="text-2xl font-bold text-red-600 mb-4">انتهت الفترة التجريبية</h2>
        <p className="text-gray-700 mb-6">لقد انتهت فترة تجربتك المجانية. للاستمرار في استخدام "اوديت" وإدارة أعمالك، يرجى اختيار إحدى باقاتنا.</p>
        <button 
            onClick={() => window.location.hash = '/pricing'}
            className="rounded-md bg-blue-600 px-6 py-3 text-lg font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
            عرض خطط الاشتراك
        </button>
    </div>
);


const CompanyDashboard: React.FC<{ company: Company, user: AppUser }> = ({ company, user }) => {
    const [trialDaysRemaining, setTrialDaysRemaining] = useState<number | null>(null);
    const [isTrialExpired, setIsTrialExpired] = useState(false);

    useEffect(() => {
        if (user.trialEndsAt && company.subscriptionPlan === 'trial') {
            const now = Date.now();
            const endsAt = user.trialEndsAt;
            if (now > endsAt) {
                setIsTrialExpired(true);
                setTrialDaysRemaining(0);
            } else {
                const remaining = Math.ceil((endsAt - now) / (1000 * 60 * 60 * 24));
                setTrialDaysRemaining(remaining);
                setIsTrialExpired(false);
            }
        }
    }, [user.trialEndsAt, company.subscriptionPlan]);

    const planNames = {
        basic: 'الأساسية',
        professional: 'الاحترافية',
        enterprise: 'المؤسسات',
        trial: 'الفترة التجريبية'
    };
    const currentPlanName = planNames[company.subscriptionPlan] || 'غير معروفة';
    const programDisplayNames: Record<string, string> = {
        'hr': 'الموارد البشرية',
        'accounting': 'الحسابات',
        'sales': 'المبيعات',
        'projects': 'إدارة المشاريع'
    };


    if (isTrialExpired) {
        return <TrialExpiredBlocker />;
    }

    return (
        <div className="bg-white p-8 rounded-lg shadow-md">
            {trialDaysRemaining !== null && (
                 <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-6 rounded-md" role="alert">
                    <p className="font-bold">فترة تجريبية</p>
                    <p>تبقى لديك {trialDaysRemaining} أيام في فترتك التجريبية. <a href="#/pricing" className="font-semibold underline">اختر باقة الآن</a> لتجنب انقطاع الخدمة.</p>
                </div>
            )}
             <div className="flex flex-col sm:flex-row justify-between items-start mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-bold">مرحباً بك في شركة: {company.name}</h2>
                    <p className="text-gray-500">هذه هي لوحة تحكم شركتك.</p>
                </div>
                <div className="text-left bg-gray-50 p-3 rounded-lg border w-full sm:w-auto">
                    <p className="text-sm font-medium text-gray-600">باقتك الحالية</p>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                        {currentPlanName}
                    </span>
                    {company.subscriptionPlan !== 'enterprise' && (
                        <button onClick={() => window.location.hash = '/pricing'} className="mt-2 block text-xs font-semibold text-blue-600 hover:underline">
                            ترقية الباقة
                        </button>
                    )}
                </div>
            </div>

            <div className="mt-6">
                <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="font-bold text-lg mb-3">البرامج المفعلة</h3>
                    <ul className="list-disc list-inside space-y-2 text-gray-700">
                        {(company.programs || []).map(p => <li key={p}>{programDisplayNames[p] || p}</li>)}
                    </ul>
                </div>
            </div>
        </div>
    );
};

// --- ACCOUNTING PAGE AND SUBCOMPONENTS ---
// FIX: Redefined AccountWithChildren to safely extend Account without conflicting `children` property types.
type AccountWithChildren = Omit<Account, 'children'> & {
    children: AccountWithChildren[];
};

interface AccountingSharedProps {
    companyId: string;
    accounts: Account[];
    employees: Employee[];
    journalEntries: JournalEntry[];
    expenses: Expense[];
    custody: Custody[];
    assets: FixedAsset[];
    accountsByType: Record<AccountType, Account[]>;
    createAutoJournalEntry: (entryData: Omit<JournalEntry, 'id' | 'isAutoGenerated'>) => Promise<void>;
    inputStyle: string;
    tableHeaderStyle: string;
    tableCellStyle: string;
}

const ChartOfAccountsComponent: React.FC<Pick<AccountingSharedProps, 'accounts' | 'companyId' | 'inputStyle'>> = ({ accounts, companyId, inputStyle }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentAccount, setCurrentAccount] = useState<Partial<Account> | null>(null);
    const [saving, setSaving] = useState(false);
    
    const generateNewCode = useCallback((parentId: string | null, type: AccountType) => {
        if (parentId) {
            const parentAccount = accounts.find(a => a.id === parentId);
            if (parentAccount) {
                const children = accounts.filter(a => a.parentId === parentId);
                if (children.length > 0) {
                    const lastChildCode = Math.max(...children.map(c => parseInt(c.code, 10)));
                    return (lastChildCode + 1).toString();
                }
                return parentAccount.code + '01';
            }
        }
        const rootAccounts = accounts.filter(a => !a.parentId && a.type === type);
        if (rootAccounts.length > 0) {
            const lastRootCode = Math.max(...rootAccounts.map(c => parseInt(c.code, 10)));
            return (lastRootCode + 1).toString();
        }
        const typeStartCodes: Record<AccountType, string> = { asset: '1', liability: '2', equity: '3', revenue: '4', expense: '5' };
        return typeStartCodes[type];
    }, [accounts]);

    const handleCreateDefaultChart = async () => {
        if (accounts.length > 0) {
            alert("لا يمكن إنشاء دليل افتراضي مع وجود حسابات حالية.");
            return;
        }
        if (!window.confirm("سيتم إنشاء دليل حسابات افتراضي. هل أنت متأكد؟")) return;
    
        setSaving(true);
        try {
            const fullChartData: { name: string; code: string; type: AccountType; parentName: string | null; }[] = [
                { name: 'الأصول', code: '1', type: 'asset', parentName: null },
                { name: 'الالتزامات', code: '2', type: 'liability', parentName: null },
                { name: 'حقوق الملكية', code: '3', type: 'equity', parentName: null },
                { name: 'الإيرادات', code: '4', type: 'revenue', parentName: null },
                { name: 'المصروفات', code: '5', type: 'expense', parentName: null },
                { name: 'الأصول المتداولة', code: '11', type: 'asset', parentName: 'الأصول' },
                { name: 'الأصول الثابتة', code: '12', type: 'asset', parentName: 'الأصول' },
                { name: 'الصندوق', code: '111', type: 'asset', parentName: 'الأصول المتداولة' },
                { name: 'البنك', code: '112', type: 'asset', parentName: 'الأصول المتداولة' },
                { name: 'عهد الموظفين', code: '113', type: 'asset', parentName: 'الأصول المتداولة' },
                { name: 'العملاء', code: '114', type: 'asset', parentName: 'الأصول المتداولة' },
                { name: 'مجمع اهلاك الأصول الثابتة', code: '129', type: 'asset', parentName: 'الأصول الثابتة' },
                { name: 'الموردون', code: '21', type: 'liability', parentName: 'الالتزامات' },
                { name: 'رأس المال', code: '31', type: 'equity', parentName: 'حقوق الملكية' },
                { name: 'إيرادات النشاط', code: '41', type: 'revenue', parentName: 'الإيرادات' },
                { name: 'مصروفات عمومية وإدارية', code: '51', type: 'expense', parentName: 'المصروفات' },
                { name: 'مصروف الاهلاك', code: '511', type: 'expense', parentName: 'مصروفات عمومية وإدارية' },
            ];
    
            type ChartNode = { data: typeof fullChartData[0], children: ChartNode[] };
            const nodes: Record<string, ChartNode> = {};
            fullChartData.forEach(item => { nodes[item.name] = { data: item, children: [] }; });
            const tree: ChartNode[] = [];
            fullChartData.forEach(item => {
                if (item.parentName && nodes[item.parentName]) {
                    nodes[item.parentName].children.push(nodes[item.name]);
                } else {
                    tree.push(nodes[item.name]);
                }
            });
    
            const batch = writeBatch(db);
            const accountsCol = collection(db, 'companies', companyId, 'accounts');
            const addNodeToBatch = (node: ChartNode, parentId: string | null) => {
                const docRef = doc(accountsCol);
                batch.set(docRef, { name: node.data.name, code: node.data.code, type: node.data.type, parentId, balance: 0 });
                node.children.forEach(childNode => addNodeToBatch(childNode, docRef.id));
            };
            tree.forEach(rootNode => addNodeToBatch(rootNode, null));
            
            await batch.commit();
            alert("تم إنشاء دليل الحسابات الافتراضي بنجاح.");
        } catch (error) {
            console.error("Error creating default chart:", error);
            alert("حدث خطأ أثناء إنشاء الدليل.");
        } finally {
            setSaving(false);
        }
    };

    const accountTree = useMemo(() => {
        const map: { [key: string]: AccountWithChildren } = {};
        const roots: AccountWithChildren[] = [];
        accounts.forEach(account => { map[account.id] = { ...account, children: [] }; });
        accounts.forEach(account => {
            if (account.parentId && map[account.parentId]) {
                map[account.parentId].children.push(map[account.id]);
            } else {
                roots.push(map[account.id]);
            }
        });
        const sortNodes = (nodes: AccountWithChildren[]) => {
            nodes.sort((a,b) => a.code.localeCompare(b.code));
            nodes.forEach(node => sortNodes(node.children));
        }
        sortNodes(roots);
        return roots;
    }, [accounts]);

    const AccountNode: React.FC<{ account: AccountWithChildren, level: number }> = ({ account, level }) => {
        const [isOpen, setIsOpen] = useState(level < 2);
        return (
            <>
                <div className={`flex items-center p-2 rounded hover:bg-gray-100 ${level === 0 ? 'font-bold bg-gray-50' : ''}`} style={{ paddingRight: `${level * 20}px` }}>
                    {account.children && account.children.length > 0 && (
                        <button onClick={() => setIsOpen(!isOpen)} className="text-sm font-mono me-2 w-6 text-center">[{isOpen ? '-' : '+'}]</button>
                    )}
                    <span className="flex-1">{account.code} - {account.name}</span>
                </div>
                {isOpen && account.children && account.children.map(child => <AccountNode key={child.id} account={child} level={level + 1} />)}
            </>
        );
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow-md mt-4">
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">دليل الحسابات</h2>
                <div className="flex gap-2">
                    {accounts.length === 0 && (
                         <button onClick={handleCreateDefaultChart} disabled={saving} className="bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50">
                            {saving ? 'جاري...' : 'إنشاء دليل افتراضي'}
                        </button>
                    )}
                    <button onClick={() => { setCurrentAccount({ type: 'asset', parentId: null, balance: 0 }); setIsModalOpen(true); }} className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700">+ إضافة حساب</button>
                </div>
            </div>
            <div className="space-y-1 border rounded-lg p-2">
                {accountTree.length > 0 ? (
                    accountTree.map(acc => <AccountNode key={acc.id} account={acc} level={0} />)
                ) : (
                    <div className="text-center py-10">
                        <p className="text-gray-500">دليل الحسابات فارغ.</p>
                        <p className="text-sm text-gray-400 mt-2">يمكنك إضافة حسابات يدوياً أو إنشاء دليل افتراضي.</p>
                    </div>
                )}
            </div>
            <AccountModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSaveSuccess={() => { /* Data will refetch via listener */ }}
                initialData={currentAccount}
                accounts={accounts}
                companyId={companyId}
                inputStyle={inputStyle}
                generateNewCode={generateNewCode}
            />
        </div>
    );
}

const JournalEntriesComponent: React.FC<Pick<AccountingSharedProps, 'journalEntries' | 'accounts' | 'companyId' | 'inputStyle' | 'tableHeaderStyle' | 'tableCellStyle'>> = ({ journalEntries, accounts, companyId, inputStyle, tableHeaderStyle, tableCellStyle }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    return (
         <div className="bg-white p-4 rounded-lg shadow-md mt-4">
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">القيود اليومية</h2>
                <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700">+ إضافة قيد يدوي</button>
            </div>
             <div className="overflow-x-auto">
                {journalEntries.length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50"><tr><th className={tableHeaderStyle}>التاريخ</th><th className={tableHeaderStyle}>الوصف</th><th className={tableHeaderStyle}>مدين</th><th className={tableHeaderStyle}>دائن</th><th className={tableHeaderStyle}>النوع</th></tr></thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {journalEntries.map(entry => {
                                const total = entry.items.reduce((sum, item) => sum + item.debit, 0);
                                return (
                                <tr key={entry.id}>
                                    <td className={tableCellStyle}>{entry.date}</td>
                                    <td className={tableCellStyle}>{entry.description}</td>
                                    <td className={tableCellStyle}>{total.toFixed(2)}</td>
                                    <td className={tableCellStyle}>{total.toFixed(2)}</td>
                                    <td className={tableCellStyle}>{entry.isAutoGenerated ? 'تلقائي' : 'يدوي'}</td>
                                </tr>
                                )
                            })}
                        </tbody>
                    </table>
                ) : (
                    <div className="text-center py-10 border-dashed border-2 border-gray-300 rounded-lg">
                        <p className="text-gray-500">لا توجد قيود يومية مسجلة.</p>
                        <button onClick={() => setIsModalOpen(true)} className="mt-4 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700">+ إضافة أول قيد</button>
                    </div>
                )}
            </div>
            <JournalEntryModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSaveSuccess={() => {}}
                accounts={accounts}
                companyId={companyId}
                inputStyle={inputStyle}
            />
        </div>
    );
}

const ExpensesComponent: React.FC<Pick<AccountingSharedProps, 'expenses' | 'accountsByType' | 'accounts'| 'createAutoJournalEntry' | 'companyId' | 'inputStyle' | 'tableHeaderStyle' | 'tableCellStyle'>> = ({ expenses, accountsByType, accounts, createAutoJournalEntry, companyId, inputStyle, tableHeaderStyle, tableCellStyle }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    return (
         <div className="bg-white p-4 rounded-lg shadow-md mt-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">إدارة المصروفات</h2>
                <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700">+ إضافة مصروف</button>
            </div>
            {expenses.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50"><tr><th className={tableHeaderStyle}>التاريخ</th><th className={tableHeaderStyle}>الوصف</th><th className={tableHeaderStyle}>المبلغ</th></tr></thead>
                    <tbody>{expenses.map(exp => <tr key={exp.id}><td className={tableCellStyle}>{exp.date}</td><td className={tableCellStyle}>{exp.description}</td><td className={tableCellStyle}>{exp.amount.toFixed(2)}</td></tr>)}</tbody>
                </table>
            ) : (
                <div className="text-center py-10 border-dashed border-2 border-gray-300 rounded-lg">
                    <p className="text-gray-500">لا توجد مصروفات مسجلة.</p>
                    <button onClick={() => setIsModalOpen(true)} className="mt-4 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700">+ إضافة أول مصروف</button>
                </div>
            )}
            <ExpenseModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSaveSuccess={() => {}}
                accounts={accounts}
                accountsByType={accountsByType}
                companyId={companyId}
                inputStyle={inputStyle}
                createAutoJournalEntry={createAutoJournalEntry}
            />
        </div>
    )
}

const CustodyComponent: React.FC<Pick<AccountingSharedProps, 'custody'| 'employees' | 'accounts' | 'createAutoJournalEntry' | 'companyId' | 'inputStyle' | 'tableHeaderStyle' | 'tableCellStyle'>> = ({ custody, employees, accounts, createAutoJournalEntry, companyId, inputStyle, tableHeaderStyle, tableCellStyle }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const custodyBalances = useMemo(() => {
        const balances: Record<string, {name: string, balance: number}> = {};
        employees.forEach(emp => balances[emp.id] = { name: emp.name, balance: 0 });
        custody.forEach(c => {
            if (balances[c.employeeId]) {
                balances[c.employeeId].balance += c.type === 'receipt' ? c.amount : -c.amount;
            }
        });
        return Object.values(balances).filter(b => b.balance !== 0 || custody.some(c => c.employeeName === b.name));
    }, [custody, employees]);

    return (
         <div className="bg-white p-4 rounded-lg shadow-md mt-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">إدارة العهد</h2>
                <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700">+ إضافة حركة عهدة</button>
            </div>
            <h3 className="font-bold mb-2">أرصدة العهد الحالية</h3>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {custodyBalances.length > 0 ? custodyBalances.map((item, i) => (
                    <div key={i} className="bg-gray-100 p-3 rounded-lg text-center">
                        <p className="font-semibold text-gray-800">{item.name}</p>
                        <p className="text-xl font-bold text-blue-600">{item.balance.toFixed(2)}</p>
                    </div>
                )) : <p className="col-span-full text-center text-gray-500 py-4">لا توجد أرصدة عهد للموظفين.</p>}
             </div>
             <h3 className="font-bold mb-2">سجل الحركات</h3>
             {custody.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50"><tr><th className={tableHeaderStyle}>الموظف</th><th className={tableHeaderStyle}>التاريخ</th><th className={tableHeaderStyle}>النوع</th><th className={tableHeaderStyle}>المبلغ</th></tr></thead>
                    <tbody>{custody.map(c => <tr key={c.id}><td className={tableCellStyle}>{c.employeeName}</td><td className={tableCellStyle}>{c.date}</td><td className={tableCellStyle}>{c.type === 'receipt' ? 'استلام' : 'تسوية'}</td><td className={tableCellStyle}>{c.amount.toFixed(2)}</td></tr>)}</tbody>
                </table>
             ) : (
                <div className="text-center py-10 border-dashed border-2 border-gray-300 rounded-lg">
                    <p className="text-gray-500">لا توجد حركات عهد مسجلة.</p>
                </div>
             )}
            <CustodyModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSaveSuccess={() => {}}
                employees={employees}
                accounts={accounts}
                companyId={companyId}
                inputStyle={inputStyle}
                createAutoJournalEntry={createAutoJournalEntry}
            />
        </div>
    )
}

const AssetsComponent: React.FC<Pick<AccountingSharedProps, 'assets'| 'accounts' | 'createAutoJournalEntry' | 'companyId' | 'inputStyle' | 'tableHeaderStyle' | 'tableCellStyle'>> = ({ assets, accounts, createAutoJournalEntry, companyId, inputStyle, tableHeaderStyle, tableCellStyle }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentAsset, setCurrentAsset] = useState<Partial<FixedAsset> | null>(null);

    const handlePostDepreciation = async (asset: FixedAsset) => {
        const depreciationExpenseAccount = accounts.find(a => a.name.includes("مصروف الاهلاك"));
        const accumulatedDepreciationAccount = accounts.find(a => a.name.includes("مجمع اهلاك"));

        if (!depreciationExpenseAccount || !accumulatedDepreciationAccount) {
            alert("يرجى إنشاء حساب 'مصروف الاهلاك' و 'مجمع اهلاك الأصول الثابتة' أولاً.");
            return;
        }

        const annualDepreciation = asset.purchasePrice * (asset.depreciationRate / 100);
        
        await createAutoJournalEntry({
            date: new Date().toISOString().split('T')[0],
            description: `إهلاك أصل: ${asset.name}`,
            type: 'general',
            items: [
                { accountId: depreciationExpenseAccount.id, accountName: depreciationExpenseAccount.name, debit: annualDepreciation, credit: 0 },
                { accountId: accumulatedDepreciationAccount.id, accountName: accumulatedDepreciationAccount.name, debit: 0, credit: annualDepreciation }
            ],
            sourceId: asset.id,
        });
        alert("تم تسجيل قيد الإهلاك بنجاح.");
    };

    return (
         <div className="bg-white p-4 rounded-lg shadow-md mt-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">إدارة الأصول الثابتة</h2>
                <button onClick={() => { setCurrentAsset({ purchaseDate: new Date().toISOString().split('T')[0] }); setIsModalOpen(true); }} className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700">+ إضافة أصل</button>
            </div>
            {assets.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50"><tr><th className={tableHeaderStyle}>الأصل</th><th className={tableHeaderStyle}>سعر الشراء</th><th className={tableHeaderStyle}>نسبة الإهلاك</th><th className={tableHeaderStyle}>الإجراء</th></tr></thead>
                    <tbody>{assets.map(a => <tr key={a.id}><td className={tableCellStyle}>{a.name}</td><td className={tableCellStyle}>{a.purchasePrice.toFixed(2)}</td><td className={tableCellStyle}>{a.depreciationRate}%</td><td className={tableCellStyle}><button onClick={() => handlePostDepreciation(a)} className="text-blue-600 text-xs">تسجيل إهلاك</button></td></tr>)}</tbody>
                </table>
            ) : (
                 <div className="text-center py-10 border-dashed border-2 border-gray-300 rounded-lg">
                    <p className="text-gray-500">لا توجد أصول ثابتة مسجلة.</p>
                    <button onClick={() => { setCurrentAsset({ purchaseDate: new Date().toISOString().split('T')[0] }); setIsModalOpen(true); }} className="mt-4 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700">+ إضافة أول أصل</button>
                </div>
            )}
            <AssetModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSaveSuccess={() => {}}
                initialData={currentAsset}
                companyId={companyId}
                inputStyle={inputStyle}
            />
        </div>
    )
}

const FinancialStatementsComponent: React.FC<Pick<AccountingSharedProps, 'accounts'| 'journalEntries' | 'assets' | 'inputStyle' | 'tableHeaderStyle' | 'tableCellStyle'>> = ({ accounts, journalEntries, assets, inputStyle, tableHeaderStyle, tableCellStyle }) => {
    const [activeReport, setActiveReport] = useState('trial-balance');

    const trialBalanceData = useMemo(() => {
        const balances: Record<string, { name: string; code: string; debit: number; credit: number }> = {};
        accounts.forEach(acc => {
            balances[acc.id] = { name: acc.name, code: acc.code, debit: 0, credit: 0 };
        });
        journalEntries.forEach(entry => {
            entry.items.forEach(item => {
                if (balances[item.accountId]) {
                    balances[item.accountId].debit += item.debit;
                    balances[item.accountId].credit += item.credit;
                }
            });
        });

        const result = Object.values(balances).map(b => {
            if (b.debit > b.credit) {
                return { ...b, debit: b.debit - b.credit, credit: 0 };
            } else {
                return { ...b, credit: b.credit - b.debit, debit: 0 };
            }
        });
        return result.sort((a,b) => a.code.localeCompare(b.code));
    }, [accounts, journalEntries]);

    const TrialBalance = () => {
        const totalDebit = trialBalanceData.reduce((sum, item) => sum + item.debit, 0);
        const totalCredit = trialBalanceData.reduce((sum, item) => sum + item.credit, 0);
        return (
            <div>
                <h3 className="text-lg font-bold mb-2">ميزان المراجعة</h3>
                 <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50"><tr><th className={tableHeaderStyle}>الحساب</th><th className={tableHeaderStyle}>مدين</th><th className={tableHeaderStyle}>دائن</th></tr></thead>
                    <tbody>
                        {trialBalanceData.map((item, i) => <tr key={i}><td className={tableCellStyle}>{item.code} - {item.name}</td><td className={tableCellStyle}>{item.debit.toFixed(2)}</td><td className={tableCellStyle}>{item.credit.toFixed(2)}</td></tr>)}
                    </tbody>
                    <tfoot className="bg-gray-100 font-bold">
                        <tr><td className={tableCellStyle}>الإجمالي</td><td className={tableCellStyle}>{totalDebit.toFixed(2)}</td><td className={tableCellStyle}>{totalCredit.toFixed(2)}</td></tr>
                    </tfoot>
                 </table>
            </div>
        );
    };
    
    const GeneralLedger = () => {
         const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
         const ledgerEntries = useMemo(() => {
            if (!selectedAccount) return [];
            const entries: (JournalEntryItem & {date: string, description: string})[] = [];
            journalEntries.forEach(entry => {
                entry.items.forEach(item => {
                    if (item.accountId === selectedAccount) {
                        entries.push({...item, date: entry.date, description: entry.description});
                    }
                })
            });
            return entries.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
         }, [selectedAccount, journalEntries]);

        let runningBalance = 0;
        return (
            <div>
                 <h3 className="text-lg font-bold mb-2">دفتر الأستاذ العام</h3>
                 <select onChange={e => setSelectedAccount(e.target.value)} className={`${inputStyle} mb-4`}><option>اختر حساب</option>{accounts.sort((a,b) => a.code.localeCompare(b.code)).map(a=><option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}</select>
                 {selectedAccount && (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50"><tr><th className={tableHeaderStyle}>التاريخ</th><th className={tableHeaderStyle}>الوصف</th><th className={tableHeaderStyle}>مدين</th><th className={tableHeaderStyle}>دائن</th><th className={tableHeaderStyle}>الرصيد</th></tr></thead>
                        <tbody>
                            {ledgerEntries.map((item, i) => {
                                runningBalance += item.debit - item.credit;
                                return <tr key={i}><td className={tableCellStyle}>{item.date}</td><td className={tableCellStyle}>{item.description}</td><td className={tableCellStyle}>{item.debit.toFixed(2)}</td><td className={tableCellStyle}>{item.credit.toFixed(2)}</td><td className={tableCellStyle}>{runningBalance.toFixed(2)}</td></tr>
                            })}
                        </tbody>
                    </table>
                 )}
            </div>
        );
    };

    const IncomeStatement = () => {
        const calculateTotal = (accountType: 'revenue' | 'expense') => {
             return trialBalanceData.reduce((sum, item) => {
                const acc = accounts.find(a => a.code === item.code);
                if (acc && acc.type === accountType) {
                    return sum + (accountType === 'revenue' ? item.credit : item.debit);
                }
                return sum;
            }, 0);
        };

        const totalRevenue = calculateTotal('revenue');
        const totalExpense = calculateTotal('expense');
        const netIncome = totalRevenue - totalExpense;

        return (
            <div>
                <h3 className="text-lg font-bold mb-2 text-center">قائمة الدخل</h3>
                <div className="border p-4 rounded-lg max-w-lg mx-auto">
                    <div className="flex justify-between py-2 border-b"><span>الإيرادات</span><span>{totalRevenue.toFixed(2)}</span></div>
                    <div className="flex justify-between py-2 border-b"><span>المصروفات</span><span>({totalExpense.toFixed(2)})</span></div>
                    <div className={`flex justify-between py-2 font-bold ${netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}><span>صافي الربح/الخسارة</span><span>{netIncome.toFixed(2)}</span></div>
                </div>
            </div>
        );
    };

    const BalanceSheet = () => {
         const calculateTotalForType = (type: AccountType) => {
            return trialBalanceData.reduce((sum, item) => {
                const acc = accounts.find(a => a.code === item.code);
                if (acc && acc.type === type) {
                    return sum + (item.debit - item.credit);
                }
                return sum;
            }, 0);
        };

        const totalAssets = calculateTotalForType('asset');
        const totalLiabilities = calculateTotalForType('liability');
        const totalEquity = calculateTotalForType('equity');
        
        return (
            <div>
                 <h3 className="text-lg font-bold mb-2 text-center">الميزانية العمومية</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="border p-4 rounded-lg">
                        <h4 className="font-bold text-center border-b pb-2 mb-2">الأصول</h4>
                        {accounts.filter(a => a.type === 'asset').map(acc => {
                            const balance = trialBalanceData.find(b => b.code === acc.code);
                            return <div key={acc.id} className="flex justify-between py-1"><span className="text-sm">{acc.name}</span><span className="text-sm">{(balance?.debit || 0).toFixed(2)}</span></div>
                        })}
                        <div className="flex justify-between py-2 border-t mt-2 font-bold"><span>إجمالي الأصول</span><span>{totalAssets.toFixed(2)}</span></div>
                    </div>
                    <div className="border p-4 rounded-lg">
                        <h4 className="font-bold text-center border-b pb-2 mb-2">الالتزامات وحقوق الملكية</h4>
                        {accounts.filter(a => a.type === 'liability').map(acc => {
                            const balance = trialBalanceData.find(b => b.code === acc.code);
                            return <div key={acc.id} className="flex justify-between py-1"><span className="text-sm">{acc.name}</span><span className="text-sm">{(balance?.credit || 0).toFixed(2)}</span></div>
                        })}
                        <div className="flex justify-between py-1 border-t mt-2 font-semibold"><span>إجمالي الالتزامات</span><span>{Math.abs(totalLiabilities).toFixed(2)}</span></div>
                         {accounts.filter(a => a.type === 'equity').map(acc => {
                            const balance = trialBalanceData.find(b => b.code === acc.code);
                            return <div key={acc.id} className="flex justify-between py-1"><span className="text-sm">{acc.name}</span><span className="text-sm">{(balance?.credit || 0).toFixed(2)}</span></div>
                        })}
                         <div className="flex justify-between py-1 font-semibold"><span>إجمالي حقوق الملكية</span><span>{Math.abs(totalEquity).toFixed(2)}</span></div>
                         <div className="flex justify-between py-2 border-t mt-2 font-bold"><span>إجمالي الالتزامات وحقوق الملكية</span><span>{(Math.abs(totalLiabilities) + Math.abs(totalEquity)).toFixed(2)}</span></div>
                    </div>
                 </div>
            </div>
        )
    };

    const CashFlowStatement = () => {
        const netIncome = useMemo(() => {
             const totalRevenue = trialBalanceData.reduce((sum, item) => {
                const acc = accounts.find(a => a.code === item.code);
                if (acc && acc.type === 'revenue') return sum + item.credit;
                return sum;
            }, 0);
            const totalExpense = trialBalanceData.reduce((sum, item) => {
                const acc = accounts.find(a => a.code === item.code);
                if (acc && acc.type === 'expense') return sum + item.debit;
                return sum;
            }, 0);
            return totalRevenue - totalExpense;
        }, [trialBalanceData, accounts]);

        const depreciationExpense = useMemo(() => {
            const depreciationAccount = accounts.find(a => a.name.includes("مصروف الاهلاك"));
            if (!depreciationAccount) return 0;
            const balance = trialBalanceData.find(b => b.code === depreciationAccount.code);
            return balance ? balance.debit : 0;
        }, [accounts, trialBalanceData]);

        const cashFlowFromOps = netIncome + depreciationExpense;

        const cashFlowFromInvesting = -assets.reduce((sum, asset) => sum + asset.purchasePrice, 0);
        const capitalAccount = accounts.find(a => a.name.includes("رأس المال"));
        const capitalBalance = capitalAccount ? trialBalanceData.find(b => b.code === capitalAccount.code)?.credit || 0 : 0;
        const cashFlowFromFinancing = capitalBalance;

        const netCashFlow = cashFlowFromOps + cashFlowFromInvesting + cashFlowFromFinancing;

        return (
            <div>
                <h3 className="text-lg font-bold mb-2 text-center">قائمة التدفقات النقدية</h3>
                <div className="border p-4 rounded-lg max-w-2xl mx-auto space-y-4">
                    <div>
                        <h4 className="font-semibold text-gray-700">التدفقات النقدية من الأنشطة التشغيلية</h4>
                        <div className="flex justify-between py-1 border-b ms-4"><span className="text-sm">صافي الدخل</span><span>{netIncome.toFixed(2)}</span></div>
                        <div className="flex justify-between py-1 border-b ms-4"><span className="text-sm">تعديلات (مصروف الإهلاك)</span><span>{depreciationExpense.toFixed(2)}</span></div>
                        <div className="flex justify-between py-1 font-bold"><span className="text-sm">صافي النقد من الأنشطة التشغيلية</span><span>{cashFlowFromOps.toFixed(2)}</span></div>
                    </div>
                     <div>
                        <h4 className="font-semibold text-gray-700">التدفقات النقدية من الأنشطة الاستثمارية</h4>
                         <div className="flex justify-between py-1 border-b ms-4"><span className="text-sm">شراء أصول ثابتة</span><span>({Math.abs(cashFlowFromInvesting).toFixed(2)})</span></div>
                        <div className="flex justify-between py-1 font-bold"><span className="text-sm">صافي النقد من الأنشطة الاستثمارية</span><span>{cashFlowFromInvesting.toFixed(2)}</span></div>
                    </div>
                     <div>
                        <h4 className="font-semibold text-gray-700">التدفقات النقدية من الأنشطة التمويلية</h4>
                         <div className="flex justify-between py-1 border-b ms-4"><span className="text-sm">مساهمات رأس المال</span><span>{cashFlowFromFinancing.toFixed(2)}</span></div>
                        <div className="flex justify-between py-1 font-bold"><span className="text-sm">صافي النقد من الأنشطة التمويلية</span><span>{cashFlowFromFinancing.toFixed(2)}</span></div>
                    </div>
                    <div className="flex justify-between py-2 border-t mt-2 font-bold text-lg">
                        <span>صافي التغير في النقد</span>
                        <span className={netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}>{netCashFlow.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        );
    }

    const ChangesInEquityStatement = () => {
         const netIncome = useMemo(() => {
            const totalRevenue = trialBalanceData.reduce((sum, item) => {
                const acc = accounts.find(a => a.code === item.code);
                if (acc && acc.type === 'revenue') return sum + item.credit;
                return sum;
            }, 0);
            const totalExpense = trialBalanceData.reduce((sum, item) => {
                const acc = accounts.find(a => a.code === item.code);
                if (acc && acc.type === 'expense') return sum + item.debit;
                return sum;
            }, 0);
            return totalRevenue - totalExpense;
        }, [trialBalanceData, accounts]);

        const beginningEquity = useMemo(() => {
            let total = 0;
            const openingEntries = journalEntries.filter(j => j.type === 'opening');
            openingEntries.forEach(entry => {
                entry.items.forEach(item => {
                    const account = accounts.find(a => a.id === item.accountId);
                    if (account && account.type === 'equity') {
                        total += item.credit - item.debit;
                    }
                });
            });
            return total;
        }, [journalEntries, accounts]);

        const endingEquity = beginningEquity + netIncome;

        return (
             <div>
                <h3 className="text-lg font-bold mb-2 text-center">قائمة التغير في حقوق الملكية</h3>
                <div className="border p-4 rounded-lg max-w-lg mx-auto">
                    <div className="flex justify-between py-2 border-b"><span className="text-sm">رصيد حقوق الملكية أول المدة</span><span>{beginningEquity.toFixed(2)}</span></div>
                    <div className="flex justify-between py-2 border-b"><span className="text-sm">صافي الربح للفترة</span><span>{netIncome.toFixed(2)}</span></div>
                    <div className="flex justify-between py-2 font-bold"><span className="text-sm">رصيد حقوق الملكية آخر المدة</span><span>{endingEquity.toFixed(2)}</span></div>
                </div>
            </div>
        );
    }
    
    return (
        <div className="bg-white p-4 rounded-lg shadow-md mt-4">
             <div className="border-b border-gray-200 mb-4">
                <nav className="-mb-px flex space-x-4 overflow-x-auto" aria-label="Tabs">
                    <button onClick={() => setActiveReport('trial-balance')} className={`${activeReport === 'trial-balance' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'} whitespace-nowrap py-3 px-2 border-b-2 font-medium text-sm`}>ميزان المراجعة</button>
                    <button onClick={() => setActiveReport('general-ledger')} className={`${activeReport === 'general-ledger' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'} whitespace-nowrap py-3 px-2 border-b-2 font-medium text-sm`}>دفتر الأستاذ</button>
                    <button onClick={() => setActiveReport('income-statement')} className={`${activeReport === 'income-statement' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'} whitespace-nowrap py-3 px-2 border-b-2 font-medium text-sm`}>قائمة الدخل</button>
                    <button onClick={() => setActiveReport('balance-sheet')} className={`${activeReport === 'balance-sheet' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'} whitespace-nowrap py-3 px-2 border-b-2 font-medium text-sm`}>الميزانية العمومية</button>
                    <button onClick={() => setActiveReport('cash-flow')} className={`${activeReport === 'cash-flow' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'} whitespace-nowrap py-3 px-2 border-b-2 font-medium text-sm`}>قائمة التدفقات النقدية</button>
                    <button onClick={() => setActiveReport('changes-in-equity')} className={`${activeReport === 'changes-in-equity' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'} whitespace-nowrap py-3 px-2 border-b-2 font-medium text-sm`}>قائمة التغير فى حقوق الملكية</button>
                </nav>
            </div>
             {activeReport === 'trial-balance' && <TrialBalance />}
             {activeReport === 'general-ledger' && <GeneralLedger />}
             {activeReport === 'income-statement' && <IncomeStatement />}
             {activeReport === 'balance-sheet' && <BalanceSheet />}
             {activeReport === 'cash-flow' && <CashFlowStatement />}
             {activeReport === 'changes-in-equity' && <ChangesInEquityStatement />}
        </div>
    );
}

const AccountingPage: React.FC<{ companyId: string, section: string }> = ({ companyId, section }) => {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [custody, setCustody] = useState<Custody[]>([]);
    const [assets, setAssets] = useState<FixedAsset[]>([]);
    const [loading, setLoading] = useState(true);

    const inputStyle = "bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-600 focus:border-blue-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 disabled:bg-gray-200";
    const tableHeaderStyle = "px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider";
    const tableCellStyle = "px-6 py-4 whitespace-nowrap text-sm text-gray-900";

    const programSections: Record<string, string> = {
            'chart-of-accounts': 'دليل الحسابات',
            'journal-entries': 'القيود اليومية',
            'expenses': 'المصروفات',
            'custody': 'العهد',
            'assets': 'الأصول',
            'financial-statements': 'القوائم المالية',
        };

    useEffect(() => {
        setLoading(true);

        const collectionsToListen = {
            accounts: (data: any) => setAccounts(data),
            employees: (data: any) => setEmployees(data),
            journalEntries: (data: any) => setJournalEntries(data.sort((a: JournalEntry, b: JournalEntry) => new Date(b.date).getTime() - new Date(a.date).getTime())),
            expenses: (data: any) => setExpenses(data),
            custody: (data: any) => setCustody(data),
            assets: (data: any) => setAssets(data),
        };

        const unsubscribers = Object.entries(collectionsToListen).map(([colName, setter]) => {
            const collectionRef = collection(db, 'companies', companyId, colName);
            return onSnapshot(collectionRef, (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setter(data);
            }, (error) => {
                console.error(`Error fetching ${colName}:`, error);
            });
        });

        const initialFetch = async () => {
            try {
                await Promise.all(
                    Object.keys(collectionsToListen).map(colName => getDocs(collection(db, 'companies', companyId, colName)))
                );
            } catch (error) {
                console.error("Error during initial fetch:", error);
            } finally {
                setLoading(false);
            }
        };

        initialFetch();
        
        return () => unsubscribers.forEach(unsub => unsub());
    }, [companyId]);

    const accountsByType = useMemo(() => {
        const result: Record<AccountType, Account[]> = { asset: [], liability: [], equity: [], revenue: [], expense: [] };
        accounts.forEach(acc => {
            if (result[acc.type]) {
                result[acc.type].push(acc);
            }
        });
        return result;
    }, [accounts]);

    const createAutoJournalEntry = useCallback(async (entryData: Omit<JournalEntry, 'id' | 'isAutoGenerated'>) => {
        try {
            await addDoc(collection(db, 'companies', companyId, 'journalEntries'), {
                ...entryData,
                isAutoGenerated: true,
            });
        } catch (error) {
            console.error("Failed to create auto journal entry:", error);
        }
    }, [companyId]);

    const sharedProps = { companyId, accounts, employees, journalEntries, expenses, custody, assets, accountsByType, createAutoJournalEntry, inputStyle, tableHeaderStyle, tableCellStyle };

    const renderSection = () => {
        switch(section) {
            case 'chart-of-accounts': return <ChartOfAccountsComponent {...sharedProps} />;
            case 'journal-entries': return <JournalEntriesComponent {...sharedProps} />;
            case 'financial-statements': return <FinancialStatementsComponent {...sharedProps} />;
            case 'expenses': return <ExpensesComponent {...sharedProps} />;
            case 'custody': return <CustodyComponent {...sharedProps} />;
            case 'assets': return <AssetsComponent {...sharedProps} />;
            default:
                return (
                    <div className="text-center py-20 bg-white rounded-lg shadow-md mt-4">
                        <h2 className="text-2xl font-bold text-gray-800">الرجاء اختيار قسم</h2>
                        <p className="text-gray-500 mt-2">اختر أحد أقسام المحاسبة من الشريط الجانبي.</p>
                    </div>
                );
        }
    };
    
    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">
                برنامج الحسابات - {programSections[section] || ''}
            </h1>
            {loading ? <Spinner /> : renderSection()}
        </div>
    );
};

// --- HR PAGE AND SUBCOMPONENTS ---

const HRDashboard: React.FC = () => (
    <div className="bg-white p-4 rounded-lg shadow-md mt-4">
      <h2 className="text-xl font-bold">لوحة تحكم الموارد البشرية</h2>
      <p>هنا ستعرض إحصائيات سريعة حول الموظفين والتوظيف...</p>
    </div>
);

const EmployeesList: React.FC<{
    employees: Employee[];
    companyId: string;
    setSelectedEmployee: (e: Employee) => void;
    inputStyle: string;
    tableHeaderStyle: string;
    tableCellStyle: string;
}> = ({ employees, companyId, setSelectedEmployee, inputStyle, tableHeaderStyle, tableCellStyle }) => {
     const [isModalOpen, setIsModalOpen] = useState(false);
     const [currentEmployee, setCurrentEmployee] = useState<Partial<Employee>>({});

     return (
          <div className="bg-white p-4 rounded-lg shadow-md mt-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">قائمة الموظفين</h2>
                <button onClick={() => { setCurrentEmployee({}); setIsModalOpen(true); }} className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center gap-2"><PlusIcon className="w-5 h-5"/> إضافة موظف</button>
            </div>
            {employees.length > 0 ? (
                 <table className="min-w-full divide-y divide-gray-200">
                     <thead className="bg-gray-50"><tr><th className={tableHeaderStyle}>الاسم</th><th className={tableHeaderStyle}>المنصب</th><th className={tableHeaderStyle}>الحالة</th><th className={tableHeaderStyle}>إجراء</th></tr></thead>
                     <tbody>
                         {employees.map(emp => (
                             <tr key={emp.id}>
                                <td className={tableCellStyle}>{emp.name}</td>
                                <td className={tableCellStyle}>{emp.position}</td>
                                <td className={tableCellStyle}><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${emp.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{emp.status === 'active' ? 'نشط' : 'غير نشط'}</span></td>
                                <td className={tableCellStyle}><button onClick={() => setSelectedEmployee(emp)} className="text-blue-600 hover:underline">عرض الملف الشخصي</button></td>
                            </tr>
                         ))}
                     </tbody>
                 </table>
            ) : (
                <div className="text-center py-10 border-dashed border-2 border-gray-300 rounded-lg">
                    <IdentificationIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">لا يوجد موظفون</h3>
                    <p className="mt-1 text-sm text-gray-500">ابدأ بإضافة أول موظف لشركتك.</p>
                    <div className="mt-6">
                        <button onClick={() => { setCurrentEmployee({}); setIsModalOpen(true); }} className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                            إضافة موظف
                        </button>
                    </div>
                </div>
            )}
            <EmployeeModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSaveSuccess={() => {}}
                initialData={currentEmployee}
                companyId={companyId}
                inputStyle={inputStyle}
            />
        </div>
     );
};

const HRRecruitment: React.FC<{ companyId: string, jobOpenings: JobOpening[], candidates: Candidate[], inputStyle: string, tableHeaderStyle: string, tableCellStyle: string }> = ({ companyId, jobOpenings, candidates, inputStyle, tableHeaderStyle, tableCellStyle }) => {
    return (
         <div className="bg-white p-4 rounded-lg shadow-md mt-4">
            <h2 className="text-xl font-bold mb-4">التوظيف</h2>
            <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold">الوظائف الشاغرة</h3>
                     <button className="bg-blue-600 text-white py-1 px-3 rounded-lg text-sm">+ إضافة وظيفة</button>
                </div>
                {jobOpenings.length > 0 ? (
                     <table className="min-w-full divide-y divide-gray-200"><thead className="bg-gray-50"><tr><th className={tableHeaderStyle}>المسمى</th><th className={tableHeaderStyle}>القسم</th><th className={tableHeaderStyle}>الحالة</th></tr></thead><tbody>{jobOpenings.map(j=><tr key={j.id}><td className={tableCellStyle}>{j.title}</td><td className={tableCellStyle}>{j.department}</td><td className={tableCellStyle}>{j.status}</td></tr>)}</tbody></table>
                ) : (
                    <p className="text-center text-gray-500 py-4 border-dashed border-2 rounded-lg">لا توجد وظائف شاغرة حالياً.</p>
                )}
            </div>
             <div>
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold">المرشحون</h3>
                     <button className="bg-blue-600 text-white py-1 px-3 rounded-lg text-sm">+ إضافة مرشح</button>
                </div>
                {candidates.length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-200"><thead className="bg-gray-50"><tr><th className={tableHeaderStyle}>الاسم</th><th className={tableHeaderStyle}>البريد الإلكتروني</th><th className={tableHeaderStyle}>الحالة</th></tr></thead><tbody>{candidates.map(c=><tr key={c.id}><td className={tableCellStyle}>{c.name}</td><td className={tableCellStyle}>{c.email}</td><td className={tableCellStyle}>{c.status}</td></tr>)}</tbody></table>
                ) : (
                     <p className="text-center text-gray-500 py-4 border-dashed border-2 rounded-lg">لا يوجد مرشحون حالياً.</p>
                )}
            </div>
        </div>
    )
};
const HRAttendance: React.FC<{ companyId: string, attendance: AttendanceRecord[], employees: Employee[], inputStyle: string, tableHeaderStyle: string, tableCellStyle: string }> = ({ companyId, attendance, employees, inputStyle, tableHeaderStyle, tableCellStyle }) => {
    return (
         <div className="bg-white p-4 rounded-lg shadow-md mt-4">
            <div className="flex justify-between items-center mb-4">
                 <h2 className="text-xl font-bold">سجل الحضور والانصراف</h2>
                 <button className="bg-blue-600 text-white py-2 px-4 rounded-lg">+ تسجيل حضور</button>
            </div>
            {attendance.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200"><thead className="bg-gray-50"><tr><th className={tableHeaderStyle}>الموظف</th><th className={tableHeaderStyle}>التاريخ</th><th className={tableHeaderStyle}>الحضور</th><th className={tableHeaderStyle}>الانصراف</th></tr></thead><tbody>{attendance.map(a=><tr key={a.id}><td className={tableCellStyle}>{a.employeeName}</td><td className={tableCellStyle}>{a.date}</td><td className={tableCellStyle}>{a.checkIn}</td><td className={tableCellStyle}>{a.checkOut}</td></tr>)}</tbody></table>
            ) : (
                 <div className="text-center py-10 border-dashed border-2 border-gray-300 rounded-lg">
                    <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">لا توجد سجلات</h3>
                    <p className="mt-1 text-sm text-gray-500">لم يتم تسجيل أي حركة حضور أو انصراف بعد.</p>
                </div>
            )}
        </div>
    );
};
const HRLeaves: React.FC<{ companyId: string, leaves: LeaveRequest[], employees: Employee[], inputStyle: string, tableHeaderStyle: string, tableCellStyle: string }> = ({ companyId, leaves, employees, inputStyle, tableHeaderStyle, tableCellStyle }) => {
    return (
         <div className="bg-white p-4 rounded-lg shadow-md mt-4">
             <div className="flex justify-between items-center mb-4">
                 <h2 className="text-xl font-bold">طلبات الإجازات</h2>
                 <button className="bg-blue-600 text-white py-2 px-4 rounded-lg">+ طلب إجازة</button>
            </div>
            {leaves.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200"><thead className="bg-gray-50"><tr><th className={tableHeaderStyle}>الموظف</th><th className={tableHeaderStyle}>النوع</th><th className={tableHeaderStyle}>من</th><th className={tableHeaderStyle}>إلى</th><th className={tableHeaderStyle}>الحالة</th></tr></thead><tbody>{leaves.map(l=><tr key={l.id}><td className={tableCellStyle}>{l.employeeName}</td><td className={tableCellStyle}>{l.leaveType}</td><td className={tableCellStyle}>{l.startDate}</td><td className={tableCellStyle}>{l.endDate}</td><td className={tableCellStyle}>{l.status}</td></tr>)}</tbody></table>
            ) : (
                <div className="text-center py-10 border-dashed border-2 border-gray-300 rounded-lg">
                    <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">لا توجد طلبات إجازة</h3>
                    <p className="mt-1 text-sm text-gray-500">لم يتم تقديم أي طلبات إجازة بعد.</p>
                </div>
            )}
        </div>
    );
};
const HRPenaltiesRewards: React.FC<{ companyId: string, penalties: Penalty[], rewards: Reward[], employees: Employee[], inputStyle: string, tableHeaderStyle: string, tableCellStyle: string }> = ({ companyId, penalties, rewards, employees, inputStyle, tableHeaderStyle, tableCellStyle }) => {
    return (
        <div className="bg-white p-4 rounded-lg shadow-md mt-4">
            <h2 className="text-xl font-bold mb-4">الجزاءات والمكافآت</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                     <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-semibold">الجزاءات</h3>
                         <button className="bg-red-500 text-white py-1 px-3 rounded-lg text-sm">+ إضافة جزاء</button>
                    </div>
                    {penalties.length > 0 ? (
                        <table className="min-w-full divide-y divide-gray-200"><thead className="bg-gray-50"><tr><th className={tableHeaderStyle}>الموظف</th><th className={tableHeaderStyle}>التاريخ</th><th className={tableHeaderStyle}>المبلغ</th></tr></thead><tbody>{penalties.map(p=><tr key={p.id}><td className={tableCellStyle}>{p.employeeName}</td><td className={tableCellStyle}>{p.date}</td><td className={tableCellStyle}>{p.amount?.toFixed(2) || '-'}</td></tr>)}</tbody></table>
                    ) : (
                        <p className="text-center text-gray-500 py-4 border-dashed border-2 rounded-lg">لا توجد جزاءات.</p>
                    )}
                </div>
                 <div>
                     <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-semibold">المكافآت</h3>
                         <button className="bg-green-500 text-white py-1 px-3 rounded-lg text-sm">+ إضافة مكافأة</button>
                    </div>
                    {rewards.length > 0 ? (
                        <table className="min-w-full divide-y divide-gray-200"><thead className="bg-gray-50"><tr><th className={tableHeaderStyle}>الموظف</th><th className={tableHeaderStyle}>التاريخ</th><th className={tableHeaderStyle}>المبلغ</th></tr></thead><tbody>{rewards.map(r=><tr key={r.id}><td className={tableCellStyle}>{r.employeeName}</td><td className={tableCellStyle}>{r.date}</td><td className={tableCellStyle}>{r.amount?.toFixed(2) || '-'}</td></tr>)}</tbody></table>
                    ) : (
                        <p className="text-center text-gray-500 py-4 border-dashed border-2 rounded-lg">لا توجد مكافآت.</p>
                    )}
                </div>
            </div>
        </div>
    );
};
const HRPayroll: React.FC<{ companyId: string, payrolls: Payroll[], employees: Employee[], inputStyle: string, tableHeaderStyle: string, tableCellStyle: string }> = ({ companyId, payrolls, employees, inputStyle, tableHeaderStyle, tableCellStyle }) => {
     const [isModalOpen, setIsModalOpen] = useState(false);
     
    return (
         <div className="bg-white p-4 rounded-lg shadow-md mt-4">
            <div className="flex justify-between items-center mb-4">
                 <h2 className="text-xl font-bold">مسير الرواتب</h2>
                 <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white py-2 px-4 rounded-lg">+ إنشاء مسير رواتب</button>
            </div>
            {payrolls.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200"><thead className="bg-gray-50"><tr><th className={tableHeaderStyle}>الشهر/السنة</th><th className={tableHeaderStyle}>الحالة</th><th className={tableHeaderStyle}>صافي المدفوع</th><th className={tableHeaderStyle}>تاريخ الإنشاء</th></tr></thead><tbody>{payrolls.map(p=><tr key={p.id}><td className={tableCellStyle}>{p.month}/{p.year}</td><td className={tableCellStyle}>{p.status}</td><td className={tableCellStyle}>{p.totalNetPayable.toFixed(2)}</td><td className={tableCellStyle}>{new Date(p.createdAt).toLocaleDateString()}</td></tr>)}</tbody></table>
            ) : (
                <div className="text-center py-10 border-dashed border-2 border-gray-300 rounded-lg">
                    <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">لا يوجد مسيرات رواتب</h3>
                    <p className="mt-1 text-sm text-gray-500">قم بإنشاء أول مسير رواتب لموظفيك.</p>
                </div>
            )}
            <RunPayrollModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onRunSuccess={() => {}}
                companyId={companyId}
                payrolls={payrolls}
                employees={employees}
                inputStyle={inputStyle}
            />
        </div>
    );
};

const HRPage: React.FC<{ companyId: string, section: string }> = ({ companyId, section }) => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [jobOpenings, setJobOpenings] = useState<JobOpening[]>([]);
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
    const [penalties, setPenalties] = useState<Penalty[]>([]);
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [payrolls, setPayrolls] = useState<Payroll[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [loading, setLoading] = useState(true);

    const inputStyle = "bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-600 focus:border-blue-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 disabled:bg-gray-200";
    const tableHeaderStyle = "px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right";
    const tableCellStyle = "px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right";

    const programSections: Record<string, string> = {
        'dashboard': 'لوحة التحكم',
        'employees': 'الموظفون',
        'recruitment': 'التوظيف',
        'attendance': 'الحضور والانصراف',
        'leaves': 'الإجازات',
        'penalties-rewards': 'الجزاءات والمكافآت',
        'payroll': 'مسير الرواتب',
    };

    useEffect(() => {
        setLoading(true);
        const collectionsToListen = {
            employees: (data: any) => setEmployees(data),
            jobOpenings: (data: any) => setJobOpenings(data),
            candidates: (data: any) => setCandidates(data),
            attendance: (data: any) => setAttendance(data),
            leaveRequests: (data: any) => setLeaves(data),
            penalties: (data: any) => setPenalties(data),
            rewards: (data: any) => setRewards(data),
            payrolls: (data: any) => setPayrolls(data.sort((a: Payroll, b: Payroll) => (b.year - a.year) || (b.month - a.month))),
        };

        const unsubscribers = Object.entries(collectionsToListen).map(([colName, setter]) => {
            const collectionRef = collection(db, 'companies', companyId, colName);
            return onSnapshot(collectionRef, (snapshot) => {
                setter(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
            });
        });

        const initialFetch = async () => {
            try {
                await Promise.all(Object.keys(collectionsToListen).map(col => getDocs(collection(db, 'companies', companyId, col))));
            } catch (error) {
                console.error("Error fetching HR data:", error);
            } finally {
                setLoading(false);
            }
        };

        initialFetch();
        return () => unsubscribers.forEach(unsub => unsub());
    }, [companyId]);


    if (selectedEmployee) {
        return <HREmployeeProfile employee={selectedEmployee} companyId={companyId} onBack={() => setSelectedEmployee(null)} />;
    }
    
    const sharedProps = { companyId, employees, jobOpenings, candidates, attendance, leaves, penalties, rewards, payrolls, inputStyle, tableHeaderStyle, tableCellStyle };
    
    const renderSection = () => {
        switch(section) {
            case 'dashboard': return <HRDashboard />;
            case 'employees': return <EmployeesList {...{employees, companyId, setSelectedEmployee, inputStyle, tableHeaderStyle, tableCellStyle}} />;
            case 'recruitment': return <HRRecruitment {...sharedProps} />;
            case 'attendance': return <HRAttendance {...sharedProps} />;
            case 'leaves': return <HRLeaves {...sharedProps} />;
            case 'penalties-rewards': return <HRPenaltiesRewards {...sharedProps} />;
            case 'payroll': return <HRPayroll {...sharedProps} />;
            default: return <HRDashboard />;
        }
    }

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">
                برنامج الموارد البشرية - {programSections[section] || 'لوحة التحكم'}
            </h1>
             {loading ? <Spinner /> : renderSection() }
        </div>
    );
};

// --- SALES PAGE AND SUBCOMPONENTS ---

const CustomersComponent: React.FC<{ companyId: string; customers: Customer[]; inputStyle: string }> = ({ companyId, customers, inputStyle }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentCustomer, setCurrentCustomer] = useState<Partial<Customer> | null>(null);

    return (
        <div className="bg-white p-4 rounded-lg shadow-md mt-4">
            <div className="flex justify-between items-center mb-4">
                 <h2 className="text-xl font-bold">العملاء</h2>
                 <button onClick={() => { setCurrentCustomer({}); setIsModalOpen(true); }} className="bg-blue-600 text-white py-2 px-4 rounded-lg">+ إضافة عميل</button>
            </div>
            {customers.length > 0 ? (
                <p>جدول العملاء سيعرض هنا...</p>
            ) : (
                <div className="text-center py-10 border-dashed border-2 border-gray-300 rounded-lg">
                    <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">لا يوجد عملاء</h3>
                    <p className="mt-1 text-sm text-gray-500">ابدأ بإضافة أول عميل لشركتك.</p>
                </div>
            )}
            <CustomerModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSaveSuccess={() => {}}
                initialData={currentCustomer}
                companyId={companyId}
                inputStyle={inputStyle}
            />
        </div>
    );
};
const InvoicesComponent: React.FC<{ companyId: string; invoices: SalesInvoice[]; customers: Customer[]; inputStyle: string }> = ({ companyId, invoices, customers, inputStyle }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
         <div className="bg-white p-4 rounded-lg shadow-md mt-4">
            <div className="flex justify-between items-center mb-4">
                 <h2 className="text-xl font-bold">فواتير المبيعات</h2>
                 <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white py-2 px-4 rounded-lg">+ إضافة فاتورة</button>
            </div>
             {invoices.length > 0 ? (
                <p>جدول الفواتير سيعرض هنا...</p>
            ) : (
                <div className="text-center py-10 border-dashed border-2 border-gray-300 rounded-lg">
                    <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">لا توجد فواتير</h3>
                    <p className="mt-1 text-sm text-gray-500">ابدأ بإنشاء أول فاتورة مبيعات.</p>
                </div>
            )}
            <SalesInvoiceModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSaveSuccess={() => {}}
                customers={customers}
                companyId={companyId}
                inputStyle={inputStyle}
            />
        </div>
    );
};
const ReceiptsComponent: React.FC<{ companyId: string; receipts: ReceiptVoucher[]; customers: Customer[]; accounts: Account[]; inputStyle: string; createAutoJournalEntry: (entryData: Omit<JournalEntry, 'id' | 'isAutoGenerated'>) => Promise<void>; }> = ({ companyId, receipts, customers, accounts, inputStyle, createAutoJournalEntry }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
         <div className="bg-white p-4 rounded-lg shadow-md mt-4">
            <div className="flex justify-between items-center mb-4">
                 <h2 className="text-xl font-bold">سندات القبض</h2>
                 <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white py-2 px-4 rounded-lg">+ إضافة سند قبض</button>
            </div>
            {receipts.length > 0 ? (
                <p>جدول سندات القبض سيعرض هنا...</p>
            ) : (
                <div className="text-center py-10 border-dashed border-2 border-gray-300 rounded-lg">
                    <ReceiptPercentIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">لا توجد سندات قبض</h3>
                    <p className="mt-1 text-sm text-gray-500">ابدأ بإنشاء أول سند قبض.</p>
                </div>
            )}
            <ReceiptVoucherModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSaveSuccess={() => {}}
                customers={customers}
                accounts={accounts}
                companyId={companyId}
                inputStyle={inputStyle}
                createAutoJournalEntry={createAutoJournalEntry}
            />
        </div>
    );
};

const SalesPage: React.FC<{ companyId: string, section: string }> = ({ companyId, section }) => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
    const [receipts, setReceipts] = useState<ReceiptVoucher[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);

    const inputStyle = "bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-600 focus:border-blue-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 disabled:bg-gray-200";

    const programSections: Record<string, string> = {
        'customers': 'العملاء',
        'invoices': 'فواتير المبيعات',
        'receipts': 'سندات القبض',
    };

    useEffect(() => {
        setLoading(true);
        const collectionsToListen = {
            customers: (data: any) => setCustomers(data),
            salesInvoices: (data: any) => setInvoices(data),
            receiptVouchers: (data: any) => setReceipts(data),
            accounts: (data: any) => setAccounts(data),
        };

        const unsubscribers = Object.entries(collectionsToListen).map(([colName, setter]) => {
            const collectionRef = collection(db, 'companies', companyId, colName);
            return onSnapshot(collectionRef, (snapshot) => {
                setter(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
            });
        });

        const initialFetch = async () => {
            try {
                await Promise.all(
                    Object.keys(collectionsToListen).map(col => getDocs(collection(db, 'companies', companyId, col)))
                );
            } catch (error) {
                console.error("Error fetching sales data:", error);
            } finally {
                setLoading(false);
            }
        };

        initialFetch();
        return () => unsubscribers.forEach(unsub => unsub());
    }, [companyId]);
    
    const createAutoJournalEntry = useCallback(async (entryData: Omit<JournalEntry, 'id' | 'isAutoGenerated'>) => {
        try {
            await addDoc(collection(db, 'companies', companyId, 'journalEntries'), {
                ...entryData,
                isAutoGenerated: true,
            });
        } catch (error) {
            console.error("Failed to create auto journal entry:", error);
        }
    }, [companyId]);

    const renderSection = () => {
        switch(section) {
            case 'customers': return <CustomersComponent companyId={companyId} customers={customers} inputStyle={inputStyle} />;
            case 'invoices': return <InvoicesComponent companyId={companyId} invoices={invoices} customers={customers} inputStyle={inputStyle} />;
            case 'receipts': return <ReceiptsComponent companyId={companyId} receipts={receipts} customers={customers} accounts={accounts} inputStyle={inputStyle} createAutoJournalEntry={createAutoJournalEntry} />;
            default: return <CustomersComponent companyId={companyId} customers={customers} inputStyle={inputStyle} />;
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">
                برنامج المبيعات - {programSections[section] || 'العملاء'}
            </h1>
            {loading ? <Spinner /> : renderSection()}
        </div>
    );
};

// --- PROJECTS PAGE AND SUBCOMPONENTS ---

const ProjectsList: React.FC<{ companyId: string, projects: Project[], tableHeaderStyle: string, tableCellStyle: string }> = ({ companyId, projects, tableHeaderStyle, tableCellStyle }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentProject, setCurrentProject] = useState<Partial<Project> | null>(null);

    const statusStyles: Record<string, string> = {
        'planning': 'bg-gray-100 text-gray-800',
        'in-progress': 'bg-blue-100 text-blue-800',
        'completed': 'bg-green-100 text-green-800',
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow-md mt-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">المشاريع</h2>
                <button onClick={() => { setCurrentProject({}); setIsModalOpen(true); }} className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center gap-2"><PlusIcon className="w-5 h-5"/> إضافة مشروع</button>
            </div>
            {projects.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50"><tr><th className={tableHeaderStyle}>اسم المشروع</th><th className={tableHeaderStyle}>الحالة</th><th className={tableHeaderStyle}>تاريخ البدء</th><th className={tableHeaderStyle}>تاريخ الانتهاء</th></tr></thead>
                    <tbody>
                        {projects.map(proj => (
                            <tr key={proj.id}>
                                <td className={tableCellStyle}>{proj.name}</td>
                                <td className={tableCellStyle}><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusStyles[proj.status]}`}>{proj.status}</span></td>
                                <td className={tableCellStyle}>{proj.startDate}</td>
                                <td className={tableCellStyle}>{proj.endDate}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <div className="text-center py-10 border-dashed border-2 border-gray-300 rounded-lg">
                    <FolderIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">لا توجد مشاريع</h3>
                    <p className="mt-1 text-sm text-gray-500">ابدأ بإنشاء مشروعك الأول.</p>
                </div>
            )}
            <ProjectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSaveSuccess={() => {}} initialData={currentProject} companyId={companyId} inputStyle={"bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-600 focus:border-blue-600 block w-full p-2.5"} />
        </div>
    );
};

const TasksList: React.FC<{ companyId: string, tasks: Task[], projects: Project[], employees: Employee[], tableHeaderStyle: string, tableCellStyle: string }> = ({ companyId, tasks, projects, employees, tableHeaderStyle, tableCellStyle }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentTask, setCurrentTask] = useState<Partial<Task> | null>(null);
    
    return (
        <div className="bg-white p-4 rounded-lg shadow-md mt-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">المهام</h2>
                <button onClick={() => { setCurrentTask({}); setIsModalOpen(true); }} className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center gap-2"><PlusIcon className="w-5 h-5"/> إضافة مهمة</button>
            </div>
             {tasks.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50"><tr><th className={tableHeaderStyle}>المهمة</th><th className={tableHeaderStyle}>المشروع</th><th className={tableHeaderStyle}>المسؤول</th><th className={tableHeaderStyle}>تاريخ الاستحقاق</th><th className={tableHeaderStyle}>الحالة</th></tr></thead>
                    <tbody>
                        {tasks.map(task => (
                            <tr key={task.id}>
                                <td className={tableCellStyle}>{task.name}</td>
                                <td className={tableCellStyle}>{task.projectName}</td>
                                <td className={tableCellStyle}>{task.assigneeName || 'غير معين'}</td>
                                <td className={tableCellStyle}>{task.dueDate}</td>
                                <td className={tableCellStyle}>{task.status}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             ) : (
                <div className="text-center py-10 border-dashed border-2 border-gray-300 rounded-lg">
                    <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">لا توجد مهام</h3>
                     <p className="mt-1 text-sm text-gray-500">ابدأ بإضافة مهمتك الأولى.</p>
                </div>
            )}
            <TaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSaveSuccess={() => {}} initialData={currentTask} companyId={companyId} projects={projects} employees={employees} inputStyle={"bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-600 focus:border-blue-600 block w-full p-2.5"} />
        </div>
    );
};

const ProjectsPage: React.FC<{ companyId: string, section: string }> = ({ companyId, section }) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);

    const tableHeaderStyle = "px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right";
    const tableCellStyle = "px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right";

    const programSections: Record<string, string> = {
        'projects': 'المشاريع',
        'tasks': 'المهام',
    };

    useEffect(() => {
        setLoading(true);
        const collectionsToListen = {
            projects: setProjects,
            tasks: setTasks,
            employees: setEmployees,
        };

        const unsubscribers = Object.entries(collectionsToListen).map(([colName, setter]) => 
            onSnapshot(collection(db, 'companies', companyId, colName), snapshot => 
                setter(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)))
            )
        );

        const initialFetch = async () => {
            try {
                await Promise.all(Object.keys(collectionsToListen).map(col => getDocs(collection(db, 'companies', companyId, col))));
            } catch(e) { console.error(e); }
            finally { setLoading(false); }
        };
        initialFetch();

        return () => unsubscribers.forEach(unsub => unsub());
    }, [companyId]);
    
    const renderSection = () => {
        switch(section) {
            case 'projects': return <ProjectsList companyId={companyId} projects={projects} tableHeaderStyle={tableHeaderStyle} tableCellStyle={tableCellStyle} />;
            case 'tasks': return <TasksList companyId={companyId} tasks={tasks} projects={projects} employees={employees} tableHeaderStyle={tableHeaderStyle} tableCellStyle={tableCellStyle} />;
            default: return <ProjectsList companyId={companyId} projects={projects} tableHeaderStyle={tableHeaderStyle} tableCellStyle={tableCellStyle} />;
        }
    };
    
    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">
                برنامج إدارة المشاريع - {programSections[section] || 'المشاريع'}
            </h1>
            {loading ? <Spinner /> : renderSection()}
        </div>
    );
};

// --- SETTINGS PAGE AND SUBCOMPONENTS ---
const CompanyDetails: React.FC<{company: Company; onCompanyUpdate: () => void; inputStyle: string;}> = ({ company, onCompanyUpdate, inputStyle }) => {
    const [companyData, setCompanyData] = useState(company);
    const [saving, setSaving] = useState(false);
    
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { id, ...data } = companyData;
            await updateDoc(doc(db, 'companies', id), data);
            onCompanyUpdate();
            alert("تم حفظ بيانات الشركة بنجاح!");
        } catch(error) { console.error(error); }
        finally { setSaving(false); }
    }

    return (
        <div className="bg-white p-4 rounded-lg shadow-md mt-4 max-w-2xl">
            <h2 className="text-xl font-bold mb-4">بيانات الشركة</h2>
            <form onSubmit={handleSave} className="space-y-4">
                <input value={companyData.name} onChange={e => setCompanyData({...companyData, name: e.target.value})} className={inputStyle}/>
                <input value={companyData.email || ''} onChange={e => setCompanyData({...companyData, email: e.target.value})} className={inputStyle} placeholder="البريد الإلكتروني"/>
                <input value={companyData.phone || ''} onChange={e => setCompanyData({...companyData, phone: e.target.value})} className={inputStyle} placeholder="الهاتف"/>
                <input value={companyData.address || ''} onChange={e => setCompanyData({...companyData, address: e.target.value})} className={inputStyle} placeholder="العنوان"/>
                <button type="submit" disabled={saving} className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving ? '...' : 'حفظ التغييرات'}</button>
            </form>
        </div>
    );
};
const FinancialSettings: React.FC<{company: Company; onCompanyUpdate: () => void; inputStyle: string;}> = ({ company, onCompanyUpdate, inputStyle }) => {
     const [companyData, setCompanyData] = useState(company);
    const [saving, setSaving] = useState(false);
    
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { id, ...data } = companyData;
            await updateDoc(doc(db, 'companies', id), data);
            onCompanyUpdate();
            alert("تم حفظ الإعدادات المالية بنجاح!");
        } catch(error) { console.error(error); }
        finally { setSaving(false); }
    }
    return (
        <div className="bg-white p-4 rounded-lg shadow-md mt-4 max-w-2xl">
            <h2 className="text-xl font-bold mb-4">الإعدادات المالية</h2>
             <form onSubmit={handleSave} className="space-y-4">
                 <input value={companyData.currency || ''} onChange={e => setCompanyData({...companyData, currency: e.target.value})} className={inputStyle} placeholder="العملة"/>
                 <input value={companyData.taxNumber || ''} onChange={e => setCompanyData({...companyData, taxNumber: e.target.value})} className={inputStyle} placeholder="الرقم الضريبي"/>
                 <button type="submit" disabled={saving} className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving ? '...' : 'حفظ التغييرات'}</button>
             </form>
        </div>
    );
};

const CompanyMembers: React.FC<{ company: Company; user: AppUser; inputStyle: string; }> = ({ company, user, inputStyle }) => {
    const [members, setMembers] = useState<CompanyMember[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(true);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

    useEffect(() => {
        setLoadingMembers(true);
        const membersCol = collection(db, 'companies', company.id, 'members');
        const unsub = onSnapshot(membersCol, (snapshot) => {
            const memberList = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as CompanyMember));
            setMembers(memberList);
            setLoadingMembers(false);
        });
        return () => unsub();
    }, [company.id]);

    const canManageMembers = user.role === 'owner' || user.role === 'admin';

    return (
        <div className="bg-white p-4 rounded-lg shadow-md mt-4 max-w-2xl">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">أعضاء الفريق</h2>
                {canManageMembers && (
                    <button onClick={() => setIsInviteModalOpen(true)} className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center gap-2">
                        <PlusIcon className="w-5 h-5"/> دعوة عضو
                    </button>
                )}
            </div>
            {loadingMembers ? <Spinner /> : (
                <div className="space-y-2">
                    {members.map(member => (
                        <div key={member.uid} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <div>
                                <p className="font-semibold">{member.email}</p>
                                <p className="text-sm text-gray-500 capitalize">{member.role === 'owner' ? 'مالك' : 'عضو'}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <InviteMemberModal
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
                companyId={company.id}
                currentMembers={members}
                inputStyle={inputStyle}
            />
        </div>
    );
};
    
const SettingsPage: React.FC<{ company: Company, user: AppUser, section: string, onCompanyUpdate: () => void }> = ({ company, user, section, onCompanyUpdate }) => {
    const inputStyle = "bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-600 focus:border-blue-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 disabled:bg-gray-200";

    const programSections: Record<string, string> = {
        'company-details': 'بيانات الشركة',
        'team-members': 'أعضاء الفريق',
        'financial-settings': 'الإعدادات المالية',
    };

    const renderSection = () => {
        switch(section) {
            case 'company-details': return <CompanyDetails {...{company, onCompanyUpdate, inputStyle}} />;
            case 'team-members': return <CompanyMembers {...{company, user, inputStyle}} />;
            case 'financial-settings': return <FinancialSettings {...{company, onCompanyUpdate, inputStyle}} />;
            default: return <CompanyDetails {...{company, onCompanyUpdate, inputStyle}} />;
        }
    }

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">
                الإعدادات - {programSections[section] || 'بيانات الشركة'}
            </h1>
            {renderSection()}
        </div>
    );
};


const HREmployeeProfile: React.FC<{ employee: Employee; companyId: string; onBack: () => void }> = ({ employee, companyId, onBack }) => {
    const [activeTab, setActiveTab] = useState('attendance');
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
    const [penalties, setPenalties] = useState<Penalty[]>([]);
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [payrolls, setPayrolls] = useState<Payroll[]>([]);
    const [loading, setLoading] = useState(true);

    const tableHeaderStyle = "px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider";
    const tableCellStyle = "px-6 py-4 whitespace-nowrap text-sm text-gray-900";


    useEffect(() => {
        setLoading(true);
        const fetchData = async () => {
            const collectionsToFetch = {
                attendance: 'attendance',
                leaves: 'leaveRequests',
                penalties: 'penalties',
                rewards: 'rewards',
            };
            const promises = Object.entries(collectionsToFetch).map(async ([key, colName]) => {
                const q = query(collection(db, 'companies', companyId, colName), where('employeeId', '==', employee.id));
                const snapshot = await getDocs(q);
                return { [key]: snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any)) };
            });

            const payrollsCol = collection(db, 'companies', companyId, 'payrolls');
            const payrollsSnapshot = await getDocs(payrollsCol);
            const allPayrolls = payrollsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Payroll));
            setPayrolls(allPayrolls);
            
            const results = await Promise.all(promises);
            const data: any = results.reduce((acc, curr) => ({ ...acc, ...curr }), {});
            
            setAttendance(data.attendance || []);
            setLeaves(data.leaves || []);
            setPenalties(data.penalties || []);
            setRewards(data.rewards || []);

            setLoading(false);
        };
        fetchData();
    }, [companyId, employee.id]);

    const attendanceByYearMonth = useMemo(() => {
        const processed: Record<string, Record<string, number>> = {};
        attendance.forEach(record => {
            const date = new Date(record.date);
            const year = date.getFullYear().toString();
            const month = (date.getMonth() + 1).toString();
            if (!processed[year]) {
                processed[year] = {};
            }
            if (!processed[year][month]) {
                processed[year][month] = 0;
            }
            processed[year][month]++;
        });
        return processed;
    }, [attendance]);
    
    const employeePayslips = useMemo(() => {
        const slips: { year: number; month: number; payslip: Payslip }[] = [];
        payrolls.forEach(payroll => {
            const payslip = payroll.payslips.find(p => p.employeeId === employee.id);
            if (payslip) {
                slips.push({ year: payroll.year, month: payroll.month, payslip });
            }
        });
        return slips.sort((a, b) => (b.year - a.year) || (b.month - a.month));
    }, [payrolls, employee.id]);

    const months = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
    
    const TabButton: React.FC<{ tabName: string; label: string }> = ({ tabName, label }) => (
        <button
            onClick={() => setActiveTab(tabName)}
            className={`${
                activeTab === tabName
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
        >
            {label}
        </button>
    );

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <button onClick={onBack} className="text-blue-600 hover:underline mb-4">&larr; العودة إلى قائمة الموظفين</button>
            <div className="mb-6">
                <h2 className="text-3xl font-bold text-gray-800">{employee.name}</h2>
                <p className="text-md text-gray-500">{employee.position}</p>
            </div>
            
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <TabButton tabName="attendance" label="الحضور والانصراف" />
                    <TabButton tabName="leaves" label="الإجازات" />
                    <TabButton tabName="penalties" label="الجزاءات" />
                    <TabButton tabName="rewards" label="المكافآت" />
                    <TabButton tabName="payroll" label="سجل الراتب" />
                </nav>
            </div>

            <div className="mt-6">
                {loading ? <Spinner /> : (
                    <>
                        {activeTab === 'attendance' && (
                            <div>
                                <h3 className="text-xl font-bold mb-4">ملخص الحضور</h3>
                                {Object.keys(attendanceByYearMonth).length > 0 ? Object.keys(attendanceByYearMonth).sort((a,b) => parseInt(b) - parseInt(a)).map(year => (
                                    <div key={year} className="mb-4 p-4 border rounded-lg">
                                        <h4 className="font-bold">{year}</h4>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                                            {Object.keys(attendanceByYearMonth[year]).map(month => (
                                                <div key={month} className="bg-gray-50 p-2 rounded text-center">
                                                    <p className="text-sm font-medium text-gray-600">{months[parseInt(month) - 1]}</p>
                                                    <p className="text-lg font-bold">{attendanceByYearMonth[year][month]} أيام</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )) : <p className="text-gray-500">لا يوجد سجل حضور.</p>}
                            </div>
                        )}
                        {activeTab === 'leaves' && (
                            leaves.length > 0 ?
                            <table className="min-w-full divide-y divide-gray-200"><thead className="bg-gray-50"><tr><th className={tableHeaderStyle}>نوع الإجازة</th><th className={tableHeaderStyle}>من</th><th className={tableHeaderStyle}>إلى</th><th className={tableHeaderStyle}>الحالة</th></tr></thead><tbody className="bg-white divide-y divide-gray-200">{leaves.map(l=><tr key={l.id}><td className={tableCellStyle}>{l.leaveType}</td><td className={tableCellStyle}>{l.startDate}</td><td className={tableCellStyle}>{l.endDate}</td><td className={tableCellStyle}>{l.status}</td></tr>)}</tbody></table>
                            : <p className="text-gray-500">لا توجد طلبات إجازة.</p>
                        )}
                        {activeTab === 'penalties' && (
                           penalties.length > 0 ?
                           <table className="min-w-full divide-y divide-gray-200"><thead className="bg-gray-50"><tr><th className={tableHeaderStyle}>التاريخ</th><th className={tableHeaderStyle}>النوع</th><th className={tableHeaderStyle}>السبب</th><th className={tableHeaderStyle}>المبلغ</th></tr></thead><tbody className="bg-white divide-y divide-gray-200">{penalties.map(p=><tr key={p.id}><td className={tableCellStyle}>{p.date}</td><td className={tableCellStyle}>{p.type}</td><td className={tableCellStyle}>{p.reason}</td><td className={tableCellStyle}>{p.amount?.toFixed(2) || '-'}</td></tr>)}</tbody></table>
                           : <p className="text-gray-500">لا توجد جزاءات.</p>
                        )}
                         {activeTab === 'rewards' && (
                           rewards.length > 0 ?
                           <table className="min-w-full divide-y divide-gray-200"><thead className="bg-gray-50"><tr><th className={tableHeaderStyle}>التاريخ</th><th className={tableHeaderStyle}>النوع</th><th className={tableHeaderStyle}>السبب</th><th className={tableHeaderStyle}>المبلغ</th></tr></thead><tbody className="bg-white divide-y divide-gray-200">{rewards.map(r=><tr key={r.id}><td className={tableCellStyle}>{r.date}</td><td className={tableCellStyle}>{r.type}</td><td className={tableCellStyle}>{r.reason}</td><td className={tableCellStyle}>{r.amount?.toFixed(2) || '-'}</td></tr>)}</tbody></table>
                           : <p className="text-gray-500">لا توجد مكافآت.</p>
                        )}
                         {activeTab === 'payroll' && (
                           employeePayslips.length > 0 ?
                           <table className="min-w-full divide-y divide-gray-200"><thead className="bg-gray-50"><tr><th className={tableHeaderStyle}>الشهر/السنة</th><th className={tableHeaderStyle}>الراتب الأساسي</th><th className={tableHeaderStyle}>المكافآت</th><th className={tableHeaderStyle}>الخصومات</th><th className={tableHeaderStyle}>صافي الراتب</th></tr></thead><tbody className="bg-white divide-y divide-gray-200">{employeePayslips.map((p,i)=><tr key={i}><td className={tableCellStyle}>{p.month}/{p.year}</td><td className={tableCellStyle}>{p.payslip.baseSalary.toFixed(2)}</td><td className={tableCellStyle}>{p.payslip.totalRewards.toFixed(2)}</td><td className={tableCellStyle}>{p.payslip.totalDeductions.toFixed(2)}</td><td className={tableCellStyle}>{p.payslip.netSalary.toFixed(2)}</td></tr>)}</tbody></table>
                           : <p className="text-gray-500">لا يوجد سجل رواتب.</p>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

const programLinks: Record<string, {name: string, icon: React.FC<{className?: string}>, sub: Record<string, string>}> = {
    hr: {
        name: 'الموارد البشرية',
        icon: UsersIcon,
        sub: {
            'dashboard': 'لوحة التحكم',
            'employees': 'الموظفون',
            'recruitment': 'التوظيف',
            'attendance': 'الحضور والانصراف',
            'leaves': 'الإجازات',
            'penalties-rewards': 'الجزاءات والمكافآت',
            'payroll': 'مسير الرواتب',
        }
    },
    accounting: {
        name: 'الحسابات',
        icon: BuildingLibraryIcon,
        sub: {
            'chart-of-accounts': 'دليل الحسابات',
            'journal-entries': 'القيود اليومية',
            'expenses': 'المصروفات',
            'custody': 'العهد',
            'assets': 'الأصول',
            'financial-statements': 'القوائم المالية',
        }
    },
    sales: {
        name: 'المبيعات',
        icon: ShoppingCartIcon,
        sub: {
            'customers': 'العملاء',
            'invoices': 'فواتير المبيعات',
            'receipts': 'سندات القبض',
        }
    },
    projects: {
        name: 'إدارة المشاريع',
        icon: FolderIcon,
        sub: {
            'projects': 'المشاريع',
            'tasks': 'المهام',
        }
    }
};

const DashboardLayout: React.FC<{ user: AppUser; company: Company | null; loadingCompany: boolean; onCompanyCreated: () => void; route: string }> = ({ user, company, loadingCompany, onCompanyCreated, route }) => {
    
    const [openPrograms, setOpenPrograms] = useState<string[]>([]);
    
    const handleSignOut = async () => {
        await signOut(auth);
        window.location.hash = '/login';
    };
    
    const [program, page] = route.substring(1).split('/');
    const currentSection = page || (program === 'hr' ? 'dashboard' : program === 'accounting' ? 'chart-of-accounts' : program === 'sales' ? 'customers' : program === 'projects' ? 'projects' : 'company-details');


    useEffect(() => {
        if(program && !openPrograms.includes(program)){
            setOpenPrograms(p => [...p, program]);
        }
    }, [program, openPrograms]);

    const toggleProgram = (progId: string) => {
        setOpenPrograms(prev => prev.includes(progId) ? prev.filter(p => p !== progId) : [...prev, progId]);
    };

    const renderPage = () => {
        if (!company) {
             return <Dashboard user={user} company={company} loadingCompany={loadingCompany} onCompanyCreated={onCompanyCreated} />;
        }
        
        switch (program) {
            case 'dashboard':
                return <Dashboard user={user} company={company} loadingCompany={loadingCompany} onCompanyCreated={onCompanyCreated} />;
            case 'hr':
                return <HRPage companyId={company.id} section={currentSection} />;
            case 'accounting':
                return <AccountingPage companyId={company.id} section={currentSection} />;
            case 'sales':
                return <SalesPage companyId={company.id} section={currentSection} />;
            case 'projects':
                return <ProjectsPage companyId={company.id} section={currentSection} />;
            case 'settings':
                return <SettingsPage company={company} user={user} section={currentSection} onCompanyUpdate={onCompanyCreated} />;
            default:
                return <Dashboard user={user} company={company} loadingCompany={loadingCompany} onCompanyCreated={onCompanyCreated} />;
        }
    };

    return (
        <div className="flex h-screen bg-gray-100">
            <aside className="w-64 bg-white shadow-md flex flex-col">
                <div className="p-4 border-b">
                    <h2 className="text-xl font-bold text-blue-600 text-center">اوديت</h2>
                </div>
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    <a href="#/dashboard" className={`flex items-center p-2 rounded-lg ${program === 'dashboard' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}><HomeIcon className="w-5 h-5 me-2" /> الرئيسية</a>
                    
                    {company && <h3 className="px-2 pt-4 pb-2 text-xs font-semibold text-gray-500 uppercase">البرامج</h3>}
                    {(company?.programs || []).map(progId => {
                        const progDetails = programLinks[progId];
                        if (!progDetails) return null;
                        
                        return (
                            <div key={progId}>
                                <button onClick={() => toggleProgram(progId)} className={`w-full flex items-center p-2 rounded-lg text-right ${program === progId ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}>
                                   {React.createElement(progDetails.icon, { className: "w-5 h-5 me-2" })}
                                   <span className="flex-1">{progDetails.name}</span>
                                    <svg className={`w-4 h-4 transition-transform ${openPrograms.includes(progId) ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                                </button>
                                {openPrograms.includes(progId) && (
                                    <div className="ms-6 mt-1 border-r-2 border-gray-200">
                                        {Object.entries(progDetails.sub).map(([subId, subName]) => (
                                            <a key={subId} href={`#/${progId}/${subId}`} className={`block p-2 text-sm rounded-lg me-2 ${currentSection === subId && program === progId ? 'bg-gray-100 font-semibold' : 'hover:bg-gray-100'}`}>
                                                {subName}
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    })}

                    <div className="pt-4 border-t">
                        <div key="settings">
                            <button onClick={() => toggleProgram('settings')} className={`w-full flex items-center p-2 rounded-lg text-right ${program === 'settings' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}>
                                <CogIcon className="w-5 h-5 me-2" />
                                <span className="flex-1">الإعدادات</span>
                                <svg className={`w-4 h-4 transition-transform ${openPrograms.includes('settings') ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                            </button>
                             {openPrograms.includes('settings') && (
                                <div className="ms-6 mt-1 border-r-2 border-gray-200">
                                    <a href="#/settings/company-details" className={`block p-2 text-sm rounded-lg me-2 ${currentSection === 'company-details' && program === 'settings' ? 'bg-gray-100 font-semibold' : 'hover:bg-gray-100'}`}>بيانات الشركة</a>
                                    <a href="#/settings/team-members" className={`block p-2 text-sm rounded-lg me-2 ${currentSection === 'team-members' && program === 'settings' ? 'bg-gray-100 font-semibold' : 'hover:bg-gray-100'}`}>أعضاء الفريق</a>
                                    <a href="#/settings/financial-settings" className={`block p-2 text-sm rounded-lg me-2 ${currentSection === 'financial-settings' && program === 'settings' ? 'bg-gray-100 font-semibold' : 'hover:bg-gray-100'}`}>الإعدادات المالية</a>
                                </div>
                            )}
                        </div>
                    </div>
                </nav>
                <div className="p-4 border-t">
                    <button onClick={handleSignOut} className="flex items-center w-full p-2 rounded-lg hover:bg-red-50 text-red-600">
                        <LogoutIcon className="w-5 h-5 me-2" /> تسجيل الخروج
                    </button>
                </div>
            </aside>
            <main className="flex-1 overflow-y-auto">
                {renderPage()}
            </main>
        </div>
    );
};


const App: React.FC = () => {
    const { user, loading } = useAuth();
    const [route, setRoute] = useState(window.location.hash || '#/');
    const [company, setCompany] = useState<Company | null>(null);
    const [loadingCompany, setLoadingCompany] = useState(true);

    useEffect(() => {
        const handleHashChange = () => {
            setRoute(window.location.hash || '#/');
        };
        window.addEventListener('hashchange', handleHashChange);
        handleHashChange(); // Initial load
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    const fetchCompany = useCallback(async (companyId: string) => {
        setLoadingCompany(true);
        const companyDocRef = doc(db, "companies", companyId);
        const unsubscribe = onSnapshot(companyDocRef, (companyDoc) => {
            if (companyDoc.exists()) {
                setCompany({ id: companyDoc.id, ...companyDoc.data() } as Company);
            } else {
                setCompany(null);
            }
            setLoadingCompany(false);
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        let unsubscribe: (() => void) | null = null;
        if (user && user.companyId) {
            fetchCompany(user.companyId).then(unsub => {
                unsubscribe = unsub;
            });
        } else {
            setCompany(null);
            setLoadingCompany(false);
        }
        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [user, fetchCompany]);

    if (loading) {
        return <FullPageSpinner />;
    }

    const path = route.replace('#', '');

    // Public Routes
    if (!user) {
        if (path === '/login') return <AuthPage isLogin={true} />;
        if (path === '/register') return <AuthPage isLogin={false} />;
        if (path === '/pricing') return <PricingPage />;
        if (path === '/about') return <PublicPage pageId="about" />;
        if (path === '/programs') return <PublicPage pageId="programs" />;
        if (path === '/contact') return <PublicPage pageId="contact" />;
        return <LandingPage />;
    }

    // Authenticated Routes
    return <DashboardLayout 
                user={user} 
                company={company} 
                loadingCompany={loadingCompany} 
                onCompanyCreated={() => user.companyId && fetchCompany(user.companyId)} 
                route={path || '/dashboard'} 
            />;
};

export default App;