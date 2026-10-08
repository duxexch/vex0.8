// Domain profiles translated for all 8 languages
// brand + focus stay in server.ts (domain identity constants)

export type ProfileText = { tagline: string; description: string; intro: string; h1: string };

export const PROFILES: Record<string, Record<string, ProfileText>> = {
  'vex.deals': {
    ar: {
      tagline: 'منصة التعويضات والولاء',
      description: 'VEX Deals تتخصّص في تعويض خسائر المراهنات وتتبع المحافظ وتوقعات المباريات بالذكاء الاصطناعي.',
      intro: 'VEX Deals تغطّي تعويض خسائر المراهنات وتتبّع أرصدة المحافظ عبر الشركات المدعومة، مع توقعات مباريات مدعومة بالذكاء الاصطناعي ويانصيب تكافلي قابل للتحقق.',
      h1: 'VEX Deals — منصة التعويضات والولاء',
    },
    en: {
      tagline: 'Loyalty & Compensation Platform',
      description: 'VEX Deals covers betting loss compensation, wallet tracking, and AI-powered match predictions.',
      intro: 'VEX Deals covers betting loss compensation and wallet balance tracking across the bookmakers it supports, with AI-powered match predictions and a verifiably fair lottery.',
      h1: 'VEX Deals — Loyalty & Compensation Platform',
    },
    es: {
      tagline: 'Plataforma de lealtad y compensación',
      description: 'VEX Deals cubre la compensación de pérdidas de apuestas, el seguimiento de carteras y las predicciones de partidos con IA.',
      intro: 'VEX Deals cubre la compensación de pérdidas de apuestas y el seguimiento de saldos en las casas que admite, con predicciones de partidos impulsadas por IA y una lotería verificablemente justa.',
      h1: 'VEX Deals — Plataforma de lealtad y compensación',
    },
    ru: {
      tagline: 'Платформа лояльности и компенсации',
      description: 'VEX Deals — платформа для компенсации ставок, отслеживания кошельков и AI-прогнозов матчей.',
      intro: 'VEX Deals охватывает компенсацию проигрышей ставок и отслеживание балансов у поддерживаемых букмекеров, с AI-прогнозами матчей и проверяемо честной лотереей.',
      h1: 'VEX Deals — платформа лояльности и компенсации',
    },
    fr: {
      tagline: 'Plateforme de fidélité et d’indemnisation',
      description: 'VEX Deals couvre l’indemnisation des pertes de paris, le suivi de portefeuilles et les prédictions de matchs par IA.',
      intro: 'VEX Deals couvre l’indemnisation des pertes de paris et le suivi des soldes auprès des bookmakers pris en charge, avec des prédictions de matchs par IA et une loterie vérifiablement équitable.',
      h1: 'VEX Deals — plateforme de fidélité et d’indemnisation',
    },
    de: {
      tagline: 'Loyalitäts- und Erstattungsplattform',
      description: 'VEX Deals umfasst Wettverlust-Erstattung, Guthaben-Tracking und KI-gestützte Spielprognosen.',
      intro: 'VEX Deals umfasst die Erstattung von Wettverlusten und das Tracking von Guthaben bei den unterstützten Anbietern, mit KI-Prognosen und einem überprüfbar fairen Lotto.',
      h1: 'VEX Deals — Loyalitäts- und Erstattungsplattform',
    },
    tr: {
      tagline: 'Sadakat ve Tazminat Platformu',
      description: 'VEX Deals; bahis kayıp tazminatı, cüzdan takibi ve yapay zeka destekli maç tahminlerini kapsar.',
      intro: 'VEX Deals; desteklenen platformlarda bahis kayıp tazminatı ve bakiye takibini kapsar — yapay zeka destekli maç tahminleri ve doğrulanabilir adil piyango ile.',
      h1: 'VEX Deals — Sadakat ve Tazminat Platformu',
    },
    pt: {
      tagline: 'Plataforma de fidelidade e compensação',
      description: 'VEX Deals cobre compensação de perdas em apostas, acompanhamento de carteiras e previsões de jogos com IA.',
      intro: 'VEX Deals cobre a compensação de perdas em apostas e o acompanhamento de saldos nas casas suportadas, com previsões de jogos por IA e uma loteria verificavelmente justa.',
      h1: 'VEX Deals — Plataforma de fidelidade e compensação',
    },
  },
  'betjam.sbs': {
    ar: {
      tagline: 'مركز استرداد خسائر المراهنات',
      description: 'BetJam متخصص في استرداد خسائر المراهنات واسترجاع النسب النقدية من شركات المراهنات التي يغطّيها.',
      intro: 'BetJam يساعدك على استعادة جزء من خسائرك عبر طلبات استرداد نقدي مباشرة، مع متابعة لحظية لأرصدة حساباتك في شركات المراهنات وتحويلات إلى محفظتك.',
      h1: 'BetJam — استرداد خسائر المراهنات والنقد المسترد',
    },
    en: {
      tagline: 'Betting Loss Recovery Center',
      description: 'BetJam specializes in recovering betting losses and reclaiming cashback percentages from betting companies.',
      intro: 'BetJam helps you recover part of your losses through direct cashback claims, with live tracking of your balances across betting companies and transfers to your wallet.',
      h1: 'BetJam — Betting Loss Recovery & Cashback',
    },
    es: {
      tagline: 'Centro de recuperación de pérdidas de apuestas',
      description: 'BetJam se especializa en recuperar pérdidas de apuestas y porcentajes de reembolso de casas de apuestas.',
      intro: 'BetJam te ayuda a recuperar parte de tus pérdidas con solicitudes de reembolso directas, seguimiento en vivo de tus saldos y transferencias a tu cartera.',
      h1: 'BetJam — recuperación de pérdidas y cashback de apuestas',
    },
    ru: {
      tagline: 'Центр возмещения проигрышей ставок',
      description: 'BetJam специализируется на возврате проигрышей ставок и кэшбэка от букмекеров.',
      intro: 'BetJam помогает вернуть часть проигрышей через прямые запросы на кэшбэк, с отслеживанием балансов в реальном времени и переводами на кошелёк.',
      h1: 'BetJam — возврат проигрышей и кэшбэк ставок',
    },
    fr: {
      tagline: 'Centre de récupération des pertes de paris',
      description: 'BetJam est spécialisé dans la récupération des pertes de paris et des pourcentages de cashback auprès de bookmakers.',
      intro: 'BetJam vous aide à récupérer une partie de vos pertes via des demandes de cashback directes, avec suivi en direct de vos soldes et transferts vers votre portefeuille.',
      h1: 'BetJam — récupération des pertes et cashback de paris',
    },
    de: {
      tagline: 'Zentrale zur Rückgewinnung von Wettverlusten',
      description: 'BetJam ist auf die Rückforderung von Wettverlusten und Cashback-Prozenten bei Anbietern spezialisiert.',
      intro: 'BetJam hilft Ihnen, einen Teil Ihrer Verluste über direkte Cashback-Anträge zurückzugewinnen – mit Live-Tracking Ihrer Guthaben und Überweisungen auf Ihr Wallet.',
      h1: 'BetJam — Wettverlust-Rückgewinnung und Cashback',
    },
    tr: {
      tagline: 'Bahis Kayıp Geri Kazanım Merkezi',
      description: 'BetJam; bahis şirketlerinden kayıp ve nakit iade yüzdesi geri kazanımında uzmanlaşmıştır.',
      intro: 'BetJam; doğrudan nakit iade talepleriyle kayıplarınızın bir kısmını geri kazanmanıza yardımcı olur — bakiyelerinizi canlı takip eder ve cüzdanınıza transfer eder.',
      h1: 'BetJam — bahis kayıp geri kazanımı ve nakit iade',
    },
    pt: {
      tagline: 'Central de recuperação de perdas em apostas',
      description: 'BetJam especializa-se em recuperar perdas de apostas e percentuais de cashback de casas de apostas.',
      intro: 'BetJam ajuda você a recuperar parte das perdas com solicitações diretas de cashback, acompanhamento ao vivo dos saldos e transferências para sua carteira.',
      h1: 'BetJam — recuperação de perdas e cashback de apostas',
    },
  },
  '1xbetservices.com': {
    ar: {
      tagline: 'دليل خدمات ودعم 1xBet الشامل',
      description: 'دليل شامل لخدمات 1xBet: أكواد الخصم، الدعم الفني، تحميل التطبيق، وأكواد الإحالة.',
      intro: '1xBet Services هو دليلك الشامل لكل ما يتعلق بـ 1xBet: أحدث أكواد الخصم والبونص الترحيبي، حلول الدعم الفني، روابط تحميل التطبيق APK، وشرح نظام الإحالات والأرباح.',
      h1: '1xBet Services — الدليل الشامل لخدمات 1xBet',
    },
    en: {
      tagline: 'The Complete 1xBet Services & Support Guide',
      description: 'A complete guide to 1xBet services: promo codes, customer support, app download, and referral codes.',
      intro: '1xBet Services is your complete guide to everything about 1xBet: the latest promo codes and welcome bonuses, customer support solutions, APK download links, and a full explanation of the referral and earnings system.',
      h1: '1xBet Services — The Complete 1xBet Services Guide',
    },
    es: {
      tagline: 'Guía completa de servicios y soporte de 1xBet',
      description: 'Guía completa de los servicios de 1xBet: códigos promocionales, soporte, descarga de la app y códigos de referidos.',
      intro: '1xBet Services es tu guía completa de todo sobre 1xBet: los últimos códigos promocionales, soluciones de soporte, enlaces de descarga APK y una explicación completa del sistema de referidos y ganancias.',
      h1: '1xBet Services — guía completa de servicios de 1xBet',
    },
    ru: {
      tagline: 'Полное руководство по сервисам и поддержке 1xBet',
      description: 'Полное руководство по сервисам 1xBet: промокоды, поддержка, скачивание приложения и реферальные коды.',
      intro: '1xBet Services — ваше полное руководство по всему, что связано с 1xBet: актуальные промокоды и бонусы, решения поддержки, ссылки на APK и подробное описание реферальной системы и заработка.',
      h1: '1xBet Services — полное руководство по сервисам 1xBet',
    },
    fr: {
      tagline: 'Le guide complet des services et du support 1xBet',
      description: 'Guide complet des services 1xBet : codes promo, support, téléchargement de l’app et codes de parrainage.',
      intro: '1xBet Services est votre guide complet sur tout ce qui concerne 1xBet : derniers codes promo et bonus de bienvenue, solutions de support, liens de téléchargement APK et explication complète du système de parrainage et de gains.',
      h1: '1xBet Services — le guide complet des services 1xBet',
    },
    de: {
      tagline: 'Der vollständige 1xBet-Service- und Supportleitfaden',
      description: 'Ein vollständiger Leitfaden zu 1xBet-Services: Aktionscodes, Support, App-Download und Empfehlungscodes.',
      intro: '1xBet Services ist Ihr vollständiger Leitfaden zu allem rund um 1xBet: die neuesten Aktionscodes und Willkommensboni, Support-Lösungen, APK-Download-Links und eine vollständige Erklärung des Empfehlungs- und Verdienstsystems.',
      h1: '1xBet Services — der vollständige 1xBet-Serviceleitfaden',
    },
    tr: {
      tagline: 'Kapsamlı 1xBet Hizmet ve Destek Rehberi',
      description: '1xBet hizmetleri için kapsamlı rehber: promosyon kodları, destek, uygulama indirme ve referans kodları.',
      intro: '1xBet Services; 1xBet ile ilgili her şey için kapsamlı rehberiniz: en son promosyon kodları ve hoş geldin bonusları, destek çözümleri, APK indirme bağlantıları ve referans/kazanç sisteminin tam açıklaması.',
      h1: '1xBet Services — kapsamlı 1xBet hizmet rehberi',
    },
    pt: {
      tagline: 'O guia completo de serviços e suporte da 1xBet',
      description: 'Guia completo dos serviços da 1xBet: códigos promocionais, suporte, download do app e códigos de indicação.',
      intro: '1xBet Services é o seu guia completo sobre tudo da 1xBet: últimos códigos promocionais e bônus de boas-vindas, soluções de suporte, links de download APK e explicação completa do sistema de indicações e ganhos.',
      h1: '1xBet Services — o guia completo de serviços da 1xBet',
    },
  },
  'vixo.uno': {
    ar: {
      tagline: 'توقعات المباريات بالذكاء الاصطناعي',
      description: 'Vixo يقدم توقعات مباريات بالذكاء الاصطناعي مع تحليلات تكتيكية واحتمالات فوز.',
      intro: 'Vixo منصة التحليل الرياضي بالذكاء الاصطناعي: توقعات للمباريات مدعومة بنموذج Gemini، مع احتمالات فوز ونتائج متوقعة وملخصات تكتيكية ومؤشر ثقة لكل مباراة.',
      h1: 'Vixo — توقعات المباريات بالذكاء الاصطناعي',
    },
    en: {
      tagline: 'AI-Powered Football Match Predictions',
      description: 'Vixo delivers AI football match predictions with tactical analysis and win probabilities.',
      intro: 'Vixo is the AI sports analytics platform: match predictions powered by the Gemini model, with win probabilities, predicted scores, tactical summaries, and a confidence score for every match.',
      h1: 'Vixo — AI-Powered Football Match Predictions',
    },
    es: {
      tagline: 'Predicciones de fútbol con inteligencia artificial',
      description: 'Vixo ofrece predicciones de fútbol con IA, análisis táctico y probabilidades de victoria.',
      intro: 'Vixo es la plataforma de analítica deportiva con IA: predicciones de partidos impulsadas por el modelo Gemini, con probabilidades de victoria, resultados previstos, resúmenes tácticos y un índice de confianza para cada partido.',
      h1: 'Vixo — predicciones de fútbol con inteligencia artificial',
    },
    ru: {
      tagline: 'AI-прогнозы футбольных матчей',
      description: 'Vixo предоставляет AI-прогнозы футбола с тактическим анализом и вероятностями побед.',
      intro: 'Vixo — платформа спортивной аналитики на базе ИИ: прогнозы матчей от модели Gemini с вероястностями побед, прогнозами счета, тактическими сводками и уровнем уверенности для каждого матча.',
      h1: 'Vixo — AI-прогнозы футбольных матчей',
    },
    fr: {
      tagline: 'Prédictions de football par intelligence artificielle',
      description: 'Vixo fournit des prédictions de football grâce à l’IA, avec analyse tactique et probabilités de victoire.',
      intro: 'Vixo est la plateforme d’analyse sportive par IA : prédictions de matchs propulsées par le modèle Gemini, avec probabilités de victoire, scores prévus, résumés tactiques et indice de confiance pour chaque match.',
      h1: 'Vixo — prédictions de football par intelligence artificielle',
    },
    de: {
      tagline: 'KI-gestützte Fußballspielprognosen',
      description: 'Vixo liefert KI-Fußballprognosen mit taktischer Analyse und Siegwahrscheinlichkeiten.',
      intro: 'Vixo ist die KI-Sportanalyseplattform: Spielprognosen des Gemini-Modells mit Siegwahrscheinlichkeiten, TorgPrognosen, taktischen Zusammenfassungen und einem Konfidenzwert für jedes Spiel.',
      h1: 'Vixo — KI-gestützte Fußballspielprognosen',
    },
    tr: {
      tagline: 'Yapay Zeka Destekli Futbol Maç Tahminleri',
      description: 'Vixo; taktik analiz ve kazanma olasılıklarıyla yapay zeka futbol tahminleri sunar.',
      intro: 'Vixo, yapay zeka destekli spor analizi platformudur: Gemini modeliyle maç tahminleri, kazanma olasılıkları, skor tahminleri, taktik özetler ve her maç için güven skoru.',
      h1: 'Vixo — Yapay Zeka Destekli Futbol Maç Tahminleri',
    },
    pt: {
      tagline: 'Previsões de futebol com inteligência artificial',
      description: 'Vixo oferece previsões de futebol com IA, análise tática e probabilidades de vitória.',
      intro: 'Vixo é a plataforma de análises esportivas com IA: previsões de jogos com o modelo Gemini, probabilidades de vitória, placares previstos, resumos táticos e um índice de confiança para cada jogo.',
      h1: 'Vixo — previsões de futebol com inteligência artificial',
    },
  },
  'betongame.cloud': {
    ar: {
      tagline: 'اليانصيب التكافلي والتحليلات الرياضية',
      description: 'BetoGame يجمع بين اليانصيب التكافلي المُثبت العدالة والتحليلات الرياضية المتقدمة.',
      intro: 'BetoGame وجهتك لليانصيب التكافلي المُثبت العدالة بتشفير SHA-256، مع جوائز Jackpot تصل إلى 10,000$، وتحليلات رياضية متقدمة وتوقعات مباريات يومية.',
      h1: 'BetoGame — اليانصيب التكافلي والتحليلات الرياضية',
    },
    en: {
      tagline: 'Provably Fair Lottery & Sports Analytics',
      description: 'BetoGame combines a provably fair lottery with advanced sports analytics.',
      intro: 'BetoGame is your home for a provably fair SHA-256 lottery with jackpots up to $10,000, plus advanced sports analytics and daily match predictions.',
      h1: 'BetoGame — Provably Fair Lottery & Sports Analytics',
    },
    es: {
      tagline: 'Lotería demostrablemente justa y análisis deportivo',
      description: 'BetoGame combina una lotería demostrablemente justa con análisis deportivos avanzados.',
      intro: 'BetoGame es tu sitio para una lotería SHA-256 demostrablemente justa con jackpots de hasta 10.000 $, además de análisis deportivos avanzados y predicciones diarias.',
      h1: 'BetoGame — lotería demostrablemente justa y análisis deportivo',
    },
    ru: {
      tagline: 'Честная лотерея и спортивная аналитика',
      description: 'BetoGame сочетает прозрачную лотерею с продвинутой спортивной аналитикой.',
      intro: 'BetoGame — ваш дом для честной лотереи SHA-256 с джекпотами до 10 000 $, а также продвинутой спортивной аналитики и ежедневных прогнозов матчей.',
      h1: 'BetoGame — честная лотерея и спортивная аналитика',
    },
    fr: {
      tagline: 'Loterie équitable et analyses sportives',
      description: 'BetoGame associe une loterie vérifiablement équitable et des analyses sportives avancées.',
      intro: 'BetoGame est votre destination pour une loterie SHA-256 équitable avec des jackpots jusqu’à 10 000 $, ainsi que des analyses sportives avancées et des prédictions quotidiennes.',
      h1: 'BetoGame — loterie équitable et analyses sportives',
    },
    de: {
      tagline: 'Nachweisbar faires Lotto & Sportanalysen',
      description: 'BetoGame kombiniert ein nachweisbar faires Lotto mit fortschrittlichen Sportanalysen.',
      intro: 'BetoGame ist Ihr Zuhause für ein nachweisbar faires SHA-256-Lotto mit Jackpots bis 10.000 $, dazu fortschrittliche Sportanalysen und tägliche Spielprognosen.',
      h1: 'BetoGame — nachweisbar faires Lotto & Sportanalysen',
    },
    tr: {
      tagline: 'Kanıtlanabilir Adil Piyango ve Spor Analizleri',
      description: 'BetoGame; kanıtlanabilir adil piyango ile gelişmiş spor analizlerini birleştirir.',
      intro: 'BetoGame; 10.000$’a kadar jackpotlu, SHA-256 ile kanıtlanabilir adil piyango, gelişmiş spor analizleri ve günlük maç tahminleri için adresiniz.',
      h1: 'BetoGame — Kanıtlanabilir Adil Piyango ve Spor Analizleri',
    },
    pt: {
      tagline: 'Loteria comprovadamente justa e análises esportivas',
      description: 'BetoGame combina uma loteria comprovadamente justa com análises esportivas avançadas.',
      intro: 'BetoGame é o seu destino para uma loteria SHA-256 comprovadamente justa com jackpots de até US$ 10.000, além de análises esportivas avançadas e previsões diárias.',
      h1: 'BetoGame — loteria comprovadamente justa e análises esportivas',
    },
  },
};

export const getProfileText = (domain: string, lang: string): ProfileText => {
  const byDomain = PROFILES[domain] || PROFILES['vex.deals'];
  return byDomain[lang] || byDomain['en'] || byDomain['ar'];
};
