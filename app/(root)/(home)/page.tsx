import HeroSection from "../../_components/hero-section";
import BookCard from "../../_components/book-card";
import { getAllBooks } from "@/lib/actions/book.actions";
import EmptyBooks from "@/components/empty-books";
import Search from "@/components/search";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string }>;
}) {
  const { query } = await searchParams;

  const bookResults = await getAllBooks(query);
  const books = bookResults.success ? (bookResults.data ?? []) : [];

  return (
    <main className="wrapper pb-10">
      <HeroSection />

      {books.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 mb-10">
          <h2 className="text-3xl font-serif font-bold text-[#212a3b]">
            Recent Books
          </h2>
          <Search />
        </div>
      )}

      {books.length === 0 ? (
        <div className="w-full">
          <EmptyBooks />
        </div>
      ) : (
        <div className="library-books-grid">
          {books.map((book) => (
            <BookCard
              key={book.slug}
              title={book.title}
              slug={book.slug}
              author={book.author}
              coverURL={book.coverURL}
            />
          ))}
        </div>
      )}
    </main>
  );
}
