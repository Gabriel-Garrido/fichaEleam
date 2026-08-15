import { Navigate, useSearchParams } from "react-router-dom";
import { isValidUUID } from "../../utils/validators";

export default function LegacyObservationRedirect({ create = false }) {
  const [searchParams] = useSearchParams();
  const residentId = searchParams.get("residenteId");

  if (!isValidUUID(residentId)) return <Navigate to="/residents" replace />;

  const params = new URLSearchParams({ tab: "evolucion" });
  if (create) params.set("nuevaEvolucion", "1");
  return <Navigate to={`/residents/${residentId}?${params.toString()}`} replace />;
}
