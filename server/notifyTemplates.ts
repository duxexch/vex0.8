// =========================================================================
// VEX Notification Composer — one place that turns a bare event into a push
// people actually tap.
//
// Why this exists: notification copy used to be written inline at every call
// site, in at most 4 languages, and some sends carried no translations at all —
// so a Spanish or Turkish subscriber got English text. Everything now flows
// through here: 8 languages, hook-driven copy (curiosity / urgency / benefit),
// and emoji anchors, so the wording is *localized* rather than translated.
// =========================================================================

export type NotifyLang = 'ar' | 'en' | 'es' | 'ru' | 'fr' | 'de' | 'tr' | 'pt';

export const NOTIFY_LANGS: NotifyLang[] = ['ar', 'en', 'es', 'ru', 'fr', 'de', 'tr', 'pt'];

export type NotifyKind =
  | 'hot_pick'      // a confident prediction is live
  | 'result'        // prediction settled — won/lost
  | 'live'          // a match with live commentary is running
  | 'bonus'         // a reward / cashback is waiting
  | 'jackpot'       // lottery jackpot is close
  | 'wallet'        // money moved in the wallet
  | 'compensation'; // a compensation request changed status

export interface NotifyCopy {
  title: string;
  body: string;
}

interface Template {
  title: string;
  body: string;
  /** Alternate body used for A/B testing (same hook family, different angle). */
  bodyAlt?: string;
}

