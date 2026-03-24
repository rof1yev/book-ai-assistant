import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getBookBySlug } from "@/lib/actions/book.actions";
import { ArrowLeft, Mic, MicOff } from "lucide-react";
import { BookType } from "@/types";

interface BookPageProps {
  params: {
    slug: string;
  };
}

export default async function BookPage({ params }: BookPageProps) {
  const { slug } = await params;

  const { userId } = await auth();
  if (!userId) redirect("/");

  // Fetch book data
  const { data, success, error } = await getBookBySlug(slug);

  if (!success || !data) redirect("/");

  return (
    <>
      {/* Floating Back Button */}
      <a
        href="/"
        className="back-btn-floating fixed top-24 left-6 z-50 w-12 h-12 rounded-full bg-white border border-gray-200 shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center hover:bg-gray-50"
      >
        <ArrowLeft className="w-5 h-5 text-gray-700" />
      </a>

      {/* Main Content */}
      <main className="book-page-container min-h-svh px-4">
        <div className="wrapper container mx-auto max-w-4xl">
          {/* Header Card */}
          <div className="vapi-header-card rounded-xl p-8 mb-6 flex gap-6 bg-[#f3e4c7]">
            {/* Book Cover with Mic Button */}
            <div className="relative flex-shrink-0">
              <img
                src={data.coverURL || "/placeholder-book.jpg"}
                alt={data.title}
                className="w-32 h-48 rounded-lg shadow-lg object-cover"
              />
              {/* Floating Mic Button */}
              <button
                className="vapi-mic-btn absolute bottom-2 right-2 w-14 h-14 rounded-full bg-white shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center hover:bg-gray-50"
                aria-label="Start listening"
              >
                <Mic className="w-6 h-6 text-gray-800" />
              </button>
            </div>

            {/* Book Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold font-serif text-gray-900 mb-1">
                {data.title}
              </h1>
              <p className="text-lg text-gray-600 mb-6">by {data.author}</p>

              {/* Status Badges */}
              <div className="flex flex-wrap gap-3">
                {/* Ready Status */}
                <div className="vapi-status-indicator inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm">
                  <div className="vapi-status-dot w-2.5 h-2.5 rounded-full bg-gray-400"></div>
                  <span className="vapi-status-text text-sm text-gray-700 font-medium">
                    Ready
                  </span>
                </div>

                {/* Voice Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm">
                  <span className="text-sm text-gray-700 font-medium">
                    Voice:{" "}
                    <span className="font-semibold">
                      {data.persona || "Default"}
                    </span>
                  </span>
                </div>

                {/* Timer Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm">
                  <span className="text-sm text-gray-700 font-medium">
                    0:00/15:00
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Transcript Area */}
          <div className="transcript-container bg-white rounded-xl shadow-sm min-h-[400px] p-12 flex flex-col items-center justify-center">
            <div className="transcript-empty text-center">
              <div className="mb-4 flex justify-center">
                <MicOff className="w-12 h-12 text-gray-400" />
              </div>
              <h2 className="transcript-empty-text text-2xl font-bold text-gray-900 mb-2">
                No conversation yet
              </h2>
              <p className="transcript-empty-hint text-gray-500">
                Click the mic button above to start talking
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
