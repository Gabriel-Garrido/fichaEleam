import { useEffect, useMemo, useState } from "react";
import Button from "../../components/Button";
import HelpTooltip from "../../components/HelpTooltip";
import Loading from "../../components/Loading";
import Modal from "../../components/Modal";
import { useToast } from "../../components/Toast";
import { FEATURE_CATALOG, featureDefaultMap } from "../permissions/featureCatalog";
import { DEFAULT_PERMS, FEATURE_ACTION_PERMISSIONS, PERMISSION_FEATURE, PERM_GROUPS, normalizePaymentAccess } from "./teamConstants";
import {
  getFuncionarioPermisos,
  getProfileFeaturePermissions,
  updateFuncionarioPermisos,
  updateProfileFeaturePermissions,
} from "./teamService";

const NOTHING_ALLOWED = Object.fromEntries(Object.keys(DEFAULT_PERMS).map((key) => [key, false]));
const NO_VISIBLE_AREAS = Object.fromEntries(FEATURE_CATALOG.map((feature) => [feature.id, false]));
const INTERNAL_ACTIONS = new Set(["ver_pagos_residentes"]);

export default function StaffPermissionsModal({ member, isOpen, onClose, initialPermissions = null, onApply = null, onDraftChange = null, embedded = false, primaryLabel, secondaryLabel, onSecondary, externalSaving = false }) {
  const toast = useToast();
  const [areas, setAreas] = useState(NO_VISIBLE_AREAS);
  const [actions, setActions] = useState(NOTHING_ALLOWED);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoadError(false);
    if (onApply) {
      const normalized = normalizePaymentAccess(
        { ...NO_VISIBLE_AREAS, ...(initialPermissions?.areas ?? {}) },
        { ...NOTHING_ALLOWED, ...(initialPermissions?.actions ?? {}) },
      );
      setActions(normalized.actions);
      setAreas(normalized.areas);
      setLoading(false);
      return;
    }
    if (!member?.id) return;
    let active = true;
    setActions(NOTHING_ALLOWED);
    setAreas(NO_VISIBLE_AREAS);
    setLoading(true);
    Promise.all([getFuncionarioPermisos(member.id), getProfileFeaturePermissions(member.id)])
      .then(([savedActions, savedAreas]) => {
        if (!active) return;
        const normalized = normalizePaymentAccess(
          featureDefaultMap("funcionario", savedAreas),
          { ...NOTHING_ALLOWED, ...(savedActions ?? {}) },
        );
        setActions(normalized.actions);
        setAreas(normalized.areas);
      })
      .catch((error) => {
        if (!active) return;
        setLoadError(true);
        toast(error.message || "No se pudieron cargar los permisos.", "error");
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [initialPermissions, isOpen, member?.id, onApply, toast]);

  const enabledAreas = useMemo(() => Object.values(areas).filter(Boolean).length, [areas]);

  const setAreaAccess = (featureId, checked) => {
    setAreas((current) => ({ ...current, [featureId]: checked }));
    if (featureId === "resident_payments") {
      const related = FEATURE_ACTION_PERMISSIONS.resident_payments ?? [];
      setActions((current) => checked
        ? { ...current, ver_pagos_residentes: true }
        : { ...current, ...Object.fromEntries(related.map((permission) => [permission, false])) });
      return;
    }
    if (!checked) {
      const related = FEATURE_ACTION_PERMISSIONS[featureId] ?? [];
      setActions((current) => ({
        ...current,
        ...Object.fromEntries(related.map((permission) => [permission, false])),
      }));
    }
  };

  const setActionAccess = (permission, checked) => {
    const featureId = PERMISSION_FEATURE[permission];
    if (featureId === "resident_payments") {
      const related = FEATURE_ACTION_PERMISSIONS.resident_payments ?? [];
      setActions((current) => permission === "ver_pagos_residentes" && !checked
        ? { ...current, ...Object.fromEntries(related.map((key) => [key, false])) }
        : { ...current, [permission]: checked, ...(checked ? { ver_pagos_residentes: true } : {}) });
      if (permission === "ver_pagos_residentes" && !checked) {
        setAreas((current) => ({ ...current, resident_payments: false }));
        return;
      }
    } else {
      setActions((current) => ({ ...current, [permission]: checked }));
    }
    if (checked && featureId) {
      setAreas((current) => ({ ...current, [featureId]: true }));
    }
  };

  const save = async () => {
    if (loadError) return;
    if (onApply) {
      onApply({ actions, areas });
      if (!embedded) onClose();
      return;
    }
    setSaving(true);
    try {
      await Promise.all([
        updateFuncionarioPermisos(member.id, actions),
        updateProfileFeaturePermissions(member.id, areas),
      ]);
      toast(`Permisos de ${member.nombre} actualizados.`, "success");
      onClose();
    } catch (error) {
      toast(error.message || "No se pudieron guardar los permisos.", "error");
    } finally {
      setSaving(false);
    }
  };

  const content = loading ? <Loading message="Cargando permisos..." /> : loadError ? (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
      <p className="font-semibold text-rose-900">No pudimos cargar los permisos actuales</p>
      <p className="mt-1 text-sm leading-6 text-rose-800">No se guardará ningún cambio para evitar reemplazarlos por error. Cierra esta ventana y vuelve a intentarlo.</p>
      <Button type="button" onClick={onClose} className="mt-4 border border-rose-200 bg-white text-rose-800">Cerrar</Button>
    </div>
  ) : (
        <div className="space-y-6">
          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
            <p className="font-semibold">Elige qué puede ver y qué puede cambiar esta persona.</p>
            <p className="mt-1 text-xs leading-5 text-sky-800">Ya tienes una configuración inicial. Cambia solo lo que necesites.</p>
          </div>

          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2"><h3 className="font-bold text-slate-950">1. Qué puede ver</h3><HelpTooltip label="Ayuda sobre secciones visibles">Cada opción es un permiso de lectura. Si está desactivada, el área desaparece del menú, sus enlaces no se muestran, las URL quedan bloqueadas y la base de datos no entrega sus registros.</HelpTooltip></div>
              <span className="text-xs font-semibold text-slate-500">{enabledAreas} de {FEATURE_CATALOG.length} visibles</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {FEATURE_CATALOG.map((feature) => <PermissionToggle key={feature.id} label={feature.id === "compliance" ? "Ver documentos y cumplimiento" : `Ver ${feature.label.toLowerCase()}`} description={feature.id === "compliance" ? "Documentos, requisitos, protocolos y controles del establecimiento." : feature.description} checked={areas[feature.id] === true} onChange={(checked) => setAreaAccess(feature.id, checked)} />)}
            </div>
          </section>

          <section>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-slate-950">2. Qué puede cambiar</h3>
              <HelpTooltip label="Ayuda sobre cambios permitidos">Estos permisos se aplican en la base de datos y controlan la creación, modificación, eliminación, validación y cierre de registros.</HelpTooltip>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {PERM_GROUPS.map((group) => (
                <fieldset key={group.label} className="rounded-2xl border border-slate-200 p-3">
                  <legend className="px-1 text-sm font-bold text-slate-900">{group.label}</legend>
                  <div className="space-y-2">
                    {group.perms.filter((permission) => !INTERNAL_ACTIONS.has(permission.key)).map((permission) => <PermissionToggle key={permission.key} compact label={permission.label} checked={actions[permission.key] === true} onChange={(checked) => setActionAccess(permission.key, checked)} />)}
                  </div>
                </fieldset>
              ))}
            </div>
          </section>

          <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-slate-200 bg-white pt-4 sm:flex-row sm:justify-end">
            <Button type="button" onClick={() => { onDraftChange?.({ actions, areas }); (onSecondary ?? onClose)(); }} disabled={saving || externalSaving} className="border border-slate-200 bg-white text-slate-700">{secondaryLabel ?? "Cancelar"}</Button>
            <Button type="button" onClick={save} disabled={saving || externalSaving || loadError} className="bg-teal-700 text-white hover:bg-teal-800">{saving || externalSaving ? "Guardando..." : primaryLabel ?? (onApply ? "Usar estos permisos" : "Guardar permisos")}</Button>
          </div>
        </div>
      );

  if (embedded) return content;

  return (
    <Modal isOpen={isOpen} onClose={() => !saving && onClose()} title={`Permisos · ${member?.nombre || "Nuevo funcionario"}`} panelClassName="max-w-4xl p-4 sm:p-6">
      {content}
    </Modal>
  );
}

function PermissionToggle({ label, description, checked, onChange, compact = false }) {
  return (
    <label className={`flex cursor-pointer items-start justify-between gap-3 rounded-xl border transition-colors ${compact ? "p-2.5" : "p-3"} ${checked ? "border-teal-200 bg-teal-50/70" : "border-slate-200 bg-white"}`}>
      <span className="min-w-0"><span className="block text-sm font-semibold text-slate-900">{label}</span>{description && <span className="mt-0.5 block text-xs leading-4 text-slate-500">{description}</span>}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-teal-700" />
    </label>
  );
}
