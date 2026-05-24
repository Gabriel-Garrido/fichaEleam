import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Loading from "../../components/Loading";
import PasswordToggleButton from "../../components/PasswordToggleButton";
import { authErrorMessage, clearMustResetPassword, updatePasswordAndClearResetFlag } from "../auth/authService";
import { getPasswordStrength, PASSWORD_MAX_LENGTH, validatePassword } from "../../utils/passwordValidation";

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const linkedGoogle = params.get("linked") === "google";
  const toast = useToast();
  const { user, homePath, refetchProfile } = useAuth();

  const [password, setPassword]     = useState("");
  const [confirm,  setConfirm]      = useState("");
  const [showPw,   setShowPw]       = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [finalizingGoogle, setFinalizingGoogle] = useState(linkedGoogle);
  const [error,    setError]        = useState(null);

  // Check if user is already authenticated via Google OAuth
  const isAlreadyGoogleUser = (user?.identities || []).some(
    (identity) => identity.provider === "google"
  );

  const strength = getPasswordStrength(password);

  // Handle callback from Google OAuth (linked=google param)
  useEffect(() => {
    if (!linkedGoogle || !user?.id) return;

    let cancelled = false;
    const finishGoogleLink = async () => {
      setFinalizingGoogle(true);
      setError(null);
      try {
        const hash = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
        const oauthParams = new URLSearchParams(hash);
        const oauthError = oauthParams.get("error_description") || oauthParams.get("error");
        if (oauthError) {
          throw new Error(oauthError);
        }

        await clearMustResetPassword(user.id);
        await refetchProfile();
        if (cancelled) return;
        toast("Acceso con Google confirmado", "success");
        navigate(homePath || "/dashboard", { replace: true });
      } catch (err) {
        console.warn("Error al confirmar Google:", err);
        if (!cancelled) {
          setError("No fue posible confirmar el acceso con Google. Puedes establecer una contraseña para continuar.");
          setFinalizingGoogle(false);
          navigate("/cambiar-clave", { replace: true });
        }
      }
    };

    finishGoogleLink();
    return () => { cancelled = true; };
  }, [homePath, linkedGoogle, navigate, refetchProfile, toast, user?.id]);

  // For users already signed in via Google: just clear the flag
  const handleContinueAsGoogle = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await clearMustResetPassword(user.id);
      await refetchProfile();
      toast("Acceso confirmado", "success");
      navigate(homePath || "/dashboard", { replace: true });
    } catch (err) {
      setError(authErrorMessage(err, "No se pudo confirmar el acceso. Intenta de nuevo."));
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const pwError = validatePassword(password, confirm);
    if (pwError) { setError(pwError); return; }

    setSubmitting(true);
    try {
      await updatePasswordAndClearResetFlag(password, user.id);
      await refetchProfile();
      toast("Contraseña actualizada correctamente", "success");
      navigate(homePath || "/dashboard", { replace: true });
    } catch (err) {
      setError(authErrorMessage(err, err.message || "No se pudo actualizar la contraseña."));
    } finally {
      setSubmitting(false);
    }
  };

  if (finalizingGoogle) return <Loading message="Confirmando acceso con Google..." />;

  // User already signed in with Google OAuth — just confirm and continue
  if (isAlreadyGoogleUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 space-y-6">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
              <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Acceso con Google confirmado</h1>
            <p className="text-sm text-slate-500">
              Tu cuenta ya está vinculada a Google. No necesitas crear una contraseña.
            </p>
          </div>

          {error && (
            <p className="text-rose-600 text-xs bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 text-center">
              {error}
            </p>
          )}

          <Button
            onClick={handleContinueAsGoogle}
            disabled={submitting}
            className="w-full bg-teal-700 text-white py-3 rounded-xl font-semibold hover:bg-teal-800 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Confirmando..." : "Continuar al sistema"}
          </Button>
        </div>
      </div>
    );
  }

  // Standard flow: set a new password
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 space-y-6">
        <div>
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Elige tu contraseña</h1>
          <p className="text-sm text-slate-500 mt-1">
            Por seguridad, debes establecer una contraseña personal antes de continuar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="cp-new-password" className="text-xs uppercase font-semibold text-slate-500 mb-1 block">
              Nueva contraseña
            </label>
            <div className="relative">
              <Input
                id="cp-new-password"
                type={showPw ? "text" : "password"}
                name="new-password"
                placeholder="Mínimo 8 caracteres, 1 mayúscula, 1 número"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                maxLength={PASSWORD_MAX_LENGTH}
                required
                disabled={submitting}
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 pr-10"
              />
              <PasswordToggleButton visible={showPw} onToggle={() => setShowPw((v) => !v)} />
            </div>
            {strength && (
              <div className="mt-2 space-y-1">
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full transition-all ${strength.cls} ${strength.bar}`} />
                </div>
                <p className="text-xs text-slate-500">{strength.txt}</p>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="cp-confirm-password" className="text-xs uppercase font-semibold text-slate-500 mb-1 block">
              Confirmar contraseña
            </label>
            <Input
              id="cp-confirm-password"
              type={showPw ? "text" : "password"}
              name="confirm-password"
              placeholder="Repite la contraseña"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              maxLength={PASSWORD_MAX_LENGTH}
              required
              disabled={submitting}
              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {error && (
            <p className="text-rose-600 text-xs bg-rose-50 border border-rose-200 rounded-xl px-3 py-2" role="alert" aria-live="polite">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={submitting || !password || !confirm}
            className="w-full bg-teal-700 text-white py-3 rounded-xl font-semibold hover:bg-teal-800 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Actualizando..." : "Establecer contraseña"}
          </Button>
        </form>

        <p className="text-xs text-center text-slate-400">
          Tu contraseña debe tener al menos 8 caracteres, una mayúscula y un número.
        </p>
      </div>
    </div>
  );
}
