import Image from "next/image";
import { LandingMenu } from "./landing-menu";

/**
 * The floating pill header. Static apart from its menu, which is the one small
 * client component it needs for a phone.
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
        <LandingMenu />
      </header>
    </div>
  );
}
