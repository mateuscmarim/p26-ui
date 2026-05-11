/**
 * Auth factory — handles login form submission, token storage, logout.
 * Storage keys are namespaced with `cred_` to avoid collision with other
 * panels that may share the same origin in dev.
 *
 * The factory takes the form/error nodes as specs so it can be reused or
 * mocked, and exposes `onLoginSuccess` so the caller (`app.js`) can react.
 */

const KEYS = {
  token: "cred_token",
  name: "cred_display_name",
  userId: "cred_user_id",
  email: "cred_email",
};

export function createAuth({ api, $form, $error }) {
  let onSuccessCallback = null;

  function getStoredToken() {
    return localStorage.getItem(KEYS.token);
  }
  function getDisplayName() {
    return localStorage.getItem(KEYS.name) || "";
  }
  function getUserId() {
    return localStorage.getItem(KEYS.userId);
  }
  function getEmail() {
    return localStorage.getItem(KEYS.email);
  }
  function logout() {
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
  }

  function store({ token, displayName, userId, email }) {
    localStorage.setItem(KEYS.token, token);
    if (displayName) localStorage.setItem(KEYS.name, displayName);
    if (userId != null) localStorage.setItem(KEYS.userId, String(userId));
    if (email) localStorage.setItem(KEYS.email, email);
  }

  if ($form && $form.length) {
    $form.on("submit", async (event) => {
      event.preventDefault();
      $error?.hide();

      const email = $form.find("#login-email").val()?.trim();
      const password = $form.find("#login-password").val();
      if (!email || !password) {
        $error?.text("Please enter your email and password.").show();
        return;
      }

      const $btn = $form.find('button[type="submit"]');
      const originalLabel = $btn.text();
      $btn.prop("disabled", true).text("Signing in…");

      try {
        // api.js camelizes response keys, so we read displayName/userId here.
        const result = await api.login({ email, password });
        store({
          token: result.token,
          displayName: result.displayName,
          userId: result.userId,
          email,
        });
        if (typeof onSuccessCallback === "function") {
          onSuccessCallback(result.displayName);
        }
      } catch (err) {
        const message = err?.responseJSON?.message || "Invalid credentials.";
        $error?.text(message).show();
      } finally {
        $btn.prop("disabled", false).text(originalLabel);
      }
    });
  }

  return {
    getStoredToken,
    getDisplayName,
    getUserId,
    getEmail,
    logout,
    onLoginSuccess: (cb) => {
      onSuccessCallback = cb;
    },
  };
}