// Placeholders resolved at compose time: {{team}} {{pct}} {{amount}} {{company}}
// {{name}} {{match}} {{status}} {{count}}
const COPY: Record<NotifyKind, Record<NotifyLang, Template>> = {
  // ---------------------------------------------------------- hot prediction
  hot_pick: {
    ar: { title: '🔥 توقّع سخن — {{team}}', body: 'ثقة {{pct}}٪ وتحليل محدّث للتشكيلات. افتحه قبل ما تبدأ المباراة', bodyAlt: 'التحليل قال {{pct}}٪ لصالح {{team}}. شوف التفاصيل بنفسك' },
    en: { title: '🔥 Hot pick — {{team}}', body: '{{pct}}% confidence, line-ups already factored in. Open before kickoff', bodyAlt: 'Our model gives {{team}} {{pct}}%. See the reasoning' },
    es: { title: '🔥 Pronóstico caliente — {{team}}', body: '{{pct}}% de confianza con alineaciones ya analizadas. Ábrelo antes del inicio', bodyAlt: 'El modelo marca {{pct}}% para {{team}}. Mira el análisis' },
    ru: { title: '🔥 Горячий прогноз — {{team}}', body: 'Уверенность {{pct}}%, составы уже учтены. Откройте до начала матча', bodyAlt: 'Модель даёт {{team}} {{pct}}%. Посмотрите разбор' },
    fr: { title: '🔥 Prono du moment — {{team}}', body: '{{pct}}% de confiance, compositions déjà analysées. Ouvrez avant le coup d\'envoi', bodyAlt: 'Notre modèle donne {{pct}}% à {{team}}. Voyez le détail' },
    de: { title: '🔥 Tipp des Tages — {{team}}', body: '{{pct}}% Sicherheit, Aufstellungen bereits einbezogen. Vor Anpfiff öffnen', bodyAlt: 'Unser Modell gibt {{team}} {{pct}}%. Details ansehen' },
    tr: { title: '🔥 Sıcak tahmin — {{team}}', body: 'Güven {{pct}}%, dizilişler hesaba katıldı. Maç başlamadan aç', bodyAlt: 'Modelimiz {{team}} için {{pct}}% veriyor. Analizi gör' },
    pt: { title: '🔥 Palpite quente — {{team}}', body: '{{pct}}% de confiança, escalações já consideradas. Abra antes do jogo', bodyAlt: 'Nosso modelo dá {{pct}}% para {{team}}. Veja o porquê' },
  },

  // ------------------------------------------------------------- settlement
  result: {
    ar: { title: '{{status}} — {{match}}', body: 'خلصت المباراة والنتيجة على طول. افتح التفاصيل والرصيد', bodyAlt: 'التحاليل طلعت {{status}}. شوف كيف يؤثر ده على رصيدك' },
    en: { title: '{{status}} — {{match}}', body: 'Full time. Open to see how it landed in your balance', bodyAlt: 'The model called {{status}}. Check what that means for your wallet' },
    es: { title: '{{status}} — {{match}}', body: 'Final del partido. Abre para ver cómo cayó en tu saldo', bodyAlt: 'El modelo acertó: {{status}}. Mira tu saldo' },
    ru: { title: '{{status}} — {{match}}', body: 'Матч завершён. Откройте, чтобы увидеть зачёт на балансе', bodyAlt: 'Модель дала {{status}}. Посмотрите итог на балансе' },
    fr: { title: '{{status}} — {{match}}', body: 'Fin du match. Ouvrez pour voir le crédité sur votre solde', bodyAlt: 'Le modèle a prévu {{status}}. Vérifiez votre solde' },
    de: { title: '{{status}} — {{match}}', body: 'Endstand. Öffnen und prüfen, wie es auf Ihrem Guthaben landet', bodyAlt: 'Unser Modell lag bei {{status}}. Guthaben ansehen' },
    tr: { title: '{{status}} — {{match}}', body: 'Maç bitti. Bakiyene nasıl yansıdığını gör', bodyAlt: 'Model {{status}} dedi. Bakiyeni kontrol et' },
    pt: { title: '{{status}} — {{match}}', body: 'Fim de jogo. Abra para ver como entrou no seu saldo', bodyAlt: 'O modelo acertou {{status}}. Confira seu saldo' },
  },

  // ------------------------------------------------------------ live match
  live: {
    ar: { title: '⚽ مباشر دلوقتي — {{match}}', body: 'تعليق حي وأهداف لحظة بلحظة. ادخل وتابع معانا', bodyAlt: 'المباراة شغّالة — التحليل بيتحدّث معاها. افتح الآن' },
    en: { title: '⚽ Live now — {{match}}', body: 'Minute-by-minute commentary and goals as they happen', bodyAlt: 'It\'s running — the analysis updates live. Open now' },
    es: { title: '⚽ En vivo — {{match}}', body: 'Comentario minuto a minuto y goles al momento', bodyAlt: 'El partido está en marcha y el análisis se actualiza. Abre ya' },
    ru: { title: '⚽ Прямая трансляция — {{match}}', body: 'Комментарий по минутам и голы в моменте', bodyAlt: 'Матч идёт — анализ обновляется в реальном времени' },
    fr: { title: '⚽ En direct — {{match}}', body: 'Commentaire minute par minute et buts à la seconde', bodyAlt: 'Le match est en cours, l\'analyse se met à jour. Ouvrez' },
    de: { title: '⚽ Live — {{match}}', body: 'Spielkommentar Minute für Minute und Tore live', bodyAlt: 'Das Spiel läuft, die Analyse aktualisiert sich live' },
    tr: { title: '⚽ Canlı — {{match}}', body: 'Dakika dakika yorum ve goller geldiği anda', bodyAlt: 'Maç sürüyor, analiz canlı güncelleniyor. Hemen aç' },
    pt: { title: '⚽ Ao vivo — {{match}}', body: 'Comentário minuto a minuto e gols na hora', bodyAlt: 'O jogo está rolando e a análise atualiza ao vivo. Abra' },
  },

  // --------------------------------------------------------------- bonus
  bonus: {
    ar: { title: '🎁 مكافأة مستحقّاك في {{company}}', body: 'في {{amount}} مستنياك. افتح المحفظة وخدها دلوقتي', bodyAlt: 'نسيت مكافأتك؟ {{amount}} في انتظارك — خدها قبل ما تخلص' },
    en: { title: '🎁 A bonus is waiting at {{company}}', body: '{{amount}} is yours to claim. Open your wallet now', bodyAlt: 'You may have forgotten it — {{amount}} is still waiting' },
    es: { title: '🎁 Tienes un bono en {{company}}', body: '{{amount}} esperándote. Abre tu cartera y reclámalo', bodyAlt: '¿Se te olvidó? {{amount}} sigue ahí, réclamalo' },
    ru: { title: '🎁 Бонус ждёт вас в {{company}}', body: '{{amount}} можно забрать. Откройте кошелёк', bodyAlt: 'Не забыли? {{amount}} всё ещё ждёт вас' },
    fr: { title: '🎁 Un bonus vous attend chez {{company}}', body: '{{amount}} à réclamer. Ouvrez votre portefeuille', bodyAlt: 'Vous l\'avez oublié ? {{amount}} vous attend toujours' },
    de: { title: '🎁 Bonus wartet bei {{company}}', body: '{{amount}} können Sie abholen. Wallet öffnen', bodyAlt: 'Vergessen? {{amount}} wartet noch immer auf Sie' },
    tr: { title: '🎁 {{company}}\'da bonusun var', body: '{{amount}} seni bekliyor. Cüzdanını aç ve al', bodyAlt: 'Unuttun mu? {{amount}} hâlâ seni bekliyor' },
    pt: { title: '🎁 Um bônus espera por você na {{company}}', body: '{{amount}} para resgatar. Abra sua carteira agora', bodyAlt: 'Esqueceu? {{amount}} continua esperando por você' },
  },

  // -------------------------------------------------------------- jackpot
  jackpot: {
    ar: { title: '🎰 الجائزة الكبرى {{amount}}', body: 'السحب قرب وتذاكرك شغّالة. افتح وشوف فرصتك', bodyAlt: 'عدد التذاكر بيقل — الجائزة الكبرى {{amount}} لسه مستنياك' },
    en: { title: '🎰 Jackpot up to {{amount}}', body: 'The draw is close and your tickets are in. Check your odds', bodyAlt: 'Tickets are filling up — the {{amount}} jackpot is still open' },
    es: { title: '🎰 El bote sube a {{amount}}', body: 'El sorteo está cerca y tus tickets cuentan. Mira tus probabilidades', bodyAlt: 'Quedan pocos tickets — el bote de {{amount}} sigue abierto' },
    ru: { title: '🎰 Джекпот до {{amount}}', body: 'Розыгрыш близко, ваши билеты участвуют. Проверьте шансы', bodyAlt: 'Билетов становится меньше — джекпот {{amount}} ещё открыт' },
    fr: { title: '🎰 Jackpot jusqu\'à {{amount}}', body: 'Le tirage approche et vos billets comptent. Voyez vos chances', bodyAlt: 'Les billets partent vite — le jackpot de {{amount}} est encore ouvert' },
    de: { title: '🎰 Jackpot bis {{amount}}', body: 'Die Ziehung ist nah, Ihre Lose sind dabei. Chance prüfen', bodyAlt: 'Die Lose werden weniger — der {{amount}}-Jackpot ist noch offen' },
    tr: { title: '🎰 Büyük ikramiye {{amount}}', body: 'Çekiliş yaklaşıyor, biletlerin geçerli. Şansını gör', bodyAlt: 'Biletler azalıyor — {{amount}} ikramiyesi hâlâ açık' },
    pt: { title: '🎰 Jackpot de até {{amount}}', body: 'O sorteio está perto e seus bilhetes contam. Veja suas chances', bodyAlt: 'Bilhetes acabando — o jackpot de {{amount}} ainda está aberto' },
  },

  // --------------------------------------------------------------- wallet
  wallet: {
    ar: { title: '💳 حركة في محفظتك', body: '{{amount}} من {{company}}. افتح السجل وتأكد بنفسك', bodyAlt: 'في تحديث على محفظتك من {{company}} — شوف التفاصيل' },
    en: { title: '💳 Movement in your wallet', body: '{{amount}} from {{company}}. Open your history to confirm', bodyAlt: 'There\'s an update from {{company}} — see the details' },
    es: { title: '💳 Movimiento en tu cartera', body: '{{amount}} de {{company}}. Abre el historial para confirmar', bodyAlt: 'Hay una actualización de {{company}}. Mira los detalles' },
    ru: { title: '💳 Движение в кошельке', body: '{{amount}} от {{company}}. Откройте историю для подтверждения', bodyAlt: 'Обновление от {{company}} — посмотрите детали' },
    fr: { title: '💳 Mouvement sur votre portefeuille', body: '{{amount}} de {{company}}. Ouvrez l\'historique pour confirmer', bodyAlt: 'Une mise à jour de {{company}} — voir les détails' },
    de: { title: '💳 Bewegung in Ihrer Wallet', body: '{{amount}} von {{company}}. Verlauf öffnen und bestätigen', bodyAlt: 'Eine Aktualisierung von {{company}} — Details ansehen' },
    tr: { title: '💳 Cüzdanında hareket var', body: '{{company}}\'dan {{amount}}. Geçmişi aç ve doğrula', bodyAlt: '{{company}}\'dan bir güncelleme var — detayları gör' },
    pt: { title: '💳 Movimento na sua carteira', body: '{{amount}} da {{company}}. Abra o histórico para confirmar', bodyAlt: 'Há uma atualização da {{company}} — veja os detalhes' },
  },

  // ---------------------------------------------------------- compensation
  compensation: {
    ar: { title: '✅ تعويضك: {{status}}', body: 'طلبك من {{company}} اتحدّث. افتح المحفظة وكمّل الخطوات', bodyAlt: 'في خبر عن طلب التعويض بتاعك — شوف الحالة دلوقتي' },
    en: { title: '✅ Your compensation: {{status}}', body: 'Your request with {{company}} was updated. Open your wallet', bodyAlt: 'News on your compensation request — check the status now' },
    es: { title: '✅ Tu reembolso: {{status}}', body: 'Tu solicitud con {{company}} se actualizó. Abre tu cartera', bodyAlt: 'Novedades en tu solicitud de reembolso. Revisa el estado' },
    ru: { title: '✅ Ваша компенсация: {{status}}', body: 'Заявка в {{company}} обновлена. Откройте кошелёк', bodyAlt: 'Новость по вашей заявке на компенсацию — проверьте статус' },
    fr: { title: '✅ Votre remboursement : {{status}}', body: 'Votre demande chez {{company}} a été mise à jour. Ouvrez le portefeuille', bodyAlt: 'Nouvelle concernant votre demande — vérifiez le statut' },
    de: { title: '✅ Ihre Erstattung: {{status}}', body: 'Ihre Anfrage bei {{company}} wurde aktualisiert. Wallet öffnen', bodyAlt: 'Neuigkeit zu Ihrer Erstattung — Status prüfen' },
    tr: { title: '✅ Tazminatın: {{status}}', body: '{{company}}\'daki talebin güncellendi. Cüzdanını aç', bodyAlt: 'Tazminat talebinle ilgili haber var — durumu gör' },
    pt: { title: '✅ Sua compensação: {{status}}', body: 'Seu pedido na {{company}} foi atualizado. Abra a carteira', bodyAlt: 'Novidade no seu pedido de compensação — confira o status' },
  },
};

