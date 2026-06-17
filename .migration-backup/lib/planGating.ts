/**
 * Plan-gating utilities for feature access control.
 * Checks user's subscription plan against feature limits.
 */

export type PlanName = 'free' | 'lite' | 'standard' | 'boss';

const PLAN_RANK: Record<PlanName, number> = {
  free: 0,
  lite: 1,
  standard: 2,
  boss: 3,
};

export interface PlanLimits {
  templateLimit: number;
  customCommandLimit: number;
  flowLimit: number;
  hasAutoReply: boolean;
  hasStatusViewer: boolean;
  hasGroupAnalytics: boolean;
  hasAnalyticsExport: boolean;
  hasEcommerce: boolean;
  hasPrioritySupport: boolean;
  hasApiAccess: boolean;
  hasCustomBranding: boolean;
  hasQrAlertEmail: boolean;
  hasQrAlertWhatsApp: boolean;
}

const PLAN_LIMITS: Record<PlanName, PlanLimits> = {
  free: {
    templateLimit: 3,
    customCommandLimit: 0,
    flowLimit: 0,
    hasAutoReply: false,
    hasStatusViewer: false,
    hasGroupAnalytics: false,
    hasAnalyticsExport: false,
    hasEcommerce: false,
    hasPrioritySupport: false,
    hasApiAccess: false,
    hasCustomBranding: false,
    hasQrAlertEmail: false,
    hasQrAlertWhatsApp: false,
  },
  lite: {
    templateLimit: 10,
    customCommandLimit: 5,
    flowLimit: 0,
    hasAutoReply: true,
    hasStatusViewer: false,
    hasGroupAnalytics: false,
    hasAnalyticsExport: false,
    hasEcommerce: false,
    hasPrioritySupport: false,
    hasApiAccess: false,
    hasCustomBranding: false,
    hasQrAlertEmail: true,
    hasQrAlertWhatsApp: false,
  },
  standard: {
    templateLimit: 50,
    customCommandLimit: 20,
    flowLimit: 3,
    hasAutoReply: true,
    hasStatusViewer: true,
    hasGroupAnalytics: true,
    hasAnalyticsExport: false,
    hasEcommerce: false,
    hasPrioritySupport: true,
    hasApiAccess: false,
    hasCustomBranding: false,
    hasQrAlertEmail: true,
    hasQrAlertWhatsApp: true,
  },
  boss: {
    templateLimit: -1,
    customCommandLimit: -1,
    flowLimit: -1,
    hasAutoReply: true,
    hasStatusViewer: true,
    hasGroupAnalytics: true,
    hasAnalyticsExport: true,
    hasEcommerce: true,
    hasPrioritySupport: true,
    hasApiAccess: true,
    hasCustomBranding: true,
    hasQrAlertEmail: true,
    hasQrAlertWhatsApp: true,
  },
};

export function getPlanLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[(plan as PlanName)] || PLAN_LIMITS.free;
}

export function isPlanAtLeast(userPlan: string, requiredPlan: PlanName): boolean {
  const userRank = PLAN_RANK[(userPlan as PlanName)] ?? 0;
  const requiredRank = PLAN_RANK[requiredPlan];
  return userRank >= requiredRank;
}

export function isWithinLimit(count: number, limit: number): boolean {
  if (limit === -1) return true;
  return count < limit;
}
