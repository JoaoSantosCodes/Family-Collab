import { supabase } from './supabase';

export interface Suggestion {
  name: string;
  category: string;
  confidence: number; // 0 to 1
}

export const getSmartSuggestions = async (userId: string) => {
  const { data: history } = await supabase
    .from('shopping_list')
    .select('name, category')
    .eq('user_id', userId)
    .eq('completed', true)
    .order('updated_at', { ascending: false })
    .limit(50);

  if (!history || history.length === 0) {
    return [
      { name: 'Leite', category: 'Laticínios', confidence: 0.5 },
      { name: 'Café', category: 'Matinal', confidence: 0.5 },
      { name: 'Pão', category: 'Padaria', confidence: 0.5 }
    ];
  }

  const { data: current } = await supabase
    .from('shopping_list')
    .select('name')
    .eq('user_id', userId)
    .eq('completed', false);

  const currentNames = new Set(current?.map(i => i.name.toLowerCase()));

  const freqMap: Record<string, { count: number; category: string }> = {};
  
  history.forEach(item => {
    const name = item.name;
    if (!currentNames.has(name.toLowerCase())) {
      if (!freqMap[name]) {
        freqMap[name] = { count: 0, category: item.category || 'Geral' };
      }
      freqMap[name].count++;
    }
  });

  const suggestions: Suggestion[] = Object.entries(freqMap)
    .map(([name, data]) => ({
      name,
      category: data.category,
      confidence: Math.min(1, data.count / 3)
    }))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);

  return suggestions;
};
