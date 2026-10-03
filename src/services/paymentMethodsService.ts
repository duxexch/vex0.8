import { collection, doc, setDoc, getDocs, deleteDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebaseClient';
import { PaymentMethod } from '../types';

export const DEFAULT_PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'pm_vodafone',
    name: 'فودافون كاش (Vodafone Cash)',
    nameAr: 'فودافون كاش',
    nameEn: 'Vodafone Cash',
    accountNumber: '01012345678',
    holderName: 'VEX Deals Official',
    instructions: 'قم بتحويل المبلغ المطلوب إلى رقم محفظة فودافون كاش الموضحة، ثم أدخل رقم هاتفك ورقم العملية في نموذج فك التجميد بالأسفل لتأكيد الإيداع 1:1.',
    instructionsAr: 'قم بتحويل المبلغ المطلوب إلى رقم محفظة فودافون كاش الموضحة، ثم أدخل رقم هاتفك ورقم العملية في نموذج فك التجميد بالأسفل لتأكيد الإيداع 1:1.',
    instructionsEn: 'Transfer the required amount to the Vodafone Cash wallet number above, then enter your sender phone and transaction ID in the form below.',
    descriptionAr: 'التحويل السريع والفوري عبر محفظة فودافون كاش المصرية',
    descriptionEn: 'Instant transfer via Vodafone Cash wallet',
    badge: 'محفظة إلكترونية',
    is_active: true,
  },
  {
    id: 'pm_instapay',
    name: 'إنستا باي (InstaPay IPN)',
    nameAr: 'إنستا باي (InstaPay)',
    nameEn: 'InstaPay IPN',
    accountNumber: 'vexdeals@instapay',
    holderName: 'VEX Deals Egypt',
    instructions: 'افتح تطبيق إنستاباي وأرسل التحويل المالي إلى عنوان الدفع اللحظي (IPA) الموضح أعلاه، ثم أدخل رقم المرجع البنكي في خانة الإيصال.',
    instructionsAr: 'افتح تطبيق إنستاباي وأرسل التحويل المالي إلى عنوان الدفع اللحظي (IPA) الموضح أعلاه، ثم أدخل رقم المرجع البنكي في خانة الإيصال.',
    instructionsEn: 'Open InstaPay app and send funds to the IPA address above. Save the bank reference number and paste it into the receipt field.',
    descriptionAr: 'شبكة المدفوعات اللحظية - تحويل فوري مجاني من أي حساب بنكي',
    descriptionEn: 'Instant payment network - free transfer from any bank account',
    badge: 'دفع لحظي IPN',
    is_active: true,
  },
  {
    id: 'pm_etisalat',
    name: 'اتصالات كاش (Etisalat Cash)',
    nameAr: 'اتصالات كاش',
    nameEn: 'Etisalat Cash',
    accountNumber: '01198765432',
    holderName: 'VEX Deals Official',
    instructions: 'حول المبلغ المحدد إلى محفظة اتصالات كاش، ثم سجل رقم الهاتف المرسل ورقم العملية.',
    instructionsAr: 'حول المبلغ المحدد إلى محفظة اتصالات كاش، ثم سجل رقم الهاتف المرسل ورقم العملية.',
    instructionsEn: 'Transfer the amount to the Etisalat Cash wallet and input your sender number and transaction ID.',
    descriptionAr: 'محفظة اتصالات كاش لاستلام وتحويل الأموال',
    descriptionEn: 'Etisalat Cash digital wallet',
    badge: 'محفظة إلكترونية',
    is_active: true,
  },
  {
    id: 'pm_orange',
    name: 'أورانج كاش (Orange Cash)',
    nameAr: 'أورانج كاش',
    nameEn: 'Orange Cash',
    accountNumber: '01233344455',
    holderName: 'VEX Deals Official',
    instructions: 'حول إلى رقم محفظة أورانج كاش وسجل تفاصيل الإيصال في طلب فك التجميد.',
    instructionsAr: 'حول إلى رقم محفظة أورانج كاش وسجل تفاصيل الإيصال في طلب فك التجميد.',
    instructionsEn: 'Transfer to the Orange Cash wallet and record your receipt details in the unfreeze form.',
    descriptionAr: 'محفظة أورانج كاش الرقمية المعتمدة',
    descriptionEn: 'Orange Cash digital wallet',
    badge: 'محفظة إلكترونية',
    is_active: true,
  },
  {
    id: 'pm_we',
    name: 'وي باي (WE Pay)',
    nameAr: 'وي باي (WE Pay)',
    nameEn: 'WE Pay',
    accountNumber: '01555667788',
    holderName: 'VEX Deals Official',
    instructions: 'أرسل المبلغ إلى محفظة WE Pay المعتمدة وأرفق رقم العملية.',
    instructionsAr: 'أرسل المبلغ إلى محفظة WE Pay المعتمدة وأرفق رقم العملية.',
    instructionsEn: 'Send the deposit to the official WE Pay wallet and attach your transaction number.',
    descriptionAr: 'محفظة المصرية للاتصالات WE Pay',
    descriptionEn: 'WE Pay digital wallet',
    badge: 'محفظة إلكترونية',
    is_active: true,
  },
  {
    id: 'pm_bank',
    name: 'تحويل بنكي محلي / ميزة (Bank / Meeza)',
    nameAr: 'تحويل بنكي محلي / ميزة',
    nameEn: 'Local Bank / Meeza',
    accountNumber: 'EG87000200012345678901',
    holderName: 'VEX Deals Financials',
    instructions: 'قم بعمل تحويل بنكي أو إيداع عبر الصراف الآلي (ATM) إلى رقم الحساب البنكي / الآيبان الموضح أعلاه، ثم أدخل رقم إيصال التحويل.',
    instructionsAr: 'قم بعمل تحويل بنكي أو إيداع عبر الصراف الآلي (ATM) إلى رقم الحساب البنكي / الآيبان الموضح أعلاه، ثم أدخل رقم إيصال التحويل.',
    instructionsEn: 'Execute a bank wire or ATM deposit to the IBAN above, then enter the transfer receipt reference in the field below.',
    descriptionAr: 'تحويل مباشر لأي حساب بنكي مصري أو بطاقة ميزة الوطنية',
    descriptionEn: 'Direct transfer to any Egyptian bank account or Meeza card',
    badge: 'حساب بنكي / آيبان',
    is_active: true,
  },
];

