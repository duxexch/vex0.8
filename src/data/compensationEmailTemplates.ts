import {
  CompensationEmailTemplate,
  CompensationEmailPlaceholder,
  CompensationRequest,
  Company,
  Wallet,
} from '../types';

export const COMPENSATION_PLACEHOLDERS: CompensationEmailPlaceholder[] = [
  // User Balance Placeholders
  {
    key: '{{user_balance}}',
    label: 'إجمالي رصيد المحفظة',
    label_en: 'Total Wallet Balance',
    category: 'balance',
    example: '$350.00',
    description: 'المجموع الكلي للرصيد المتاح والمجمد للمستخدم',
  },
  {
    key: '{{available_balance}}',
    label: 'الرصيد المتاح للسحب والتحويل',
    label_en: 'Available Balance',
    category: 'balance',
    example: '$150.00',
    description: 'الرصيد النشط الجاهز للسحب أو التحويل الفوري',
  },
  {
    key: '{{frozen_balance}}',
    label: 'الرصيد المجمد المتبقي',
    label_en: 'Remaining Frozen Balance',
    category: 'balance',
    example: '$200.00',
    description: 'الرصيد المجمد بانتظار إيداع فك التجميد (1:1)',
  },
  {
    key: '{{approved_amount}}',
    label: 'المبلغ المعتمد في هذا الطلب',
    label_en: 'Approved Amount',
    category: 'balance',
    example: '$50.00',
    description: 'المبلغ المالي الذي تم اعتماده بالطلب الحالي',
  },
  {
    key: '{{currency}}',
    label: 'رمز العملة',
    label_en: 'Currency Code / Symbol',
    category: 'balance',
    example: '$',
    description: 'رمز العملة المعتمدة في النظام (افتراضياً $ أو USD)',
  },
  {
    key: '{{account_number}}',
    label: 'رقم حساب اللاعب لدى الشركة',
    label_en: 'Player Bookmaker Account ID',
    category: 'balance',
    example: '98451203',
    description: 'رقم الحساب المعرف للاعب في منصة المراهنات',
  },
  {
    key: '{{user_id}}',
    label: 'معرف المستخدم في VEX',
    label_en: 'VEX User ID',
    category: 'balance',
    example: 'WCm5x8k2ab3f',
    description: 'المعرف الفريد لحساب المستخدم في منصة VEX Deals',
  },
  {
    key: '{{recipient_email}}',
    label: 'البريد الإلكتروني للمستلم',
    label_en: 'Recipient Email Address',
    category: 'balance',
    example: 'player@example.com',
    description: 'عنوان البريد الإلكتروني الموجه إليه الإشعار',
  },
  {
    key: '{{unfreeze_ratio}}',
    label: 'نسبة فك التجميد',
    label_en: 'Unfreeze Match Ratio',
    category: 'balance',
    example: '1:1',
    description: 'نسبة الإيداع المقابل لفك التجميد (1:1 مباشر)',
  },

  // Company Details Placeholders
  {
    key: '{{company_name}}',
    label: 'اسم الشركة / الوكالة',
    label_en: 'Company / Sportsbook Name',
    category: 'company',
    example: '1XBET',
    description: 'الاسم الرسمي لشركة المراهنات المرتبطة بالطلب',
  },
  {
    key: '{{company_promo_code}}',
    label: 'كود البرومو المعتمد للشركة',
    label_en: 'Official Promo Code',
    category: 'company',
    example: 'vexwallet',
    description: 'كود الوكالة التابع لمنصة VEX للحصول على المزايا',
  },
  {
    key: '{{company_bonus_text}}',
    label: 'نص المكافأة والبونص الحصري',
    label_en: 'Bonus Perks & Offers',
    category: 'company',
    example: 'استرداد يصل لـ 100% + بونص 130%',
    description: 'العرض النشط أو البونص الترويجي للشركة',
  },
  {
    key: '{{company_affiliate_link}}',
    label: 'رابط تسجيل الشريك المعتمد',
    label_en: 'Direct Affiliate Link',
    category: 'company',
    example: 'https://1xbet.com/partner',
    description: 'الرابط المباشر لمنصة الشريك للاستفادة من المزايا',
  },
  {
    key: '{{company_app_link}}',
    label: 'رابط تطبيق الشركة',
    label_en: 'Partner App Download Link',
    category: 'company',
    example: 'https://vexdeals.com/download',
    description: 'رابط تنزيل تطبيق الشريك الرسمي للهاتف المحمول',
  },
  {
    key: '{{company_support_email}}',
    label: 'البريد الرسمي لدعم الشريك',
    label_en: 'Partner Support Email',
    category: 'company',
    example: 'support@vexdeals.com',
    description: 'عنوان التواصل لخدمة العملاء والدعم الفني المباشر',
  },
  {
    key: '{{company_type}}',
    label: 'تصنيف الشريك',
    label_en: 'Partner Category',
    category: 'company',
    example: 'Sportsbook & Casino VIP',
    description: 'نوع المنصة (مراهنات رياضية، كازينو، أو كلاهما)',
  },
  {
    key: '{{company_color}}',
    label: 'لون هوية الشركة الأساسي',
    label_en: 'Brand Primary Color',
    category: 'company',
    example: '#0d579b',
    description: 'الرمز اللوني المعتمد لعلامة الشركة التجارية',
  },

  // Request & Audit Placeholders
  {
    key: '{{request_id}}',
    label: 'رقم مرجع الطلب',
    label_en: 'Request Reference ID',
    category: 'request',
    example: 'REQ-92104',
    description: 'رقم السجل الفريد للطلب المعتمد في قاعدة البيانات',
  },
  {
    key: '{{request_type}}',
    label: 'نوع طلب التعويض',
    label_en: 'Compensation Type',
    category: 'request',
    example: 'تعويض خسارة رهان',
    description: 'تصنيف المعاملة (تعويض خسارة أو فك تجميد 1:1)',
  },
  {
    key: '{{bet_slip_id}}',
    label: 'رقم قسيمة الرهان / إشعار الإيداع',
    label_en: 'Bet Slip ID / Deposit Ref',
    category: 'request',
    example: '1XB-9941028',
    description: 'رقم القسيمة المدققة أو المعرف المرجعي لعملية الإيداع',
  },
  {
    key: '{{approval_date}}',
    label: 'تاريخ ووقت الاعتماد',
    label_en: 'Approval Timestamp',
    category: 'request',
    example: new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    description: 'التوقيت الدقيق لمصادقة واعتماد الطلب من قبل الإدارة',
  },
  {
    key: '{{admin_agent}}',
    label: 'اسم مراجع الاعتماد / المدقق',
    label_en: 'Reviewing Auditor / Officer',
    category: 'request',
    example: 'VEX Financial Compliance Officer',
    description: 'اسم أو صفة المسؤول الإداري الذي باشر الاعتماد',
  },

  // Platform Placeholders
  {
    key: '{{platform_name}}',
    label: 'اسم المنصة',
    label_en: 'Platform Name',
    category: 'platform',
    example: 'VEX Deals VIP',
    description: 'الاسم الرسمي لمنصة إدارة التعويضات والولاء',
  },
];

