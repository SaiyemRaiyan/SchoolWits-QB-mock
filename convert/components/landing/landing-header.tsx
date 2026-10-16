import Image from "next/image";
import Link from "next/link";

/**
 * The floating pill header. Static, so it stays a server component: the
 * landing page's only interactive parts are the picker and its combobox.
 */
export function LandingHeader() {
  return (
    <div className="landing-header-wrap">
      <header className="landing-header">
        <div className="landing-brand">
          <Image src="/img/logo.jpg" alt="School Wits" width={42} height={42} priority />
          <div className="landing-brand-text">
            <span className="landing-brand-name">School Wits</span>
            <span className="landing-brand-sub">Cambridge Question Bank</span>
          </div>
        </div>
        <nav className="landing-header-links">
          <Link href="/browse">Skip to Browse</Link>
        </nav>
      </header>
    </div>
  );
}
