/** Invite-claim sellers: 3 months free. Manual signups: paid from month 1. */
export const INVITE_TRIAL_MONTHS = 3;

export type SellerSignupSource = 'MANUAL' | 'INVITE_CLAIM';
export type SellerSubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE';

export type SellerSubscriptionUser = {
  role: string;
  sellerSignupSource?: SellerSignupSource | null;
  trialEndsAt?: Date | string | null;
  sellerSubscriptionStatus?: SellerSubscriptionStatus | null;
};

export function addMonths(date: Date, months: number): Date {
  const out = new Date(date);
  out.setMonth(out.getMonth() + months);
  return out;
}

export function trialEndsAtFromInviteClaim(from = new Date()): Date {
  return addMonths(from, INVITE_TRIAL_MONTHS);
}

export function manualSellerSignupDefaults() {
  return {
    sellerSignupSource: 'MANUAL' as const,
    sellerSubscriptionStatus: 'PAST_DUE' as const,
    trialEndsAt: null,
  };
}

export function inviteClaimSellerSignupDefaults(from = new Date()) {
  return {
    sellerSignupSource: 'INVITE_CLAIM' as const,
    sellerSubscriptionStatus: 'TRIAL' as const,
    trialEndsAt: trialEndsAtFromInviteClaim(from),
  };
}

export type SellerSubscriptionSummary = {
  sellerSignupSource: SellerSignupSource | null;
  sellerSubscriptionStatus: SellerSubscriptionStatus | null;
  trialEndsAt: string | null;
  onTrial: boolean;
  needsPayment: boolean;
  hasAccess: boolean;
  trialDaysRemaining: number;
  message: string | null;
};

/** ponytail: dashboard not hard-gated until billing ships — banner + API only */
export function getSellerSubscriptionSummary(user: SellerSubscriptionUser): SellerSubscriptionSummary | null {
  if (user.role !== 'SELLER') return null;

  const legacy = user.sellerSignupSource == null && user.sellerSubscriptionStatus == null;
  if (legacy) {
    return {
      sellerSignupSource: null,
      sellerSubscriptionStatus: null,
      trialEndsAt: null,
      onTrial: false,
      needsPayment: false,
      hasAccess: true,
      trialDaysRemaining: 0,
      message: null,
    };
  }

  const source = user.sellerSignupSource ?? 'MANUAL';
  const status = user.sellerSubscriptionStatus ?? (source === 'INVITE_CLAIM' ? 'TRIAL' : 'PAST_DUE');
  const trialEnd = user.trialEndsAt ? new Date(user.trialEndsAt) : null;
  const now = new Date();
  const onTrial = status === 'TRIAL' && !!trialEnd && trialEnd > now;
  const trialExpired = status === 'TRIAL' && !!trialEnd && trialEnd <= now;
  const needsPayment = status === 'PAST_DUE' || trialExpired;
  const hasAccess = status === 'ACTIVE' || onTrial || needsPayment;

  let message: string | null = null;
  if (onTrial && trialEnd) {
    message = `Free until ${trialEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} — customer booking invite`;
  } else if (needsPayment && source === 'MANUAL') {
    message = 'Subscription required — seller plans apply from month 1';
  } else if (trialExpired) {
    message = 'Your free trial has ended — subscribe to keep your seller account active';
  }

  return {
    sellerSignupSource: source,
    sellerSubscriptionStatus: trialExpired ? 'PAST_DUE' : status,
    trialEndsAt: trialEnd?.toISOString() ?? null,
    onTrial,
    needsPayment,
    hasAccess,
    trialDaysRemaining: onTrial && trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / 86400000)) : 0,
    message,
  };
}
