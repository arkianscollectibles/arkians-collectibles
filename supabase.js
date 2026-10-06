const SUPABASE_URL = "https://ubgnwgwicaznwfxvbxfg.supabase.co";

const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_VKlBIfDbzpD9d1nuGTdhgw__QYvyhb9";

const supabaseClient = window.supabase?.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  { auth: { flowType: "pkce" } }
);
// Keep static browsing functional when the external SDK is unavailable.
// The revision invalidates pending work when another tab switches accounts.
const arkiansAuthState = window.arkiansAuthState = { userId: null, revision: 0, ready: false };
let editProfileUserId = null;
const googleLoginButton = document.getElementById("googleLoginButton");
const authMessage = document.getElementById("authMessage");
function showAuthMessage(key) {
  if (!authMessage) return;
  authMessage.hidden = false;
  authMessage.dataset.i18n = key;
  window.arkiansTranslate?.();
}

if (!supabaseClient) {
  if (googleLoginButton) googleLoginButton.disabled = true;
  showAuthMessage("auth_unavailable");
}

if (supabaseClient) {
  if (googleLoginButton) {
    googleLoginButton.addEventListener("click", async () => {
      googleLoginButton.disabled = true;
      if (authMessage) authMessage.hidden = true;
      try {
        const { error } = await supabaseClient.auth.signInWithOAuth({
          provider: "google",
          options: {
            // Return to the same site, including its existing custom domain.
            redirectTo: new URL("account.html", window.location.href).href,
            // Basic identity only. No Gmail, Drive or other Google API scopes.
            scopes: "openid email profile",
            queryParams: { prompt: "select_account" }
          }
        });
        if (error) throw error;
      } catch {
        showAuthMessage("auth_failed");
        googleLoginButton.disabled = false;
      }
    });
  }

  function updateAccountUI(session) {
    const userId = session?.user?.id || null;
    const changed = !arkiansAuthState.ready || userId !== arkiansAuthState.userId;
    if (changed) {
      arkiansAuthState.userId = userId;
      arkiansAuthState.ready = true;
      arkiansAuthState.revision += 1;
      clearProfileData();
      document.dispatchEvent(new CustomEvent("arkians-auth-change", { detail: { userId } }));
      // Keep auth callbacks synchronous; profile reads happen after the auth lock releases.
      if (userId) setTimeout(() => {
        loadProfileData().catch(() => showAuthMessage("auth_failed"));
        loadEditProfileData().catch(() => showAuthMessage("auth_failed"));
      }, 0);
    }
    const loginSection = document.getElementById("loginSection");
    const accountGrid = document.querySelector(".account-grid");
    const logoutWrapper = document.querySelector(".logout-wrapper");
    if (loginSection) loginSection.style.display = session ? "none" : "block";
    if (accountGrid) accountGrid.style.display = session ? "grid" : "none";
    if (logoutWrapper) logoutWrapper.style.display = session ? "block" : "none";
  }

  // Auth callbacks stay synchronous; nested auth calls can block the auth lock.
  supabaseClient.auth.onAuthStateChange((_event, session) => updateAccountUI(session));
  const initialAuthRevision = arkiansAuthState.revision;
  supabaseClient.auth.getSession().then(({data, error}) => {
    if (error) { showAuthMessage("auth_failed"); return; }
    if (arkiansAuthState.revision === initialAuthRevision) updateAccountUI(data.session);
  }).catch(() => showAuthMessage("auth_failed"));

  const logoutButton = document.getElementById("logoutButton");
  if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
      logoutButton.disabled = true;
      try {
        const {error} = await supabaseClient.auth.signOut();
        if (error) throw error;
        window.location.href = "account.html";
      } catch {
        showAuthMessage("auth_failed");
        logoutButton.disabled = false;
      }
    });
  }

// Profile fields must never survive a switch to another account.
function clearProfileData() {
  ["profileName", "profileEmail", "profileAddress", "profilePhone"].forEach(id => {
    const field = document.getElementById(id);
    if (field) field.textContent = "—";
  });
  const form = document.getElementById("editProfileForm");
  if (form) {
    form.reset();
    form.querySelectorAll("input, button").forEach(field => { field.disabled = true; });
  }
  editProfileUserId = null;
}
function profileRequestIsCurrent(revision, user) {
  return revision === arkiansAuthState.revision &&
    (!arkiansAuthState.ready || arkiansAuthState.userId === user?.id);
}
async function loadProfileData() {
  const profileName = document.getElementById("profileName");
  const profileEmail = document.getElementById("profileEmail");
  const profileAddress = document.getElementById("profileAddress");
  const profilePhone = document.getElementById("profilePhone");
  if (!profileName || !profileEmail || !profileAddress || !profilePhone) return;
  const revision = arkiansAuthState.revision;
  const { data: { user }, error } = await supabaseClient.auth.getUser();
  if (revision !== arkiansAuthState.revision) return;
  if (error || !user) { window.location.href = "account.html"; return; }
  if (!profileRequestIsCurrent(revision, user)) return;
  profileName.textContent = user.user_metadata?.full_name || user.user_metadata?.name || "—";
  profileEmail.textContent = user.email || "—";
  profileAddress.textContent = user.user_metadata?.address || "—";
  profilePhone.textContent = user.user_metadata?.phone || "—";
}
async function loadEditProfileData() {
  const form = document.getElementById("editProfileForm");
  if (!form) return;
  const revision = arkiansAuthState.revision;
  const { data: { user }, error } = await supabaseClient.auth.getUser();
  if (revision !== arkiansAuthState.revision) return;
  if (error || !user) { window.location.href = "account.html"; return; }
  if (!profileRequestIsCurrent(revision, user)) return;
  document.getElementById("editName").value = user.user_metadata?.full_name || user.user_metadata?.name || "";
  document.getElementById("editEmail").value = user.email || "";
  document.getElementById("editAddress").value = user.user_metadata?.address || "";
  document.getElementById("editPhone").value = user.user_metadata?.phone || "";
  editProfileUserId = user.id;
  form.querySelectorAll("input, button").forEach(field => { field.disabled = false; });
}
const editProfileForm = document.getElementById("editProfileForm");
if (editProfileForm) {
  editProfileForm.querySelectorAll("input, button").forEach(field => { field.disabled = true; });
  editProfileForm.addEventListener("submit", async event => {
    event.preventDefault();
    const revision = arkiansAuthState.revision;
    const ownerId = editProfileUserId;
    const submitButton = editProfileForm.querySelector('[type="submit"]');
    if (!ownerId || submitButton.disabled) return;
    submitButton.disabled = true;
    try {
      const { data: { user }, error } = await supabaseClient.auth.getUser();
      if (error || !user || user.id !== ownerId || !profileRequestIsCurrent(revision, user)) return;
      const { error: updateError } = await supabaseClient.auth.updateUser({ data: {
        full_name: document.getElementById("editName").value.trim(),
        address: document.getElementById("editAddress").value.trim(),
        phone: document.getElementById("editPhone").value.trim()
      } });
      if (updateError) throw updateError;
      if (profileRequestIsCurrent(revision, user)) window.location.href = "profile.html";
    } catch (error) {
      console.error("Profile update error:", error);
      alert(document.documentElement.lang === "el" ? "Δεν ήταν δυνατή η αποθήκευση του προφίλ." : "Could not save your profile.");
    } finally {
      if (revision === arkiansAuthState.revision && editProfileUserId === ownerId) submitButton.disabled = false;
    }
  });
}
loadProfileData().catch(() => showAuthMessage("auth_failed"));
loadEditProfileData().catch(() => showAuthMessage("auth_failed"));
}
