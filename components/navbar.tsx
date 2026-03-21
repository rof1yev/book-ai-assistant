"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navItems } from "@/lib/constants";
import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
  useUser,
} from "@clerk/nextjs";

const Navbar = () => {
  const pathname = usePathname();
  const { user } = useUser();

  return (
    <header className="w-full fixed z-50 bg-('--bg-primary')">
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
          {navItems.map(({ label, href }: INavItem) => {
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
              <div className="nav-user-link">
                <UserButton />
                {user?.firstName && (
                  <Link href="/subscriptions" className="nav-user-name">
                    {user.firstName}
                  </Link>
                )}
              </div>
            </Show>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
