/* =====================================================================
   School Wits — admin login gate.
   Shared by upload.html (whole page) and modules.html (Builder tab only).
   Looks for a matching #adminGate / #adminGateContent pair in the page;
   does nothing if a page doesn't have one (so this script is safe to
   include everywhere, even on pages with no gated content).

   This is a UX convenience only — the actual access boundary is RLS
   (public.is_admin(), backend/supabase/migrations/0006-0009). A visitor
   could bypass this gate entirely and every write would still be
   rejected server-side.
   ===================================================================== */
(function(){

  async function initGate(){
    const gate = document.getElementById('adminGate');
    const content = document.getElementById('adminGateContent');
    if(!gate || !content) return;

    const button = document.getElementById('adminGateGoogle');
    const errorEl = document.getElementById('adminGateError');

    // Pages whose scripts must not run until an admin is present listen for
    // this instead of DOMContentLoaded — upload.js, for one, would otherwise
    // query papers anonymously and wire up elements that are still hidden.
    function reveal(){
      gate.hidden = true;
      content.hidden = false;
      document.dispatchEvent(new CustomEvent('sw:admin-ready'));
    }
    function lock(){ gate.hidden = false; content.hidden = true; }

    if(await DB.isAdmin()){ reveal(); return; }
    lock();

    // Returning from Google, the session exists but the account may not be
    // on the admin list. Say which account was refused — otherwise someone
    // signed into the wrong Google account sees a login screen that appears
    // to do nothing when they click it again.
    const user = await DB.currentUser();
    if(user){
      errorEl.textContent = 'Signed in as ' + (user.email || 'this account')
        + ', which is not on the admin list.';
      errorEl.hidden = false;
    }

    button.addEventListener('click', async () => {
      errorEl.hidden = true;
      button.disabled = true;
      try{
        // Redirects away; nothing after this runs on success.
        await DB.signInWithGoogle();
      } catch(err){
        button.disabled = false;
        errorEl.textContent = err.message || 'Could not start Google sign-in.';
        errorEl.hidden = false;
      }
    });
  }

  document.addEventListener('DOMContentLoaded', initGate);

})();
