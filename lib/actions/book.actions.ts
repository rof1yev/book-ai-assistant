"use server";

import { connectToDatabase } from "@/database/mongoose";
import Book from "@/database/models/book.model";
import { escapeRegex, generateSlug, serializeData } from "../utils";
import { CreateBook, TextSegment, BookType } from "@/types";
import BookSegment from "@/database/models/book-segment.model";
import { getPlanLimits, getUserPlan } from "@/lib/subscription.server";

export const getAllBooks = async (search?: string) => {
  try {
    await connectToDatabase();

    let query = {};

    if (search) {
      const escapedSearch = escapeRegex(search);
      const regex = new RegExp(escapedSearch, "i");
      query = {
        $or: [{ title: { $regex: regex } }, { author: { $regex: regex } }],
      };
    }

    const books = await Book.find(query).sort({ createdAt: -1 }).lean();

    return {
      success: true,
      data: serializeData(books),
    };
  } catch (e) {
    console.error("Error fetching all books:", e);

    return {
      success: false,
      error: "Failed to fetch books",
    };
  }
};

export const checkBookExists = async (title: string) => {
  try {
    await connectToDatabase();

    const normalizedTitle = title.trim().toLowerCase();
    const slug = generateSlug(normalizedTitle);
    const existingBook = await Book.findOne({ slug }).lean();

    if (existingBook)
      return { exists: true, book: { ...serializeData(existingBook), slug } };

    return {
      exists: false,
    };
  } catch (e) {
    console.error("Error checking if book exists:", e);
    return {
      exists: false,
      error: "Failed to check if book exists",
    };
  }
};

export const createBook = async (data: CreateBook) => {
  const slug = generateSlug(data.title);

  try {
    await connectToDatabase();

    const existingBook = await Book.findOne({ slug }).lean();

    if (existingBook) {
      return {
        success: true,
        data: serializeData(existingBook),
        alreadyExists: true,
      };
    }

    // TODO: Check subscription limits before creating a book
    const plan = await getUserPlan();
    const limits = await getPlanLimits();

    const { auth } = await import("@clerk/nextjs/server");
    const { userId } = await auth();

    if (!userId || userId !== data.clerkId)
      return { success: false, error: "Unauthorized" };

    const bookCount = await Book.countDocuments({ clerkId: userId });

    if (bookCount >= limits.maxBooks) {
      const { revalidatePath } = await import("next/cache");
      revalidatePath("/");

      return {
        success: false,
        error: `You have reached the maximum number of books allowed for your ${plan} plan (${limits.maxBooks}). Please upgrade to add more books.`,
        isBillingError: true,
      };
    }

    // Use server-derived userId instead of caller-supplied data.clerkId
    try {
      const book = await Book.create({
        clerkId: userId,
        title: data.title,
        author: data.author,
        persona: data.persona,
        fileURL: data.fileURL,
        fileBlobKey: data.fileBlobKey,
        coverURL: data.coverURL,
        coverBlobKey: data.coverBlobKey,
        fileSize: data.fileSize,
        slug,
        totalSegments: 0,
      });

      return {
        success: true,
        data: { ...serializeData(book), slug },
      };
    } catch (createError: any) {
      // Handle duplicate key error (E11000) on slug
      if (createError.code === 11000 && createError.keyPattern?.slug) {
        const existingBook = (await Book.findOne({ slug }).lean()) as {
          slug: string;
        } | null;

        if (existingBook) {
          return {
            success: true,
            slug: existingBook.slug,
            alreadyExists: true,
          };
        }
      }
      // Re-throw other errors to be caught by outer catch
      throw createError;
    }
  } catch (e) {
    console.error("Error creating book:", e);

    return {
      success: false,
      error: "Failed to create book",
      slug,
    };
  }
};

export const saveBookSegments = async (
  bookId: string,
  clerkId: string,
  segments: TextSegment[],
) => {
  try {
    await connectToDatabase();

    // Verify the book belongs to this clerk before proceeding
    const book = await Book.findOne({ _id: bookId, clerkId });
    if (!book) {
      return {
        success: false,
        error: "Book not found or access denied",
      };
    }

    const segmentsToInsert = segments.map(
      ({ text, segmentIndex, pageNumber, wordCount }: TextSegment) => ({
        clerkId,
        bookId,
        content: text,
        segmentIndex,
        pageNumber,
        wordCount,
      }),
    );

    await BookSegment.insertMany(segmentsToInsert);
    await Book.findByIdAndUpdate(bookId, { totalSegments: segments.length });

    return {
      success: true,
      data: { segmentsCreated: segments.length },
    };
  } catch (e) {
    console.error("Error saving book segments:", e);

    try {
      // Scope deletions to this clerk for safety
      await BookSegment.deleteMany({ bookId, clerkId });
      // Only delete the book if it belongs to this clerk
      await Book.findOneAndDelete({ _id: bookId, clerkId });
      console.log("Cleaned up: deleted book segments and book due to failure.");
    } catch (cleanupError) {
      console.error("Error during cleanup:", cleanupError);
    }

    return {
      success: false,
      error: "Failed to save book segments",
    };
  }
};

export const getBookBySlug = async (slug: string) => {
  try {
    await connectToDatabase();

    const book = await Book.findOne({ slug }).lean();

    if (!book)
      return {
        success: false,
        error: "Book not found",
      };

    const serializedBook = serializeData(book) as unknown as BookType;
    return {
      success: true,
      data: serializedBook,
    };
  } catch (e) {
    console.error("Error fetching book by slug:", e);

    return {
      success: false,
      error: "Failed to fetch book",
    };
  }
};

export const searchBookSegments = async (
  bookId: string,
  query: string,
  limit: number = 5,
) => {
  try {
    await connectToDatabase();

    console.log(`Searching for: "${query}" in book ${bookId}`);

    // Verify the book exists
    const book = await Book.findById(bookId).lean();
    if (!book)
      return {
        success: false,
        error: "Book not found",
        data: [],
      };

    let segments: Record<string, unknown>[] = [];
    try {
      segments = await BookSegment.find({ bookId, $text: { $search: query } })
        .select("_id bookId content segmentIndex pageNumber wordCount")
        .sort({ score: { $meta: "textScore" } })
        .limit(limit)
        .lean();
    } catch (error) {
      segments = [];
    }

    // Use MongoDB text search to find matching segments
    if (segments.length === 0) {
      // Extract keywords, preferring longer terms but falling back to all tokens
      let keywords = query.split(/\s+/).filter((k) => k.length > 2);

      // If no keywords found, use all non-empty tokens (including short ones like "AI", "ML")
      if (keywords.length === 0)
        keywords = query
          .split(/\s+/)
          .map((t) => t.trim())
          .filter(Boolean);

      // If still no valid tokens, return empty result
      if (keywords.length === 0)
        return {
          success: true,
          data: [],
        };

      const pattern = keywords.map(escapeRegex).join("|");

      segments = await BookSegment.find({
        bookId,
        content: { $regex: pattern, $options: "i" },
      })
        .select("_id bookId content segmentIndex pageNumber wordCount")
        .sort({ segmentIndex: 1 })
        .limit(limit)
        .lean();

      console.log(`Search complete. Found ${segments.length} results`);

      return {
        success: true,
        data: serializeData(segments),
      };
    }

    return {
      success: true,
      data: serializeData(segments),
    };
  } catch (e) {
    console.error("Error searching book segments:", e);

    return {
      success: false,
      error: (e as Error).message || "Failed to search book segments",
      data: [],
    };
  }
};
