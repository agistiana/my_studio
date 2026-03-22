import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, onSnapshot, 
  deleteDoc, doc, updateDoc, query, serverTimestamp 
} from 'firebase/firestore';
import { 
  getAuth, signInAnonymously, onAuthStateChanged 
} from 'firebase/auth';
import { 
  Plus, Trash2, Edit3, X, 
  ExternalLink, Lock, Loader2, 
  Image as ImageIcon, CheckCircle2, AlertCircle
} from 'lucide-react';

// --- INITIALIZATION ---
// Pastikan __firebase_config terisi otomatis oleh environment
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'portfolio-prod-001';

export default function App() {
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [activeTab, setActiveTab] = useState('Semua');
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [passInput, setPassInput] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    category: 'Website',
    imageUrl: '',
    description: '',
    link: '#'
  });

  const categories = ['Semua', 'Website', 'Foto', 'Video', 'Desain'];
  const timerRef = useRef(null);

  // (1) Setup Authentication & User Session
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          // Ganti dengan token khusus jika ada
          const { signInWithCustomToken } = await import('firebase/auth');
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          // Fallback ke anonim agar Firestore terbuka
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth Fail:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // (2) Fetch Data with Simple Query (Rule 2: No complex queries)
  useEffect(() => {
    if (!user) return;

    // Path sesuai Rule 1: /artifacts/{appId}/public/data/{collectionName}
    const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'portfolio');
    
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sortir di memori browser (Rule 2)
      const sorted = docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setItems(sorted);
      setLoading(false);
    }, (err) => {
      console.error("Firestore Error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // (3) Admin Secret Access (Long Press 3s on "STUDIO")
  const startTimer = () => {
    timerRef.current = setTimeout(() => {
      if (!isAuthorized) setShowAdminPanel(true);
    }, 3000);
  };

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  // (4) Database Operations
  const handleAdminAuth = (e) => {
    e.preventDefault();
    if (passInput === '2024') { // Kode akses rahasia Anda
      setIsAuthorized(true);
      setShowAdminPanel(false);
      setPassInput('');
    } else {
      alert("Kode salah.");
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!isAuthorized || !user) return;
    
    setIsSaving(true);
    try {
      const colPath = collection(db, 'artifacts', appId, 'public', 'data', 'portfolio');
      
      if (editingItem) {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'portfolio', editingItem.id);
        await updateDoc(docRef, { 
          ...formData,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(colPath, { 
          ...formData, 
          createdAt: serverTimestamp() 
        });
      }
      resetForm();
    } catch (err) {
      alert("Gagal menyimpan: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!isAuthorized || !confirm("Hapus karya ini secara permanen?")) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'portfolio', id));
    } catch (err) {
      alert("Gagal menghapus.");
    }
  };

  const resetForm = () => {
    setFormData({ title: '', category: 'Website', imageUrl: '', description: '', link: '#' });
    setEditingItem(null);
    setShowModal(false);
  };

  const filteredItems = activeTab === 'Semua' ? items : items.filter(i => i.category === activeTab);

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 font-sans selection:bg-indigo-600 selection:text-white">
      
      {/* Navbar with Secret Trigger */}
      <nav className="fixed top-0 w-full z-40 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-20 flex justify-between items-center">
          <div 
            onTouchStart={startTimer} 
            onTouchEnd={clearTimer}
            onMouseDown={startTimer}
            onMouseUp={clearTimer}
            className="text-xl font-black tracking-tighter cursor-help select-none"
          >
            STUDIO<span className="text-indigo-600">.</span>
          </div>
          
          <div className="flex items-center gap-3">
            {isAuthorized && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-full border border-green-100">
                <CheckCircle2 size={14} className="text-green-600" />
                <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Admin Verified</span>
                <button onClick={() => setIsAuthorized(false)} className="ml-2 text-slate-400 hover:text-red-500">
                  <X size={14} />
                </button>
              </div>
            )}
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
              <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="pt-40 pb-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="inline-block px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest mb-6">
            Digital Portfolio 2024
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 leading-tight">
            Desain visual <br/> yang <span className="italic font-serif">menginspirasi.</span>
          </h1>
          <p className="text-slate-500 text-lg max-w-xl font-medium leading-relaxed">
            Menghadirkan solusi kreatif digital dengan pendekatan minimalis dan fungsional.
          </p>
        </div>
      </header>

      {/* Filter Tabs */}
      <div className="sticky top-20 z-30 bg-white/90 backdrop-blur-md py-4 px-6 border-b border-slate-50 overflow-x-auto scrollbar-hide">
        <div className="max-w-4xl mx-auto flex gap-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={`px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === cat ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Gallery */}
      <main className="py-12 px-6 max-w-4xl mx-auto pb-40">
        {loading ? (
          <div className="flex flex-col items-center py-20 text-slate-300">
            <Loader2 className="animate-spin mb-4" size={32} />
            <p className="font-bold text-[10px] uppercase tracking-widest">Sinkronisasi Data...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-32 text-center border-2 border-dashed border-slate-200 rounded-[40px]">
            <AlertCircle className="mx-auto mb-4 text-slate-200" size={48} />
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Galeri masih kosong</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-16">
            {filteredItems.map(item => (
              <div key={item.id} className="group">
                <div className="relative aspect-[16/10] rounded-[40px] overflow-hidden bg-slate-200 border border-white shadow-sm">
                  <img 
                    src={item.imageUrl} 
                    alt={item.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
                    onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop'; }}
                  />
                  {isAuthorized && (
                    <div className="absolute top-6 right-6 flex gap-3">
                      <button 
                        onClick={() => { setEditingItem(item); setFormData(item); setShowModal(true); }} 
                        className="p-4 bg-white/90 backdrop-blur rounded-2xl text-blue-600 shadow-xl active:scale-90 transition-transform"
                      >
                        <Edit3 size={20}/>
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id)} 
                        className="p-4 bg-white/90 backdrop-blur rounded-2xl text-red-500 shadow-xl active:scale-90 transition-transform"
                      >
                        <Trash2 size={20}/>
                      </button>
                    </div>
                  )}
                </div>
                <div className="mt-8 flex justify-between items-start">
                  <div className="flex-1 pr-6">
                    <span className="text-indigo-600 font-black text-[10px] uppercase tracking-[0.2em] mb-3 block">{item.category}</span>
                    <h3 className="text-3xl font-bold tracking-tight mb-3">{item.title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">{item.description}</p>
                  </div>
                  <a 
                    href={item.link} 
                    target="_blank" 
                    className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center hover:bg-indigo-600 transition-colors shadow-lg active:scale-90"
                  >
                    <ExternalLink size={24} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Secret Login Overlay */}
      {showAdminPanel && (
        <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-2xl flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[40px] p-10 shadow-2xl">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mb-8 mx-auto">
              <Lock size={28} />
            </div>
            <h2 className="text-2xl font-bold text-center mb-2 tracking-tight">Panel Admin</h2>
            <p className="text-slate-400 text-center text-sm mb-10">Masukkan kode akses pribadi Anda.</p>
            <form onSubmit={handleAdminAuth} className="space-y-4">
              <input 
                type="password" 
                placeholder="Kode Rahasia" 
                className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-center tracking-widest"
                value={passInput}
                onChange={e => setPassInput(e.target.value)}
                autoFocus
              />
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 py-5 bg-indigo-600 text-white rounded-2xl font-bold active:scale-95 transition-transform shadow-xl shadow-indigo-100">Buka</button>
                <button type="button" onClick={() => setShowAdminPanel(false)} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-2xl font-bold active:scale-95 transition-transform">Tutup</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CMS Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[110] bg-white overflow-y-auto px-6 py-12">
          <div className="max-w-lg mx-auto">
            <div className="flex justify-between items-center mb-12">
               <h2 className="text-4xl font-bold tracking-tighter italic">{editingItem ? 'EDIT' : 'PUBLISH'}</h2>
               <button onClick={resetForm} className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center active:scale-90 transition-transform"><X size={28}/></button>
            </div>
            
            <form onSubmit={handleSave} className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Judul Karya</label>
                <input 
                  placeholder="Contoh: Brand Identity Design" 
                  className="w-full px-8 py-5 bg-slate-50 rounded-3xl border border-slate-100 outline-none focus:ring-2 focus:ring-indigo-600 font-bold" 
                  value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value})} 
                  required 
                />
              </div>
              
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kategori</label>
                <select className="w-full px-8 py-5 bg-slate-50 rounded-3xl border border-slate-100 outline-none focus:ring-2 focus:ring-indigo-600 font-bold text-indigo-600" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                  {categories.filter(c => c !== 'Semua').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">URL Link Gambar</label>
                <input 
                  placeholder="https://images.unsplash.com/..." 
                  className="w-full px-8 py-5 bg-slate-50 rounded-3xl border border-slate-100 outline-none focus:ring-2 focus:ring-indigo-600 text-sm" 
                  value={formData.imageUrl} 
                  onChange={e => setFormData({...formData, imageUrl: e.target.value})} 
                  required 
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Deskripsi Singkat</label>
                <textarea 
                  placeholder="Jelaskan sedikit tentang proses kreatif Anda..." 
                  className="w-full px-8 py-5 bg-slate-50 rounded-3xl border border-slate-100 outline-none focus:ring-2 focus:ring-indigo-600 h-40 resize-none text-sm leading-relaxed" 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  required 
                />
              </div>

              <button 
                disabled={isSaving}
                className={`w-full py-6 text-white rounded-[32px] font-bold flex items-center justify-center gap-3 transition-all ${isSaving ? 'bg-slate-300' : 'bg-slate-900 shadow-2xl active:scale-[0.98]'}`}
              >
                {isSaving ? <Loader2 className="animate-spin" size={24} /> : 'SIMPAN PORTOFOLIO SEKARANG'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Button */}
      {isAuthorized && !showModal && (
        <button 
          onClick={() => setShowModal(true)}
          className="fixed bottom-10 right-8 w-16 h-16 bg-indigo-600 text-white rounded-3xl shadow-2xl flex items-center justify-center z-50 active:scale-90 transition-transform"
        >
          <Plus size={32} />
        </button>
      )}

      <footer className="py-20 px-6 text-center border-t border-slate-100 bg-white">
        <div className="font-black text-lg mb-4 tracking-tighter">STUDIO<span className="text-indigo-600">.</span></div>
        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.5em]">Digital Collective © 2024</p>
      </footer>

    </div>
  );
}

