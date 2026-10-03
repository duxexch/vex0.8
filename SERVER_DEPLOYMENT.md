# 🚀 VEX Deals - Production Server Deployment & Run Guide
# دليل الرفع والتشغيل على السيرفر (بيئة الإنتاج)

---

## ⚡ التشغيل الفوري بأمر واحد فقط (Single Script Execution)

يمكنك تشغيل المشروع بالكامل في بيئة الإنتاج (Production) بواسطة أمر واحد ينفذ:
1. فحص وتثبيت المكتبات المطلوبة.
2. إنشاء مجلد التخزين الدائم للمحافظ والشركات (`./data`).
3. بناء واجهة React Vite وحزم خادم Node.js / Express بواسطة esbuild في مسار `dist/server.cjs`.
4. التحقق من سلامة ملفات الإنتاج وتفعيل خادم الإشعارات التلقائي في الخلفية (Background Worker Daemon).
5. تشغيل السيرفر على المنفذ `3000`.

### الطريقة الأولى: عبر Bash Script مباشرة
```bash
chmod +x ./start-production.sh
./start-production.sh
```

### الطريقة الثانية: عبر npm
```bash
npm run prod
```

---

## 🔐 لوحة الإدارة المنفصلة (Standalone Admin Dashboard)

- **الرابط المباشر للوحة الإدارة:**
  `http://YOUR_SERVER_IP:3000/admin`
  أو
  `http://YOUR_SERVER_IP:3000/#admin`

- **رمز الأمان الافتراضي (Master PIN):**
  `7788`
  *(يمكن تغييره وتحديثه مباشرة من داخل لوحة التحكم عبر زر المفتاح 🔑)*

- **خصائص اللوحة المنفصلة:**
  1. **بوابة أمان PIN محمية بالكامل:** تمنع أي مستخدم عادي من الوصول للبيانات الحساسة أو المحافظ.
  2. **وضع ملء الشاشة المنفصل (Fullscreen Standalone Mode):** لوحة عمليات تشغيلية كاملة مستقلة عن واجهة العميل.
  3. **إمكانية التبديل بين النافذة المنفصلة والنافذة العائمة (Modal vs Standalone).**
  4. **زر قفل الجلسة الفوري (Lock/Logout)** لتأمين النظام عند الانتهاء.
  5. **مؤشر حالة الإنتاج المباشر:** يوضح الاتصال بالخادم والمنفذ 3000.

---

## 🐳 التشغيل عبر Docker و Docker Compose

### 1. تشغيل الحاوية عبر Docker Compose (موصى به):
```bash
docker-compose up -d --build
```

### 2. فحص السجلات (Logs):
```bash
docker-compose logs -f
```

### 3. إيقاف وإعادة تشغيل الحاوية:
```bash
docker-compose down
docker-compose up -d
```

> **ملاحظة هامة عن التخزين الدائم:** تم ربط مجلد `./data` من السيرفر بالحاوية (`./data:/app/data`) لضمان بقاء أي شركة جديدة أو تعديل على المحافظ والطلبات محفوظاً دائماً حتى بعد إعادة بناء الحاوية.

---

## 🛠️ التشغيل كخدمة خلفية دائمة على سيرفر Linux (PM2 أو Systemd)

### الخيار أ: عبر PM2 (موصى به لمديري الخوادم)
```bash
# تثبيت PM2 إن لم يكن مثبتاً
npm install -g pm2

# بناء المشروع أولاً
npm run build

# تشغيل السيرفر بواسطة PM2
pm2 start dist/server.cjs --name "vex-deals" --env NODE_ENV=production

# حفظ الإعدادات لتعمل تلقائياً عند إعادة تشغيل السيرفر
pm2 save
pm2 startup
```

### الخيار ب: خدمة Systemd (`/etc/systemd/system/vex.service`)
```ini
[Unit]
Description=VEX Deals Production Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/vex-deals
ExecStart=/usr/bin/bash /var/www/vex-deals/start-production.sh
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```
ثم تفعيلها:
```bash
sudo systemctl daemon-reload
sudo systemctl enable vex
sudo systemctl start vex
```

---

## 🩺 روابط التحقق والفحص الصحي (Health Endpoints)

| المسار | الوظيفة | الصلاحية |
| :--- | :--- | :--- |
| `http://localhost:3000/` | تطبيق العميل الرئيسي (VEX Deals Web App) | عام |
| `http://localhost:3000/admin` | لوحة التحكم المركزية المنفصلة | محمية برمز PIN (7788) |
| `http://localhost:3000/api/health` | فحص صحة واستجابة السيرفر ومحرك الإشعارات | عام |
| `http://localhost:3000/api/companies` | واجهة جلب وتحديث الشركات والشراكات | مؤمنة |
| `http://localhost:3000/api/wallets` | واجهة أرصدة ومحافظ المستفيدين | مؤمنة |