const FIRESTORE_COLLECTION = 'payment_methods';
const LOCAL_STORAGE_KEY = 'vex_payment_methods_cache';

/**
 * Fetch all payment methods from Firestore with fallback to localStorage & default seeds.
 */
export async function getPaymentMethodsFromFirestore(): Promise<PaymentMethod[]> {
  try {
    const fetchPromise = getDocs(collection(db, FIRESTORE_COLLECTION));
    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), 3500)
    );

    const snapshot = await Promise.race([fetchPromise, timeoutPromise]);
    if (snapshot && !snapshot.empty) {
      const methods: PaymentMethod[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as PaymentMethod;
        methods.push({
          ...data,
          id: docSnap.id,
          name: data.name || data.nameAr || data.nameEn || docSnap.id,
          instructions: data.instructions || data.instructionsAr || data.descriptionAr || '',
          is_active: data.is_active !== undefined ? Boolean(data.is_active) : true,
        });
      });
      // Cache locally
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(methods));
      }
      return methods;
    }
  } catch (error) {
    console.warn('[Firestore] Unable to fetch payment methods from Firestore:', error);
  }

  // Check local cache
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {}
    }
  }

  // If first time and empty, seed defaults to Firestore asynchronously and return them
  seedDefaultPaymentMethodsToFirestore().catch((err) =>
    console.warn('[Firestore] Could not auto-seed payment methods:', err)
  );

  return DEFAULT_PAYMENT_METHODS;
}

/**
 * Persist a single payment method to Firestore.
 */
export async function savePaymentMethodToFirestore(method: PaymentMethod): Promise<void> {
  const methodId = method.id || `pm_${Date.now()}`;
  const payload: PaymentMethod = {
    ...method,
    id: methodId,
    name: method.name || method.nameAr || 'New Payment Method',
    instructions: method.instructions || method.instructionsAr || '',
    is_active: method.is_active !== undefined ? Boolean(method.is_active) : true,
    updated_at: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, FIRESTORE_COLLECTION, methodId), payload, { merge: true });
    console.log(`[Firestore] Payment method ${methodId} successfully saved to Firestore.`);
  } catch (error) {
    console.warn(`[Firestore] Error saving payment method ${methodId}:`, error);
  }

  // Update local cache
  if (typeof window !== 'undefined') {
    try {
      const cachedStr = localStorage.getItem(LOCAL_STORAGE_KEY);
      let list: PaymentMethod[] = cachedStr ? JSON.parse(cachedStr) : [];
      const idx = list.findIndex((m) => m.id === methodId);
      if (idx >= 0) {
        list[idx] = payload;
      } else {
        list.push(payload);
      }
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
    } catch {}
  }
}

