"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navItems } from "@/lib/constants";
import { Show, SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { useRef } from "react";

const Navbar = () => {
  const pathname = usePathname();
  const { user } = useUser();

  const buttonRef = useRef<HTMLDivElement>(null);

  const handleClick = () => {
    const btn = buttonRef.current?.querySelector("button");
    btn?.click();
  };

  return (
    <header className="w-full fixed z-50 bg-[var(--bg-primary)] border-b">
      <div className="wrapper navbar-height py-4 flex items-center justify-between">
        <Link href="/" className="flex gap-0.5 items-center">
          <Image
            src="/assets/logo.png"
            alt="Bookified"
            width={42}
            height={26}
            loading="lazy"
          />
          <span className="logo-text">Bookified</span>
        </Link>

        <nav className="w-fit flex gap-7.5 items-center">
          {navItems.map(({ label, href }) => {
            const isActive =
              pathname === href || (href !== "/" && pathname.startsWith(href));

            return (
              <Link
                href={href}
                key={label}
                className={cn(
                  "nav-link-base",
                  isActive ? "nav-link-active" : "text-black hover:opacity-70",
                )}
              >
                {label}
              </Link>
            );
          })}

          <div className="flex gap-7.5 items-center">
            <Show when="signed-out">
              <SignInButton mode="modal" />
            </Show>
            <Show when="signed-in">
              <div
                onClick={handleClick}
                className="nav-user-link cursor-pointer"
              >
                <div ref={buttonRef}>
                  <UserButton />
                </div>
                <span className="font-medium text-foreground">
                  {user?.firstName}
                </span>
              </div>
            </Show>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
