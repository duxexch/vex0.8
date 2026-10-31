import React, { useCallback, useEffect, useState } from 'react';
import {
  Users,
  Flame,
  Bot,
  Send,
  Search,
  RefreshCw,
  Square,
  MessageSquare,
  Megaphone,
  Settings2,
  Sparkles,
  Activity,
} from 'lucide-react';

// =========================================================================
// Growth Intelligence Engine — admin control room: live stats, lead table
// with filters + detail timeline, segmented campaigns, smart-reply settings,
// and a dry-run simulator for the classification brain.
// =========================================================================

interface LeadRow {
  id: string;
  tg_user_id: number;
  username?: string;
  first_name?: string;
  phone?: string;
  web_user_id?: string;
  type: string;
  status: string;
  started: boolean;
  score: number;
  interests: Record<string, number>;
  source: string;
  sources: string[];
  segment: string;
  last_touch_at: number;
  first_seen_at: number;
  drip_step: number;
  drip_sent: string[];
  ab_group?: string;
  invites: number;
  needs_human?: boolean;
  touchpoints: { at: number; kind: string; detail?: string; source?: string }[];
}

interface CampaignRow {
  id: string;
  name: string;
  segment: string;
  text: string;
  status: string;
  created_at: number;
  sent_at?: number;
  stats: { targeted: number; sent: number; failed: number };
}

const SEGMENTS = ['whale', 'hot_player', 'warm_player', 'cold', 'agent', 'dormant', 'dead'];

const SEGMENT_LABELS: Record<string, string> = {
  whale: '🔥 وايل (ساخن جداً)',
  hot_player: 'لاعب ساخن',
  warm_player: 'لاعب دافئ',
  cold: 'بارد',
  agent: 'وكيل',
  dormant: 'خامل/متوقف',
  dead: 'ميت (محظور)',
  started: 'كل من بدأ /start',
  players: 'اللاعبون فقط',
  all: 'الجميع',
};