/**
 * Persist an entire list of payment methods to Firestore.
 */
export async function saveAllPaymentMethodsToFirestore(methods: PaymentMethod[]): Promise<void> {
  // Save each method to Firestore
  try {
    const promises = methods.map((m) => {
      const mId = m.id || `pm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const payload: PaymentMethod = {
        ...m,
        id: mId,
        name: m.name || m.nameAr || 'Payment Method',
        instructions: m.instructions || m.instructionsAr || '',
        is_active: m.is_active !== undefined ? Boolean(m.is_active) : true,
        updated_at: new Date().toISOString(),
      };
      return setDoc(doc(db, FIRESTORE_COLLECTION, mId), payload, { merge: true });
    });
    await Promise.all(promises);
    console.log('[Firestore] All payment methods successfully synchronized with Firestore.');
  } catch (error) {
    console.warn('[Firestore] Error syncing all payment methods:', error);
  }

  // Update local cache
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(methods));
  }
}

/**
 * Delete a payment method from Firestore.
 */
export async function deletePaymentMethodFromFirestore(methodId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, FIRESTORE_COLLECTION, methodId));
    console.log(`[Firestore] Payment method ${methodId} deleted from Firestore.`);
  } catch (error) {
    console.warn(`[Firestore] Error deleting payment method ${methodId}:`, error);
  }

  // Update local cache
  if (typeof window !== 'undefined') {
    try {
      const cachedStr = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cachedStr) {
        let list: PaymentMethod[] = JSON.parse(cachedStr);
        list = list.filter((m) => m.id !== methodId);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
      }
    } catch {}
  }
}

/**
 * Toggle active/inactive status in Firestore.
 */
export async function togglePaymentMethodInFirestore(methodId: string, isActive: boolean): Promise<void> {
  try {
    await updateDoc(doc(db, FIRESTORE_COLLECTION, methodId), {
      is_active: isActive,
      updated_at: new Date().toISOString(),
    });
    console.log(`[Firestore] Payment method ${methodId} active status set to ${isActive}.`);
  } catch (error) {
    console.warn(`[Firestore] Error updating status for ${methodId}:`, error);
  }

  // Update local cache
  if (typeof window !== 'undefined') {
    try {
      const cachedStr = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cachedStr) {
        let list: PaymentMethod[] = JSON.parse(cachedStr);
        list = list.map((m) => (m.id === methodId ? { ...m, is_active: isActive } : m));
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
      }
    } catch {}
  }
}

/**
 * Auto-seed defaults into Firestore if collection is empty.
 */
export async function seedDefaultPaymentMethodsToFirestore(): Promise<PaymentMethod[]> {
  try {
    const promises = DEFAULT_PAYMENT_METHODS.map((m) =>
      setDoc(doc(db, FIRESTORE_COLLECTION, m.id), m, { merge: true })
    );
    await Promise.all(promises);
    console.log('[Firestore] Default payment methods seeded to Firestore.');
  } catch (err) {
    console.warn('[Firestore] Seeding payment methods warning:', err);
  }
  return DEFAULT_PAYMENT_METHODS;
}

/**
 * Subscribe to real-time changes in Firestore payment_methods collection.
 */
export function subscribeToPaymentMethods(
  onUpdate: (methods: PaymentMethod[]) => void
): () => void {
  try {
    const unsubscribe = onSnapshot(
      collection(db, FIRESTORE_COLLECTION),
      (snapshot) => {
        if (!snapshot.empty) {
          const methods: PaymentMethod[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as PaymentMethod;
            methods.push({
              ...data,
              id: docSnap.id,
              name: data.name || data.nameAr || data.nameEn || docSnap.id,
              instructions: data.instructions || data.instructionsAr || data.descriptionAr || '',
              is_active: data.is_active !== undefined ? Boolean(data.is_active) : true,
            });
          });
          onUpdate(methods);
          if (typeof window !== 'undefined') {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(methods));
          }
        }
      },
      (error) => {
        console.warn('[Firestore] Realtime subscription warning:', error);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('[Firestore] Could not start real-time listener:', err);
    return () => {};
  }
}
