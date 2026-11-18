"use client";

import { useRef } from "react";

/**
 * The 3D showcase beside the picker: the three documents a student gets for
 * every question, stacked in depth. Pure CSS perspective and transforms; the
 * only script is the pointer handler that turns the pointer position into two
 * custom properties (--rx, --ry) the stylesheet reads. Nothing is loaded, and
 * with reduced motion requested the stage sits still.
 *
 * The sheets carry bars where text would go rather than invented questions, so
 * the page never shows content that is not in the bank.
 */
export function LandingStage() {
  const stage = useRef<HTMLDivElement>(null);

  function tilt(e: React.PointerEvent<HTMLDivElement>) {
    const el = stage.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--ry", `${(x * 22).toFixed(2)}deg`);
    el.style.setProperty("--rx", `${(-y * 16).toFixed(2)}deg`);
  }

  function settle() {
    stage.current?.style.removeProperty("--ry");
    stage.current?.style.removeProperty("--rx");
  }

  return (
    <div
      className="landing-stage"
      ref={stage}
      onPointerMove={tilt}
      onPointerLeave={settle}
      aria-hidden="true"
    >
      <div className="stage-scene">
        <div className="stage-floor" />

        {/* Back: the question, ruled like the printed paper. */}
        <div className="stage-sheet stage-q">
          <div className="stage-head">
            <span>Question 3</span>
            <b>[5]</b>
          </div>
          <div className="stage-row"><i>(a)</i><span className="bar w90" /><b>[2]</b></div>
          <div className="stage-row"><i>(b)</i><span className="bar w70" /><b>[1]</b></div>
          <div className="stage-row"><i>(c)</i><span className="bar w80" /><b>[2]</b></div>
          <div className="stage-fig" />
        </div>

        {/* Middle: the examiner's grid, with M / A / B mark chips. */}
        <div className="stage-sheet stage-ms">
          <div className="stage-head"><span>Mark scheme</span></div>
          <div className="stage-grid">
            <span className="chip-ref">3(a)</span><span className="bar w80" /><em data-k="M">M1</em>
            <span className="chip-ref">3(b)</span><span className="bar w60" /><em data-k="A">A1</em>
            <span className="chip-ref">3(c)</span><span className="bar w70" /><em data-k="B">B1</em>
          </div>
        </div>

        {/* Front: the worked solution, a brass timeline. */}
        <div className="stage-sheet stage-sol">
          <div className="stage-head"><span>Worked solution</span></div>
          <div className="stage-step"><u>1</u><span className="bar w90" /></div>
          <div className="stage-step"><u>2</u><span className="bar w70" /></div>
          <div className="stage-step"><u>3</u><span className="bar w80" /></div>
        </div>

        <span className="stage-orb stage-orb-a" />
        <span className="stage-orb stage-orb-b" />
      </div>
    </div>
  );
}
