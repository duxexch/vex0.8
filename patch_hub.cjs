const fs = require('fs');

let code = fs.readFileSync('src/components/AiSportsHubTab.tsx', 'utf8');

// Add Filter icon to lucide-react imports if not there
if (!code.includes('Filter,')) {
    code = code.replace('Clock,', 'Clock,\n  Filter,\n  Calendar,');
}

// Add state and filter logic
const stateCode = `
  const isAr = lang === 'ar';
  const [activeSubTab, setActiveSubTab] = useState<'fixtures' | 'news'>('fixtures');
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDate, setSelectedDate] = useState<string>('All');

  const categories = ['All', ...Array.from(new Set(fixtures.map(f => f.category).filter(Boolean)))];
  const dates = ['All', ...Array.from(new Set(fixtures.map(f => f.date).filter(Boolean)))];

  const filteredFixtures = fixtures.filter(f => {
    const matchCategory = selectedCategory === 'All' || f.category === selectedCategory;
    const matchDate = selectedDate === 'All' || f.date === selectedDate;
    return matchCategory && matchDate;
  });
`;

code = code.replace(
  "  const isAr = lang === 'ar';\n  const [activeSubTab, setActiveSubTab] = useState<'fixtures' | 'news'>('fixtures');\n  const [broadcastLoading, setBroadcastLoading] = useState(false);",
  stateCode
);

const filterUiCode = `
      {/* Filters (Only for fixtures) */}
      {activeSubTab === 'fixtures' && (
        <div className="flex gap-2">
          <div className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-transparent text-xs font-bold text-slate-700 outline-none"
            >
              {categories.map(cat => (
                <option key={cat as string} value={cat as string}>
                  {cat === 'All' ? (isAr ? 'كل الرياضات' : 'All Sports') : (cat as string)}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-transparent text-xs font-bold text-slate-700 outline-none"
            >
              {dates.map(d => (
                <option key={d as string} value={d as string}>
                  {d === 'All' ? (isAr ? 'كل التواريخ' : 'All Dates') : (d as string)}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Fixtures List */}
      {activeSubTab === 'fixtures' && (
        <div className="space-y-3">
          {filteredFixtures.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
              {isAr ? 'لا توجد مباريات مطابقة للبحث' : 'No matches found matching criteria'}
            </div>
          ) : (
            filteredFixtures.map((fixture) => (
`;

code = code.replace(
  "      {/* Fixtures List */}\n      {activeSubTab === 'fixtures' && (\n        <div className=\"space-y-3\">\n          {fixtures.map((fixture) => (",
  filterUiCode
);

fs.writeFileSync('src/components/AiSportsHubTab.tsx', code);
console.log('patched hub');