function fmtAgo(ts: number): string {
  if (!ts) return '—';
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'الآن';
  if (m < 60) return `${m}د`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}س`;
  return `${Math.floor(h / 24)}ي`;
}

const KIND_LABELS: Record<string, string> = {
  signal: 'إشارة',
  start: '/start',
  reply: 'رد',
  drip: 'drip',
  campaign: 'حملة',
  drop: 'توقعات',
  contact: 'جهة اتصال',
  invite: 'دعوة',
};

export function GrowthTab() {
  const [stats, setStats] = useState<any>(null);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [total, setTotal] = useState(0);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [q, setQ] = useState('');
  const [segment, setSegment] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<LeadRow | null>(null);
  const [msgText, setMsgText] = useState('');
  const [simText, setSimText] = useState('');
  const [simResult, setSimResult] = useState<any>(null);
  const [campForm, setCampForm] = useState({ name: '', segment: 'all', text: '', generate: false });
  const [toast, setToast] = useState('');
  const [waSafety, setWaSafety] = useState<any>(null);
  const [waStats, setWaStats] = useState<any>(null);
  const [tgweb, setTgweb] = useState<any>(null);
  const [tgForm, setTgForm] = useState({ target: '', text: '' });
  const [waOutbox, setWaOutbox] = useState<any>(null);
  const [showWaOutbox, setShowWaOutbox] = useState(false);

  const flash = (t: string) => {
    setToast(t);
    setTimeout(() => setToast(''), 2500);
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [s, l, c, st, sf, tw, wo] = await Promise.all([
        fetch('/api/admin/growth/stats').then((r) => r.json()),
        fetch(
          `/api/admin/growth/leads?q=${encodeURIComponent(q)}&segment=${segment}&status=${status}&limit=150`
        ).then((r) => r.json()),
        fetch('/api/admin/growth/campaigns').then((r) => r.json()),
        fetch('/api/admin/growth/settings').then((r) => r.json()),
        fetch('/api/admin/growth/wa/safety').then((r) => r.json()).catch(() => null),
        fetch('/api/admin/growth/tgweb').then((r) => r.json()).catch(() => null),
        showWaOutbox
          ? fetch('/api/admin/growth/wa/outbox').then((r) => r.json()).catch(() => null)
          : Promise.resolve(null),
      ]);
      setStats(s.stats || null);
      setLeads(l.leads || []);
      setTotal(l.total || 0);
      setCampaigns(c.campaigns || []);
      setSettings(st.settings || null);
      if (sf) {
        setWaSafety(sf.safety || null);
        setWaStats(sf.wa || null);
      }
      if (tw) setTgweb(tw.tgweb || null);
      if (wo) setWaOutbox(wo.outbox || null);
    } catch {
      flash('تعذر التحديث');
    }
    setLoading(false);
  }, [q, segment, status, showWaOutbox]);

  useEffect(() => {
    const t = setTimeout(loadAll, q ? 400 : 0);
    return () => clearTimeout(t);
  }, [loadAll, q]);

  const saveSettings = async (patch: any) => {
    const res = await fetch('/api/admin/growth/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    setSettings(data.settings);
    flash('تم حفظ الإعدادات');
  };

  const stopLead = async (id: string) => {
    await fetch(`/api/admin/growth/leads/${id}/stop`, { method: 'POST' });
    flash('تم إيقاف ال lead — لن يتلقى أي رسالة');
    setSelected(null);
    loadAll();
  };

  // WhatsApp safety: instant halt on a ban report; resume restarts the ramp.
  const haltWa = async () => {
    const reason = window.prompt('سبب الإيقاف (حظر/بلاغ/شكوى):') || 'ban report';
    const res = await fetch('/api/admin/growth/wa/halt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    if (data.success) {
      setWaSafety(data.safety);
      setWaStats(data.wa);
      flash(`🚨 تم إيقاف واتساب — ${data.reverted_today ?? 0} جهة رجعت للانتظار`);
    } else flash('فشل الإيقاف');
  };

  const resumeWa = async () => {
    const res = await fetch('/api/admin/growth/wa/resume', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      setWaSafety(data.safety);
      setWaStats(data.wa);
      flash('✅ رجع بالوضع الآمن — تسخين من اليوم الأول (3/يوم)');
    } else flash('فشل الاستئناف');
  };

  const buildWaOutbox = async () => {
    const res = await fetch('/api/admin/growth/wa/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force: true }),
    });
    const data = await res.json();
    if (data.success && data.batch) {
      if (data.batch.halted) flash('🚨 واتساب متوقف — لا يمكن بناء صندوق جديد');
      else if (data.batch.count === 0) flash('وصلت حد اليوم — مافيش رسايل زيادة النهارده');
      else flash(`📱 صندوق جاهز: ${data.batch.count} رسالة (متبقّي اليوم: ${data.batch.remaining})`);
      loadAll();
    } else flash('فشل بناء الصندوق');
  };

  // ---- Telegram Web session outbox (existing-chats tool; campaigns go via bot) ----
  const queueTgWeb = async () => {
    const target = tgForm.target.trim();
    const text = tgForm.text.trim();
    if (!target || !text) return flash('اكتب اسم المحادثة/المعرّف ونص الرسالة');
    const res = await fetch('/api/admin/growth/tgweb/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target, text, kind: 'manual' }),
    });
    const data = await res.json();
    if (data.success) {
      flash(`queued في طابور الويب — المتبقّي اليوم: ${data.tgweb?.remaining_today}`);
      setTgForm({ target: '', text: '' });
      setTgweb(data.tgweb || null);
    } else flash(data.error === 'halted' ? '🚨 الطابور متوقف — استأنف أولاً' : (data.error || 'فشل الإضافة للطابور'));
  };

  const haltTgWeb = async () => {
    const reason = window.prompt('سبب إيقاف تليجرام (ويب):') || 'ban report';
    const res = await fetch('/api/admin/growth/tgweb/halt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    if (data.success) { setTgweb(data.tgweb); flash('🚨 تم إيقاف تليجرام (ويب)'); }
    else flash('فشل الإيقاف');
  };

  const resumeTgWeb = async () => {
    const res = await fetch('/api/admin/growth/tgweb/resume', { method: 'POST' });
    const data = await res.json();
    if (data.success) { setTgweb(data.tgweb); flash('✅ استُؤنف تليجرام (ويب) — تسخين من اليوم الأول'); }
    else flash('فشل الاستئناف');
  };

  // ---- WhatsApp manual outbox viewer: toggle, copy, mark-all-sent (no auto-send) ----
  const toggleWaOutbox = () => setShowWaOutbox((v) => !v);

  const waPhones = React.useMemo(() => {
    const content: string = waOutbox?.content || '';
    const phones: string[] = [];
    // Batch lines look like: "## 3. Ahmed — +201234567890 [warm_player]"
    const re = /^##\s*\d+\.\s.*—\s*(\+?\d{6,15})\s*\[/gm;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) phones.push(m[1]);
    return phones;
  }, [waOutbox?.content]);

  const copyWaOutbox = async () => {
    const content: string = waOutbox?.content || '';
    if (!content) return flash('لا يوجد صندوق اليوم');
    try {
      await navigator.clipboard.writeText(content);
      flash(`📋 نُسخ الصندوق (${waPhones.length} جهة) — الصقه في واتساب Business`);
    } catch {
      flash('تعذر النسخ — انسخ يدوياً');
    }
  };

  const markAllWaSent = async () => {
    if (waPhones.length === 0) return flash('مافيش جهات في الصندوق');
    if (!confirm(`تعليم ${waPhones.length} جهة كـ«اتبعتت»؟ ده بس لتتبع العدّاد — مفيش إرسال تلقائي.`)) return;
    const res = await fetch('/api/admin/growth/wa/mark', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phones: waPhones, status: 'sent' }),
    });
    const data = await res.json();
    if (data.success) {
      setWaStats(data.wa);
      setWaSafety(data.safety);
      flash(`✅ عُلّمت ${data.marked} جهة — اتجدد حد اليوم`);
      loadAll();
    } else flash('فشل التعليم');
  };

  const sendManual = async () => {
    if (!selected || !msgText.trim()) return;
    const res = await fetch(`/api/admin/growth/leads/${selected.id}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: msgText }),
    });
    const data = await res.json();
    flash(data.success ? 'تم الإرسال ✅' : 'فشل الإرسال (ربما محظور)');
    setMsgText('');
  };

  const createCampaign = async () => {
    if (!campForm.name || !campForm.segment) return flash('أكمل اسم الحملة والشريحة');
    const res = await fetch('/api/admin/growth/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(campForm),
    });
    const data = await res.json();
    if (data.success) {
      flash('تم إنشاء الحملة — جاهزة للإرسال');
      setCampForm({ name: '', segment: 'all', text: '', generate: false });
      loadAll();
    } else flash(data.error || 'فشل الإنشاء');
  };

  const sendCampaign = async (id: string) => {
    if (!confirm('إرسال الحملة الآن؟ (تمر عبر الطابور الآمن)')) return;
    const res = await fetch(`/api/admin/growth/campaigns/${id}/send`, { method: 'POST' });
    const data = await res.json();
    flash(data.success ? `تم الإرسال: ${data.campaign.stats.sent}/${data.campaign.stats.targeted}` : data.error || 'فشل');
    loadAll();
  };

  const simulate = async () => {
    if (!simText.trim()) return;
    const res = await fetch('/api/admin/growth/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: simText }),
    });
    const data = await res.json();
    setSimResult(data.intent || null);
  };

  const t = stats?.totals || {};
  const del = stats?.delivery || {};

  const card = (label: string, value: string | number, icon: React.ElementType, tint: string) => (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3">
      <div className={`p-2.5 rounded-xl ${tint}`}>
        {React.createElement(icon, { className: 'w-5 h-5 text-white' })}
      </div>
      <div>
        <div className="text-xl font-black text-slate-900 dark:text-white">{value}</div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">{label}</div>
      </div>
    </div>
  );

  const toggle = (key: string, label: string) => (
    <label className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl px-3 py-2.5 cursor-pointer">
      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{label}</span>
      <button
        onClick={() => saveSettings({ [key]: !settings?.[key] })}
        className={`w-11 h-6 rounded-full transition-all relative ${settings?.[key] ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${settings?.[key] ? 'right-0.5' : 'right-5.5'}`}
          style={{ right: settings?.[key] ? 2 : 22 }}
        />
      </button>
    </label>
  );

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-500" /> محرك ذكاء النمو — قاعدة عملاء تيليجرام
        </h2>
        <button
          onClick={loadAll}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> تحديث
        </button>
      </div>

      {toast && (
        <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold rounded-xl px-4 py-2.5">
          {toast}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {card('إجمالي Leads', t.leads ?? 0, Users, 'bg-slate-600')}
        {card('بدأت /start', t.started ?? 0, Send, 'bg-blue-600')}
        {card('ساخنين', t.hot ?? 0, Flame, 'bg-orange-500')}
        {card('وكلاء', stats?.by_type?.agent ?? 0, Bot, 'bg-violet-600')}
        {card('رسائل اليوم', del?.daily_dms?.count ?? 0, MessageSquare, 'bg-emerald-600')}
        {card('محظورين 403', t.dead ?? 0, Square, 'bg-red-500')}
      </div>

      {/* WhatsApp safety — managed-manual outreach guardrails */}
      {waSafety && (
        <div
          className={`rounded-2xl border p-4 ${
            waSafety.halted
              ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-800'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <MessageSquare className={`w-5 h-5 ${waSafety.halted ? 'text-red-600' : 'text-emerald-600'}`} />
              <span className="text-sm font-black text-slate-900 dark:text-white">
                واتساب — إرسال يدوي مُتحكَّم فيه
              </span>
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  waSafety.halted
                    ? 'bg-red-600 text-white'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                }`}
              >
                {waSafety.halted ? '🚨 متوقف' : '🟢 آمن'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {waSafety.halted ? (
                <button
                  onClick={resumeWa}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
                >
                  استئناف + إعادة التسخين
                </button>
              ) : (
                <button
                  onClick={haltWa}
                  className="px-3 py-1.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700"
                >
                  إيقاف فوري (بلاغ حظر)
                </button>
              )}
              <button
                onClick={buildWaOutbox}
                disabled={waSafety.halted}
                className="px-3 py-1.5 rounded-xl bg-sky-600 text-white text-xs font-bold hover:bg-sky-700 disabled:opacity-40"
              >
                بناء صندوق اليوم
              </button>
              <button
                onClick={toggleWaOutbox}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700"
              >
                {showWaOutbox ? 'إخفاء الصندوق' : 'عرض صندوق اليوم'}
              </button>
            </div>
          </div>

          {waSafety.halted && (
            <p className="mt-2 text-xs font-bold text-red-700 dark:text-red-300">
              السبب: {waSafety.halt_reason || '—'} — الاستئناف يعيد التسخين من اليوم الأول (3/يوم) للأمان.
            </p>
          )}

          <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-2 text-center">
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-2">
              <div className="text-lg font-black text-slate-900 dark:text-white">{waSafety.daily_cap}</div>
              <div className="text-[10px] font-bold text-slate-500">حد اليوم (رسالة)</div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-2">
              <div className="text-lg font-black text-slate-900 dark:text-white">{waSafety.warmup_day}</div>
              <div className="text-[10px] font-bold text-slate-500">يوم التسخين</div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-2">
              <div className="text-lg font-black text-slate-900 dark:text-white">
                {waSafety.min_gap_min}-{waSafety.max_gap_min}
              </div>
              <div className="text-[10px] font-bold text-slate-500">دقائق بين الرسايل</div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-2">
              <div className="text-lg font-black text-slate-900 dark:text-white">{waStats?.queued ?? 0}</div>
              <div className="text-[10px] font-bold text-slate-500">جاهزة بالصندوق</div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-2">
              <div className="text-lg font-black text-slate-900 dark:text-white">{waStats?.sent ?? 0}</div>
              <div className="text-[10px] font-bold text-slate-500">اتبعتت (إجمالي)</div>
            </div>
          </div>

          {/* Today's outbox — view, copy, and mark-sent after you send by hand */}
          {showWaOutbox && (
            <div className="mt-3 border-t border-slate-200 dark:border-slate-700 pt-3 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                  📦 صندوق {waOutbox?.date || 'اليوم'} — {waPhones.length} جهة جاهزة
                  {!waOutbox?.exists && ' (لا يوجد ملف بعد — ابنِ الصندوق)'}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={copyWaOutbox}
                    disabled={!waOutbox?.exists}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-40"
                  >
                    📋 نسخ الكل
                  </button>
                  <button
                    onClick={markAllWaSent}
                    disabled={waPhones.length === 0}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 disabled:opacity-40"
                  >
                    ✅ علّم الكل مُرسَل
                  </button>
                </div>
              </div>
              {waOutbox?.exists ? (
                <pre className="max-h-64 overflow-y-auto bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 text-[11px] leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono" dir="rtl">
                  {waOutbox.content}
                </pre>
              ) : (
                <p className="text-[11px] font-bold text-slate-400">
                  اضغط «بناء صندوق اليوم» يولّد رسائل جاهزة (≤ حد اليوم) ترسلها بنفسك من رقمك.
                </p>
              )}
            </div>
          )}

          <p className="mt-2 text-[10px] font-bold text-slate-400">
            النظام لا يرسل تلقائياً أبداً — الصندوق جاهز للإرسال اليدوي، وبعد الإرسال علّمهم من رأس القائمة.
          </p>
        </div>
      )}

      {/* Telegram Web session outbox — existing-chats tool (campaigns go via the bot) */}
      {tgweb && (
        <div
          className={`rounded-2xl border p-4 ${
            tgweb.safety?.halted
              ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-800'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Send className={`w-5 h-5 ${tgweb.safety?.halted ? 'text-red-600' : 'text-sky-600'}`} />
              <span className="text-sm font-black text-slate-900 dark:text-white">
                تليجرام — جلسة الويب على السيرفر (محادثات قائمة)
              </span>
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  tgweb.worker?.state === 'running' && !tgweb.safety?.halted
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                    : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                }`}
              >
                {tgweb.safety?.halted
                  ? '🚨 متوقف'
                  : tgweb.worker?.state === 'running'
                  ? '🟢 العامل يعمل'
                  : '⏸ العامل متوقف'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {tgweb.safety?.halted ? (
                <button
                  onClick={resumeTgWeb}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
                >
                  استئناف + إعادة التسخين
                </button>
              ) : (
                <button
                  onClick={haltTgWeb}
                  className="px-3 py-1.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700"
                >
                  إيقاف فوري
                </button>
              )}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-2 text-center">
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-2">
              <div className="text-lg font-black text-slate-900 dark:text-white">{tgweb.pending ?? 0}</div>
              <div className="text-[10px] font-bold text-slate-500">بالطابور</div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-2">
              <div className="text-lg font-black text-slate-900 dark:text-white">{tgweb.sent_today ?? 0}/{tgweb.allowed_today ?? 0}</div>
              <div className="text-[10px] font-bold text-slate-500">اليوم (حد السماح)</div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-2">
              <div className="text-lg font-black text-slate-900 dark:text-white">{tgweb.warmup_day ?? 1}</div>
              <div className="text-[10px] font-bold text-slate-500">يوم التسخين</div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-2">
              <div className="text-lg font-black text-slate-900 dark:text-white">{tgweb.sent_total ?? 0}</div>
              <div className="text-[10px] font-bold text-slate-500">اتبعتت (إجمالي)</div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-2">
              <div className="text-lg font-black text-slate-900 dark:text-white">{tgweb.failed_total ?? 0}</div>
              <div className="text-[10px] font-bold text-slate-500">فشلت</div>
            </div>
          </div>

          {/* Queue a message to an EXISTING chat by search (numeric-id/phone don't work) */}
          <div className="mt-3 flex flex-col md:flex-row gap-2">
            <input
              value={tgForm.target}
              onChange={(e) => setTgForm({ ...tgForm, target: e.target.value })}
              placeholder="اسم المحادثة أو @username (للبحث)"
              className="md:w-56 bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2 text-xs font-bold outline-none"
            />
            <input
              value={tgForm.text}
              onChange={(e) => setTgForm({ ...tgForm, text: e.target.value })}
              placeholder="نص الرسالة لمحادثة قائمة..."
              className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2 text-xs font-bold outline-none"
            />
            <button
              onClick={queueTgWeb}
              disabled={tgweb.safety?.halted}
              className="px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold hover:bg-sky-700 disabled:opacity-40"
            >
              أضف للطابور
            </button>
          </div>

          <p className="mt-2 text-[10px] font-bold text-slate-400">
            الحملات تمر عبر البوت (للمشتركين). جلسة الويب دي لمحادثات قائمة فقط — تليجرام يمنع الرسايل الباردة للأرقام، فالعامل يبحث بالاسم ويفتح المحادثة ويرسل.
            {tgweb.worker?.message ? ` | حالة العامل: ${tgweb.worker.message}` : ''}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Leads table */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="w-4 h-4 absolute right-2.5 top-2.5 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="بحث: اسم / معرّف / هاتف..."
                className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl py-2 pr-8 pl-3 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
              />
            </div>
            <select
              value={segment}
              onChange={(e) => setSegment(e.target.value)}
              className="bg-slate-100 dark:bg-slate-800 rounded-xl px-2 py-2 text-xs font-bold text-slate-700 dark:text-slate-300"
            >
              <option value="">كل الشرائح</option>
              {SEGMENTS.map((s) => (
                <option key={s} value={s}>{SEGMENT_LABELS[s]}</option>
              ))}
            </select>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="bg-slate-100 dark:bg-slate-800 rounded-xl px-2 py-2 text-xs font-bold text-slate-700 dark:text-slate-300"
            >
              <option value="">كل الحالات</option>
              <option value="new">جديد</option>
              <option value="engaged">متفاعل</option>
              <option value="stopped">متوقف</option>
              <option value="dead">ميت</option>
            </select>
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="text-right p-2 font-bold">العميل</th>
                  <th className="text-right p-2 font-bold">الشريحة</th>
                  <th className="text-right p-2 font-bold">الحرارة</th>
                  <th className="text-right p-2 font-bold">المصدر</th>
                  <th className="text-right p-2 font-bold">آخر نشاط</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr
                    key={l.id}
                    onClick={() => setSelected(l)}
                    className="border-t border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                  >
                    <td className="p-2 font-bold text-slate-800 dark:text-slate-200">
                      {l.first_name || l.username || l.id}
                      {l.needs_human && <span className="text-[10px] text-amber-500 mr-1">⚠️</span>}
                      {l.phone && <span className="text-[10px] text-emerald-500 mr-1">📱</span>}
                    </td>
                    <td className="p-2 text-slate-600 dark:text-slate-300">{SEGMENT_LABELS[l.segment] || l.segment}</td>
                    <td className="p-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-14 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${l.score >= 60 ? 'bg-red-500' : l.score >= 40 ? 'bg-orange-400' : 'bg-slate-400'}`}
                            style={{ width: `${l.score}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-black text-slate-500">{l.score}</span>
                      </div>
                    </td>
                    <td className="p-2 text-slate-500 dark:text-slate-400 font-mono text-[10px]">{l.source}</td>
                    <td className="p-2 text-slate-500 dark:text-slate-400">{fmtAgo(l.last_touch_at)}</td>
                  </tr>
                ))}
                {leads.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-400 font-bold">
                      لا يوجد leads بعد — المحرك يبدأ الالتقاط من أول رسالة جروب أو /start
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-2 text-[10px] text-slate-400 font-bold text-center">
            المعروض {leads.length} من {total} — انقر أي صف لفتح التفاصيل
          </div>
        </div>

        {/* Right column: detail + settings + simulate */}
        <div className="space-y-4">
          {selected ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-black text-slate-900 dark:text-white text-sm">
                  {selected.first_name || selected.username || selected.id}
                </div>
                <button onClick={() => setSelected(null)} className="text-[11px] text-slate-400 font-bold">إغلاق ✕</button>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1 font-bold">
                <div>M-ID: <span className="font-mono">{selected.tg_user_id}</span></div>
                {selected.username && <div>@{selected.username}</div>}
                {selected.phone && <div>📱 {selected.phone}</div>}
                {selected.web_user_id && <div>🔗 مرتبط بالموقع: {selected.web_user_id}</div>}
                <div>المصادر: {selected.sources.join(' · ')}</div>
                {selected.ab_group && <div>مجموعة A/B: {selected.ab_group}</div>}
                <div>دعوات: {selected.invites} | drip: {selected.drip_step} ({selected.drip_sent.join(',')})</div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(selected.interests).map(([k, v]) => (
                  <span key={k} className="text-[10px] bg-slate-100 dark:bg-slate-800 rounded-lg px-2 py-1 font-bold text-slate-600 dark:text-slate-300">
                    {k}: {v as number}
                  </span>
                ))}
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1">
                {(selected.touchpoints || []).slice(-15).reverse().map((tp, i) => (
                  <div key={i} className="text-[10px] text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-1">
                    <span className="font-black text-slate-600 dark:text-slate-300">{KIND_LABELS[tp.kind] || tp.kind}</span>
                    {' · '}{fmtAgo(tp.at)} {tp.detail ? `· ${tp.detail.slice(0, 60)}` : ''}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={msgText}
                  onChange={(e) => setMsgText(e.target.value)}
                  placeholder="رسالة يدوية..."
                  className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                />
                <button onClick={sendManual} className="px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold">إرسال</button>
                <button onClick={() => stopLead(selected.id)} className="px-3 py-2 rounded-xl bg-red-500 text-white text-xs font-bold">إيقاف</button>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
              <div className="text-xs font-black text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" /> جرّب دماغ البوت
              </div>
              <textarea
                value={simText}
                onChange={(e) => setSimText(e.target.value)}
                placeholder="اكتب رسالة وهمية زي ما يكتبها لاعب في الجروب... مثال: ايه توقعكم لمباراة ريال مدريد والبارسا؟"
                className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2 text-xs font-bold outline-none h-20 resize-none"
              />
              <button onClick={simulate} className="mt-2 w-full py-2 rounded-xl bg-amber-500 text-white text-xs font-bold">
                صنّف الرسالة
              </button>
              {simResult && (
                <pre className="mt-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2 text-[10px] text-slate-600 dark:text-slate-300 overflow-x-auto font-mono" dir="ltr">
                  {JSON.stringify(simResult, null, 1)}
                </pre>
              )}
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-2">
            <div className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-1">
              <Settings2 className="w-4 h-4 text-slate-400" /> إعدادات المحرك
            </div>
            {toggle('listen_enabled', 'الاستماع لرسائل الجروبات')}
            {toggle('auto_reply', 'الردود الذكية التلقائية')}
            {toggle('prediction_drops', 'رمي توقعات المباريات في الجروبات')}
            {toggle('drip_enabled', 'محرك الرسائل المترابطة (drip)')}
            {toggle('campaigns_enabled', 'الحملات المجزّأة')}
          </div>
        </div>
      </div>

      {/* Campaigns */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
        <div className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-violet-500" /> الحملات (segment broadcasts)
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input
            value={campForm.name}
            onChange={(e) => setCampForm({ ...campForm, name: e.target.value })}
            placeholder="اسم الحملة"
            className="bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2 text-xs font-bold outline-none"
          />
          <select
            value={campForm.segment}
            onChange={(e) => setCampForm({ ...campForm, segment: e.target.value })}
            className="bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300"
          >
            {['all', 'started', 'players', 'agents', ...SEGMENTS].map((s) => (
              <option key={s} value={s}>{SEGMENT_LABELS[s] || s}</option>
            ))}
          </select>
          <input
            value={campForm.text}
            onChange={(e) => setCampForm({ ...campForm, text: e.target.value })}
            placeholder="نص الرسالة (أو فكرة للتوليد بالـAI)"
            className="bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2 text-xs font-bold outline-none"
          />
          <div className="flex gap-2">
            <label className="flex items-center gap-1 text-[11px] font-bold text-slate-500 px-2">
              <input
                type="checkbox"
                checked={campForm.generate}
                onChange={(e) => setCampForm({ ...campForm, generate: e.target.checked })}
              />
              توليد AI
            </label>
            <button onClick={createCampaign} className="flex-1 py-2 rounded-xl bg-violet-600 text-white text-xs font-bold">
              إنشاء
            </button>
          </div>
        </div>
        <div className="space-y-1.5 max-h-44 overflow-y-auto">
          {campaigns.map((c) => (
            <div key={c.id} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl px-3 py-2">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-black text-slate-800 dark:text-slate-200 truncate">{c.name}</div>
                <div className="text-[10px] text-slate-500 font-bold">
                  {SEGMENT_LABELS[c.segment] || c.segment} · {c.status}
                  {c.status === 'sent' && ` · أُرسلت ${c.stats.sent}/${c.stats.targeted}`}
                </div>
              </div>
              {c.status === 'draft' && (
                <button
                  onClick={() => sendCampaign(c.id)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-bold"
                >
                  إرسال الآن
                </button>
              )}
            </div>
          ))}
          {campaigns.length === 0 && (
            <div className="text-center text-slate-400 text-xs font-bold py-3">لا توجد حملات بعد</div>
          )}
        </div>
      </div>
    </div>
  );
}
