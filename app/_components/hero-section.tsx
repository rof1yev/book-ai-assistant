import Link from "next/link";
import Image from "next/image";
import { heroStepsData } from "@/lib/constants";

const HeroSection = () => {
  return (
    <section className="pt-28 mb-10 md:mb-16">
      <div className="library-hero-card">
        <div className="library-hero-content">
          <div className="library-hero-text">
            <h1 className="library-hero-title text-4xl font-serif font-bold">
              Your Library
            </h1>
            <p className="library-hero-description">
              Convert your book into interactive AI conversations.
              <br className="hidden md:block" /> Listen., learn and discuss your
              favorite reads.
            </p>
            <Link
              href="/books/new"
              className="library-cta-primary mt-4 flex items-center justify-center"
            >
              <span className="text-3xl font-light mb-1 mr-2">+</span>
              <span className="text-[#212a3b]">Add new book</span>
            </Link>
          </div>

          <div className="library-hero-illustration-desktop">
            <Image
              src="/assets/hero-illustration.png"
              alt="Hero background"
              width={400}
              height={400}
              loading="lazy"
              className="object-contain"
            />
          </div>
          <div className="library-hero-illustration">
            <Image
              src="/assets/hero-illustration.png"
              alt="Hero background"
              width={400}
              height={400}
              loading="lazy"
              className="object-contain"
            />
          </div>

          <div className="library-steps-card min-w-[260px] max-w-[280px] z-10 shadow-soft-md">
            <ul className="space-y-6">
              {heroStepsData.map(({ id, title, description }) => (
                <li key={id} className="library-step-item">
                  <div className="w-10 h-10 min-w-10 min-h-10 rounded-full border border-gray-300 flex items-center justify-center font-medium text-lg">
                    {id}
                  </div>
                  <div className="flex flex-col">
                    <h3 className="library-step-title text-lg font-bold">
                      {title}
                    </h3>
                    <p className="library-step-description text-gray-500">
                      {description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
