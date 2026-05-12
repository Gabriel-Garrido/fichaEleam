import { useCallback, useEffect, useMemo, useState } from "react";
import Loading from "../../components/Loading";
import FeaturePermissionMatrix from "../permissions/FeaturePermissionMatrix";
import { FEATURE_ROLES, featureDefaultMap } from "../permissions/featureCatalog";
import { getEleamFeaturePermissions, saveEleamRoleFeaturePermissions } from "../permissions/featurePermissionsService";
import SuperAdminPageHeader from "./components/SuperAdminPageHeader";
import { getAllEleams } from "./superadminService";

const ROLE_LABEL = {
  admin_eleam: "Admin ELEAM",
  funcionario: "Funcionario",
  familiar: "Familiar",
};

export default function SuperAdminPermisos() {
  const [eleams, setEleams] = useState([]);
  const [selectedEleamId, setSelectedEleamId] = useState("");
  const [activeRole, setActiveRole] = useState("admin_eleam");
  const [permissions, setPermissions] = useState({});
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const filteredEleams = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return eleams;
    return eleams.filter((eleam) => `${eleam.nombre} ${eleam.email_admin ?? ""}`.toLowerCase().includes(q));
  }, [eleams, query]);

  const selectedEleam = eleams.find((eleam) => eleam.id === selectedEleamId);

  const load = useCallback(async () => {
    setLoading(true);
    const rows = await getAllEleams();
    setEleams(rows);
    const first = rows[0]?.id || "";
    setSelectedEleamId(first);
    if (first) setPermissions(await getEleamFeaturePermissions(first));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handlePickEleam = async (eleamId) => {
    setSelectedEleamId(eleamId);
    setNotice("");
    setPermissions(await getEleamFeaturePermissions(eleamId));
  };

  const rolePerms = permissions[activeRole] ?? featureDefaultMap(activeRole);

  const handleSave = async () => {
    if (!selectedEleamId) return;
    setSaving(true);
    setNotice("");
    try {
      await saveEleamRoleFeaturePermissions(selectedEleamId, activeRole, rolePerms);
      setNotice("Permisos actualizados.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPermissions((prev) => ({
      ...prev,
      [activeRole]: featureDefaultMap(activeRole),
    }));
    setNotice("Defaults restaurados en pantalla. Guarda para aplicar.");
  };

  if (loading) return <Loading message="Cargando permisos..." />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <SuperAdminPageHeader
        title="Permisos por feature"
        description="Define qué módulos puede usar cada rol en cada ELEAM. El admin del ELEAM solo puede ajustar usuarios dentro de estos límites."
        actions={
          <>
            <button type="button" onClick={handleReset} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Restaurar defaults
            </button>
            <button type="button" onClick={handleSave} disabled={saving || !selectedEleamId} className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60">
              {saving ? "Guardando..." : "Guardar rol"}
            </button>
          </>
        }
      />

      {notice && <div className="mb-4 rounded-2xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-800">{notice}</div>}

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Buscar ELEAM</label>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nombre o correo"
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          />
          <div className="mt-4 max-h-[60vh] space-y-1 overflow-y-auto">
            {filteredEleams.map((eleam) => (
              <button
                key={eleam.id}
                type="button"
                onClick={() => handlePickEleam(eleam.id)}
                className={`w-full rounded-2xl px-3 py-3 text-left ${selectedEleamId === eleam.id ? "bg-teal-50 text-teal-900 ring-1 ring-teal-100" : "hover:bg-slate-50"}`}
              >
                <span className="block truncate text-sm font-semibold">{eleam.nombre}</span>
                <span className="block truncate text-xs text-slate-500">{eleam.email_admin}</span>
              </button>
            ))}
          </div>
        </aside>

        <section>
          <div className="mb-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-950">{selectedEleam?.nombre ?? "Selecciona un ELEAM"}</h2>
                <p className="text-sm text-slate-500">Configura un rol a la vez para evitar cambios accidentales.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {FEATURE_ROLES.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setActiveRole(role)}
                    className={`rounded-xl px-3 py-2 text-sm font-semibold ${activeRole === role ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-600"}`}
                  >
                    {ROLE_LABEL[role]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <FeaturePermissionMatrix
            role={activeRole}
            value={rolePerms}
            onChange={(next) => setPermissions((prev) => ({ ...prev, [activeRole]: next }))}
            title={`Features para ${ROLE_LABEL[activeRole]}`}
            description="Estos permisos definen el máximo disponible para este rol dentro del ELEAM."
          />
        </section>
      </div>
    </div>
  );
}
