export interface WorldCurrency {
  code: string;
  nameEn: string;
  nameAr: string;
  nameEs: string;
  nameRu: string;
  symbol: string;
  flag: string;
}

export const WORLD_CURRENCIES: WorldCurrency[] = [
  // Major World Currencies
  { code: 'USD', nameEn: 'US Dollar', nameAr: 'دولار أمريكي', nameEs: 'Dólar estadounidense', nameRu: 'Доллар США', symbol: '$', flag: '🇺🇸' },
  { code: 'EUR', nameEn: 'Euro', nameAr: 'يورو', nameEs: 'Euro', nameRu: 'Евро', symbol: '€', flag: '🇪🇺' },
  { code: 'GBP', nameEn: 'British Pound', nameAr: 'جنيه إسترليني', nameEs: 'Libra esterlina', nameRu: 'Британский фунт', symbol: '£', flag: '🇬🇧' },
  
  // Arab & Middle East Currencies
  { code: 'EGP', nameEn: 'Egyptian Pound', nameAr: 'جنيه مصري', nameEs: 'Libra egipcia', nameRu: 'Египетский фунт', symbol: 'EGP', flag: '🇪🇬' },
  { code: 'SAR', nameEn: 'Saudi Riyal', nameAr: 'ريال سعودي', nameEs: 'Riyal saudí', nameRu: 'Саудовский риял', symbol: 'SAR', flag: '🇸🇦' },
  { code: 'AED', nameEn: 'UAE Dirham', nameAr: 'درهم إماراتي', nameEs: 'Dírham de EAU', nameRu: 'Дирхам ОАЭ', symbol: 'AED', flag: '🇦🇪' },
  { code: 'KWD', nameEn: 'Kuwaiti Dinar', nameAr: 'دينار كويتي', nameEs: 'Dinar kuwaití', nameRu: 'Кувейтский динар', symbol: 'KWD', flag: '🇰🇼' },
  { code: 'QAR', nameEn: 'Qatari Riyal', nameAr: 'ريال قطري', nameEs: 'Riyal qatarí', nameRu: 'Катарский риал', symbol: 'QAR', flag: '🇶🇦' },
  { code: 'BHD', nameEn: 'Bahraini Dinar', nameAr: 'دينار بحريني', nameEs: 'Dinar bahreiní', nameRu: 'Бахрейнский динар', symbol: 'BHD', flag: '🇧🇭' },
  { code: 'OMR', nameEn: 'Omani Rial', nameAr: 'ريال عماني', nameEs: 'Rial omaní', nameRu: 'Оманский риал', symbol: 'OMR', flag: '🇴🇲' },
  { code: 'JOD', nameEn: 'Jordanian Dinar', nameAr: 'دينار أردني', nameEs: 'Dinar jordano', nameRu: 'Иорданский динар', symbol: 'JOD', flag: '🇯🇴' },
  { code: 'IQD', nameEn: 'Iraqi Dinar', nameAr: 'دينار عراقي', nameEs: 'Dinar iraquí', nameRu: 'Иракский динар', symbol: 'IQD', flag: '🇮🇶' },
  { code: 'LYD', nameEn: 'Libyan Dinar', nameAr: 'دينار ليبي', nameEs: 'Dinar libio', nameRu: 'Ливийский динар', symbol: 'LYD', flag: '🇱🇾' },
  { code: 'TND', nameEn: 'Tunisian Dinar', nameAr: 'دينار تونسي', nameEs: 'Dinar tunecino', nameRu: 'Тунисский динар', symbol: 'TND', flag: '🇹🇳' },
  { code: 'DZD', nameEn: 'Algerian Dinar', nameAr: 'دينار جزائري', nameEs: 'Dinar argelino', nameRu: 'Алжирский динар', symbol: 'DZD', flag: '🇩🇿' },
  { code: 'MAD', nameEn: 'Moroccan Dirham', nameAr: 'درهم مغربي', nameEs: 'Dírham marroquí', nameRu: 'Марокканский дирхам', symbol: 'MAD', flag: '🇲🇦' },
  { code: 'SDG', nameEn: 'Sudanese Pound', nameAr: 'جنيه سوداني', nameEs: 'Libra sudanesa', nameRu: 'Суданский фунт', symbol: 'SDG', flag: '🇸🇩' },
  { code: 'LBP', nameEn: 'Lebanese Pound', nameAr: 'ليرة لبنانية', nameEs: 'Libra libanesa', nameRu: 'Ливанский фунт', symbol: 'LBP', flag: '🇱🇧' },
  { code: 'SYP', nameEn: 'Syrian Pound', nameAr: 'ليرة سورية', nameEs: 'Libra siria', nameRu: 'Сирийский фунт', symbol: 'SYP', flag: '🇸🇾' },
  { code: 'YER', nameEn: 'Yemeni Rial', nameAr: 'ريال يمني', nameEs: 'Rial yemení', nameRu: 'Йеменский риал', symbol: 'YER', flag: '🇾🇪' },
  
  // Americas & Europe
  { code: 'CAD', nameEn: 'Canadian Dollar', nameAr: 'دولار كندي', nameEs: 'Dólar canadiense', nameRu: 'Канадский доллар', symbol: 'C$', flag: '🇨🇦' },
  { code: 'AUD', nameEn: 'Australian Dollar', nameAr: 'دولار أسترالي', nameEs: 'Dólar australiano', nameRu: 'Австралийский доллар', symbol: 'A$', flag: '🇦🇺' },
  { code: 'CHF', nameEn: 'Swiss Franc', nameAr: 'فرنك سويسري', nameEs: 'Franco suizo', nameRu: 'Швейцарский франк', symbol: 'CHF', flag: '🇨🇭' },
  { code: 'TRY', nameEn: 'Turkish Lira', nameAr: 'ليرة تركية', nameEs: 'Lira turca', nameRu: 'Турецкая лира', symbol: '₺', flag: '🇹🇷' },
  { code: 'RUB', nameEn: 'Russian Ruble', nameAr: 'روبل روسي', nameEs: 'Rublo ruso', nameRu: 'Российский рубль', symbol: '₽', flag: '🇷🇺' },
  { code: 'BRL', nameEn: 'Brazilian Real', nameAr: 'ريال برازيلي', nameEs: 'Real brasileño', nameRu: 'Бразильский реал', symbol: 'R$', flag: '🇧🇷' },
  { code: 'MXN', nameEn: 'Mexican Peso', nameAr: 'بيزو مكسيكي', nameEs: 'Peso mexicano', nameRu: 'Мексиканский песо', symbol: 'Mex$', flag: '🇲🇽' },
  { code: 'ARS', nameEn: 'Argentine Peso', nameAr: 'بيزو أرجنتيني', nameEs: 'Peso argentino', nameRu: 'Аргентинский песо', symbol: '$', flag: '🇦🇷' },
  { code: 'CLP', nameEn: 'Chilean Peso', nameAr: 'بيزو تشيلي', nameEs: 'Peso chileno', nameRu: 'Чилийский песо', symbol: '$', flag: '🇨🇱' },
  { code: 'COP', nameEn: 'Colombian Peso', nameAr: 'بيزو كولومبي', nameEs: 'Peso colombiano', nameRu: 'Колумбийский песо', symbol: '$', flag: '🇨🇴' },
  { code: 'PEN', nameEn: 'Peruvian Sol', nameAr: 'سول بيروفي', nameEs: 'Sol peruano', nameRu: 'Перуанский соль', symbol: 'S/.', flag: '🇵🇪' },
  { code: 'SEK', nameEn: 'Swedish Krona', nameAr: 'كرونة سويدية', nameEs: 'Corona sueca', nameRu: 'Шведская крона', symbol: 'kr', flag: '🇸🇪' },
  { code: 'NOK', nameEn: 'Norwegian Krone', nameAr: 'كرونة نرويجية', nameEs: 'Corona noruega', nameRu: 'Норвежская крона', symbol: 'kr', flag: '🇳🇴' },
  { code: 'DKK', nameEn: 'Danish Krone', nameAr: 'كرونة دنماركية', nameEs: 'Corona danesa', nameRu: 'Датская крона', symbol: 'kr', flag: '🇩🇰' },
  { code: 'PLN', nameEn: 'Polish Zloty', nameAr: 'زلوتي بولندي', nameEs: 'Zloty polaco', nameRu: 'Польский злотый', symbol: 'zł', flag: '🇵🇱' },
  { code: 'CZK', nameEn: 'Czech Koruna', nameAr: 'كورونا تشيكية', nameEs: 'Corona checa', nameRu: 'Чешская крона', symbol: 'Kč', flag: '🇨🇿' },
  { code: 'HUF', nameEn: 'Hungarian Forint', nameAr: 'فورنت مجري', nameEs: 'Forinto húngaro', nameRu: 'Венгерский форинт', symbol: 'Ft', flag: '🇭🇺' },
  { code: 'RON', nameEn: 'Romanian Leu', nameAr: 'ليو روماني', nameEs: 'Leu rumano', nameRu: 'Румынский лей', symbol: 'lei', flag: '🇷🇴' },
  { code: 'BGN', nameEn: 'Bulgarian Lev', nameAr: 'ليف بلغاري', nameEs: 'Lev búlgaro', nameRu: 'Болгарский лев', symbol: 'лв', flag: '🇧🇬' },
  { code: 'UAH', nameEn: 'Ukrainian Hryvnia', nameAr: 'هريفنيا أوكرانية', nameEs: 'Grivna ucraniana', nameRu: 'Украинская гривна', symbol: '₴', flag: '🇺🇦' },

  // Asia & Oceania
  { code: 'CNY', nameEn: 'Chinese Yuan', nameAr: 'يوان صيني', nameEs: 'Yuan chino', nameRu: 'Китайский юань', symbol: '¥', flag: '🇨🇳' },
  { code: 'JPY', nameEn: 'Japanese Yen', nameAr: 'ين ياباني', nameEs: 'Yen japonés', nameRu: 'Японская иена', symbol: '¥', flag: '🇯🇵' },
  { code: 'INR', nameEn: 'Indian Rupee', nameAr: 'روبية هندية', nameEs: 'Rupia india', nameRu: 'Индийская рупия', symbol: '₹', flag: '🇮🇳' },
  { code: 'KRW', nameEn: 'South Korean Won', nameAr: 'وون كوري جنوبي', nameEs: 'Won surcoreano', nameRu: 'Южнокорейская вона', symbol: '₩', flag: '🇰🇷' },
  { code: 'SGD', nameEn: 'Singapore Dollar', nameAr: 'دولار سنغافوري', nameEs: 'Dólar de Singapur', nameRu: 'Сингапурский доллар', symbol: 'S$', flag: '🇸🇬' },
  { code: 'HKD', nameEn: 'Hong Kong Dollar', nameAr: 'دولار هونج كونج', nameEs: 'Dólar de Hong Kong', nameRu: 'Гонконгский доллар', symbol: 'HK$', flag: '🇭🇰' },
  { code: 'NZD', nameEn: 'New Zealand Dollar', nameAr: 'دولار نيوزيلندي', nameEs: 'Dólar neozelandés', nameRu: 'Новозеландский доллар', symbol: 'NZ$', flag: '🇳🇿' },
  { code: 'MYR', nameEn: 'Malaysian Ringgit', nameAr: 'رينغيت ماليزي', nameEs: 'Ringgit malayo', nameRu: 'Малайзийский ринггит', symbol: 'RM', flag: '🇲🇾' },
  { code: 'THB', nameEn: 'Thai Baht', nameAr: 'بات تايلاندي', nameEs: 'Baht tailandés', nameRu: 'Тайский бат', symbol: '฿', flag: '🇹🇭' },
  { code: 'IDR', nameEn: 'Indonesian Rupiah', nameAr: 'روبية إندونيسية', nameEs: 'Rupia indonesia', nameRu: 'Индонезийская рупия', symbol: 'Rp', flag: '🇮🇩' },
  { code: 'PHP', nameEn: 'Philippine Peso', nameAr: 'بيزو فلبيني', nameEs: 'Peso filipino', nameRu: 'Филиппинский песо', symbol: '₱', flag: '🇵🇭' },
  { code: 'VND', nameEn: 'Vietnamese Dong', nameAr: 'دونغ فيتنامي', nameEs: 'Dong vietnamita', nameRu: 'Вьетнамский донг', symbol: '₫', flag: '🇻🇳' },
  { code: 'PKR', nameEn: 'Pakistani Rupee', nameAr: 'روبية باكستانية', nameEs: 'Rupia pakistaní', nameRu: 'Пакистанская рупия', symbol: '₨', flag: '🇵🇰' },
  { code: 'BDT', nameEn: 'Bangladeshi Taka', nameAr: 'تاكا بنغلاديشية', nameEs: 'Taka bangladesí', nameRu: 'Бангладешская така', symbol: '৳', flag: '🇧🇩' },

  // CIS & Central Asia
  { code: 'KZT', nameEn: 'Kazakhstani Tenge', nameAr: 'تينغ كازاخستاني', nameEs: 'Tenge kazajo', nameRu: 'Казахстанский тенге', symbol: '₸', flag: '🇰🇿' },
  { code: 'UZS', nameEn: 'Uzbekistani Som', nameAr: 'سوم أوزبكستاني', nameEs: 'Som uzbeko', nameRu: 'Узбекский сум', symbol: "so'm", flag: '🇺🇿' },
  { code: 'AZN', nameEn: 'Azerbaijani Manat', nameAr: 'مانات أذربيجاني', nameEs: 'Manat azerbaiyano', nameRu: 'Азербайджанский манат', symbol: '₼', flag: '🇦🇿' },
  { code: 'GEL', nameEn: 'Georgian Lari', nameAr: 'لاري جورجي', nameEs: 'Lari georgiano', nameRu: 'Грузинский лари', symbol: '₾', flag: '🇬🇪' },
  { code: 'AMD', nameEn: 'Armenian Dram', nameAr: 'درام أرميني', nameEs: 'Dram armenio', nameRu: 'Армянский драм', symbol: '֏', flag: '🇦🇲' },

  // Africa
  { code: 'ZAR', nameEn: 'South African Rand', nameAr: 'راند جنوب أفريقي', nameEs: 'Rand sudafricano', nameRu: 'Южноафриканский рэнд', symbol: 'R', flag: '🇿🇦' },
  { code: 'NGN', nameEn: 'Nigerian Naira', nameAr: 'نايرا نيجيرية', nameEs: 'Naira nigeriana', nameRu: 'Нигерийская найра', symbol: '₦', flag: '🇳🇬' },
  { code: 'KES', nameEn: 'Kenyan Shilling', nameAr: 'شلن كيني', nameEs: 'Chelín keniano', nameRu: 'Кенийский шиллинг', symbol: 'KSh', flag: '🇰🇪' },
  { code: 'GHS', nameEn: 'Ghanaian Cedi', nameAr: 'سيدي غاني', nameEs: 'Cedi ghanés', nameRu: 'Ганский седи', symbol: 'GH₵', flag: '🇬🇭' },

  // Crypto / Digital
  { code: 'USDT', nameEn: 'Tether USD (Crypto)', nameAr: 'تيذر دولار (USDT)', nameEs: 'Tether USD (Crypto)', nameRu: 'Tether USD (USDT)', symbol: '₮', flag: '🌐' },
];

export function getCurrencyName(curr: WorldCurrency, lang: 'ar' | 'en' | 'es' | 'ru'): string {
  switch (lang) {
    case 'ar':
      return curr.nameAr;
    case 'es':
      return curr.nameEs;
    case 'ru':
      return curr.nameRu;
    case 'en':
    default:
      return curr.nameEn;
  }
}
