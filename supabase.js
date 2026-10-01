const SUPABASE_URL = "https://ubgnwgwicaznwfxvbxfg.supabase.co";

const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_VKlBIfDbzpD9d1nuGTdhgw__QYvyhb9";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);
const googleLoginButton =
  document.getElementById("googleLoginButton");

if (googleLoginButton) {

  googleLoginButton.addEventListener(
    "click",
    async () => {

      const { error } =
        await supabaseClient.auth.signInWithOAuth({

          provider: "google",

          options: {

            redirectTo:
  "https://arkianscollectibles.github.io/arkians-collectibles/account.html",

            queryParams: {
              prompt: "select_account"
            }

          }

        });


      if (error) {
        console.error(
          "Google login error:",
          error
        );
      }

    }
  );
}

// CHECK IF USER IS LOGGED IN

async function checkUserSession() {

  const {
    data: { session },
    error
  } = await supabaseClient.auth.getSession();


  if (error) {
    console.error("Session error:", error);
    return;
  }


  const loginSection =
    document.getElementById("loginSection");

  const accountGrid =
    document.querySelector(".account-grid");

  const logoutWrapper =
    document.querySelector(".logout-wrapper");


  if (session) {

    if (loginSection) {
      loginSection.style.display = "none";
    }

    if (accountGrid) {
      accountGrid.style.display = "grid";
    }

    if (logoutWrapper) {
      logoutWrapper.style.display = "block";
    }

  } else {

    if (loginSection) {
      loginSection.style.display = "block";
    }

    if (accountGrid) {
      accountGrid.style.display = "none";
    }

    if (logoutWrapper) {
      logoutWrapper.style.display = "none";
    }
  }
}

checkUserSession();
supabaseClient.auth.onAuthStateChange(
  (_event, session) => {

    checkUserSession();

  }
);


const logoutButton =
  document.getElementById("logoutButton");

if (logoutButton) {

  logoutButton.addEventListener(
    "click",
    async () => {

      const { error } =
        await supabaseClient.auth.signOut();

      if (error) {
        console.error("Logout error:", error);
        return;
      }

      window.location.href = "account.html";
    }
  );
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
