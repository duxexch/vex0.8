// Promotional post sent when the bot is opened WITHOUT a verification session payload.
// Kept as a pure function so tests can assert on domains/features deterministically.

export const BOT_PROMO_DOMAINS = [
  'https://vex.deals',
  'https://betjam.sbs',
  'https://1xbetservices.com',
  'https://betongame.cloud',
  'https://vixo.uno',
];

export const BOT_PROMO_DEEP_LINK = 'https://vex.deals/?ref=bot_start';

export function buildBotPromoMessage(): string {
  const lines = [
    '🏆 مرحبًا بك في عالم VEX Deals — منصتك الذكية!',
    '',
    '✅ نظام ولاء ومكافآت على كل رهان',
    '💰 تعويضات فورية وحماية خاسرك',
    '🎰 يانصيب بجوائز ضخمة أسبوعياً',
    '🤖 تحليلات ذكاء اصطناعي للمباريات',
    '🔐 حسابك مرتبط برقمك — افتح من أي جهاز',
    '⚡ إيداع وسحب سريعة وآمنة',
    '',
    '🌐 مواقعنا الرسمية:',
  ];
  for (const domain of BOT_PROMO_DOMAINS) {
    lines.push(`🔹 ${domain}`);
  }
  lines.push('');
  lines.push('🎁 افتح الآن واحصل على مزايا حصرية 👇');
  lines.push(BOT_PROMO_DEEP_LINK);
  return lines.join('\n');
}
