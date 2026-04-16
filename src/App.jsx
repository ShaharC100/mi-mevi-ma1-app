import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, addDoc, deleteDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Share2, Plus, ArrowRight, Calendar, Users, Utensils, Check, Trash2, Copy, Pencil, MapPin, MessageCircle, X, Key } from 'lucide-react';

// === Firebase Initialization ===
const firebaseConfig = {
  apiKey: "AIzaSyC54e6PPSje87J1E_AgFKT80-TBWlqrwMM",
  authDomain: "mi-mevi-ma-787587.firebaseapp.com",
  projectId: "mi-mevi-ma-787587",
  storageBucket: "mi-mevi-ma-787587.firebasestorage.app",
  messagingSenderId: "945092483763",
  appId: "1:945092483763:web:6d62898f28e4096d7b2ec6"
};

// Clean appId for Firebase path segments
const rawAppId = typeof __app_id !== 'undefined' ? __app_id : "mi-mevi-ma-prod";
const appId = rawAppId.replace(/\//g, '_');

const isLocalSandbox = typeof __firebase_config !== 'undefined';
const configToUse = isLocalSandbox ? JSON.parse(__firebase_config) : firebaseConfig;

const app = initializeApp(configToUse);
const auth = getAuth(app);
const db = getFirestore(app);

export default function App() {
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [items, setItems] = useState([]);
  const [currentView, setCurrentView] = useState('home');
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [isEventsLoaded, setIsEventsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (isLocalSandbox && typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        setIsLoading(false);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setIsLoading(false);
      }
    });

    const handleHash = () => {
      const hash = window.location.hash;
      if (hash && hash.startsWith('#id=')) {
        const sharedEventId = hash.replace('#id=', '');
        setSelectedEventId(sharedEventId);
        setCurrentView('eventDetails');
      }
    };
    
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => {
      unsubscribe();
      window.removeEventListener('hashchange', handleHash);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const eventsRef = collection(db, 'artifacts', appId, 'public', 'data', 'potluck_events');
    const unsubEvents = onSnapshot(eventsRef, (snapshot) => {
      const eventsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      eventsData.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setEvents(eventsData);
      setIsEventsLoaded(true);
    }, () => setIsEventsLoaded(true));

    const itemsRef = collection(db, 'artifacts', appId, 'public', 'data', 'potluck_items');
    const unsubItems = onSnapshot(itemsRef, (snapshot) => {
      const itemsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      itemsData.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setItems(itemsData);
    });

    return () => {
      unsubEvents();
      unsubItems();
    };
  }, [user]);

  const goHome = () => {
    setCurrentView('home');
    setSelectedEventId(null);
    try { window.location.hash = ''; } catch (e) {}
  };

  const goToEvent = (eventId) => {
    setSelectedEventId(eventId);
    setCurrentView('eventDetails');
    try { window.location.hash = `id=${eventId}`; } catch (e) {}
  };

  if (isLoading) {
    return (
      <div dir="rtl" className="min-h-screen bg-gray-50 flex items-center justify-center font-sans text-indigo-600">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-current"></div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 text-gray-800 font-sans pb-10 antialiased text-right">
      <header className="bg-white shadow-sm sticky top-0 z-20 border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center text-right">
          <h1 className="text-2xl font-bold text-indigo-600 flex items-center gap-2 cursor-pointer" onClick={goHome}>
            <Utensils className="w-6 h-6" />
            <span>מי מביא מה?</span>
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-[10px] text-gray-400 font-bold bg-gray-50 px-2 py-1 rounded border border-gray-100 hidden sm:inline-block">האפליקציות של שחר</span>
            {currentView !== 'home' && (
              <button onClick={goHome} className="text-gray-500 hover:text-indigo-600 flex items-center gap-1 text-sm font-bold transition-colors">
                <ArrowRight className="w-4 h-4" />
                חזרה לראשי
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {currentView === 'home' && <HomeView events={events} onCreateClick={() => setCurrentView('createEvent')} onEventClick={goToEvent} />}
        {currentView === 'createEvent' && <CreateEventView user={user} onEventCreated={goToEvent} onCancel={goHome} />}
        {currentView === 'eventDetails' && selectedEventId && (
          <EventDetailsView 
            event={events.find(e => e.id === selectedEventId)} 
            items={items.filter(i => i.eventId === selectedEventId)}
            user={user}
            isLoadingEvents={!isEventsLoaded}
          />
        )}
      </main>
    </div>
  );
}

function HomeView({ events, onCreateClick, onEventClick }) {
  const [joinId, setJoinId] = useState('');
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-center bg-indigo-600 p-8 rounded-3xl text-white shadow-xl">
        <div className="mb-6 md:mb-0 text-center md:text-right">
          <h2 className="text-2xl font-black mb-2">מארגנים מפגש חברים?</h2>
          <p className="text-indigo-100 font-medium">צרו דף למפגש, שתפו עם כולם וראו מי מביא מה.</p>
        </div>
        <button onClick={onCreateClick} className="bg-white text-indigo-600 hover:bg-indigo-50 px-8 py-4 rounded-2xl font-black shadow-lg transition-all active:scale-95 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          <span>פתיחת מפגש חדש</span>
        </button>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm transition-all hover:shadow-md text-right" dir="rtl">
        <h3 className="font-black text-gray-800 mb-4 flex items-center gap-2 text-right">
          <Key className="w-4 h-4 text-indigo-500" />
          קיבלתם קוד למפגש?
        </h3>
        <div className="flex gap-3">
          <input type="text" value={joinId} onChange={(e) => setJoinId(e.target.value)} placeholder="הזינו קוד..." className="flex-1 px-5 py-3.5 rounded-2xl border border-gray-200 bg-gray-50 outline-none text-right font-mono font-bold tracking-widest focus:bg-white" dir="rtl" />
          <button onClick={() => { if(joinId.trim()) onEventClick(joinId.trim()) }} className="bg-gray-800 text-white px-8 py-3.5 rounded-2xl font-black transition-all active:scale-95">הצטרפות</button>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-black text-gray-800 mb-4 px-1 text-right">מפגשים פעילים</h3>
        {events.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-dashed border-gray-200 text-center text-gray-400">אין מפגשים עדיין. תהיו הראשונים לפתוח אחד!</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 text-right" dir="rtl">
            {events.map(event => (
              <div key={event.id} onClick={() => onEventClick(event.id)} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-indigo-200 cursor-pointer transition-all group active:scale-[0.98] text-right">
                <h4 className="font-black text-xl text-gray-900 group-hover:text-indigo-600 transition-colors mb-3 text-right">{String(event.eventName || '')}</h4>
                <div className="flex items-center text-gray-400 text-[11px] font-black gap-4 uppercase tracking-wider text-right">
                  <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /><span>{String(event.eventDate || '')}</span></div>
                  {event.creatorName && <div className="pr-4 border-r border-gray-200 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /><span>מארגן: {String(event.creatorName)}</span></div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CreateEventView({ user, onEventCreated, onCancel }) {
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!eventName.trim() || !eventDate || !creatorName.trim() || !user) return;
    setIsSubmitting(true);
    try {
      const eventsRef = collection(db, 'artifacts', appId, 'public', 'data', 'potluck_events');
      const docRef = await addDoc(eventsRef, {
        eventName: eventName.trim(), eventDate, eventLocation: eventLocation.trim(),
        createdBy: user.uid, creatorName: creatorName.trim(), createdAt: serverTimestamp()
      });
      onEventCreated(docRef.id);
    } catch (err) {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-3xl shadow-2xl border border-gray-100 text-right" dir="rtl">
      <h2 className="text-2xl font-black text-gray-800 mb-6 text-center">פתיחת מפגש חדש</h2>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-[11px] font-black text-gray-400 mb-2 mr-1 uppercase text-right">מה האירוע?</label>
          <input type="text" value={eventName} onChange={(e) => setEventName(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-gray-50 focus:bg-white outline-none font-bold text-right" placeholder="יום הולדת לשחר" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-black text-gray-400 mb-2 mr-1 uppercase text-right">תאריך</label>
            <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 font-bold bg-gray-50 focus:bg-white outline-none text-right" required />
          </div>
          <div>
            <label className="block text-[11px] font-black text-gray-400 mb-2 mr-1 uppercase text-right">מיקום</label>
            <input type="text" value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 font-bold bg-gray-50 focus:bg-white outline-none text-right" placeholder="איפה זה?" />
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-black text-gray-400 mb-2 mr-1 uppercase text-right">שם המארגן</label>
          <input type="text" value={creatorName} onChange={(e) => setCreatorName(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-gray-50 focus:bg-white text-gray-900 text-right" placeholder="משפחת לוי" required />
        </div>
        <div className="pt-6 flex flex-col gap-3">
          <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg active:scale-[0.98] disabled:opacity-50">{isSubmitting ? 'מעבד...' : 'צור את המפגש'}</button>
          <button type="button" onClick={onCancel} className="w-full bg-gray-50 text-gray-500 py-3 rounded-2xl font-bold transition-all">ביטול</button>
        </div>
      </form>
    </div>
  );
}

function EventDetailsView({ event, items, user, isLoadingEvents }) {
  const [copySuccess, setCopySuccess] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  if (isLoadingEvents) return <div className="text-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div><p className="font-bold text-gray-400">טוען נתוני...</p></div>;
  if (!event) return <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm"><p className="text-xl font-bold text-gray-400">המפגש לא נמצא.</p></div>;
  
  const familyCounts = {};
  items.forEach(item => {
    const name = (item.familyName || '').trim();
    if (name && familyCounts[name] === undefined) familyCounts[name] = Number(item.participantsCount) || 0;
  });
  const totalParticipants = Object.values(familyCounts).reduce((sum, count) => sum + count, 0);

  const getShareUrl = () => {
    let currentUrl = window.location.href;
    if (currentUrl.startsWith('blob:')) currentUrl = currentUrl.substring(5);
    try {
      const urlObj = new URL(currentUrl);
      urlObj.search = ''; urlObj.hash = `#id=${event.id}`;
      return urlObj.toString();
    } catch (e) { return `${currentUrl.split('?')[0].split('#')[0]}#id=${event.id}`; }
  };

  const copyToClipboard = (text, setSuccess) => {
    const el = document.createElement('textarea'); el.value = text;
    document.body.appendChild(el); el.select(); document.execCommand('copy');
    document.body.removeChild(el); setSuccess(true); setTimeout(() => setSuccess(false), 2000);
  };

  const handleDeleteItem = async (itemId) => {
    try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'potluck_items', itemId)); } catch (e) {}
  };

  return (
    <div className="space-y-8 text-right" dir="rtl">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden text-center md:text-right">
        <div className="space-y-4">
          <h2 className="text-3xl font-black text-gray-900 tracking-tight text-right">{String(event.eventName || '')}</h2>
          <div className="flex flex-wrap justify-center md:justify-start items-center gap-4 text-gray-500 text-sm font-bold text-right">
            <span className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl border border-indigo-100"><Calendar className="w-4 h-4" />{String(event.eventDate || '')}</span>
            {event.eventLocation && <span className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl"><MapPin className="w-4 h-4 text-red-400" />{String(event.eventLocation)}</span>}
            <span className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl"><Users className="w-4 h-4" />משתתפים: {totalParticipants}</span>
          </div>
        </div>
        <button onClick={() => setIsShareModalOpen(true)} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg flex items-center gap-2 shrink-0 transition-all active:scale-95">
          <Share2 className="w-5 h-5" />
          <span>שתף מפגש</span>
        </button>
      </div>

      {isShareModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 relative">
            <button onClick={() => setIsShareModalOpen(false)} className="absolute left-6 top-6 text-gray-300"><X className="w-6 h-6" /></button>
            <h3 className="font-black text-gray-900 mb-8 text-center text-xl">איך תרצו לשתף?</h3>
            <div className="grid grid-cols-2 gap-6 mb-10">
              <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent("הוזמנת למפגש: " + event.eventName + "\n" + getShareUrl())}`} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center shadow-sm transition-all hover:bg-green-600 hover:text-white"><MessageCircle className="w-8 h-8" /></div>
                <span className="text-xs font-black">וואטסאפ</span>
              </a>
              <button onClick={() => copyToClipboard(getShareUrl(), setCopySuccess)} className="flex flex-col items-center gap-3">
                <div className={`w-16 h-16 ${copySuccess ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600'} rounded-2xl flex items-center justify-center shadow-sm`}>{copySuccess ? <Check className="w-8 h-8" /> : <Copy className="w-8 h-8" />}</div>
                <span className="text-xs font-black">{copySuccess ? 'הועתק!' : 'העתק קישור'}</span>
              </button>
            </div>
            <div className="bg-gray-50 p-5 rounded-2xl text-center border border-gray-100">
              <p className="text-[10px] text-gray-400 mb-2 font-black uppercase tracking-widest text-center">קוד ידני</p>
              <span className="font-mono font-black text-indigo-600 text-sm block text-center">{event.id}</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <div className="w-full lg:w-[320px] bg-white p-8 rounded-3xl border border-gray-100 shadow-sm sticky top-28 text-right">
          <h3 className="text-xl font-black mb-6 flex items-center gap-2 text-gray-800 text-right">
            {editingItem ? <Pencil className="w-6 h-6 text-indigo-500" /> : <Plus className="w-6 h-6 text-indigo-500" />} 
            {editingItem ? 'עריכת מנה' : 'מה אתם מביאים?'}
          </h3>
          <AddItemForm eventId={event.id} user={user} items={items} editingItem={editingItem} setEditingItem={setEditingItem} />
        </div>

        <div className="flex-1 w-full bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
          <div className="p-6 border-b bg-gray-50/50 flex justify-between items-center text-right">
             <h3 className="font-black text-gray-800 text-lg text-right">רשימת הכיבוד</h3>
             <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full border border-indigo-100">{items.length} שורות</span>
          </div>
          
          {items.length === 0 ? (
             <div className="p-32 text-center flex flex-col items-center justify-center opacity-30">
                <Utensils className="w-20 h-20 mb-4 text-gray-300" />
                <p className="font-black text-xl text-gray-400">הרשימה עדיין ריקה</p>
             </div>
          ) : (
            <div className="overflow-x-auto text-right">
              <table className="w-full text-right border-collapse" dir="rtl">
                <thead>
                  <tr className="bg-gray-50 text-gray-400 font-black text-[11px] uppercase tracking-widest border-b border-gray-100 text-right">
                    <th className="p-5 text-right">משפחה</th>
                    <th className="p-5 text-right">סוג</th>
                    <th className="p-5 text-right">מנה</th>
                    <th className="p-5 text-center">כמות</th>
                    <th className="p-5 text-right">הערות</th>
                    <th className="p-5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-indigo-50/30 transition-colors group text-right">
                      <td className="p-5 text-right font-black text-gray-900">{String(item.familyName || '')}</td>
                      <td className="p-5 text-right"><span className="bg-gray-100 text-gray-500 text-[10px] font-black px-2 py-1 rounded-lg uppercase">{String(item.mealComponent || '')}</span></td>
                      <td className="p-5 text-indigo-700 font-black text-right">{String(item.dish || '')}</td>
                      <td className="p-5 text-center font-black text-gray-700 bg-gray-50/30">{String(item.quantity || '')}</td>
                      <td className="p-5 text-gray-400 text-sm font-bold italic max-w-[150px] truncate text-right">{String(item.notes || '-')}</td>
                      <td className="p-5 text-left">
                        {user && (item.userId === user.uid || event.createdBy === user.uid) && (
                          <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100">
                            <button onClick={() => { setEditingItem(item); window.scrollTo({top: 0, behavior: 'smooth'}); }} className="text-indigo-600 p-2"><Pencil className="w-4 h-4" /></button>
                            <button onClick={() => handleDeleteItem(item.id)} className="text-red-500 p-2"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AddItemForm({ eventId, user, items, editingItem, setEditingItem }) {
  const [familyName, setFamilyName] = useState('');
  const [participantsCount, setParticipantsCount] = useState('1');
  const [mealComponent, setMealComponent] = useState('עיקרית');
  const [dish, setDish] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingItem) {
      setFamilyName(editingItem.familyName); setParticipantsCount(String(editingItem.participantsCount));
      setMealComponent(editingItem.mealComponent || 'עיקרית'); setDish(editingItem.dish);
      setQuantity(editingItem.quantity); setNotes(editingItem.notes || '');
    } else { setDish(''); setQuantity('1'); setNotes(''); setMealComponent('עיקרית'); }
  }, [editingItem]);

  const existing = items.find(i => (i.familyName || '').trim() === familyName.trim() && familyName.trim() !== '' && i.id !== editingItem?.id);
  useEffect(() => { if (existing && !editingItem) setParticipantsCount(String(existing.participantsCount)); }, [existing, familyName, editingItem]);

  const handleSubmit = async (e) => {
    e.preventDefault(); if (!familyName.trim() || !dish.trim() || !user) return;
    setIsSubmitting(true);
    try {
      const data = { familyName: familyName.trim(), participantsCount: Number(participantsCount), mealComponent, dish: dish.trim(), quantity: String(quantity), notes: notes.trim(), updatedAt: serverTimestamp() };
      if (editingItem) { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'potluck_items', editingItem.id), data); setEditingItem(null); }
      else { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'potluck_items'), { ...data, eventId, userId: user.uid, createdAt: serverTimestamp() }); setFamilyName(''); setParticipantsCount('1'); setDish(''); setQuantity('1'); setNotes(''); setMealComponent('עיקרית'); }
    } catch (err) {} finally { setIsSubmitting(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 text-right" dir="rtl">
      <div>
        <label className="block text-[10px] font-black text-gray-400 mb-2 mr-1 uppercase text-right">שם משפחה</label>
        <input type="text" value={familyName} onChange={(e) => setFamilyName(e.target.value)} className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 focus:bg-white outline-none font-bold text-gray-900 text-right" placeholder="כהן" required />
      </div>
      <div>
        <label className="block text-[10px] font-black text-gray-400 mb-2 mr-1 uppercase text-right">כמות משתתפים</label>
        <input type="number" min="1" max="40" value={participantsCount} onChange={(e) => setParticipantsCount(e.target.value)} disabled={!!existing && !editingItem} className="w-full px-4 py-3 rounded-2xl border bg-gray-50 outline-none text-right font-black disabled:opacity-50 text-right" required />
      </div>
      <div className="border-t border-gray-50 pt-6 mt-2 text-right">
        <label className="block text-[10px] font-black text-gray-400 mb-2 mr-1 uppercase text-right">סוג המנה</label>
        <select value={mealComponent} onChange={(e) => setMealComponent(e.target.value)} className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white font-bold mb-5 cursor-pointer text-right">
          <option>עיקרית</option><option>תוספת</option><option>מנה צמחונית</option><option>עוגה</option><option>קינוח מתוק</option><option>שתיה קלה</option><option>אחר</option>
        </select>
        <label className="block text-[10px] font-black text-gray-400 mb-2 mr-1 uppercase text-right">פירוט המנה</label>
        <input type="text" maxLength={50} value={dish} onChange={(e) => setDish(e.target.value)} className="w-full px-4 py-3 rounded-2xl border border-gray-100 bg-white focus:ring-4 focus:ring-indigo-50 outline-none font-black text-indigo-700 text-right" placeholder="סיר ממולאים" required />
      </div>
      <div className="grid grid-cols-2 gap-4 text-right">
        <div>
          <label className="block text-[10px] font-black text-gray-400 mb-2 mr-1 uppercase text-right">כמות</label>
          <input type="text" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white outline-none font-black text-center text-gray-900 shadow-sm text-right" placeholder="1" required />
        </div>
      </div>
      <div>
        <label className="block text-[10px] font-black text-gray-400 mb-2 mr-1 uppercase text-right">הערות</label>
        <textarea maxLength={80} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-4 py-3 rounded-2xl border border-gray-100 bg-white outline-none font-bold resize-none h-20 text-gray-600 text-right" placeholder="אלרגיות..." />
      </div>
      <div className="pt-4 flex flex-col gap-3">
        <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg active:scale-[0.98] disabled:opacity-50">
          {isSubmitting ? 'מעבד...' : (editingItem ? 'שמור שינויים' : 'הוסף לרשימה')}
        </button>
        {editingItem && <button type="button" onClick={() => setEditingItem(null)} className="w-full bg-gray-100 text-gray-600 py-3 rounded-2xl font-bold">ביטול</button>}
      </div>
    </form>
  );
}