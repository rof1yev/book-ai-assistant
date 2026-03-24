import { sampleBooks } from "@/lib/constants";
import HeroSection from "../../_components/hero-section";
import BookCard from "../../_components/book-card";
import { getAllBooks } from "@/lib/actions/book.actions";

export default async function HomePage() {
  const bookResults = await getAllBooks();
  const books = bookResults.success ? (bookResults.data ?? []) : [];

  return (
    <main className="wrapper pb-10">
      <HeroSection />

      <div className="library-books-grid">
        {Array.from(
          new Map(
            [...sampleBooks, ...books].map((book) => [book.slug, book]),
          ).values(),
        ).map((book) => (
          <BookCard
            key={book._id}
            title={book.title}
            slug={book.slug}
            author={book.author}
            coverURL={book.coverURL}
          />
        ))}
      </div>
    </main>
  );
}
