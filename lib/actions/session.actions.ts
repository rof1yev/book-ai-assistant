"use server";

import VoiceSession from "@/database/models/voice-session.model";
import { connectToDatabase } from "@/database/mongoose";
import { StartSessionResult, EndSessionResult } from "@/types";
import { getCurrentBillingPeriodStart, getPlanSessionLimit } from "../subscription-constants";

export const startVoiceSession = async (
  clerkId: string,
  bookId: string,
): Promise<StartSessionResult> => {
  try {
    await connectToDatabase();

    // Get the billing period start
    const billingPeriodStart = getCurrentBillingPeriodStart();

    // Get the session limit for this clerk's plan
    const sessionLimit = getPlanSessionLimit(clerkId);

    // Count existing sessions in the current billing period
    const existingSessionCount = await VoiceSession.countDocuments({
      clerkId,
      billingPeriodStart,
    });

    // Check if session limit is reached
    if (existingSessionCount >= sessionLimit) {
      return {
        success: false,
        error: "Session limit reached. Please upgrade your plan",
      };
    }

    const session = await VoiceSession.create({
      clerkId,
      bookId,
      startedAt: new Date(),
      billingPeriodStart,
      durationSeconds: 0,
    });

    return {
      success: true,
      sessionId: session._id.toString(),
      //   maxDurationMinutes: session.maxDurationMinutes
    };
  } catch (e) {
    console.error("Error starting voice session:", e);
    return {
      success: false,
      error: "Failed to start voice session. Please try again later.",
    };
  }
};

export const endVoiceSession = async (
  sessionId: string,
  durationSeconds: number,
): Promise<EndSessionResult> => {
  try {
    await connectToDatabase();

    const result = await VoiceSession.findByIdAndUpdate(sessionId, {
      endedAt: new Date(),
      durationSeconds,
    });

    if (!result) return { success: false, error: "Voice session not found." };

    return { success: true };
  } catch (e) {
    console.error("Error ending voice session:", e);
    return {
      success: false,
      error: "Failed to end voice session. Please try again later.",
    };
  }
};
