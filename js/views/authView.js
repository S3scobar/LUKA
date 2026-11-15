// js/views/authView.js
import { authService } from "../services/authService.js";
import { resolveContainer } from "../utils.js";
import { slideToSubmit } from "../components/slideToSubmit.js";

export const authView = {
  render(target, onAuthSuccess) {
    const container = resolveContainer(target);
    let isLoginMode = true;
    let notice = "";

    const renderForm = () => {
      container.innerHTML = `
        <div class="auth-card">
          <div class="auth-header">
            <i class="fa-solid fa-wallet auth-icon"></i>
            <h2>${isLoginMode ? "Iniciar Sesión" : "Crear Cuenta"}</h2>
            <p>${isLoginMode ? "Accede a tu gestor de gastos" : "Registra tus datos para empezar"}</p>
          </div>

          <!-- Botón de Google con animación Liquid Glass -->
          <button type="button" id="btn-google-login" class="btn-google">
            <svg class="google-icon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
              <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
            </svg>
            <span id="google-btn-text">Continuar con Google</span>
          </button>

          <div class="auth-divider">
            <span>o con tu celular</span>
          </div>

          <form id="auth-form" class="auth-form">
            ${!isLoginMode ? `
              <div class="form-group">
                <label for="auth-name">Nombre Completo</label>
                <div class="input-with-icon">
                  <i class="fa-solid fa-user input-icon-prefix"></i>
                  <input type="text" id="auth-name" placeholder="Santiago Escobar" autocomplete="name" required />
                </div>
              </div>
            ` : ""}

            <div class="form-group">
              <label for="auth-phone">${isLoginMode ? "Número de Celular o Correo" : "Número de Celular"}</label>
              <div class="input-with-icon">
                <i class="fa-solid fa-mobile-screen-button input-icon-prefix"></i>
                <input type="text" id="auth-phone" placeholder="Ej. 300 123 4567" autocomplete="tel" required />
              </div>
            </div>

            <div class="form-group">
              <label for="auth-password">Contraseña</label>
              <div class="input-with-icon">
                <i class="fa-solid fa-lock input-icon-prefix"></i>
                <input type="password" id="auth-password" placeholder="••••••••" minlength="6" autocomplete="${isLoginMode ? "current-password" : "new-password"}" required />
              </div>
            </div>

            ${notice ? `<div class="alert-info">${notice}</div>` : ""}
            <div id="auth-error" class="alert-error" style="display: none;"></div>

            ${isLoginMode ? `
              <div id="auth-slider"></div>
              <button type="submit" class="visually-hidden" tabindex="-1" aria-hidden="true">Ingresar</button>
            ` : `
              <button type="submit" id="auth-submit-btn" class="btn btn-primary btn-block">Crear Cuenta</button>
            `}
          </form>

          <div class="auth-toggle">
            <span>${isLoginMode ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}</span>
            <button type="button" id="toggle-mode-btn" class="btn-link">
              ${isLoginMode ? "Crear una cuenta" : "Iniciar sesión"}
            </button>
          </div>
        </div>
      `;

      const form = document.getElementById("auth-form");
      const toggleBtn = document.getElementById("toggle-mode-btn");
      const errorDiv = document.getElementById("auth-error");
      const submitBtn = document.getElementById("auth-submit-btn");
      const googleBtn = document.getElementById("btn-google-login");
      const googleBtnText = document.getElementById("google-btn-text");

      // Animación e inicio con Google OAuth
      googleBtn.addEventListener("click", async () => {
        try {
          errorDiv.style.display = "none";
          googleBtn.classList.add("authenticating");
          googleBtnText.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Conectando...`;
          await authService.signInWithGoogle();
        } catch (err) {
          googleBtn.classList.remove("authenticating");
          googleBtnText.textContent = "Continuar con Google";
          errorDiv.textContent = err.message || "Error al conectar con Google";
          errorDiv.style.display = "block";
        }
      });

      // En el login se confirma deslizando; en el registro con botón
      const slider = isLoginMode
        ? slideToSubmit.mount(document.getElementById("auth-slider"), {
            label: "Desliza para ingresar",
            onComplete: () => {
              if (!form.checkValidity()) {
                form.reportValidity();
                slider.reset();
                return;
              }
              form.requestSubmit();
            }
          })
        : null;

      const setBusy = () => {
        if (slider) slider.setBusy();
        else if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Procesando..."; }
      };
      const setIdle = () => {
        if (slider) slider.reset();
        else if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Crear Cuenta"; }
      };

      toggleBtn.addEventListener("click", () => {
        isLoginMode = !isLoginMode;
        notice = "";
        renderForm();
      });

      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        errorDiv.style.display = "none";
        setBusy();

        const phoneOrEmail = document.getElementById("auth-phone").value.trim();
        const password = document.getElementById("auth-password").value;

        try {
          if (isLoginMode) {
            await authService.signInWithPhone(phoneOrEmail, password);
          } else {
            const fullName = document.getElementById("auth-name").value.trim();
            const { session } = await authService.signUpWithPhone(phoneOrEmail, password, fullName);
            if (!session) {
              try {
                await authService.signInWithPhone(phoneOrEmail, password);
              } catch {
                isLoginMode = true;
                notice = "Cuenta creada exitosamente. Ingresa ahora con tu número y contraseña.";
                renderForm();
                return;
              }
            }
          }
          if (onAuthSuccess) onAuthSuccess();
        } catch (err) {
          errorDiv.textContent = err.message || "Ocurrió un error en la autenticación";
          errorDiv.style.display = "block";
          setIdle();
        }
      });
    };

    renderForm();
  },

  // Modal / Pantalla para vincular celular a cuenta de Google (Regla antisaboteo: máx 2 cuentas por número)
  renderPhoneLink(target, user, onPhoneLinked) {
    const container = resolveContainer(target);
    const displayName = user?.user_metadata?.full_name || user?.email || "Usuario";

    container.innerHTML = `
      <div class="auth-card phone-link-card">
        <div class="auth-header">
          <div class="user-avatar-badge">
            <i class="fa-solid fa-shield-halved"></i>
          </div>
          <h2>Protege tu Cuenta</h2>
          <p>Hola, <strong>${displayName}</strong>. Para activar tu cuenta y evitar multicuentas, vincula tu número de celular.</p>
          <div class="rule-badge">
            <i class="fa-solid fa-circle-check"></i> Máximo 2 cuentas por número
          </div>
        </div>

        <form id="phone-link-form" class="auth-form">
          <div class="form-group">
            <label for="link-phone-input">Número de Celular</label>
            <div class="input-with-icon">
              <i class="fa-solid fa-mobile-screen-button input-icon-prefix"></i>
              <input type="tel" id="link-phone-input" placeholder="Ej. 300 123 4567" autocomplete="tel" required autofocus />
            </div>
          </div>

          <div id="phone-link-error" class="alert-error" style="display: none;"></div>

          <button type="submit" id="btn-submit-link" class="btn btn-primary btn-block">
            Vincular y Entrar a LUKA
          </button>
        </form>

        <div class="auth-toggle">
          <button type="button" id="btn-cancel-link" class="btn-link" style="color: var(--text-muted); font-size: 0.8rem;">
            <i class="fa-solid fa-arrow-right-from-bracket"></i> Usar otra cuenta / Cerrar sesión
          </button>
        </div>
      </div>
    `;

    const form = document.getElementById("phone-link-form");
    const errorDiv = document.getElementById("phone-link-error");
    const submitBtn = document.getElementById("btn-submit-link");
    const cancelBtn = document.getElementById("btn-cancel-link");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      errorDiv.style.display = "none";
      const phoneVal = document.getElementById("link-phone-input").value.trim();

      submitBtn.disabled = true;
      submitBtn.textContent = "Verificando...";

      try {
        await authService.linkPhone(phoneVal, "google");
        if (onPhoneLinked) onPhoneLinked();
      } catch (err) {
        errorDiv.textContent = err.message || "No se pudo vincular el celular.";
        errorDiv.style.display = "block";
        submitBtn.disabled = false;
        submitBtn.textContent = "Vincular y Entrar a LUKA";
      }
    });

    cancelBtn.addEventListener("click", async () => {
      try {
        await authService.signOut();
      } finally {
        window.location.reload();
      }
    });
  }
};