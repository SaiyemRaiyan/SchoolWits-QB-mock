import { LandingGateway } from "@/components/landing/landing-gateway";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";

import "@/styles/landing.css";

/**
 * The gateway page. Everything here is static markup except the picker,
 * which is the one client island (see LandingGateway).
 *
 * `.landing-body` carries what `body.landing-body` used to: Next owns the
 * document, so the page cannot style <body> itself.
 */
export default function LandingPage() {
  return (
    <div className="landing-body">
      <div className="landing">
        <LandingHeader />

        <main className="landing-hero">
          <div className="landing-hero-inner">
            <span className="landing-eyebrow">
              <span className="dot" />
              Cambridge O Level &amp; IGCSE
            </span>
            <h1 className="landing-title">
              Past papers, mark schemes
              <br />
              and <em>worked solutions</em>
            </h1>
            <p className="landing-subtitle">
              Choose your subject and curriculum to jump straight into the question bank. Narrow it
              down to a topic if you already know what you want to revise, though that part is
              entirely optional.
            </p>

            <LandingGateway />
          </div>
        </main>

        <LandingFooter />
      </div>
    </div>
  );
}
