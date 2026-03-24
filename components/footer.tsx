import { FacebookIcon, InstagramIcon, YoutubeIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "./ui/button";

const social_networks = [InstagramIcon, FacebookIcon, YoutubeIcon];

const Footer = () => {
  const startYear = 2026;
  const currentYear = new Date().getFullYear();

  return (
    <footer className="wrapper py-6 border-t flex items-center justify-between">
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
      <div className="flex">
        <p>
          {startYear === currentYear
            ? startYear
            : `${startYear}-${currentYear}`}{" "}
          All Rights Reserved.
        </p>
      </div>

      <div className="flex items-center gap-0.5">
        {social_networks.map((Icon, i) => (
          <Button
            key={i}
            variant="ghost"
            size="icon"
            className="cursor-pointer"
          >
            <Icon width={14} height={14} />
          </Button>
        ))}
      </div>
    </footer>
  );
};

export default Footer;
