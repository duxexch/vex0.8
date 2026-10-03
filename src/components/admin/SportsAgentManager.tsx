import React, { useState } from 'react';
import { ShieldCheck, Plus, Search, Check, Save } from 'lucide-react';
import { SportsCategoryAgent, SportsCategory } from '../../types';

interface SportsAgentManagerProps {
  lang: 'ar' | 'en' | 'es' | 'ru';
}

export const SportsAgentManager: React.FC<SportsAgentManagerProps> = ({ lang }) => {
  const isAr = lang === 'ar';
  
  // Mock State for Admin UI
  const [agents, setAgents] = useState<SportsCategoryAgent[]>([]);
  const [categories, setCategories] = useState<SportsCategory[]>([
    { id: 'cat-1', name: 'Football', nameAr: 'كرة القدم', icon: '⚽', enabled: true, leagues: ['Premier League', 'La Liga'] },
    { id: 'cat-2', name: 'Basketball', nameAr: 'كرة السلة', icon: '🏀', enabled: true, leagues: ['NBA', 'EuroLeague'] },
    { id: 'cat-3', name: 'Tennis', nameAr: 'تنس', icon: '🎾', enabled: true, leagues: ['ATP', 'WTA'] }
  ]);
  
  const [isAdding, setIsAdding] = useState(false);
  const [newAgent, setNewAgent] = useState<Partial<SportsCategoryAgent>>({
    agentName: '',
    username: '',
    passwordHash: '',
    categoryId: categories[0]?.id
  });

  const handleSave = () => {
    if (!newAgent.agentName || !newAgent.username || !newAgent.passwordHash) return;
    
    setAgents(prev => [...prev, {
      ...newAgent,
      id: `agent-${Date.now()}`,
      role: 'sports_agent',
      isActive: true,
      assignedLeagues: []
    } as SportsCategoryAgent]);
    
    setIsAdding(false);
    setNewAgent({ agentName: '', username: '', passwordHash: '', categoryId: categories[0]?.id });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            {isAr ? 'إدارة وكلاء الأقسام الرياضية' : 'Sports Category Agents'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {isAr 
              ? 'قم بإنشاء حسابات مخصصة للموظفين لإدارة أقسام رياضية محددة.' 
              : 'Create dedicated employee accounts to manage specific sports categories.'}
          </p>
        </div>
        
        <button
          onClick={() => setIsAdding(true)}
          className="h-10 px-4 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>{isAr ? 'إضافة وكيل' : 'Add Agent'}</span>
        </button>
      </div>

      {isAdding && (
        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 mb-6 space-y-4">
          <h3 className="font-bold text-sm text-slate-800">{isAr ? 'بيانات الوكيل الجديد' : 'New Agent Details'}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">{isAr ? 'اسم الموظف' : 'Employee Name'}</label>
              <input
                type="text"
                value={newAgent.agentName}
                onChange={e => setNewAgent(prev => ({...prev, agentName: e.target.value}))}
                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">{isAr ? 'القسم الرياضي' : 'Sports Category'}</label>
              <select
                value={newAgent.categoryId}
                onChange={e => setNewAgent(prev => ({...prev, categoryId: e.target.value}))}
                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm font-medium"
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {isAr ? cat.nameAr : cat.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">{isAr ? 'اسم المستخدم (للدخول)' : 'Username (Login)'}</label>
              <input
                type="text"
                value={newAgent.username}
                onChange={e => setNewAgent(prev => ({...prev, username: e.target.value}))}
                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm font-mono"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">{isAr ? 'كلمة المرور' : 'Password'}</label>
              <input
                type="password"
                value={newAgent.passwordHash}
                onChange={e => setNewAgent(prev => ({...prev, passwordHash: e.target.value}))}
                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm font-mono"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              onClick={handleSave}
              disabled={!newAgent.agentName || !newAgent.username || !newAgent.passwordHash}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{isAr ? 'حفظ وإنشاء' : 'Save & Create'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Agents Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[11px] uppercase tracking-wider">
              <th className="py-3 px-4 text-start">{isAr ? 'الموظف / الوكيل' : 'Agent'}</th>
              <th className="py-3 px-4 text-start">{isAr ? 'القسم الرياضي' : 'Category'}</th>
              <th className="py-3 px-4 text-start">{isAr ? 'بيانات الدخول' : 'Credentials'}</th>
              <th className="py-3 px-4 text-start">{isAr ? 'الحالة' : 'Status'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {agents.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-400 text-sm">
                  {isAr ? 'لا يوجد وكلاء مسجلين حالياً' : 'No agents registered yet.'}
                </td>
              </tr>
            ) : (
              agents.map(agent => {
                const cat = categories.find(c => c.id === agent.categoryId);
                return (
                  <tr key={agent.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{agent.agentName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">ID: {agent.id.slice(0,8)}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded-md text-xs font-bold text-slate-700">
                        <span>{cat?.icon}</span>
                        <span>{isAr ? cat?.nameAr : cat?.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-xs font-mono text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-100 inline-block">
                        {agent.username}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Check className="w-3 h-3" />
                        {isAr ? 'نشط' : 'Active'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