/**
 * Map a country code to the language we should write in. Falls back to English
 * for anything we don't cover — callers usually pair this with GeoIP so the
 * wording matches where the subscriber actually is.
 */
export function langForCountry(countryCode?: string | null): NotifyLang {
  const cc = String(countryCode || '').trim().toUpperCase();
  if (!cc) return 'en';
  const arabic = new Set(['EG', 'SA', 'AE', 'QA', 'KW', 'OM', 'JO', 'LB', 'IQ', 'SY', 'YE', 'SD', 'LY', 'TN', 'DZ', 'MA', 'PS', 'BH', 'PS']);
  const spanish = new Set(['ES', 'MX', 'AR', 'CO', 'CL', 'PE', 'VE', 'EC', 'GT', 'CR', 'PA', 'UY', 'PY', 'BO', 'DO', 'CU', 'PR', 'HN', 'NI', 'SV', 'GQ']);
  const russian = new Set(['RU', 'BY', 'KZ', 'UA', 'AM', 'KG', 'TJ', 'UZ', 'MD']);
  const french = new Set(['FR', 'BE', 'CH', 'SN', 'CI', 'CM', 'ML', 'BF', 'NE', 'TD', 'MG', 'HT', 'CD', 'CG', 'GA', 'BJ', 'TG', 'MC', 'LU', 'RW', 'BI', 'GN', 'ML']);
  const german = new Set(['DE', 'AT', 'LI']);
  const turkish = new Set(['TR', 'CY']);
  const portuguese = new Set(['PT', 'BR', 'AO', 'MZ', 'CV', 'GW', 'ST', 'TL', 'MO']);
  if (arabic.has(cc)) return 'ar';
  if (spanish.has(cc)) return 'es';
  if (russian.has(cc)) return 'ru';
  if (french.has(cc)) return 'fr';
  if (german.has(cc)) return 'de';
  if (turkish.has(cc)) return 'tr';
  if (portuguese.has(cc)) return 'pt';
  return 'en';
}

