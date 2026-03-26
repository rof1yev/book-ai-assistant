import {
  endVoiceSession,
  startVoiceSession,
  deleteVoiceSession,
} from "@/lib/actions/session.actions";
import { ASSISTANT_ID, DEFAULT_VOICE, VOICE_SETTINGS } from "@/lib/constants";
import { BookType, Messages } from "@/types";
import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";
import Vapi from "@vapi-ai/web";
import { getVoice } from "@/lib/utils";
import { useSubscription } from "./use-subscription";

export type CallStatus =
  | "idle"
  | "connecting"
  | "starting"
  | "listening"
  | "thinking"
  | "speaking";

const useLatestRef = <T>(value: T) => {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
};

const VAPI_API_KEY = process.env.NEXT_PUBLIC_VAPI_API_KEY;
const TIMER_INTERVAL_MS = 1000;
const SECONDS_PER_MINUTE = 60;
const TIME_WARNING_THRESHOLD = 60; // Show warning when this many seconds remain

let vapi: InstanceType<typeof Vapi>;

function getVapi() {
  if (!vapi) {
    if (!VAPI_API_KEY)
      throw new Error(
        "NEXT_PUBLIC_VAPI_API_KEY not found. Please set it in the .env file",
      );

    vapi = new Vapi(VAPI_API_KEY);
  }
  return vapi;
}