export const DEFAULT_COMPENSATION_EMAIL_TEMPLATES: CompensationEmailTemplate[] = [
  // 1. Loss Compensation Approved (Arabic)
  {
    id: 'tmpl-ar-loss-approved',
    name: 'إشعار اعتماد تعويض خسارة رهان (رسمي)',
    name_ar: 'إشعار اعتماد تعويض خسارة رهان (رسمي)',
    type: 'loss_compensation',
    is_default: true,
    subject: '✅ تم اعتماد طلب التعويض الخاص بك بمبلغ {{currency}}{{approved_amount}} - {{company_name}}',
    preheader: 'تم تدقيق قسيمة الرهان وإيداع التعويض في رصيدك بمحفظة {{platform_name}}.',
    body_text: `عزيزي عميل {{platform_name}} المحترم،

يسرنا إبلاغك بأنه تم فحص وتدقيق طلب التعويض رقم #{{request_id}} بنجاح من قِبل إدارة التدقيق والامتثال المالي.

تفاصيل الاعتماد:
- الشركة الشريكة: {{company_name}}
- رقم حسابك بالشركة: {{account_number}}
- رقم قسيمة الرهان: {{bet_slip_id}}
- المبلغ المعتمد المضاف: {{currency}}{{approved_amount}}
- تاريخ الاعتماد: {{approval_date}}

حالة رصيدك الحالية:
- إجمالي الرصيد: {{currency}}{{user_balance}}
- الرصيد المتاح للسحب الفوري: {{currency}}{{available_balance}}
- الرصيد المجمد: {{currency}}{{frozen_balance}}

💡 تذكير بآلية فك التجميد ({{unfreeze_ratio}}):
يمكنك تحويل رصيدك المجمد إلى رصيد متاح للسحب والتحويل فوراً عبر إجراء إيداع ترويجي مطابق بنفس القيمة واستخدام كود الوكالة المعتمد: {{company_promo_code}}.

مزاياك الحصرية لدى {{company_name}}:
- العرض النشط: {{company_bonus_text}}
- كود البرومو الخاص بك: {{company_promo_code}}
- رابط الشريك المعتمد: {{company_affiliate_link}}

لأي استفسار أو مساعدة، يمكنك التواصل مع فريق الدعم على {{company_support_email}}.

مع خالص التحية،
إدارة الامتثال والتعويضات المالية | {{platform_name}}`,
    body_html: `<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 620px; margin: 0 auto; background-color: #0f172a; color: #f8fafc; border-radius: 16px; overflow: hidden; border: 1px solid #1e293b; direction: rtl; text-align: right;">
  <!-- Header Banner -->
  <div style="background: linear-gradient(135deg, #065f46 0%, #047857 50%, #0f766e 100%); padding: 28px 24px; text-align: center; border-bottom: 2px solid #10b981;">
    <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.15); padding: 8px 18px; border-radius: 20px; margin-bottom: 12px; font-size: 12px; font-weight: bold; letter-spacing: 0.5px; color: #d1fae5;">
      🛡️ إشعار اعتماد مالي رسمي
    </div>
    <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: #ffffff;">
      تم اعتماد طلب التعويض بنجاح
    </h1>
    <p style="margin: 6px 0 0 0; font-size: 13px; color: #a7f3d0;">
      مرجع المعاملة: #{{request_id}} | {{company_name}}
    </p>
  </div>

  <!-- Body Content -->
  <div style="padding: 24px;">
    <p style="font-size: 14px; line-height: 1.7; color: #e2e8f0; margin-top: 0;">
      مرحباً <strong>عزيزنا العميل</strong>،<br>
      يسر فريق الامتثال والتدقيق المالي في <strong>{{platform_name}}</strong> إبلاغك باكتمال مطابقة قسيمة الرهان الخاصة بك رقم <strong>#{{bet_slip_id}}</strong> لحسابك لدى <strong>{{company_name}}</strong>، وتم اعتماد مبلغ التعويض وإضافته لحسابك.
    </p>

    <!-- Financial Breakdown Card -->
    <div style="background-color: #1e293b; border-radius: 12px; padding: 18px; margin: 20px 0; border: 1px solid #334155;">
      <h3 style="margin: 0 0 14px 0; font-size: 13px; color: #38bdf8; text-transform: uppercase; font-weight: bold; display: flex; align-items: center; gap: 6px;">
        📊 كشف بيانات المحفظة والرصيد المعتمد
      </h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tr style="border-bottom: 1px solid #334155;">
          <td style="padding: 10px 0; color: #94a3b8;">المبلغ المعتمد في هذا الطلب:</td>
          <td style="padding: 10px 0; font-weight: 900; color: #34d399; font-size: 16px; text-align: left; font-family: monospace;">+{{currency}}{{approved_amount}}</td>
        </tr>
        <tr style="border-bottom: 1px solid #334155;">
          <td style="padding: 10px 0; color: #94a3b8;">رقم حسابك لدى {{company_name}}:</td>
          <td style="padding: 10px 0; font-weight: bold; color: #f1f5f9; text-align: left; font-family: monospace;">{{account_number}}</td>
        </tr>
        <tr style="border-bottom: 1px solid #334155;">
          <td style="padding: 10px 0; color: #94a3b8;">الرصيد المتاح للسحب والتحويل:</td>
          <td style="padding: 10px 0; font-weight: bold; color: #38bdf8; text-align: left; font-family: monospace;">{{currency}}{{available_balance}}</td>
        </tr>
        <tr style="border-bottom: 1px solid #334155;">
          <td style="padding: 10px 0; color: #94a3b8;">الرصيد المجمد (بانتظار فك التجميد):</td>
          <td style="padding: 10px 0; font-weight: bold; color: #f59e0b; text-align: left; font-family: monospace;">{{currency}}{{frozen_balance}}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #cbd5e1; font-weight: bold;">إجمالي رصيد المحفظة:</td>
          <td style="padding: 10px 0; font-weight: 900; color: #ffffff; text-align: left; font-size: 15px; font-family: monospace;">{{currency}}{{user_balance}}</td>
        </tr>
      </table>
    </div>

    <!-- 1:1 Unfreeze Mechanism Guidance -->
    <div style="background: rgba(16, 185, 129, 0.08); border-right: 4px solid #10b981; padding: 14px 16px; border-radius: 8px; margin: 20px 0;">
      <h4 style="margin: 0 0 6px 0; font-size: 13px; color: #34d399; font-weight: bold;">
        🔓 كيفية فك تجميد الرصيد ({{unfreeze_ratio}}):
      </h4>
      <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #cbd5e1;">
        لتحويل الرصيد المجمد إلى رصيد متاح جاهز للسحب الفوري أو التحويل، قم بإيداع مباشر مطابق (1:1) عبر حسابك لدى <strong>{{company_name}}</strong> وسيقوم النظام الذكي بفك التجميد آلياً فور تسجيل الإيداع.
      </p>
    </div>

    <!-- Partner Perks Box -->
    <div style="background-color: #020617; border: 1px dashed #475569; border-radius: 12px; padding: 16px; text-align: center; margin: 20px 0;">
      <span style="font-size: 11px; color: #94a3b8; display: block; margin-bottom: 4px;">كود الوكالة والبرومو الحصري المعتمد</span>
      <span style="font-size: 18px; font-weight: 900; letter-spacing: 2px; color: #fbbf24; background-color: rgba(251, 191, 36, 0.1); padding: 4px 16px; border-radius: 8px; display: inline-block; font-family: monospace; border: 1px solid rgba(251, 191, 36, 0.3);">
        {{company_promo_code}}
      </span>
      <p style="margin: 8px 0 0 0; font-size: 12px; color: #94a3b8;">
        {{company_bonus_text}}
      </p>
    </div>

    <!-- CTA Button -->
    <div style="text-align: center; margin: 26px 0 16px 0;">
      <a href="{{company_affiliate_link}}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: bold; font-size: 14px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
        فتح محفظتي في {{platform_name}} ➔
      </a>
    </div>

    <p style="font-size: 11px; color: #64748b; line-height: 1.5; margin-top: 24px; border-top: 1px solid #1e293b; padding-top: 14px; text-align: center;">
      تمت المراجعة والاعتماد آلياً بواسطة <strong>{{admin_agent}}</strong> بتاريخ {{approval_date}}.<br>
      إذا كانت لديك أي استفسارات، يمكنك مراسلتنا على <a href="mailto:{{company_support_email}}" style="color: #38bdf8; text-decoration: none;">{{company_support_email}}</a>.
    </p>
  </div>
</div>`,
    created_at: new Date().toISOString(),
  },

  // 2. Deposit Unfreeze Approved (Arabic)
  {
    id: 'tmpl-ar-unfreeze-approved',
    name: 'إشعار اعتماد فك تجميد الرصيد 1:1 (متاح للسحب)',
    name_ar: 'إشعار اعتماد فك تجميد الرصيد 1:1 (متاح للسحب)',
    type: 'deposit_unfreeze',
    is_default: true,
    subject: '🔓 تهانينا! تم فك تجميد رصيدك بالكامل بمبلغ {{currency}}{{approved_amount}} - جاهز للتحويل والسحب',
    preheader: 'تم تأكيد إيداع فك التجميد بنجاح وتحويل المبلغ فوراً إلى رصيدك المتاح للسحب.',
    body_text: `مرحباً بك عزيزنا عميل {{platform_name}}،

يسرنا إشعارك باكتمال مطابقة إيداع فك التجميد (1:1) الخاص بطلبك رقم #{{request_id}}.

تفاصيل العملية:
- الشركة المودع بها: {{company_name}}
- رقم حسابك: {{account_number}}
- رقم الإشعار / القسيمة: {{bet_slip_id}}
- المبلغ المفكوك والمتاح فوراً: {{currency}}{{approved_amount}}
- الرصيد المتاح الحالي: {{currency}}{{available_balance}}
- الرصيد المجمد المتبقي: {{currency}}{{frozen_balance}}
- إجمالي الرصيد: {{currency}}{{user_balance}}

يمكنك الآن سحب رصيدك أو استخدامه في التحويلات المباشرة إلى أي شركة أخرى أو لاعب آخر.

كود البرومو الحصري: {{company_promo_code}}
دعم العملاء: {{company_support_email}}

مع أطيب التمنيات،
إدارة العمليات المالية | {{platform_name}}`,
    body_html: `<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 620px; margin: 0 auto; background-color: #0f172a; color: #f8fafc; border-radius: 16px; overflow: hidden; border: 1px solid #1e293b; direction: rtl; text-align: right;">
  <!-- Header Banner -->
  <div style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #0284c7 100%); padding: 28px 24px; text-align: center; border-bottom: 2px solid #38bdf8;">
    <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); padding: 8px 18px; border-radius: 20px; margin-bottom: 12px; font-size: 12px; font-weight: bold; color: #ffffff;">
      🔓 رصيد حر متاح للسحب والتحويل
    </div>
    <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: #ffffff;">
      تم فك تجميد الرصيد (1:1) بنجاح
    </h1>
    <p style="margin: 6px 0 0 0; font-size: 13px; color: #bfdbfe;">
      تمت مطابقة الإيداع واعتماد الرصيد فوراً بحسابك لدى {{company_name}}
    </p>
  </div>

  <!-- Body Content -->
  <div style="padding: 24px;">
    <p style="font-size: 14px; line-height: 1.7; color: #e2e8f0; margin-top: 0;">
      تهانينا <strong>عزيزنا اللاعب</strong>،<br>
      تم التحقق من إيداعك المباشر بنجاح، وتم فك تجميد مبلغ <strong>{{currency}}{{approved_amount}}</strong> بنسبة 1:1 كاملة وتحويله فوراً إلى <strong>الرصيد المتاح للسحب</strong>.
    </p>

    <!-- Balance Status Card -->
    <div style="background-color: #1e293b; border-radius: 12px; padding: 18px; margin: 20px 0; border: 1px solid #334155;">
      <h3 style="margin: 0 0 14px 0; font-size: 13px; color: #38bdf8; font-weight: bold;">
        💎 الأرصدة المحدثة فورياً
      </h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
        <div style="background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 10px; padding: 12px; text-align: center;">
          <span style="font-size: 11px; color: #86efac; display: block;">الرصيد المتاح للسحب</span>
          <span style="font-size: 20px; font-weight: 900; color: #4ade80; font-family: monospace;">{{currency}}{{available_balance}}</span>
        </div>
        <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 10px; padding: 12px; text-align: center;">
          <span style="font-size: 11px; color: #fde68a; display: block;">الرصيد المجمد المتبقي</span>
          <span style="font-size: 20px; font-weight: 900; color: #fbbf24; font-family: monospace;">{{currency}}{{frozen_balance}}</span>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 12px; color: #94a3b8;">
        <tr style="border-top: 1px solid #334155;">
          <td style="padding: 8px 0;">رقم المعاملة المرجعي:</td>
          <td style="padding: 8px 0; text-align: left; font-family: monospace; color: #f8fafc;">#{{request_id}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;">رقم حسابك بالشركة:</td>
          <td style="padding: 8px 0; text-align: left; font-family: monospace; color: #f8fafc;">{{account_number}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;">تاريخ التنفيذ:</td>
          <td style="padding: 8px 0; text-align: left; font-family: monospace; color: #f8fafc;">{{approval_date}}</td>
        </tr>
      </table>
    </div>

    <!-- Transfer Action Guidance -->
    <div style="text-align: center; margin: 26px 0 16px 0;">
      <a href="{{company_affiliate_link}}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: bold; font-size: 14px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);">
        سحب أو تحويل الرصيد المتاح ➔
      </a>
    </div>

    <div style="background-color: #020617; border-radius: 8px; padding: 12px; text-align: center; font-size: 11px; color: #64748b;">
      كود الوكالة المعتمد: <strong style="color: #38bdf8;">{{company_promo_code}}</strong> | منصة <strong>{{platform_name}}</strong>
    </div>
  </div>
</div>`,
    created_at: new Date().toISOString(),
  },

  // 3. VIP Loyalty Bonus & Compensation (Arabic)
  {
    id: 'tmpl-ar-vip-bonus',
    name: 'إشعار اعتماد ترقية VIP وبونص الولاء الحصري',
    name_ar: 'إشعار اعتماد ترقية VIP وبونص الولاء الحصري',
    type: 'vip_bonus',
    is_default: false,
    subject: '🌟 إشعار رسمي: اعتماد بونص VIP إضافي بقيمة {{currency}}{{approved_amount}} في محفظتك',
    preheader: 'بصفتك عضواً مميزاً في VEX Deals VIP، تمت ترقية حسابك وإضافة مكافأة الولاء.',
    body_text: `تحية طيبة عضو برنامج النخبة VIP في {{platform_name}}،

يسعدنا إبلاغك باعتماد مكافأة الولاء الحصرية بقيمة {{currency}}{{approved_amount}} لحسابك المرتبط بشركة {{company_name}}.

ملخص الحساب:
- كود الحساب: {{account_number}}
- الرصيد الإجمالي: {{currency}}{{user_balance}}
- الرصيد المتاح: {{currency}}{{available_balance}}
- كود البرومو الخاص بك: {{company_promo_code}}

استمتع بأعلى نسبة استرداد وخدمة عملاء ذات أولوية فائقة على مدار الساعة.

إدارة كبار العملاء VIP | {{platform_name}}`,
    body_html: `<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 620px; margin: 0 auto; background-color: #0b0f19; color: #f8fafc; border-radius: 16px; overflow: hidden; border: 1px solid #332005; direction: rtl; text-align: right;">
  <div style="background: linear-gradient(135deg, #78350f 0%, #b45309 50%, #d97706 100%); padding: 28px 24px; text-align: center; border-bottom: 2px solid #f59e0b;">
    <div style="display: inline-block; background-color: rgba(0, 0, 0, 0.3); padding: 6px 18px; border-radius: 20px; margin-bottom: 12px; font-size: 12px; font-weight: bold; color: #fef3c7;">
      👑 نادي كبار العملاء VEX VIP CLUB
    </div>
    <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: #ffffff;">
      اعتماد بونص الولاء الحصري
    </h1>
    <p style="margin: 6px 0 0 0; font-size: 13px; color: #fde68a;">
      تمت ترقية مكافأتك وإيداع {{currency}}{{approved_amount}} بنجاح
    </p>
  </div>
  <div style="padding: 24px;">
    <p style="font-size: 14px; line-height: 1.7; color: #e2e8f0; margin-top: 0;">
      عزيزنا عضو النخبة VIP، تقديراً لثقتكم ومشاركتكم في <strong>{{platform_name}}</strong>، تم اعتماد وإيداع بونص التعويض والولاء في رصيد محفظتك لدى <strong>{{company_name}}</strong>.
    </p>
    <div style="background-color: #1e1e24; border-radius: 12px; padding: 18px; margin: 20px 0; border: 1px solid #452b0c;">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tr style="border-bottom: 1px solid #2d261b;">
          <td style="padding: 10px 0; color: #d4d4d8;">المكافأة المعتمدة:</td>
          <td style="padding: 10px 0; font-weight: 900; color: #f59e0b; font-size: 16px; text-align: left; font-family: monospace;">{{currency}}{{approved_amount}}</td>
        </tr>
        <tr style="border-bottom: 1px solid #2d261b;">
          <td style="padding: 10px 0; color: #d4d4d8;">الرصيد المتاح:</td>
          <td style="padding: 10px 0; font-weight: bold; color: #34d399; text-align: left; font-family: monospace;">{{currency}}{{available_balance}}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #d4d4d8;">كود الترقية المعتمد:</td>
          <td style="padding: 10px 0; font-weight: bold; color: #fde68a; text-align: left; font-family: monospace;">{{company_promo_code}}</td>
        </tr>
      </table>
    </div>
    <div style="text-align: center; margin: 24px 0 10px 0;">
      <a href="{{company_affiliate_link}}" style="display: inline-block; background: linear-gradient(135deg, #d97706 0%, #b45309 100%); color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: bold; font-size: 14px;">
        عرض محفظة VIP الآن ➔
      </a>
    </div>
  </div>
</div>`,
    created_at: new Date().toISOString(),
  },

  // 4. English Loss Compensation Approval
  {
    id: 'tmpl-en-loss-approved',
    name: 'English - Loss Compensation Approval Notice',
    name_ar: 'النسخة الإنجليزية - إشعار اعتماد التعويض',
    type: 'loss_compensation',
    is_default: false,
    subject: '✅ Compensation Approved: {{currency}}{{approved_amount}} credited to your {{company_name}} account',
    preheader: 'Your bet slip #{{bet_slip_id}} has been audited and approved in your VEX wallet.',
    body_text: `Dear Valued Customer,

We are pleased to inform you that your compensation request #{{request_id}} has been audited and approved by the VEX Deals Financial Compliance Team.

Approval Breakdown:
- Partner Bookmaker: {{company_name}}
- Player Account ID: {{account_number}}
- Bet Slip ID: {{bet_slip_id}}
- Approved Amount: {{currency}}{{approved_amount}}
- Approval Date: {{approval_date}}

Current Wallet Balances:
- Total Balance: {{currency}}{{user_balance}}
- Available for Withdrawal: {{currency}}{{available_balance}}
- Remaining Frozen: {{currency}}{{frozen_balance}}

1:1 Unfreeze Mechanism:
To unlock your remaining frozen balance into 100% available cash, make a matching deposit using official promo code: {{company_promo_code}}.

For inquiries, contact our support desk at {{company_support_email}}.

Best regards,
Financial Compliance & Risk Audit Desk | {{platform_name}}`,
    body_html: `<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 620px; margin: 0 auto; background-color: #0f172a; color: #f8fafc; border-radius: 16px; overflow: hidden; border: 1px solid #1e293b; direction: ltr; text-align: left;">
  <div style="background: linear-gradient(135deg, #065f46 0%, #047857 50%, #0f766e 100%); padding: 28px 24px; text-align: center; border-bottom: 2px solid #10b981;">
    <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.15); padding: 8px 18px; border-radius: 20px; margin-bottom: 12px; font-size: 12px; font-weight: bold; color: #d1fae5;">
      🛡️ OFFICIAL AUDIT CONFIRMATION
    </div>
    <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: #ffffff;">
      Compensation Request Approved
    </h1>
    <p style="margin: 6px 0 0 0; font-size: 13px; color: #a7f3d0;">
      Reference: #{{request_id}} | {{company_name}}
    </p>
  </div>
  <div style="padding: 24px;">
    <p style="font-size: 14px; line-height: 1.7; color: #e2e8f0; margin-top: 0;">
      Hello <strong>Valued Player</strong>,<br>
      Your compensation request for bet slip <strong>#{{bet_slip_id}}</strong> under bookmaker account <strong>#{{account_number}}</strong> has been approved. The credited funds are reflected in your account ledger.
    </p>
    <div style="background-color: #1e293b; border-radius: 12px; padding: 18px; margin: 20px 0; border: 1px solid #334155;">
      <h3 style="margin: 0 0 14px 0; font-size: 13px; color: #38bdf8; text-transform: uppercase; font-weight: bold;">
        📊 Financial Breakdown
      </h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tr style="border-bottom: 1px solid #334155;">
          <td style="padding: 10px 0; color: #94a3b8;">Approved Amount:</td>
          <td style="padding: 10px 0; font-weight: 900; color: #34d399; font-size: 16px; text-align: right; font-family: monospace;">+{{currency}}{{approved_amount}}</td>
        </tr>
        <tr style="border-bottom: 1px solid #334155;">
          <td style="padding: 10px 0; color: #94a3b8;">Available Balance:</td>
          <td style="padding: 10px 0; font-weight: bold; color: #38bdf8; text-align: right; font-family: monospace;">{{currency}}{{available_balance}}</td>
        </tr>
        <tr style="border-bottom: 1px solid #334155;">
          <td style="padding: 10px 0; color: #94a3b8;">Frozen Balance:</td>
          <td style="padding: 10px 0; font-weight: bold; color: #f59e0b; text-align: right; font-family: monospace;">{{currency}}{{frozen_balance}}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #cbd5e1; font-weight: bold;">Total Balance:</td>
          <td style="padding: 10px 0; font-weight: 900; color: #ffffff; text-align: right; font-size: 15px; font-family: monospace;">{{currency}}{{user_balance}}</td>
        </tr>
      </table>
    </div>
    <div style="text-align: center; margin: 26px 0 16px 0;">
      <a href="{{company_affiliate_link}}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: bold; font-size: 14px;">
        Open {{platform_name}} Wallet ➔
      </a>
    </div>
    <p style="font-size: 11px; color: #64748b; line-height: 1.5; margin-top: 24px; border-top: 1px solid #1e293b; padding-top: 14px; text-align: center;">
      Audited and logged by <strong>{{admin_agent}}</strong> on {{approval_date}}.<br>
      Official Promo Code: <strong style="color: #38bdf8;">{{company_promo_code}}</strong> | Support: {{company_support_email}}
    </p>
  </div>
</div>`,
    created_at: new Date().toISOString(),
  },

  // 5. English 1:1 Deposit Unfreeze Confirmation
  {
    id: 'tmpl-en-unfreeze-approved',
    name: 'English - 1:1 Deposit Unfreeze Confirmation',
    name_ar: 'النسخة الإنجليزية - تأكيد فك التجميد 1:1',
    type: 'deposit_unfreeze',
    is_default: false,
    subject: '🔓 Funds Unfrozen: {{currency}}{{approved_amount}} is now Available for Withdrawal',
    preheader: 'Your 1:1 matching deposit was verified. Balance is now 100% unlocked.',
    body_text: `Congratulations!

Your 1:1 deposit matching request #{{request_id}} has been verified.

The amount of {{currency}}{{approved_amount}} has been unlocked from your frozen funds and is now fully available for immediate withdrawal or peer transfer.

Account Summary:
- Bookmaker: {{company_name}}
- Account ID: {{account_number}}
- Available Balance: {{currency}}{{available_balance}}
- Remaining Frozen: {{currency}}{{frozen_balance}}
- Total Balance: {{currency}}{{user_balance}}

Best regards,
{{platform_name}} Operations`,
    body_html: `<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 620px; margin: 0 auto; background-color: #0f172a; color: #f8fafc; border-radius: 16px; overflow: hidden; border: 1px solid #1e293b; direction: ltr; text-align: left;">
  <div style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #0284c7 100%); padding: 28px 24px; text-align: center; border-bottom: 2px solid #38bdf8;">
    <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: #ffffff;">
      Balance Successfully Unfrozen
    </h1>
    <p style="margin: 6px 0 0 0; font-size: 13px; color: #bfdbfe;">
      1:1 matching completed for {{company_name}}
    </p>
  </div>
  <div style="padding: 24px;">
    <p style="font-size: 14px; line-height: 1.7; color: #e2e8f0; margin-top: 0;">
      Your deposit has been audited. <strong>{{currency}}{{approved_amount}}</strong> is now available for withdrawal.
    </p>
    <div style="background-color: #1e293b; border-radius: 12px; padding: 18px; margin: 20px 0; border: 1px solid #334155;">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tr style="border-bottom: 1px solid #334155;">
          <td style="padding: 8px 0; color: #94a3b8;">Available Cash:</td>
          <td style="padding: 8px 0; font-weight: 900; color: #4ade80; text-align: right; font-family: monospace;">{{currency}}{{available_balance}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #94a3b8;">Total Balance:</td>
          <td style="padding: 8px 0; font-weight: bold; color: #ffffff; text-align: right; font-family: monospace;">{{currency}}{{user_balance}}</td>
        </tr>
      </table>
    </div>
  </div>
</div>`,
    created_at: new Date().toISOString(),
  },
];

