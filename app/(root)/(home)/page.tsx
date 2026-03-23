import { sampleBooks } from "@/lib/constants";
import HeroSection from "../../_components/hero-section";
import BookCard from "../../_components/book-card";

export default function HomePage() {
  return (
    <main className="wrapper pb-10">
      <HeroSection />

      <div className="library-books-grid">
        {sampleBooks.map((book) => (
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
