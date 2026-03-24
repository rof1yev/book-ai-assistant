import { MAX_FILE_SIZE } from "@/lib/constants";
import { auth } from "@clerk/nextjs/server";
import { handleUpload, HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as HandleUploadBody;

    if (!process.env.bookified_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { error: "Server configuration error: Missing upload token" },
        { status: 500 },
      );
    }

    const jsonResponse = await handleUpload({
      token: process.env.bookified_READ_WRITE_TOKEN,
      body,
      request,
      onBeforeGenerateToken: async () => {
        const { userId } = await auth();

        if (!userId) throw new Error("Unauthorized: User not authorized");

        return {
          allowedContentTypes: [
            "application/pdf",
            "image/jpeg",
            "image/png",
            "image/webp",
          ],
          addRandomSuffix: true,
          maximumSizeInBytes: MAX_FILE_SIZE,
          tokenPayload: JSON.stringify({ userId }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log("File upload to blob: ", blob.url);

        let userId: string | undefined;
        if (tokenPayload) {
          try {
            const payload = JSON.parse(tokenPayload) as { userId?: unknown };
            if (typeof payload.userId === "string") {
              userId = payload.userId;
            }
          } catch {
            console.warn("Invalid token payload JSON in onUploadCompleted");
          }
        }

        // TODO: PostHog
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "An unknown error occurred";
    const status = message.includes("Unauthorized") ? 401 : 500;
    const clientMessage = status === 401 ? "Unauthorized" : "Upload failed";
    return NextResponse.json({ error: clientMessage }, { status });
  }
}
