import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import { supabase } from "../../services/supabaseConfig";
import Button from "../../components/Button";
import Input from "../../components/Input";

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, homePath, refetchProfile } = useAuth();

  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError("Debe incluir al menos una letra mayúscula.");
      return;
    }
    if (!/[0-9]/.test(password)) {
      setError("Debe incluir al menos un número.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setSubmitting(true);
    try {
      const { error: pwErr } = await supabase.auth.updateUser({ password });
      if (pwErr) throw pwErr;

      // Limpiar la bandera de cambio obligatorio en el perfil
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ must_reset_password: false })
        .eq("id", user.id);
      if (profileErr) throw profileErr;

      await refetchProfile();
      toast("Contraseña actualizada correctamente", "success");
      navigate(homePath || "/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "No se pudo actualizar la contraseña.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-background,#f8fafc)] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 space-y-6">
        <div>
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Cambia tu contraseña</h1>
          <p className="text-sm text-gray-500 mt-1">
            Por seguridad, debes establecer una contraseña personal antes de continuar.
            La contraseña temporal que recibiste quedará sin efecto.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs uppercase font-semibold text-gray-500 mb-1 block">
              Nueva contraseña
            </label>
            <Input
              type="password"
              placeholder="Mínimo 8 caracteres, 1 mayúscula, 1 número"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={submitting}
            />
          </div>

          <div>
            <label className="text-xs uppercase font-semibold text-gray-500 mb-1 block">
              Confirmar contraseña
            </label>
            <Input
              type="password"
              placeholder="Repite la contraseña"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              disabled={submitting}
            />
          </div>

          {error && (
            <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={submitting || !password || !confirm}
            className="w-full bg-[var(--color-primary)] text-white py-3 rounded-xl font-semibold hover:bg-[var(--color-button-hover)] disabled:opacity-50 transition-colors"
          >
            {submitting ? "Actualizando..." : "Establecer contraseña"}
          </Button>
        </form>

        <p className="text-xs text-center text-gray-400">
          Tu contraseña debe tener al menos 8 caracteres, una mayúscula y un número.
        </p>
      </div>
    </div>
  );
}
