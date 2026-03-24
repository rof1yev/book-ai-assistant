"use server";

import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/database/mongoose";
import Book from "@/database/models/book.model";
import { generateSlug, serializeData } from "../utils";
import { CreateBook, TextSegment } from "@/types";
import BookSegment from "@/database/models/book-segment.model";

export const getAllBooks = async () => {
  try {
    await connectToDatabase();

    const books = await Book.find().sort({ createdAt: -1 }).lean();

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
    // Verify user is authenticated on the server
    const { userId } = await auth();
    if (!userId) {
      return {
        success: false,
        error: "Unauthorized: User must be authenticated",
      };
    }

    await connectToDatabase();

    // TODO: Check subscription limits before creating a book

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
