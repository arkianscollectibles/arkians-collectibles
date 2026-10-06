const SUPABASE_URL = "https://ubgnwgwicaznwfxvbxfg.supabase.co";

const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_VKlBIfDbzpD9d1nuGTdhgw__QYvyhb9";

const supabaseClient = window.supabase?.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  { auth: { flowType: "pkce" } }
);
// Keep static browsing functional when the external SDK is unavailable.
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
    const loginSection = document.getElementById("loginSection");
    const accountGrid = document.querySelector(".account-grid");
    const logoutWrapper = document.querySelector(".logout-wrapper");
    if (loginSection) loginSection.style.display = session ? "none" : "block";
    if (accountGrid) accountGrid.style.display = session ? "grid" : "none";
    if (logoutWrapper) logoutWrapper.style.display = session ? "block" : "none";
  }

  // Auth callbacks stay synchronous; nested auth calls can block the auth lock.
  supabaseClient.auth.onAuthStateChange((_event, session) => updateAccountUI(session));
  supabaseClient.auth.getSession().then(({data, error}) => {
    if (error) { showAuthMessage("auth_failed"); return; }
    updateAccountUI(data.session);
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

// LOAD GOOGLE USER DATA INTO PROFILE PAGE

// LOAD USER DATA INTO PROFILE PAGE

async function loadProfileData() {

  const profileName = document.getElementById("profileName");
  const profileEmail = document.getElementById("profileEmail");
  const profileAddress = document.getElementById("profileAddress");
  const profilePhone = document.getElementById("profilePhone");

  // Run only on profile.html
  if (
    !profileName ||
    !profileEmail ||
    !profileAddress ||
    !profilePhone
  ) return;


  const {
    data: { user },
    error
  } = await supabaseClient.auth.getUser();


  if (error || !user) {
    window.location.href = "account.html";
    return;
  }


  profileName.textContent =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    "—";

  profileEmail.textContent =
    user.email || "—";

  profileAddress.textContent =
    user.user_metadata?.address || "—";

  profilePhone.textContent =
    user.user_metadata?.phone || "—";
}


loadProfileData();
// EDIT PROFILE - LOAD + SAVE

async function setupEditProfile() {

  const form = document.getElementById("editProfileForm");

  // Run only on edit-profile.html
  if (!form) return;


  const nameInput = document.getElementById("editName");
  const emailInput = document.getElementById("editEmail");
  const addressInput = document.getElementById("editAddress");
  const phoneInput = document.getElementById("editPhone");


  // GET CURRENT USER

  const {
    data: { user },
    error
  } = await supabaseClient.auth.getUser();


  // If not logged in, go back to account page
  if (error || !user) {
    window.location.href = "account.html";
    return;
  }


  // LOAD EXISTING INFORMATION

  nameInput.value =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    "";

  emailInput.value = user.email || "";

  addressInput.value =
    user.user_metadata?.address || "";

  phoneInput.value =
    user.user_metadata?.phone || "";


  // SAVE PROFILE

  form.addEventListener("submit", async (event) => {

    event.preventDefault();


    const { error: updateError } =
      await supabaseClient.auth.updateUser({

        data: {
          full_name: nameInput.value.trim(),
          address: addressInput.value.trim(),
          phone: phoneInput.value.trim()
        }

      });


    if (updateError) {

      console.error("Profile update error:", updateError);

      alert("Could not save your profile.");

      return;
    }


    window.location.href = "profile.html";

  });

}


setupEditProfile();

}
