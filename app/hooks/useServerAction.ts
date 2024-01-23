import { useSubmit } from "@remix-run/react";
import { useCallback } from "react";
import { modify } from "~/utils";

export const useServerAction = (): ((actionId: string, data: any) => void) => {
  const submit = useSubmit();

  const actionHandler = useCallback(
    (actionId: string, data: any) => {
      // app 前后端交互数据需要转换
      const requestBody = modify.stringify({ action: actionId, data });

      submit(requestBody, { method: "POST" });
    },
    [submit]
  );

  return actionHandler;
};
