import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getBookBySlug } from "@/lib/actions/book.actions";
import { ArrowLeft, Mic, MicOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import VapiControls from "@/components/vapi-controls";

interface BookPageProps {
  params: {
    slug: string;
  };
}

export default async function BookPage({ params }: BookPageProps) {
  const { userId } = await auth();

  if (!userId) redirect("/");

  const { slug } = await params;

  // Fetch book data
  const { data, success } = await getBookBySlug(slug);

  if (!success || !data) redirect("/");

  return (
    <div className="book-page-container">
      <Link href="/" className="back-btn-floating">
        <ArrowLeft className="size-6 text-[#212a3b]" />
      </Link>

      <VapiControls book={data} />
    </div>
  );
}
