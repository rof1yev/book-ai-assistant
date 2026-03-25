export const getCurrentBillingPeriodStart = (): Date => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
};

// Plan session limits per billing period
const PLAN_SESSION_LIMITS: Record<string, number> = {
  free: 5, // Free plan: 5 sessions per month
  pro: 50, // Pro plan: 50 sessions per month
  premium: 500, // Premium plan: 500 sessions per month
};

/**
 * Gets the allowed number of sessions per billing period for a given clerk
 * @param clerkId - The Clerk user ID
 * @returns Number of allowed sessions (defaults to free tier limit)
 */
export const getPlanSessionLimit = (clerkId: string): number => {
  // TODO: Retrieve actual plan from Clerk user metadata or database
  // For now, default to free tier
  return PLAN_SESSION_LIMITS.free;
};
