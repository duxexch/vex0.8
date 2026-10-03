import React from 'react';
import { X, Share2, PlusSquare, Smartphone, CheckCircle2 } from 'lucide-react';
import { Language } from '../types';

interface IosInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const IosInstallModal: React.FC<IosInstallModalProps> = ({ isOpen, onClose, lang }) => {
  if (!isOpen) return null;

  const content = {
    ar: {
      title: 'تثبيت تطبيق VEX Deals على آيفون (iOS)',
      subtitle: 'لا تدعم متصفحات آبل التثبيت التلقائي مثل أندرويد. باتباع هذه الخطوات البسيطة، يمكنك تثبيت التطبيق على شاشتك الرئيسية بنقرة واحدة:',
      step1: 'افتح هذا الرابط حصرياً في متصفح **سفاري (Safari)**.',
      step2: 'اضغط على زر **مشاركة (Share)** الموجود في شريط الأدوات السفلي أو العلوي.',
      step3: 'انزل لأسفل القائمة واضغط على خيار **"إضافة إلى الشاشة الرئيسية" (Add to Home Screen)**.',
      step4: 'اضغط على **إضافة (Add)** في الزاوية العليا، ومبارك عليك التطبيق كبرنامج مستقل!',
      gotIt: 'فهمت، شكراً لك',
    },
    en: {
      title: 'Install VEX Deals on iPhone & iPad',
      subtitle: 'Apple does not support automatic app installation prompts. Follow these quick steps to add the app to your Home Screen:',
      step1: 'Open this website in the **Safari** browser.',
      step2: 'Tap the **Share** button in Safari’s bottom or top toolbar.',
      step3: 'Scroll down the actions list and select **"Add to Home Screen"**.',
      step4: 'Tap **Add** in the top right corner. Enjoy your app!',
      gotIt: 'Got it, Thanks',
    },
    es: {
      title: 'Instalar VEX Deals en iPhone',
      subtitle: 'Apple no admite notificaciones de instalación automática. Sigue estos sencillos pasos:',
      step1: 'Abre este sitio en el navegador **Safari**.',
      step2: 'Toca el botón **Compartir** en la barra de herramientas de Safari.',
      step3: 'Desplázate hacia abajo y selecciona **"Añadir a la pantalla de inicio"**.',
      step4: 'Toca **Añadir** en la esquina superior derecha.',
      gotIt: 'Entendido',
    },
    ru: {
      title: 'Установка VEX Deals на iPhone',
      subtitle: 'Apple не поддерживает автоматическую установку приложений. Выполните следующие действия:',
      step1: 'Откройте этот сайт в браузере **Safari**.',
      step2: 'Нажмите кнопку **Поделиться** на панели инструментов Safari.',
      step3: 'Прокрутите вниз и выберите **«На экран "Домой"»**.',
      step4: 'Нажмите **Добавить** в правом верхнем углу.',
      gotIt: 'Понятно',
    },
  };

  const t = content[lang] || content['ar'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in select-none">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 relative overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shadow-2xs">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-sm sm:text-base leading-tight">
                {t.title}
              </h3>
              <span className="text-[11px] text-emerald-600 font-bold">
                PWA Safari Guide
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          {t.subtitle}
        </p>

        {/* Steps List */}
        <div className="space-y-3.5 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
              1
            </div>
            <p className="text-xs text-slate-700 leading-normal" dangerouslySetInnerHTML={{ __html: t.step1 }} />
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
              2
            </div>
            <div className="text-xs text-slate-700 leading-normal space-y-1">
              <p dangerouslySetInnerHTML={{ __html: t.step2 }} />
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-800 font-bold shadow-2xs">
                <Share2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Share / مشاركة</span>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
              3
            </div>
            <div className="text-xs text-slate-700 leading-normal space-y-1">
              <p dangerouslySetInnerHTML={{ __html: t.step3 }} />
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-800 font-bold shadow-2xs">
                <PlusSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span>Add to Home Screen / إضافة للشاشة</span>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
              4
            </div>
            <p className="text-xs text-slate-700 leading-normal" dangerouslySetInnerHTML={{ __html: t.step4 }} />
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{t.gotIt}</span>
        </button>
      </div>
    </div>
  );
};
