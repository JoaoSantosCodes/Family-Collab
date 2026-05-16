import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingCart, 
  Plus, 
  CheckCircle2, 
  Circle, 
  Apple, 
  Beef, 
  Milk, 
  Wine, 
  Trash2,
  Sparkles,
  Loader2,
  Users,
  ChevronDown
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getSmartSuggestions, Suggestion } from '@/lib/shoppingEngine';
import { triggerHaptic } from '@/lib/haptics';
import confetti from 'canvas-confetti';

interface ShoppingItem {
  id: string;
  name: string;
  category: string;
  completed: boolean;
  user_id: string;
  created_at: string;
}

export default function App() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Geral');
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [harmonyPoints, setHarmonyPoints] = useState(0);

  const categories = [
    { name: 'Hortifruti', icon: Apple, color: 'text-green-400' },
    { name: 'Proteínas', icon: Beef, color: 'text-red-400' },
    { name: 'Laticínios', icon: Milk, color: 'text-blue-400' },
    { name: 'Bebidas', icon: Wine, color: 'text-purple-400' },
    { name: 'Geral', icon: ShoppingCart, color: 'text-gold' },
  ];

  useEffect(() => {
    const savedPoints = localStorage.getItem('harmony_points');
    if (savedPoints) setHarmonyPoints(parseInt(savedPoints));

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchItems(session.user.id).finally(() => setIsLoading(false));
        getSmartSuggestions(session.user.id).then(setSuggestions);
        
        const channel = supabase
          .channel('shopping_realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_list' }, () => {
            fetchItems(session.user.id);
          })
          .subscribe();

        return () => { supabase.removeChannel(channel); };
      } else { setIsLoading(false); }
    });
  }, []);

  const fetchItems = async (userId: string) => {
    const { data } = await supabase.from('shopping_list').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (data) setItems(data);
  };

  const addItem = async (override?: { name: string, category: string }) => {
    const name = override?.name || newItemName;
    const cat = override?.category || selectedCategory;
    if (!name || !user) return;
    
    const { data } = await supabase.from('shopping_list').insert([{ user_id: user.id, name, category: cat, completed: false }]).select();
    if (data) {
      setItems(prev => [data[0], ...prev]);
      setNewItemName('');
      triggerHaptic('light');
    }
  };

  const toggleBought = async (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    const { error } = await supabase.from('shopping_list').update({ completed: !item.completed }).eq('id', id);
    if (!error) {
      if (!item.completed) {
        const newPoints = harmonyPoints + 15;
        setHarmonyPoints(newPoints);
        localStorage.setItem('harmony_points', newPoints.toString());
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#D4AF37', '#ffffff', '#000000']
        });
      }
      setItems(prev => prev.map(i => i.id === id ? { ...i, completed: !i.completed } : i));
      triggerHaptic(!item.completed ? 'success' : 'light');
    }
  };

  const removeItem = async (id: string) => {
    const { error } = await supabase.from('shopping_list').delete().eq('id', id);
    if (!error) { setItems(prev => prev.filter(item => item.id !== id)); triggerHaptic('light'); }
  };

  if (isLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="text-gold animate-spin" size={40} /></div>;

  const familyLevel = Math.floor(harmonyPoints / 100) + 1;
  const progressToNextLevel = harmonyPoints % 100;

  return (
    <div className="min-h-screen bg-background text-text flex flex-col font-sans">
      <header className="h-20 flex items-center justify-between px-6 border-b border-border-custom bg-background/50 backdrop-blur-xl sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center border border-gold/20">
            <Users className="text-gold" size={20} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-gold mb-1">Casa Principal</p>
            <h1 className="text-lg font-serif font-bold tracking-tight flex items-center gap-2">Harmony <span className="text-gold">Hub</span> <ChevronDown size={14} className="text-text-dim" /></h1>
          </div>
        </div>

        <div className="flex flex-col items-end">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-gold" />
            <span className="text-xs font-black text-text tabular-nums">{harmonyPoints} <span className="text-text-dim font-bold">XP</span></span>
          </div>
          <div className="w-24 h-1.5 bg-surface-2 rounded-full mt-1 border border-white/5 overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progressToNextLevel}%` }}
              className="h-full bg-gold shadow-[0_0_10px_rgba(212,175,55,0.5)]"
            />
          </div>
          <span className="text-[8px] font-bold uppercase tracking-widest text-text-dim mt-1">Lvl {familyLevel} Family</span>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-2xl mx-auto w-full space-y-8">
        {/* INPUT BOX */}
        <div className="bg-surface-1 border border-border-custom p-6 rounded-[2.5rem] shadow-xl space-y-4">
          <div className="flex gap-4">
            <input 
              type="text" 
              placeholder="Falta algo em casa?"
              value={newItemName}
              onChange={e => setNewItemName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addItem()}
              className="flex-1 bg-surface-2 border border-border-custom rounded-2xl py-4 px-6 text-lg font-semibold outline-none focus:border-gold/30"
            />
            <button onClick={() => addItem()} className="px-6 bg-gold text-bg rounded-2xl font-bold hover:bg-gold-bright transition-all shadow-lg shadow-gold/20">
              <Plus size={24} />
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setSelectedCategory(cat.name)}
                className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all flex items-center gap-2 whitespace-nowrap ${selectedCategory === cat.name ? 'bg-gold text-bg border-gold' : 'border-border-custom text-text-dim hover:border-gold/50'}`}
              >
                <cat.icon size={14} /> {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* AI SUGGESTIONS */}
        {suggestions.length > 0 && (
          <div className="bg-gradient-to-br from-gold/10 to-transparent border border-gold/20 p-6 rounded-[2.5rem] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gold/20 rounded-full text-gold"><Sparkles size={16} /></div>
                <div>
                  <h3 className="text-sm font-bold">Sugestões Inteligentes</h3>
                  <p className="text-[10px] text-text-dim">Baseado no que vocês mais compram</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {suggestions.map((s) => (
                <div key={s.name} className="bg-surface-1/50 border border-gold/10 p-3 rounded-2xl flex items-center justify-between group">
                  <div>
                    <p className="text-xs font-bold">{s.name}</p>
                    <p className="text-[9px] text-text-dim uppercase">Acaba em média a cada 7 dias</p>
                  </div>
                  <button onClick={() => addItem({ name: s.name, category: s.category })} className="p-2 bg-gold/10 text-gold rounded-lg hover:bg-gold hover:text-bg transition-all">
                    <Plus size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LIST */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-text-dim">Lista da Família</h3>
            <span className="text-[10px] text-text-dim/50 font-bold uppercase">{items.filter(i => !i.completed).length} Pendentes</span>
          </div>
          
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {items.sort((a, b) => Number(a.completed) - Number(b.completed)).map((item) => {
                const categoryData = categories.find(c => c.name === item.category);
                const Icon = categoryData?.icon || ShoppingCart;

                return (
                  <motion.div 
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`p-4 rounded-2xl border transition-all flex items-center justify-between shadow-sm ${item.completed ? 'bg-surface-3/20 border-transparent opacity-40' : 'bg-surface-1 border-border-custom hover:border-gold/30'}`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <button onClick={() => toggleBought(item.id)} className={`transition-all ${item.completed ? 'text-gold' : 'text-text-dim hover:text-gold'}`}>
                        {item.completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                      </button>
                      <div>
                        <p className={`text-sm font-bold ${item.completed ? 'line-through' : ''}`}>{item.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Icon size={10} className={categoryData?.color} />
                          <p className={`text-[9px] font-black uppercase tracking-widest ${categoryData?.color}`}>{item.category}</p>
                        </div>
                      </div>
                    </div>
                    
                    <button onClick={() => removeItem(item.id)} className="p-2 text-text-dim hover:text-red-400 transition-opacity">
                      <Trash2 size={16} />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
