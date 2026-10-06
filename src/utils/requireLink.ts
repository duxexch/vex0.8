import type { UserProfile } from '../types';

export function isPhoneLinked(profile: Pick<UserProfile, 'is_phone_verified'> | null | undefined): boolean {
  return !!profile?.is_phone_verified;
}

function readLocalProfileVerified(): boolean {
  try {
    const raw = localStorage.getItem('vex_comp_profile');
    if (!raw) return false;
    return !!JSON.parse(raw)?.is_phone_verified;
  } catch {
    return false;
  }
}

/**
 * Guest-first action gate: returns true when the action may proceed.
 * Otherwise opens the in-app phone-linking modal (window event handled by App.tsx)
 * and returns false. When no profile is passed, the local profile store is checked.
 */
export function requirePhoneLink(profile?: Pick<UserProfile, 'is_phone_verified'> | null): boolean {
  const verified = profile ? isPhoneLinked(profile) : readLocalProfileVerified();
  if (verified) return true;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('vex:require-link'));
  }
  return false;
}
