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
  Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getSmartSuggestions, Suggestion } from '@/lib/shoppingEngine';
import { triggerHaptic } from '@/lib/haptics';

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

  const categories = [
    { name: 'Hortifruti', icon: Apple, color: 'text-green-400' },
    { name: 'Proteínas', icon: Beef, color: 'text-red-400' },
    { name: 'Laticínios', icon: Milk, color: 'text-blue-400' },
    { name: 'Bebidas', icon: Wine, color: 'text-purple-400' },
    { name: 'Geral', icon: ShoppingCart, color: 'text-gold' },
  ];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchItems(session.user.id).finally(() => setIsLoading(false));
        getSmartSuggestions(session.user.id).then(setSuggestions);
        
        // REALTIME SYNC
        const channel = supabase
          .channel('shopping_realtime')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'shopping_list' },
            () => {
              fetchItems(session.user.id);
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      } else {
        setIsLoading(false);
      }
    });
  }, []);

  const fetchItems = async (userId: string) => {
    const { data } = await supabase
      .from('shopping_list')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (data) setItems(data);
  };

  const addItem = async () => {
    if (!newItemName || !user) return;
    
    const { data } = await supabase
      .from('shopping_list')
      .insert([{
        user_id: user.id,
        name: newItemName,
        category: selectedCategory,
        completed: false
      }])
      .select();

    if (data) {
      setItems(prev => [data[0], ...prev]);
      setNewItemName('');
      triggerHaptic('light');
    }
  };

  const toggleBought = async (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    const { error } = await supabase
      .from('shopping_list')
      .update({ completed: !item.completed })
      .eq('id', id);

    if (!error) {
      setItems(prev => prev.map(i => i.id === id ? { ...i, completed: !i.completed } : i));
      triggerHaptic(!item.completed ? 'success' : 'light');
    }
  };

  const removeItem = async (id: string) => {
    const { error } = await supabase
      .from('shopping_list')
      .delete()
      .eq('id', id);

    if (!error) {
      setItems(prev => prev.filter(item => item.id !== id));
      triggerHaptic('light');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="text-gold animate-spin" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-text flex flex-col font-sans">
      <header className="h-20 flex items-center justify-between px-6 border-b border-border-custom bg-background/50 backdrop-blur-xl sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center border border-gold/20">
            <ShoppingCart className="text-gold" size={20} />
          </div>
          <h1 className="text-xl font-serif font-bold tracking-tight">Family <span className="text-gold">Collab</span></h1>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-2xl mx-auto w-full space-y-8">
        {/* AI SUGGESTIONS */}
        {suggestions.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-2">
              <Sparkles size={14} className="text-gold" />
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-dim/70">Sugestões de Compra</h3>
            </div>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
              {suggestions.map((s) => (
                <button
                  key={s.name}
                  onClick={() => { setNewItemName(s.name); setSelectedCategory(s.category); }}
                  className="shrink-0 px-4 py-3 bg-surface-1 border border-gold/10 rounded-2xl flex items-center gap-3 hover:border-gold/40 transition-all"
                >
                  <div className="text-left">
                    <p className="text-xs font-bold">{s.name}</p>
                    <p className="text-[9px] text-text-dim uppercase tracking-wider">{s.category}</p>
                  </div>
                  <Plus size={14} className="text-gold" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* INPUT BOX */}
        <div className="bg-surface-1 border border-border-custom p-6 rounded-3xl shadow-xl space-y-4">
          <div className="flex gap-4">
            <input 
              type="text" 
              placeholder="Adicionar item..."
              value={newItemName}
              onChange={e => setNewItemName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addItem()}
              className="flex-1 bg-surface-2 border border-border-custom rounded-2xl py-4 px-6 text-lg font-semibold outline-none focus:border-gold/30"
            />
            <button 
              onClick={addItem}
              className="px-6 bg-gold text-bg rounded-2xl font-bold hover:bg-gold-bright transition-all shadow-lg shadow-gold/20"
            >
              <Plus size={24} />
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setSelectedCategory(cat.name)}
                className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all flex items-center gap-2 whitespace-nowrap ${selectedCategory === cat.name ? 'bg-gold/10 border-gold text-gold' : 'border-border-custom text-text-dim'}`}
              >
                <cat.icon size={14} /> {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* LIST */}
        <div className="space-y-3">
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
                  className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${item.completed ? 'bg-surface-3/30 border-transparent opacity-50' : 'bg-surface-1 border-border-custom'}`}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <button 
                      onClick={() => toggleBought(item.id)}
                      className={`transition-all ${item.completed ? 'text-gold' : 'text-text-dim'}`}
                    >
                      {item.completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                    </button>
                    <div>
                      <p className={`text-sm font-bold ${item.completed ? 'line-through' : ''}`}>{item.name}</p>
                      <p className={`text-[9px] font-black uppercase tracking-widest ${categoryData?.color}`}>{item.category}</p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => removeItem(item.id)}
                    className="p-2 text-text-dim hover:text-red-400 opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity"
                  >
                    <Trash2 size={18} />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