export interface PlaceholderContextParams {
  request: CompensationRequest;
  company?: Company;
  wallet?: Wallet;
  allWallets?: Wallet[];
  adminName?: string;
  recipientEmail?: string;
  currency?: string;
}

export function buildPlaceholderContext({
  request,
  company,
  wallet,
  allWallets = [],
  adminName = 'VEX Financial Compliance Officer',
  recipientEmail,
  currency = '$',
}: PlaceholderContextParams): Record<string, string> {
  const approvedAmount = Number(request.amount || 0);

  // Derive matching wallet or aggregate user balance
  const userWallets = allWallets.filter((w) => w.user_id === request.user_id);
  const companyWallet = wallet || userWallets.find((w) => w.company_id === request.company_id || w.company_name === request.company_name);

  const available = companyWallet ? companyWallet.available : userWallets.reduce((s, w) => s + w.available, 0);
  const frozen = companyWallet ? companyWallet.frozen : userWallets.reduce((s, w) => s + w.frozen, 0);
  const totalBalance = available + frozen;

  const isUnfreeze = request.id.startsWith('DEP-UNF-') || request.bet_slip_id?.startsWith('DEPOSIT-');
  const fallbackEmail = recipientEmail || `${(request.user_id || 'user').toLowerCase().replace(/[^a-z0-9]/g, '')}@gmail.com`;

  const approvalDate = request.reviewed_at
    ? new Date(request.reviewed_at).toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

  return {
    // User Balances
    '{{user_balance}}': `${totalBalance.toFixed(2)}`,
    '{{available_balance}}': `${available.toFixed(2)}`,
    '{{frozen_balance}}': `${frozen.toFixed(2)}`,
    '{{approved_amount}}': `${approvedAmount.toFixed(2)}`,
    '{{currency}}': currency,
    '{{account_number}}': request.account_number || 'N/A',
    '{{user_id}}': request.user_id || 'U-VIP-MEMBER',
    '{{recipient_email}}': fallbackEmail,
    '{{unfreeze_ratio}}': '1:1',

    // Company Details
    '{{company_name}}': company?.name || request.company_name || 'VEX Partner Bookmaker',
    '{{company_promo_code}}': company?.promo_code || 'vexwallet',
    '{{company_bonus_text}}': company?.bonus_text || company?.bonus_text_en || 'استرداد يصل لـ 100% + بونص 130%',
    '{{company_affiliate_link}}': company?.affiliate_link || company?.app_link || 'https://vexdeals.com',
    '{{company_app_link}}': company?.app_link || 'https://vexdeals.com/download',
    '{{company_support_email}}': 'support@vexdeals.com',
    '{{company_type}}': company?.type === 'casino' ? 'كازينو معتمد' : company?.type === 'sports' ? 'مراهنات رياضية' : 'مراهنات رياضية وكازينو VIP',
    '{{company_color}}': company?.color || '#10b981',

    // Request Details
    '{{request_id}}': request.id,
    '{{request_type}}': isUnfreeze ? 'فك تجميد إيداع 1:1' : 'تعويض خسارة رهان',
    '{{bet_slip_id}}': request.bet_slip_id || request.account_number || 'SLIP-VERIFIED',
    '{{approval_date}}': approvalDate,
    '{{admin_agent}}': request.reviewed_by || adminName,

    // Platform
    '{{platform_name}}': 'VEX Deals VIP',
  };
}

export function resolvePlaceholders(templateText: string, context: Record<string, string>): string {
  if (!templateText) return '';
  let resolved = templateText;
  Object.entries(context).forEach(([key, val]) => {
    // Replace all occurrences of key
    resolved = resolved.split(key).join(val ?? '');
  });
  return resolved;
}
