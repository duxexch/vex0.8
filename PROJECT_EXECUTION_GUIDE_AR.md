# دليل البناء والتشغيل والكوميت وبناء تطبيق الأندرويد (APK)

تم إعداد وتحديث هذا الدليل والاسكربتات المرفقة لتوفير بيئة عمل واضحة ومؤتمتة بالكامل لأي وكيل ذكاء اصطناعي (AI Agent) أو مطور يعمل على تحديث وبناء تطبيق **VEX Deals**.

---

## 🛠️ الأوامر السريعة المباشرة (NPM Scripts)

| الأمر | الوظيفة |
|---|---|
| `npm run dev` | تشغيل المشروع في بيئة التطوير مع المزامنة اللحظية (Port 3000) |
| `npm run lint` | التحقق من خلو الكود من أخطاء الـ TypeScript والـ Syntax |
| `npm run build` | بناء حزمة الويب وتجميع خادم Node.js في ملف `dist/server.cjs` |
| `npm start` أو `npm run prod` | تشغيل خادم الإنتاج الفعلي مع محرك الإشعارات الخلفي |
| `npm run git:sync` | فحص الكود، عمل Stage و Commit ودفع التغييرات تلقائياً إلى Git |
| `npm run apk:build` | بناء ملف الـ Android APK (Debug) محلياً وتجهيزه للتثبيت |
| `npm run apk:build:release` | بناء نسخة الـ Android APK للإنتاج (Release) |
| `npm run apk:sync` | مزامنة كود الـ React مع مجلد الـ Android (Capacitor) |
| `npm run apk:open` | فتح مشروع الأندرويد مباشرة داخل برنامج **Android Studio** |

---

## 📱 اسكربت بناء تطبيق الأندرويد (APK) على الجهاز المحلي

ملف الاسكربت: `./scripts/build-apk.sh`

### المتطلبات المسبقة على جهازك المحلي:
1. **Node.js** (v18 أو أعلى)
2. **Java JDK** (إصدار JDK 17 أو 21)
3. **Android Studio** أو أدوات Android SDK / Gradle

### كيفية تشغيل الاسكربت:
```bash
# لبناء نسخة تجريبية سريعة (Debug APK):
npm run apk:build
# أو مباشرة عبر Bash:
bash ./scripts/build-apk.sh debug

# لبناء نسخة الإنتاج (Release APK):
npm run apk:build:release
# أو:
bash ./scripts/build-apk.sh release
```

### ماذا يفعل اسكربت بناء الـ APK تلقائياً؟
1. يقوم بعمل `npm run build` لإنتاج أحدث ملفات الويب داخل مجلد `dist/`.
2. يتحقق من وجود مجلد `android` ويقوم بعمل مزامنة كاملة `npx cap sync android`.
3. يقوم بمنح صلاحيات التنفيذ لـ `gradlew` وتشغيل أمر التجميع `./gradlew assembleDebug`.
4. يستخرج ملف الـ APK النهائي ويظهر مساره وحجمه بدقة:
   - **مسار الملف الناتج**: `android/app/build/outputs/apk/debug/app-debug.apk`
5. يمكنك تثبيته مباشرة على الهاتف المتصل بالكمبيوتر عبر الأمر:
   ```bash
   adb install -r android/app/build/outputs/apk/debug/app-debug.apk
   ```

---

## 🔄 اسكربت الكوميت والبوش الذكي (Git Automation)

ملف الاسكربت: `./scripts/git-sync.sh`

### كيفية استخدامه:
```bash
# كوميت مع رسالة مخصصة ورفع التعديلات فوراً:
bash ./scripts/git-sync.sh "تحديث ميزات اليانصيب وبناء الأندرويد"

# أو استخدام رسالة توثيقية تلقائية مع التاريخ والوقت:
npm run git:sync
```

### ماذا يفعل الاسكربت؟
1. يفحص حالة الملفات المعدلة والجديدة (`git status`).
2. يقوم بتشغيل الـ Linter والتأكد من عدم وجود أي خطأ برمجي (`npm run lint`).
3. يضيف كافة التغييرات (`git add -A`).
4. ينشئ الـ Commit بالرسالة المحددة.
5. يكتشف الفرع النشط (Main/Master) ويدفع التغييرات (`git push origin <branch>`).

---

## 🏗️ معمارية المشروع وكيف يفهمها وكيل الذكاء الاصطناعي (AI Agent)

1. **الواجهة الأمامية (Frontend)**:
   - مبنية بـ React 19 + TypeScript + Tailwind CSS v4 + Motion + Lucide Icons.
   - كود اليانصيب والجوائز موجود في `src/components/LotteryTab.tsx` و `src/components/lottery/`.

2. **الخادم الخلفي ومحرك الإشعارات (Backend & Push)**:
   - الملف الرئيسي: `server.ts` مدمج معه Socket.io ومحرك إشعارات خلفي (Docker/Worker) وتنبيهات الـ 30 دقيقة والـ 60 دقيقة لسحوبات اليانصيب.

3. **قاعدة البيانات والإشعارات السحابية**:
   - Firestore و Firebase Cloud Messaging (FCM) عبر ملف `firebase-applet-config.json` و `src/services/firebaseClient.ts`.
