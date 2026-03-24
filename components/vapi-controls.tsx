"use client";

import { BookType } from "@/types";
import { MicIcon, MicOffIcon } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

const VapiControls = ({ book }: { book: BookType }) => {
  const router = useRouter();

  const [isActive, setIsActive] = useState<boolean>(false);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <>
      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        {/* Header Card */}
        <div className="vapi-header-card">
          <div className="vapi-cover-wrapper">
            <Image
              src={book.coverURL || "/images/book-placeholder.png"}
              alt={book.title}
              width={120}
              height={180}
              className="vapi-cover-image !w-[120px] !h-auto"
              loading="lazy"
            />
            <div className="vapi-mic-wrapper relative">
              {isActive && (
                <div className="absolute inset-0 rounded-full bg-white animate-ping opacity-75" />
              )}
              <button
                className={`vapi-mic-btn shadow-md !w-[60px] !h-[60px] z-10 ${isActive ? "vapi-mic-btn-active" : "vapi-mic-btn-inactive"}`}
              >
                {isActive ? (
                  <MicIcon className="size-7 text-white" />
                ) : (
                  <MicOffIcon className="size-7 text-[#212a3b]" />
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-4 flex-1">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold font-serif text-[#212a3b] mb-1">
                {book.title}
              </h1>
              <p className="text-[#3d485e] font-medium">by {book.author}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="vapi-status-indicator">
                <span className={`vapi-status-dot `} />
                <span className="vapi-status-text">Ready</span>
              </div>

              <div className="vapi-status-indicator">
                <span className="vapi-status-text">
                  Voice: {book.persona || "Daniel"}
                </span>
              </div>

              <div className="vapi-status-indicator">
                <span className="vapi-status-text">00:00 / 15:00</span>
              </div>
            </div>
          </div>
        </div>

        <div className="vapi-transcript-wrapper">
          <div className="transcript-container min-h-[400px]">
            <div className="transcript-empty">
              <MicIcon className="size-12 text-[#212a3b] mb-4" />
              <h2 className="transcript-empty-text">No conversation yet</h2>
              <p className="transcript-empty-hint">
                Click the mic button above to start talking
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default VapiControls;
