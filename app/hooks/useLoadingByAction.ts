import { useNavigation } from "@remix-run/react";

export const useLoadingByAction = (actionId?: string) => {
  const n = useNavigation();

  if (!actionId) return n.state === "submitting";

  return n.state === "submitting" && n.formData?.get("action") === actionId;
};