function fill(text: string, vars?: Record<string, string | number>): string {
  if (!vars) return text;
  return text.replace(/\{\{(\w+)\}\}/g, (_m, key: string) => {
    const v = vars[key];
    return v === undefined || v === null || v === '' ? '' : String(v);
  });
}

/**
 * Compose one localized notification. `variant` picks the alternate hook line
 * for A/B tests; unknown languages fall back to English.
 */
export function composeNotification(
  kind: NotifyKind,
  lang: NotifyLang | string,
  vars?: Record<string, string | number>,
  variant: 'a' | 'b' = 'a'
): NotifyCopy {
  const table = COPY[kind] || COPY.hot_pick;
  const key = (NOTIFY_LANGS as string[]).includes(String(lang)) ? (lang as NotifyLang) : 'en';
  const t = table[key] || table.en;
  const body = variant === 'b' && t.bodyAlt ? t.bodyAlt : t.body;
  return { title: fill(t.title, vars).trim(), body: fill(body, vars).trim() };
}

/**
 * Build the full per-language map that `sendWebPush` expects, so each subscriber
 * receives the wording for their own language.
 */
export function composeLocalizedNotification(
  kind: NotifyKind,
  vars?: Record<string, string | number>,
  variant: 'a' | 'b' = 'a'
): Record<string, NotifyCopy> {
  const out: Record<string, NotifyCopy> = {};
  for (const lang of NOTIFY_LANGS) out[lang] = composeNotification(kind, lang, vars, variant);
  return out;
}