const useVapi = (book: BookType) => {
  const { userId } = useAuth();
  const { limits } = useSubscription();

  //   TODO: Implement limits

  const [status, setStatus] = useState<CallStatus>("idle");
  const [messages, setMessages] = useState<Messages[]>([]);

  const [currentMessage, setCurrentMessage] = useState("");
  const [currentUserMessage, setCurrentUserMessage] = useState("");
  const [duration, setDuration] = useState<number>(0);
  const [limitError, setLimitError] = useState<string | null>(null);
  const [isBillingError, setIsBillingError] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const isStoppingRef = useRef<boolean>(false);

  const bookRef = useLatestRef(book);
  const durationRef = useLatestRef(duration);
  const voice = book.persona || DEFAULT_VOICE;

  //* Limits
  const maxDurationSeconds = limits?.maxDurationPerSession
    ? limits.maxDurationPerSession * 60
    : 15 * 60;
  const maxDurationRef = useLatestRef(maxDurationSeconds);

  // Set up Vapi event listeners
  useEffect(() => {
    const handlers = {
      "call-start": () => {
        isStoppingRef.current = false;
        setStatus("starting"); // AI speaks first, wait for it
        setCurrentMessage("");
        setCurrentUserMessage("");

        // Start duration timer
        startTimeRef.current = Date.now();
        setDuration(0);
        timerRef.current = setInterval(() => {
          if (startTimeRef.current) {
            const newDuration = Math.floor(
              (Date.now() - startTimeRef.current) / TIMER_INTERVAL_MS,
            );
            setDuration(newDuration);

            // Check duration limit
            if (newDuration >= maxDurationRef.current) {
              getVapi().stop();
              setLimitError(
                `Session time limit (${Math.floor(
                  maxDurationRef.current / SECONDS_PER_MINUTE,
                )} minutes) reached. Upgrade your plan for longer sessions.`,
              );
            }
          }
        }, TIMER_INTERVAL_MS);
      },

      "call-end": () => {
        // Don't reset isStoppingRef here - delayed events may still fire
        setStatus("idle");
        setCurrentMessage("");
        setCurrentUserMessage("");

        // Stop timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        // End session tracking
        if (sessionIdRef.current) {
          endVoiceSession(sessionIdRef.current, durationRef.current).catch(
            (err) => console.error("Failed to end voice session:", err),
          );
          sessionIdRef.current = null;
        }

        startTimeRef.current = null;
      },

      "speech-start": () => {
        if (!isStoppingRef.current) {
          setStatus("speaking");
        }
      },
      "speech-end": () => {
        if (!isStoppingRef.current) {
          // After AI finishes speaking, user can talk
          setStatus("listening");
        }
      },

      message: (message: {
        type: string;
        role: string;
        transcriptType: string;
        transcript: string;
      }) => {
        if (message.type !== "transcript") return;

        // User finished speaking → AI is thinking
        if (message.role === "user" && message.transcriptType === "final") {
          if (!isStoppingRef.current) {
            setStatus("thinking");
          }
          setCurrentUserMessage("");
        }

        // Partial user transcript → show real-time typing
        if (message.role === "user" && message.transcriptType === "partial") {
          setCurrentUserMessage(message.transcript);
          return;
        }

        // Partial AI transcript → show word-by-word
        if (
          message.role === "assistant" &&
          message.transcriptType === "partial"
        ) {
          setCurrentMessage(message.transcript);
          return;
        }

        // Final transcript → add to messages
        if (message.transcriptType === "final") {
          if (message.role === "assistant") setCurrentMessage("");
          if (message.role === "user") setCurrentUserMessage("");

          setMessages((prev) => {
            const isDupe = prev.some(
              (m) =>
                m.role === message.role && m.content === message.transcript,
            );
            return isDupe
              ? prev
              : [...prev, { role: message.role, content: message.transcript }];
          });
        }
      },

      error: (error: Error) => {
        console.error("Vapi error:", error);
        // Don't reset isStoppingRef here - delayed events may still fire
        setStatus("idle");
        setCurrentMessage("");
        setCurrentUserMessage("");

        // Stop timer on error
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        // End session tracking on error
        if (sessionIdRef.current) {
          endVoiceSession(sessionIdRef.current, durationRef.current).catch(
            (err) =>
              console.error("Failed to end voice session on error:", err),
          );
          sessionIdRef.current = null;
        }

        // Show user-friendly error message
        const errorMessage = error.message?.toLowerCase() || "";
        if (
          errorMessage.includes("timeout") ||
          errorMessage.includes("silence")
        ) {
          setLimitError(
            "Session ended due to inactivity. Click the mic to start again.",
          );
        } else if (
          errorMessage.includes("network") ||
          errorMessage.includes("connection")
        ) {
          setLimitError(
            "Connection lost. Please check your internet and try again.",
          );
        } else {
          setLimitError(
            "Session ended unexpectedly. Click the mic to start again.",
          );
        }

        startTimeRef.current = null;
      },
    };

    // Register all handlers
    Object.entries(handlers).forEach(([event, handler]) => {
      getVapi().on(event as keyof typeof handlers, handler as () => void);
    });

    return () => {
      // End active session on unmount
      if (sessionIdRef.current) {
        getVapi().stop();
        endVoiceSession(sessionIdRef.current, durationRef.current).catch(
          (err) =>
            console.error("Failed to end voice session on unmount:", err),
        );
        sessionIdRef.current = null;
      }
      // Cleanup handlers
      Object.entries(handlers).forEach(([event, handler]) => {
        getVapi().off(event as keyof typeof handlers, handler as () => void);
      });
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const start = async () => {
    console.log("start");
    if (!userId) return setLimitError("Please login to start a conversation");

    setLimitError(null);
    setIsBillingError(false);
    setStatus("connecting");

    try {
      const result = await startVoiceSession(userId, book._id);

      if (!result.success) {
        setLimitError(
          result.error || "Session limit reached. Please upgrade your plan",
        );
        setIsBillingError(!!result.isBillingError);
        setStatus("idle");
        return;
      }

      sessionIdRef.current = result.sessionId || null;
      const firstMessage = `Hey, good to meet you. Quick question, before we dive in: have you actually read ${book.title} yet? Or are we starting fresh?`;

      await getVapi().start(ASSISTANT_ID, {
        firstMessage,
        variableValues: {
          title: book.title,
          author: book.author,
          bookId: book._id,
        },
        voice: {
          provider: "11labs",
          voiceId: getVoice(voice).id,
          model: "eleven_turbo_v2_5" as const,
          stability: VOICE_SETTINGS.stability,
          similarityBoost: VOICE_SETTINGS.similarityBoost,
          style: VOICE_SETTINGS.style,
          useSpeakerBoost: VOICE_SETTINGS.useSpeakerBoost,
          speed: VOICE_SETTINGS.speed,
        },
      });
    } catch (e) {
      console.log("Error starting call:", e);
      if (sessionIdRef.current) {
        // Delete the failed session so it doesn't count toward quota
        deleteVoiceSession(sessionIdRef.current).catch((deleteError) =>
          console.error(
            "Failed to delete voice session after start failure:",
            deleteError,
          ),
        );
        sessionIdRef.current = null;
      }

      setStatus("idle");
      setLimitError("An error occurred while starting the call");
    }
  };
  const stop = async () => {
    console.log("stop");

    isStoppingRef.current = true;
    await getVapi().stop();
  };
  const clearErrors = useCallback(async () => {
    setLimitError(null);
    setIsBillingError(false);
  }, []);

  const isActive =
    status === "starting" ||
    status === "listening" ||
    status === "thinking" ||
    status === "speaking";

  return {
    status,
    isActive,
    messages,
    currentMessage,
    currentUserMessage,
    duration,
    start,
    stop,
    clearErrors,
    maxDurationSeconds,
    limitError,
    isBillingError,
  };
};

export default useVapi;
