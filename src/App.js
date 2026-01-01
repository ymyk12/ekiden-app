import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot, addDoc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList
} from 'recharts';
import { 
  Home, Plus, BarChart2, Users, Settings, LogOut, ChevronRight, 
  Activity, AlertCircle, CheckCircle, Download, Trash2, Calendar, Clock, HeartPulse, Trophy, BookOpen, Flag, Target, RefreshCw, Edit, Medal, FileText, Printer, FileSpreadsheet, Lock, UserMinus, UserCheck, Archive, Menu, User
} from 'lucide-react';

// --- Firebase Configuration ---
// ステップ2でコピーした内容をここに貼り付けます
const firebaseConfig = {
  apiKey: "AIzaSyAVvrlLTsioEuloE11hzykIz8rSk6qMJrk",
  authDomain: "kswc-tf-distancerecords.firebaseapp.com",
  projectId: "kswc-tf-distancerecords",
  storageBucket: "kswc-tf-distancerecords.firebasestorage.app",
  messagingSenderId: "633417183098",
  appId: "1:633417183098:web:18c8c96359ebec0651f0c3",
  measurementId: "G-7TB3N5GBMZ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
// appIdは任意の英数字でOKです（データの保存フォルダ名になります）
const appId = 'kswc-ekidenteam-distancerecords';

// --- Helper: Date Quarter Calculation ---
const calculateAutoQuarters = (startStr, endStr) => {
  if (!startStr || !endStr) return [
    { id: 1, start: '', end: '' }, { id: 2, start: '', end: '' }, 
    { id: 3, start: '', end: '' }, { id: 4, start: '', end: '' }
  ];
  
  const start = new Date(startStr);
  const end = new Date(endStr);
  const totalTime = end - start;
  const totalDays = Math.floor(totalTime / (1000 * 60 * 60 * 24)) + 1;
  
  if (totalDays <= 0) return [
    { id: 1, start: '', end: '' }, { id: 2, start: '', end: '' }, 
    { id: 3, start: '', end: '' }, { id: 4, start: '', end: '' }
  ];

  const quarters = [];
  for (let i = 0; i < 4; i++) {
    const qStart = new Date(start);
    qStart.setDate(start.getDate() + Math.floor((totalDays / 4) * i));
    
    const qEnd = new Date(start);
    if (i === 3) {
      qEnd.setDate(start.getDate() + totalDays - 1);
    } else {
      qEnd.setDate(start.getDate() + Math.floor((totalDays / 4) * (i + 1)) - 1);
    }
    quarters.push({ 
      id: i + 1,
      start: qStart.toLocaleDateString('sv-SE'),
      end: qEnd.toLocaleDateString('sv-SE')
    });
  }
  return quarters;
};

const getDatesInRange = (startDate, endDate) => {
  if (!startDate || !endDate) return [];
  const dates = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start) || isNaN(end) || start > end) return [];
  
  const current = new Date(start);
  while (current <= end) {
    dates.push(new Date(current).toLocaleDateString('sv-SE'));
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

const App = () => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null); 
  const [profile, setProfile] = useState(null);
  const [allRunners, setAllRunners] = useState([]);
  const [allLogs, setAllLogs] = useState([]);
  const [practiceMenus, setPracticeMenus] = useState([]);
  
  const [appSettings, setAppSettings] = useState({ 
    coachPass: '1234', 
    teamPass: 'run2025', // Default team passcode
    startDate: '', 
    endDate: '',
    quarters: [
      { id: 1, start: '', end: '' }, { id: 2, start: '', end: '' },
      { id: 3, start: '', end: '' }, { id: 4, start: '', end: '' }
    ]
  });
  
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('menu'); 
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState(''); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingLogId, setEditingLogId] = useState(null);
  
  // Custom Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, message: '', onConfirm: null });
  // Menu State
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    date: new Date().toLocaleDateString('sv-SE'), 
    distance: '',
    category: '午後練',
    menuDetail: '', 
    rpe: 5,
    pain: 1,
    achieved: true,
    lastName: '',
    firstName: '',
    teamPass: '' // Field for team passcode input
  });

  const [menuInput, setMenuInput] = useState({ date: new Date().toLocaleDateString('sv-SE'), text: '' });
  const [goalInput, setGoalInput] = useState({ monthly: '', period: '', q1: '', q2: '', q3: '', q4: '' });

  // Print Styles
  const printStyles = `
    @media print {
      @page { size: landscape; margin: 10mm; }
      body { background-color: white !important; -webkit-print-color-adjust: exact; }
      body * { visibility: hidden; }
      #printable-report, #printable-report * { visibility: visible; }
      #printable-report {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        margin: 0;
        padding: 0;
        background-color: white !important;
      }
      .no-print { display: none !important; }
      .recharts-responsive-container { width: 100% !important; height: auto !important; }
    }
  `;

  // 1. Auth & Initial Load
  useEffect(() => {
    const initAuth = async () => {
      try {
        // 修正: 外部デプロイ用にシンプル化（プレビュー環境変数を削除）
        await signInAnonymously(auth);
      } catch (e) { 
        console.error("Auth failed", e);
        setLoading(false);
      }
    };
    initAuth();

    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
      } else {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  // 2. Data Listeners
  useEffect(() => {
    if (!user) return;

    const timeout = setTimeout(() => setLoading(false), 5000);

    const settingsDoc = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'global');
    getDoc(settingsDoc).then(snap => {
      if (!snap.exists()) {
        const today = new Date().toLocaleDateString('sv-SE');
        const initialQuarters = calculateAutoQuarters(today, today);
        setDoc(settingsDoc, {
          coachPass: '1234',
          teamPass: 'run2025',
          startDate: today,
          endDate: today,
          quarters: initialQuarters
        });
      }
    }).catch(e => console.log("Settings init error", e));

    const runnersRef = collection(db, 'artifacts', appId, 'public', 'data', 'runners');
    const logsRef = collection(db, 'artifacts', appId, 'public', 'data', 'logs');
    const menusRef = collection(db, 'artifacts', appId, 'public', 'data', 'menus');

    const unsubRunners = onSnapshot(runnersRef, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllRunners(list);
      
      const myP = list.find(r => r.id === user.uid);
      if (myP) { 
        setProfile(myP); 
        setRole(prev => (prev === 'coach' ? 'coach' : 'runner')); 
      }
      setLoading(false);
      clearTimeout(timeout);
    });

    const unsubLogs = onSnapshot(logsRef, (snap) => {
      setAllLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubSettings = onSnapshot(settingsDoc, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (!data.quarters) {
          data.quarters = calculateAutoQuarters(data.startDate, data.endDate);
        }
        setAppSettings(data);
      }
    });

    const unsubMenus = onSnapshot(menusRef, (snap) => {
      setPracticeMenus(snap.docs.map(d => d.data()));
    });

    return () => { unsubRunners(); unsubLogs(); unsubSettings(); unsubMenus(); clearTimeout(timeout); };
  }, [user]);

  // Derived Data
  const activeQuarters = useMemo(() => {
    return appSettings.quarters || [];
  }, [appSettings]);

  // Filter for active runners only
  const activeRunners = useMemo(() => {
    return allRunners.filter(r => r.status !== 'retired');
  }, [allRunners]);

  const personalStats = useMemo(() => {
    if (!user) return { daily: [], monthly: 0, period: 0, qs: [0,0,0,0] };
    const myLogs = allLogs.filter(l => l.runnerId === user.uid);
    const now = new Date();
    
    const monthlyTotal = myLogs
      .filter(l => {
        const d = new Date(l.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, l) => s + (Number(l.distance) || 0), 0); // Safety cast

    const start = new Date(appSettings.startDate || '2000-01-01');
    const end = new Date(appSettings.endDate || '2100-12-31');
    const periodTotal = myLogs
      .filter(l => {
        const d = new Date(l.date);
        return d >= start && d <= end;
      })
      .reduce((s, l) => s + (Number(l.distance) || 0), 0); // Safety cast

    const qs = activeQuarters.map(q => {
      if (!q.start || !q.end) return 0;
      const qStart = new Date(q.start);
      const qEnd = new Date(q.end);
      return myLogs
        .filter(l => {
          const d = new Date(l.date);
          return d >= qStart && d <= qEnd;
        })
        .reduce((s, l) => s + (Number(l.distance) || 0), 0); // Safety cast
    });

    const daily = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('sv-SE');
      const dayDist = myLogs.filter(l => l.date === dateStr).reduce((s, l) => s + (Number(l.distance) || 0), 0);
      daily.push({ date: dateStr, label: dateStr.split('-')[2], distance: Math.round(dayDist * 10) / 10 });
    }

    return { 
      daily, 
      monthly: Math.round(monthlyTotal * 10) / 10, 
      period: Math.round(periodTotal * 10) / 10,
      qs: qs.map(v => Math.round(v * 10) / 10)
    };
  }, [allLogs, user, appSettings, activeQuarters]);

  const rankingData = useMemo(() => {
    const start = new Date(appSettings.startDate || '2000-01-01');
    const end = new Date(appSettings.endDate || '2100-12-31');
    // Use activeRunners instead of allRunners
    return activeRunners.map(r => {
      const total = allLogs
        .filter(l => l.runnerId === r.id && new Date(l.date) >= start && new Date(l.date) <= end)
        .reduce((sum, l) => sum + (Number(l.distance) || 0), 0);
      return { name: `${r.lastName} ${r.firstName}`, id: r.id, total: Math.round(total * 10) / 10 };
    }).sort((a,b) => b.total - a.total);
  }, [activeRunners, allLogs, appSettings]);

  // Report Data
  const reportDates = useMemo(() => {
    return getDatesInRange(appSettings.startDate, appSettings.endDate);
  }, [appSettings]);

  const reportMatrix = useMemo(() => {
    const runnerIds = activeRunners.map(r => r.id);
    const matrix = reportDates.map(date => {
      const row = { date };
      runnerIds.forEach(id => {
        const logs = allLogs.filter(l => l.runnerId === id && l.date === date);
        const total = logs.reduce((sum, l) => sum + (Number(l.distance) || 0), 0);
        row[id] = total > 0 ? Math.round(total * 10) / 10 : '-';
      });
      return row;
    });
    
    const totals = { date: 'TOTAL' };
    runnerIds.forEach(id => {
      const sum = allLogs
        .filter(l => l.runnerId === id && reportDates.includes(l.date))
        .reduce((s, l) => s + (Number(l.distance) || 0), 0);
      totals[id] = Math.round(sum * 10) / 10;
    });

    const qTotals = activeQuarters.map((q, idx) => {
      const row = { date: `${idx + 1}期合計` };
      runnerIds.forEach(id => {
        const sum = allLogs
          .filter(l => l.runnerId === id && l.date >= q.start && l.date <= q.end)
          .reduce((s, l) => s + (Number(l.distance) || 0), 0);
        row[id] = Math.round(sum * 10) / 10;
      });
      return row;
    });

    return { matrix, totals, qTotals };
  }, [reportDates, activeRunners, allLogs, activeQuarters]);

  // Handlers
  const handlePrint = () => {
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleExportMatrixCSV = () => {
    // Header Row
    const runnerIds = activeRunners.map(r => r.id);
    const headerRow = ["日付", ...activeRunners.map(r => `${r.lastName} ${r.firstName}`)];
    
    // Data Rows
    const dataRows = reportMatrix.matrix.map(row => {
      const rowData = [row.date.slice(5).replace('-','/')];
      runnerIds.forEach(id => {
        rowData.push(row[id] !== '-' ? row[id] : '');
      });
      return rowData;
    });

    // Total Row
    const totalRow = ["TOTAL"];
    runnerIds.forEach(id => {
      totalRow.push(reportMatrix.totals[id] || 0);
    });

    // Quarter Rows
    const qRows = reportMatrix.qTotals.map((qRow, i) => {
      const row = [`${i+1}期合計`];
      runnerIds.forEach(id => {
        row.push(qRow[id] || 0);
      });
      return row;
    });

    // Combine
    const csvContent = [
      headerRow.join(","),
      ...dataRows.map(r => r.join(",")),
      totalRow.join(","),
      ...qRows.map(r => r.join(","))
    ].join("\n");

    // Download
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `ekiden_report_${appSettings.startDate}_${appSettings.endDate}.csv`;
    link.click();
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toLocaleDateString('sv-SE'),
      distance: '',
      category: '午後練',
      menuDetail: '',
      rpe: 5,
      pain: 1,
      achieved: true,
      lastName: '',
      firstName: '',
      teamPass: ''
    });
    setEditingLogId(null);
  };

  const changeView = (newView) => {
    if (newView !== 'entry') resetForm();
    setView(newView);
  };

  const handleLogout = () => {
    setRole(null);
    setView('menu'); // Reset view on logout
    setIsMenuOpen(false); // Close menu on logout
  };

  const handleRegister = async () => {
    setErrorMsg(''); // Reset error message
    if (!formData.lastName.trim() || !formData.firstName.trim()) return;
    
    // Check Team Passcode
    if (formData.teamPass !== appSettings.teamPass) {
      setErrorMsg("チームパスコードが間違っています。監督に確認してください。");
      return;
    }

    setIsSubmitting(true);

    // 修正: 既存データを取得して目標値を維持する
    const existingData = allRunners.find(r => r.id === user.uid) || {};

    const newProfile = {
      ...existingData, // 既存データがあれば展開
      lastName: formData.lastName.trim(), 
      firstName: formData.firstName.trim(), 
      // 既存の値があればそれを使い、なければ初期値を使う
      goalMonthly: existingData.goalMonthly || 400, 
      goalPeriod: existingData.goalPeriod || 200, 
      status: 'active',
      registeredAt: existingData.registeredAt || new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'runners', user.uid), newProfile);
      setProfile(newProfile);
      setRole('runner'); 
      setView('menu');
      setSuccessMsg('登録完了！');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) {
      console.error(e);
      setErrorMsg("登録に失敗しました。再読み込みして試してください。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditLog = (log) => {
    setFormData({
      date: log.date,
      distance: log.distance,
      category: log.category,
      menuDetail: log.menuDetail || '',
      rpe: log.rpe,
      pain: log.pain,
      achieved: log.achieved,
      lastName: '', 
      firstName: '',
      teamPass: ''
    });
    setEditingLogId(log.id);
    setView('entry');
  };

  const handleSaveLog = async () => {
    if (!formData.distance) return;
    setIsSubmitting(true);
    try {
      const dataToSave = {
        date: formData.date,
        distance: parseFloat(formData.distance),
        category: formData.category,
        menuDetail: formData.menuDetail,
        rpe: formData.rpe,
        pain: formData.pain,
        achieved: formData.achieved,
        runnerId: user.uid,
        runnerName: `${profile.lastName} ${profile.firstName}`,
      };

      if (editingLogId) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'logs', editingLogId), {
          ...dataToSave,
          updatedAt: new Date().toISOString()
        });
        setSuccessMsg('記録を更新しました');
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'logs'), {
          ...dataToSave,
          createdAt: new Date().toISOString()
        });
        setSuccessMsg('記録を保存しました');
      }
      
      resetForm();
      setTimeout(() => { setSuccessMsg(''); setView('menu'); }, 1500);
    } catch (e) {
      console.error(e);
      setSuccessMsg("保存エラー: " + e.message); // Updated to avoid alert
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateGoals = async () => {
    const updates = {};
    if (goalInput.monthly) updates.goalMonthly = parseFloat(goalInput.monthly);
    if (goalInput.period) updates.goalPeriod = parseFloat(goalInput.period);
    if (goalInput.q1) updates.goalQ1 = parseFloat(goalInput.q1);
    if (goalInput.q2) updates.goalQ2 = parseFloat(goalInput.q2);
    if (goalInput.q3) updates.goalQ3 = parseFloat(goalInput.q3);
    if (goalInput.q4) updates.goalQ4 = parseFloat(goalInput.q4);

    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'runners', user.uid), updates);
    setView('menu');
  };

  const exportCSV = () => {
    const headers = ["日付", "名前", "区分", "メニュー", "距離(km)", "練習強度(RPE)", "痛み"];
    const rows = allLogs.map(l => [l.date, l.runnerName, l.category, l.menuDetail || '', l.distance, l.rpe, l.pain]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `ekiden_team_data.csv`;
    link.click();
  };

  const isCurrentQuarter = (q) => {
    if (!q || !q.start || !q.end) return false;
    const now = new Date().toLocaleDateString('sv-SE');
    return now >= q.start && now <= q.end;
  };

  const handleAutoFillQuarters = () => {
    const newQuarters = calculateAutoQuarters(appSettings.startDate, appSettings.endDate);
    setAppSettings(prev => ({ ...prev, quarters: newQuarters }));
  };

  const handleQuarterChange = (index, field, value) => {
    const newQuarters = [...appSettings.quarters];
    newQuarters[index] = { ...newQuarters[index], [field]: value };
    setAppSettings(prev => ({ ...prev, quarters: newQuarters }));
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"></div></div>;

  // --- Initial Views ---
  if (!role) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8 text-white">
        <Trophy className="mb-6 text-blue-500 animate-bounce" size={60} />
        <h1 className="text-4xl font-black italic tracking-tighter mb-12">KSWC EKIDEN TEAM</h1>
        <div className="w-full max-w-xs space-y-4">
          <button onClick={() => setRole('registering')} className="w-full bg-blue-600 py-5 rounded-3xl font-black text-lg shadow-xl active:scale-95 transition-all">選手として開始</button>
          <button onClick={() => setRole('coach-auth')} className="w-full bg-slate-800 py-4 rounded-3xl font-bold text-slate-400 active:scale-95 transition-all">監督ログイン</button>
        </div>
      </div>
    );
  }

  if (role === 'coach-auth') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="w-full max-w-xs text-center">
          <h2 className="text-white font-bold mb-8 uppercase tracking-widest text-xs opacity-50">Coach Passcode</h2>
          <input type="password" maxLength={4} className="w-full bg-slate-800 text-white text-center text-5xl p-4 rounded-3xl outline-none border-2 border-transparent focus:border-blue-500 tracking-widest" onChange={e => { if (e.target.value === appSettings.coachPass) { setRole('coach'); setView('coach-stats'); }}} />
          <button onClick={() => setRole(null)} className="text-slate-500 mt-8 text-sm font-bold uppercase">Back</button>
        </div>
      </div>
    );
  }

  if (role === 'registering') {
    const isReady = formData.lastName && formData.firstName && formData.teamPass;
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-white p-10 rounded-[3rem] shadow-2xl space-y-6">
          <h2 className="text-2xl font-black text-slate-800 text-center uppercase italic">Join Team</h2>
          <div className="space-y-4">
            <input placeholder="苗字 (例: 佐藤)" className="w-full p-4 bg-slate-100 rounded-2xl outline-none font-bold focus:ring-2 ring-blue-500" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
            <input placeholder="名前 (例: 太郎)" className="w-full p-4 bg-slate-100 rounded-2xl outline-none font-bold focus:ring-2 ring-blue-500" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
            
            <div className="space-y-2">
              <div className="relative">
                <input type="text" placeholder="チームパスコード" className={`w-full p-4 pl-12 bg-slate-100 rounded-2xl outline-none font-bold focus:ring-2 ${errorMsg ? 'ring-rose-500' : 'ring-blue-500'}`} value={formData.teamPass} onChange={e => setFormData({...formData, teamPass: e.target.value})} />
                <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 ${errorMsg ? 'text-rose-500' : 'text-slate-400'}`} size={20}/>
              </div>
              {errorMsg && (
                <div className="flex items-center gap-2 text-rose-500 px-2 animate-in slide-in-from-left-2">
                  <AlertCircle size={14} />
                  <span className="text-xs font-bold">{errorMsg}</span>
                </div>
              )}
            </div>

            <button 
              onClick={handleRegister} 
              disabled={!isReady || isSubmitting} 
              className={`w-full py-4 rounded-2xl font-bold text-lg shadow-xl transition-all ${isReady ? 'bg-blue-600 text-white active:scale-95' : 'bg-slate-200 text-slate-400'}`}
            >
              {isSubmitting ? '登録中...' : 'チームに参加する'}
            </button>
            <button onClick={() => setRole(null)} className="w-full text-slate-400 font-bold uppercase text-xs text-center">Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  // --- RUNNER VIEW ---
  if (role === 'runner' && profile) {
    return (
      <div className="min-h-screen bg-slate-50 pb-28">
        {successMsg && <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-blue-600 text-white px-8 py-4 rounded-full shadow-2xl font-bold animate-in fade-in slide-in-from-top-4">{successMsg}</div>}
        
        {/* Mobile Menu Overlay */}
        {isMenuOpen && (
          <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in" onClick={() => setIsMenuOpen(false)}>
            <div className="bg-white w-full max-w-sm p-6 rounded-[2.5rem] space-y-4 shadow-2xl animate-in slide-in-from-bottom-10" onClick={e => e.stopPropagation()}>
              <h3 className="font-black text-center text-slate-400 uppercase tracking-widest text-xs">Menu</h3>
              <button onClick={() => { setView('goal'); setIsMenuOpen(false); }} className="w-full py-4 bg-slate-100 rounded-2xl font-bold text-slate-700 flex items-center justify-center gap-2 active:scale-95 transition-all"><Target size={20}/> 目標設定</button>
              <button onClick={handleLogout} className="w-full py-4 bg-rose-50 text-rose-600 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"><LogOut size={20}/> ログアウト</button>
              <button onClick={() => setIsMenuOpen(false)} className="w-full py-4 text-slate-400 font-bold text-xs uppercase tracking-widest">Close</button>
            </div>
          </div>
        )}

        <header className="bg-blue-600 text-white pt-14 pb-28 px-8 rounded-b-[4rem] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          <div className="flex justify-between items-center relative z-10 max-w-md mx-auto">
            {/* Left: Menu */}
            <button onClick={() => setIsMenuOpen(true)} className="bg-white/20 p-2.5 rounded-2xl active:scale-90 transition-all text-white">
              <Menu size={20}/>
            </button>

            {/* Center: Name */}
            <div className="text-center">
              <p className="text-blue-100 text-[10px] font-black tracking-widest uppercase mb-1">Athlete Dashboard</p>
              <h1 className="text-2xl font-black tracking-tighter">{profile.lastName} {profile.firstName}</h1>
            </div>

            {/* Right: User/Profile */}
            <button onClick={() => setView('goal')} className="bg-white/20 p-2.5 rounded-2xl active:scale-90 transition-all text-white">
              <User size={20}/>
            </button>
          </div>
        </header>

        <main className="px-5 -mt-20 space-y-6 relative z-20 max-w-md mx-auto">
          {view === 'menu' && (
            <>
              {/* Dual Goal Status Card */}
              <div className="bg-white p-7 rounded-[2.5rem] shadow-xl shadow-blue-900/5 space-y-6">
                {/* 1. Monthly Goal */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-black text-slate-400 text-[10px] uppercase tracking-widest">Monthly Mileage</h3>
                    <button onClick={() => setView('goal')} className="text-[10px] bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-black">EDIT</button>
                  </div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-3xl font-black text-blue-600 tracking-tighter">{personalStats.monthly} <span className="text-xs font-normal text-slate-400">km</span></span>
                    <span className="text-xs font-bold text-slate-400 pb-1">/ {profile.goalMonthly}km</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full transition-all duration-1000" style={{ width: `${Math.min(100, (personalStats.monthly / profile.goalMonthly) * 100)}%` }}></div>
                  </div>
                </div>

                {/* 2. Period Goal (Quarter Breakdown) */}
                {appSettings.startDate && (
                  <div className="pt-5 border-t border-slate-50">
                    <h3 className="font-black text-emerald-500 text-[10px] uppercase tracking-widest mb-3 flex items-center gap-1">
                      <Flag size={12}/> Focus Period ({appSettings.startDate.slice(5).replace('-','/')}〜)
                    </h3>
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-3xl font-black text-emerald-600 tracking-tighter">{personalStats.period} <span className="text-xs font-normal text-slate-400">km</span></span>
                      <span className="text-xs font-bold text-slate-400 pb-1">/ {profile.goalPeriod}km</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mb-4">
                      <div className="bg-emerald-500 h-full" style={{ width: `${Math.min(100, (personalStats.period / profile.goalPeriod) * 100)}%` }}></div>
                    </div>

                    {/* Quarter Breakdown */}
                    <div className="grid grid-cols-4 gap-2">
                      {activeQuarters.map((q, idx) => {
                        const goal = profile[`goalQ${idx+1}`] || 0;
                        const actual = personalStats.qs[idx] || 0;
                        const isCurrent = isCurrentQuarter(q);
                        const hasDate = q.start && q.end;
                        
                        return (
                          <div key={idx} className={`p-2 rounded-xl flex flex-col items-center ${isCurrent ? 'bg-emerald-50 ring-2 ring-emerald-400' : 'bg-slate-50'}`}>
                            <span className={`text-[8px] font-black uppercase mb-1 ${isCurrent ? 'text-emerald-600' : 'text-slate-400'}`}>Q{idx+1}</span>
                            <div className="w-full h-12 bg-slate-200 rounded-lg relative overflow-hidden flex flex-col justify-end">
                              <div 
                                className={`w-full absolute bottom-0 transition-all duration-500 ${isCurrent ? 'bg-emerald-400' : 'bg-slate-400'}`}
                                style={{ height: `${goal > 0 ? Math.min(100, (actual / goal) * 100) : 0}%` }}
                              ></div>
                            </div>
                            <span className="text-[9px] font-black mt-1 text-slate-600">{actual}</span>
                            <span className="text-[7px] font-bold text-slate-400">/ {goal || '-'}</span>
                            {hasDate && <span className="text-[6px] text-slate-300 mt-0.5">{q.start.slice(5).replace('-','/')}</span>}
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[8px] text-center text-slate-300 font-bold mt-2">現在: {activeQuarters.findIndex(isCurrentQuarter) !== -1 ? `第${activeQuarters.findIndex(isCurrentQuarter)+1}クール` : '期間外'}</p>
                  </div>
                )}
              </div>

              <div className="bg-slate-900 p-7 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
                <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2"><Calendar size={12}/> Today's Menu</p>
                {practiceMenus.find(m => m.date === new Date().toLocaleDateString('sv-SE')) ? (
                  <p className="font-bold text-lg leading-snug">{practiceMenus.find(m => m.date === new Date().toLocaleDateString('sv-SE')).text}</p>
                ) : (
                  <p className="text-slate-500 italic text-sm">指示はありません</p>
                )}
              </div>

              <button onClick={() => changeView('entry')} className="w-full bg-white p-7 rounded-[2.5rem] shadow-md flex items-center justify-between group active:scale-95 transition-all">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-[1.2rem] flex items-center justify-center">
                    <Plus size={30}/>
                  </div>
                  <div className="text-left">
                    <p className="font-black text-xl tracking-tight">練習を入力する</p>
                    <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">Input Data</p>
                  </div>
                </div>
                <ChevronRight size={24} className="text-slate-100"/>
              </button>
            </>
          )}

          {view === 'goal' && (
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl text-center space-y-8 animate-in fade-in">
              <h3 className="font-black text-slate-400 uppercase text-xs tracking-widest">目標設定</h3>
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-widest mb-2 block text-left">Monthly (km)</label>
                  <input type="number" className="w-full text-4xl font-black text-blue-600 bg-slate-50 rounded-2xl p-5 outline-none border-2 border-transparent focus:border-blue-100" placeholder={profile.goalMonthly} onChange={e => setGoalInput({...goalInput, monthly: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-emerald-400 ml-1 uppercase tracking-widest mb-2 block text-left">Period Total (km)</label>
                  <input type="number" className="w-full text-4xl font-black text-emerald-600 bg-slate-50 rounded-2xl p-5 outline-none border-2 border-transparent focus:border-emerald-100" placeholder={profile.goalPeriod} onChange={e => setGoalInput({...goalInput, period: e.target.value})} />
                </div>
                
                {/* Quarter Goals Input */}
                {activeQuarters.length > 0 && (
                  <div className="bg-slate-50 p-4 rounded-3xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-left">Quarter Goals ({appSettings.startDate.slice(5)}〜)</p>
                    <div className="grid grid-cols-2 gap-4">
                      {activeQuarters.map((q, idx) => (
                        <div key={idx} className="text-left">
                          <label className="text-[8px] font-bold text-slate-400 ml-1 block mb-1 truncate">
                            Q{idx+1} ({q.start.slice(5).replace('-','/')}〜)
                          </label>
                          <input 
                            type="number" 
                            className="w-full p-3 rounded-xl text-sm font-black text-slate-700 outline-none border border-slate-200 focus:border-emerald-400"
                            placeholder={profile[`goalQ${idx+1}`] || 0}
                            onChange={e => setGoalInput(prev => ({...prev, [`q${idx+1}`]: e.target.value}))}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-4">
                <button onClick={() => changeView('menu')} className="flex-1 py-5 bg-slate-100 rounded-2xl font-black text-slate-400">戻る</button>
                <button onClick={updateGoals} className="flex-1 py-5 bg-blue-600 text-white rounded-2xl font-black shadow-lg">保存</button>
              </div>
            </div>
          )}

          {view === 'team' && (
            <div className="bg-white p-7 rounded-[2.5rem] shadow-xl space-y-6 animate-in slide-in-from-right-10">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-2"><Trophy size={16} className="text-orange-500"/> Team Ranking</h3>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{appSettings.startDate.slice(5).replace('-','/')} - {appSettings.endDate.slice(5).replace('-','/')}</span>
              </div>
              
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rankingData} layout="vertical" margin={{ left: -10, right: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9"/>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 11, fontWeight: 'bold', fill: '#1e293b'}} axisLine={false} tickLine={false}/>
                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} />
                    <Bar dataKey="total" radius={[0, 8, 8, 0]} barSize={20}>
                      {rankingData.map((_, i) => (
                        <Cell key={i} fill={i === 0 ? '#0f172a' : i < 3 ? '#3b82f6' : '#cbd5e1'} />
                      ))}
                      <LabelList dataKey="total" position="right" formatter={v => `${v}km`} style={{fontSize: '10px', fontWeight: 'black', fill: '#475569'}} offset={10} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Leaderboard</p>
                <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar">
                  {rankingData.map((r, i) => (
                    <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${i < 3 ? 'bg-yellow-400 text-white shadow-sm' : 'bg-slate-200 text-slate-500'}`}>
                          {i + 1}
                        </div>
                        <span className="font-bold text-sm text-slate-700">{r.name}</span>
                      </div>
                      <span className="font-black text-blue-600 text-sm">{r.total} <span className="text-[9px] text-slate-400 font-normal">km</span></span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {view === 'entry' && (
            <div className="bg-white p-7 rounded-[2.5rem] shadow-xl space-y-6 animate-in slide-in-from-bottom-8 pb-10">
              <h2 className="text-xl font-black flex items-center gap-2">
                {editingLogId ? <Edit className="text-blue-600" /> : <Plus className="text-blue-600"/>} 
                {editingLogId ? "記録の編集" : "練習記録"}
              </h2>
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-2xl">
                  {['朝練', '午前練', '午後練'].map(cat => (
                    <button key={cat} onClick={() => setFormData({...formData, category: cat})} className={`py-3 rounded-[1.1rem] font-black text-[10px] uppercase transition-all ${formData.category === cat ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>
                      {cat}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">距離 (km)</label>
                    <input type="number" step="0.1" className="w-full p-4 bg-slate-50 rounded-2xl font-black text-2xl text-blue-600 outline-none" value={formData.distance} onChange={e => setFormData({...formData, distance: e.target.value})} placeholder="0.0"/>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">日付</label>
                    <input type="date" className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-xs outline-none" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})}/>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 flex items-center gap-1"><BookOpen size={12}/> メニュー詳細</label>
                  <textarea 
                    className="w-full p-4 bg-slate-50 rounded-2xl h-24 outline-none font-bold text-slate-700 resize-none shadow-inner text-sm" 
                    placeholder="例: 1000m × 5 (3'00), 20kmジョグ 等" 
                    value={formData.menuDetail} 
                    onChange={e => setFormData({...formData, menuDetail: e.target.value})}
                  />
                </div>

                <div className="p-6 bg-slate-50 rounded-[2rem] space-y-5">
                  <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <span>練習強度 (RPE)</span>
                    <span className="text-blue-600">Lv: {formData.rpe}</span>
                  </div>
                  <input type="range" min="1" max="10" className="w-full accent-blue-600" value={formData.rpe} onChange={e => setFormData({...formData, rpe: parseInt(e.target.value)})}/>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">足の痛み (1-5)</label>
                    <div className="grid grid-cols-5 gap-2">
                      {[1, 2, 3, 4, 5].map(v => (
                        <button key={v} onClick={() => setFormData({...formData, pain: v})} className={`py-3 rounded-[1.1rem] text-sm font-black transition-all ${formData.pain === v ? 'bg-rose-500 text-white shadow-md' : 'bg-white text-slate-400 border border-slate-100'}`}>{v}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <button onClick={handleSaveLog} disabled={isSubmitting || !formData.distance} className="w-full bg-blue-600 text-white py-6 rounded-3xl font-black text-lg active:scale-95 transition-all shadow-xl shadow-blue-100 disabled:opacity-50">
                    {isSubmitting ? '保存中...' : (editingLogId ? '更新する' : '記録を保存する')}
                  </button>
                  {editingLogId && (
                    <button onClick={resetForm} className="w-full py-4 text-slate-400 font-bold text-sm">編集をキャンセル</button>
                  )}
                </div>
              </div>
            </div>
          )}

          {view === 'stats' && (
            <div className="space-y-6 pb-16 animate-in slide-in-from-right-10">
              <div className="bg-white p-7 rounded-[2.5rem] shadow-lg">
                <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest mb-8 flex items-center gap-2">
                  <BarChart2 size={16} className="text-blue-600"/> 14-Day Activity
                </h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={personalStats.daily} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                      <XAxis dataKey="label" tick={{fontSize: 9, fontWeight: 'bold', fill: '#cbd5e1'}} axisLine={false} tickLine={false} />
                      <YAxis tick={{fontSize: 9, fontWeight: 'bold', fill: '#cbd5e1'}} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 'bold'}} />
                      <Bar dataKey="distance" radius={[5, 5, 0, 0]}>
                        {personalStats.daily.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.distance > 0 ? '#3b82f6' : '#f1f5f9'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-[2.5rem] shadow-lg overflow-hidden border border-slate-100">
                <div className="p-6 border-b font-black text-slate-800 uppercase text-[10px] tracking-widest bg-slate-50">Training History</div>
                <div className="divide-y divide-slate-50 max-h-[35rem] overflow-y-auto no-scrollbar">
                  {allLogs.filter(l => l.runnerId === user.uid).sort((a,b) => new Date(b.date) - new Date(a.date)).map(l => (
                    <div key={l.id} className="p-6 flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-[1.2rem] ${l.category === '朝練' ? 'bg-orange-50 text-orange-500' : 'bg-blue-50 text-blue-500'}`}><Clock size={20}/></div>
                          <div>
                            <p className="text-[10px] font-black text-slate-300 mb-1">{l.date}</p>
                            <p className="text-sm font-black text-slate-800">{l.category}</p>
                          </div>
                        </div>
                        <span className="text-3xl font-black text-blue-600 tracking-tighter">{l.distance}<span className="text-[10px] ml-0.5 text-slate-400">km</span></span>
                      </div>
                      
                      {l.menuDetail && (
                        <div className="bg-slate-50 p-3 rounded-2xl text-xs font-bold text-slate-600 leading-relaxed italic border-l-4 border-slate-200">
                          "{l.menuDetail}"
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4 pt-1 border-t border-dashed border-slate-100 mt-1">
                        <div className="bg-slate-50 p-2.5 rounded-2xl flex items-center justify-between"><span className="text-[9px] font-black text-slate-400 uppercase">強度</span><span className="text-xs font-black">Lv.{l.rpe}</span></div>
                        <div className={`p-2.5 rounded-2xl flex items-center justify-between ${l.pain > 2 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}><span className="text-[9px] font-black uppercase opacity-60">痛み</span><span className="text-xs font-black">Lv.{l.pain}</span></div>
                      </div>
                      <div className="flex justify-end gap-3 pt-2">
                          <button onClick={() => handleEditLog(l)} className="text-slate-300 hover:text-blue-500 transition-colors p-2 bg-slate-50 rounded-xl">
                            <Edit size={16}/>
                          </button>
                          <button onClick={() => { if(confirm('記録を削除しますか？')) deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'logs', l.id))}} className="text-slate-300 hover:text-rose-500 transition-colors p-2 bg-slate-50 rounded-xl">
                            <Trash2 size={16}/>
                          </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>

        <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-2xl border-t border-slate-100 flex justify-around items-center px-6 py-5 z-[50] rounded-t-[3.5rem] shadow-2xl max-w-md mx-auto">
          <button onClick={() => changeView('menu')} className={`flex flex-col items-center gap-1 transition-all ${view === 'menu' ? 'text-blue-600 scale-110' : 'text-slate-300'}`}>
            <Home size={22} /><span className="text-[8px] font-black uppercase tracking-widest mt-1">Home</span>
          </button>
          
          <button onClick={() => changeView('team')} className={`flex flex-col items-center gap-1 transition-all ${view === 'team' ? 'text-blue-600 scale-110' : 'text-slate-300'}`}>
            <Medal size={22} /><span className="text-[8px] font-black uppercase tracking-widest mt-1">Team</span>
          </button>

          <button onClick={() => changeView('entry')} className="flex flex-col items-center gap-1 -mt-14 transition-all">
            <div className={`p-5 rounded-[1.8rem] shadow-xl transition-all ${view === 'entry' ? 'bg-blue-600 text-white scale-110' : 'bg-slate-950 text-white'}`}><Plus size={24} /></div>
          </button>
          
          <button onClick={() => changeView('stats')} className={`flex flex-col items-center gap-1 transition-all ${view === 'stats' ? 'text-blue-600 scale-110' : 'text-slate-300'}`}>
            <BarChart2 size={22} /><span className="text-[8px] font-black uppercase tracking-widest mt-1">Data</span>
          </button>
        </nav>
        
        {/* Custom Confirmation Dialog */}
        {confirmDialog.isOpen && (
          <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white p-6 rounded-2xl shadow-xl max-w-xs w-full animate-in zoom-in-95">
              <p className="font-bold text-slate-800 mb-6 text-center leading-relaxed text-sm">{confirmDialog.message}</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })} className="flex-1 py-3 bg-slate-100 rounded-xl font-bold text-slate-500 text-sm">キャンセル</button>
                <button onClick={confirmDialog.onConfirm} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-lg">OK</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default App;