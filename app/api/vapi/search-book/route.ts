import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Types } from "mongoose";
import { searchBookSegments } from "@/lib/actions/book.actions";
import { connectToDatabase } from "@/database/mongoose";
import Book from "@/database/models/book.model";
import { BookType } from "@/types";

// interface VapiToolCall {
//   name: string;
//   parameters: Record<string, unknown>;
// }

// interface VapiRequest {
//   tool_calls?: VapiToolCall[];
// }

// export async function POST(request: NextRequest) {
//   try {
//     const body = (await request.json()) as VapiRequest;

//     // Extract tool calls from the request
//     const toolCalls = body.tool_calls || [];

//     // Find the "search book" tool call
//     const searchBookCall = toolCalls.find(
//       (call) => call.name === "search book",
//     );

//     if (!searchBookCall)
//       return NextResponse.json(
//         { error: "No search book tool call found" },
//         { status: 400 },
//       );

//     // Extract parameters
//     const { bookId, query } = searchBookCall.parameters as {
//       bookId?: string;
//       query?: string;
//     };

//     if (!bookId || !query)
//       return NextResponse.json(
//         { error: "Missing required parameters: bookId and query" },
//         { status: 400 },
//       );

//     // ============================================
//     // VALIDATE OBJECTID FORMAT
//     // ============================================

//     if (!Types.ObjectId.isValid(bookId as string))
//       return NextResponse.json(
//         { error: "Invalid bookId format. Must be a valid MongoDB ObjectId" },
//         { status: 400 },
//       );

//     // ============================================
//     // AUTHORIZATION CHECK
//     // ============================================

//     // Get authenticated user
//     const { userId } = await auth();

//     if (!userId)
//       return NextResponse.json(
//         { error: "Unauthorized: User not authenticated" },
//         { status: 401 },
//       );

//     // Verify user owns the book
//     try {
//       await connectToDatabase();

//       const book = await Book.findById(bookId).lean<BookType>();

//       if (!book)
//         return NextResponse.json({ error: "Book not found" }, { status: 404 });

//       if (book.clerkId !== userId)
//         return NextResponse.json(
//           { error: "Forbidden: You do not have access to this book" },
//           { status: 403 },
//         );
//     } catch (e) {
//       console.error("Error verifying book ownership:", e);
//       return NextResponse.json(
//         { error: "Internal server error during authorization" },
//         { status: 500 },
//       );
//     }

//     // ============================================
//     // SEARCH FOR MATCHING SEGMENTS
//     // ============================================

//     // Search for matching segments
//     const searchResult = await searchBookSegments(
//       bookId as string,
//       query as string,
//       3,
//     );

//     // If search failed or no segments found
//     if (!searchResult.success || searchResult.data?.length === 0)
//       return NextResponse.json(
//         { result: "No information found about this topic." },
//         { status: 200 },
//       );

//     // Combine segments with double newlines
//     const combinedContent = (searchResult.data as any[])
//       .map((segment: any) => segment.content)
//       .join("\n\n");

//     return NextResponse.json({ result: combinedContent }, { status: 200 });
//   } catch (error) {
//     console.error("Error in search-book API:", error);

//     return NextResponse.json(
//       { error: "Internal server error" },
//       { status: 500 },
//     );
//   }
// }

// Helper function to process book search logic
async function processBookSearch(bookId: unknown, query: unknown) {
  // Validate inputs before conversion to prevent null/undefined becoming "null"/"undefined" strings
  if (bookId == null || query == null || query === "") {
    return { result: "Missing bookId or query" };
  }

  // Convert bookId to string
  const bookIdStr = String(bookId);
  const queryStr = String(query).trim();

  // Additional validation after conversion
  if (
    !bookIdStr ||
    bookIdStr === "null" ||
    bookIdStr === "undefined" ||
    !queryStr
  ) {
    return { result: "Missing bookId or query" };
  }

  // Execute search
  const searchResult = await searchBookSegments(bookIdStr, queryStr, 3);

  // Return results
  if (!searchResult.success || !searchResult.data?.length) {
    return { result: "No information found about this topic in the book." };
  }

  const combinedText = searchResult.data
    .map((segment) => (segment as { content: string }).content)
    .join("\n\n");

  return { result: combinedText };
}

export async function GET() {
  return NextResponse.json({ status: "ok" });
}

// Parse tool arguments that may arrive as a JSON string or an object
function parseArgs(args: unknown): Record<string, unknown> {
  if (!args) return {};
  if (typeof args === "string") {
    try {
      return JSON.parse(args);
    } catch {
      return {};
    }
  }
  return args as Record<string, unknown>;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    console.log("Vapi search-book request:", JSON.stringify(body, null, 2));

    // Support multiple Vapi formats
    const functionCall = body?.message?.functionCall;
    const toolCallList =
      body?.message?.toolCallList || body?.message?.toolCalls;

    // Handle single functionCall format
    if (functionCall) {
      const { name, parameters } = functionCall;
      const parsed = parseArgs(parameters);

      if (name === "searchBook") {
        const result = await processBookSearch(parsed.bookId, parsed.query);
        return NextResponse.json(result);
      }

      return NextResponse.json({ result: `Unknown function: ${name}` });
    }

    // Handle toolCallList format (array of calls)
    if (!toolCallList || toolCallList.length === 0) {
      return NextResponse.json({
        results: [{ result: "No tool calls found" }],
      });
    }

    const results = [];

    for (const toolCall of toolCallList) {
      const { id, function: func } = toolCall;
      const name = func?.name;
      const args = parseArgs(func?.arguments);

      if (name === "searchBook") {
        const searchResult = await processBookSearch(args.bookId, args.query);
        results.push({ toolCallId: id, ...searchResult });
      } else {
        results.push({ toolCallId: id, result: `Unknown function: ${name}` });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Vapi search-book error:", error);
    return NextResponse.json({
      results: [{ result: "Error processing request" }],
    });
  }
}
