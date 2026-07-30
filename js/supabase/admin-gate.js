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

    const form = document.getElementById('adminGateForm');
    const emailInput = document.getElementById('adminGateEmail');
    const passwordInput = document.getElementById('adminGatePassword');
    const errorEl = document.getElementById('adminGateError');

    function reveal(){ gate.hidden = true; content.hidden = false; }
    function lock(){ gate.hidden = false; content.hidden = true; }

    if(await DB.isAdmin()){ reveal(); return; }
    lock();

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorEl.hidden = true;
      try{
        await DB.signIn(emailInput.value.trim(), passwordInput.value);
        if(await DB.isAdmin()){
          reveal();
        } else {
          await DB.signOut();
          errorEl.textContent = 'Signed in, but this account is not on the admin list.';
          errorEl.hidden = false;
        }
      } catch(err){
        errorEl.textContent = err.message || 'Could not sign in.';
        errorEl.hidden = false;
      }
    });
  }

  document.addEventListener('DOMContentLoaded', initGate);

})();
