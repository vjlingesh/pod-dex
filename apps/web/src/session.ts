import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "./api.js";

export type Me = {
  user: { id: string; email: string; name: string };
  orgId: string | null;
};

type State = { status: "loading" } | { status: "signed-out" } | { status: "signed-in"; me: Me };

/**
 * Server-side view of who the caller is and which workspace is active.
 * Preferred over the client session object because the active org lives on the
 * session row, and the server is the only thing that can be trusted about it.
 */
export function useMe() {
  const [state, setState] = useState<State>({ status: "loading" });

  const refresh = useCallback(async () => {
    try {
      setState({ status: "signed-in", me: await apiFetch<Me>("/me") });
    } catch {
      setState({ status: "signed-out" });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { state, refresh };
}
