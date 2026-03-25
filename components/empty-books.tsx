import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { BookPlusIcon, PlusIcon } from "lucide-react";

import { Button } from "./ui/button";
import Link from "next/link";

const EmptyBooks = () => {
  return (
    <Empty className="bg-white">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <BookPlusIcon />
        </EmptyMedia>
        <EmptyTitle>There are no books available</EmptyTitle>
        <EmptyDescription>
          There are currently no books uploaded! You can upload your own if you
          wish.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Link href="/books/new">
          <Button>
            <PlusIcon className="size-4" /> Add new book
          </Button>
        </Link>
      </EmptyContent>
    </Empty>
  );
};

export default EmptyBooks;
