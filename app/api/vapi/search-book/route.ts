import { NextRequest, NextResponse } from "next/server";
import { searchBookSegments } from "@/lib/actions/book.actions";

interface VapiToolCall {
  name: string;
  parameters: Record<string, unknown>;
}

interface VapiRequest {
  tool_calls?: VapiToolCall[];
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as VapiRequest;

    // Extract tool calls from the request
    const toolCalls = body.tool_calls || [];

    // Find the "search book" tool call
    const searchBookCall = toolCalls.find(
      (call) => call.name === "search book",
    );

    if (!searchBookCall)
      return NextResponse.json(
        { error: "No search book tool call found" },
        { status: 400 },
      );

    // Extract parameters
    const { bookId, query } = searchBookCall.parameters as {
      bookId?: string;
      query?: string;
    };

    if (!bookId || !query)
      return NextResponse.json(
        { error: "Missing required parameters: bookId and query" },
        { status: 400 },
      );

    // Search for matching segments
    const searchResult = await searchBookSegments(
      bookId as string,
      query as string,
      3,
    );

    // If search failed or no segments found
    if (!searchResult.success || searchResult.data?.length === 0)
      return NextResponse.json(
        { result: "No information found about this topic." },
        { status: 200 },
      );

    // Combine segments with double newlines
    const combinedContent = (searchResult.segments as any[])
      .map((segment: any) => segment.content)
      .join("\n\n");

    return NextResponse.json({ result: combinedContent }, { status: 200 });
  } catch (error) {
    console.error("Error in search-book API:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