// Prediction verdicts, already localized — passed into templates as {{status}}.
const VERDICT_STATUS: Record<string, Record<NotifyLang, string>> = {
  hit: {
    ar: '🎯 توقعنا تحقق', en: '🎯 Prediction hit', es: '🎯 ¡Acierto!',
    ru: '🎯 Прогноз совпал', fr: '🎯 Bon pronostic', de: '🎯 Tipp sitzt',
    tr: '🎯 Tahmin tuttu', pt: '🎯 Acertamos',
  },
  miss: {
    ar: '❌ التوقع لم يتحقق', en: '❌ Prediction missed', es: '❌ Pronóstico fallido',
    ru: '❌ Прогноз не совпал', fr: '❌ Prono raté', de: '❌ Tipp verfehlt',
    tr: '❌ Tutmadı', pt: '❌ Erros o palpite',
  },
  draw: {
    ar: '➖ تعادل', en: '➖ Draw', es: '➖ Empate', ru: '➖ Ничья',
    fr: '➖ Match nul', de: '➖ Unentschieden', tr: '➖ Berabere', pt: '➖ Empate',
  },
};

/** Localized verdict label for a settlement notification. */
export function verdictStatus(verdict: string, lang: NotifyLang): string {
  return VERDICT_STATUS[verdict]?.[lang] || VERDICT_STATUS[verdict]?.en || '';
}
