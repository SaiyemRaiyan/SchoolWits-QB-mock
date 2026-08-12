/* =====================================================================
   School Wits — Upload (standby)

   Temporary stand-in for js/upload.js and js/compose.js.

   Both of those parsed .tex in the browser via js/latex.js. That parser
   has been replaced by backend/src/latex, which runs in Node and Deno —
   keeping a browser copy would mean maintaining the same ~1400 lines
   twice, which is exactly what the split was meant to avoid.

   The replacement is a Supabase Edge Function: the page will upload the
   figures to the bucket, POST the .tex to the function, render the
   returned JSON as a preview with js/render/, and save on confirm. Until
   that is deployed, this file replaces the form with an explanation so
   the page fails honestly instead of throwing on a missing global.

   Delete this file when upload.js is rewritten against the function.
   ===================================================================== */

(function () {
  'use strict';

  const MESSAGE = `
    <div class="standby-card">
      <h2>Uploading is temporarily done from the terminal</h2>
      <p>
        The <code>.tex</code> parser now runs on the server rather than in
        this page, so that there is only one copy of it to maintain. The
        web upload form is being rebuilt against it.
      </p>
      <p>In the meantime, papers are imported with:</p>
      <pre><code>cd backend
npm run import -- "Physics MJ25 21"     # one paper
npm run import -- --all                 # every paper
npm run import -- "physics 21" --dry-run  # parse only, write nothing</code></pre>
      <p>
        A dry run prints the parse result and any warnings without touching
        the database — worth doing before a real import.
      </p>
      <p>
        Browsing and modules are unaffected:
        <a href="index.html">Browse</a> · <a href="modules.html">Modules</a>
      </p>
    </div>`;

  const STYLE = `
    .standby-card{max-width:680px;margin:40px auto;padding:28px;border:1px solid var(--line,#e2e2e2);
      border-radius:12px;background:var(--card,#fff);line-height:1.6}
    .standby-card h2{margin:0 0 14px;font-size:1.25rem}
    .standby-card pre{background:var(--code-bg,#f6f6f6);padding:14px;border-radius:8px;overflow-x:auto}
    .standby-card code{font-family:var(--mono,monospace);font-size:.85rem}
    .standby-card p{margin:10px 0}`;

  function standby() {
    const style = document.createElement('style');
    style.textContent = STYLE;
    document.head.appendChild(style);

    // Replace the whole working area rather than hiding pieces of it — the
    // form's handlers are gone, so leaving any of it interactive would just
    // produce dead buttons.
    const main = document.querySelector('main') || document.body;
    main.innerHTML = MESSAGE;
  }

  document.addEventListener('DOMContentLoaded', standby);
})();
