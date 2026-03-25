import HeroSection from "../../_components/hero-section";
import BookCard from "../../_components/book-card";
import { getAllBooks } from "@/lib/actions/book.actions";
import EmptyBooks from "@/components/empty-books";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const bookResults = await getAllBooks();
  const books = bookResults.success ? (bookResults.data ?? []) : [];

  return (
    <main className="wrapper pb-10">
      <HeroSection />

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
