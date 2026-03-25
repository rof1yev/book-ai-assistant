"use server";

import { auth } from "@clerk/nextjs/server";
import {
  PLANS,
  PLAN_LIMITS,
  PlanLimits,
  PlanType,
} from "@/lib/subscription-constants";

export const getUserPlan = async (): Promise<PlanType> => {
  try {
    const { has, userId } = await auth();

    if (!userId) return PLANS.FREE;

    if (has({ plan: "standard" })) return PLANS.STANDARD;
    else if (has({ plan: "pro" })) return PLANS.PRO;
    else return PLANS.FREE;
  } catch (e) {
    console.error("Error checking user subscription:", e);
    return PLANS.FREE;
  }
};

export const getPlanLimits = async (): Promise<PlanLimits> => {
  const plan = await getUserPlan();
  return PLAN_LIMITS[plan];
};
