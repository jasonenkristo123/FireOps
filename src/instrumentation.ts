import type { Instrumentation } from "next";
// Deliberately omit exception messages, request headers, URLs, bodies and user identity.
export const onRequestError: Instrumentation.onRequestError = (
  _error,
  _request,
  context,
) => {
  console.error(
    JSON.stringify({
      event: "fireops_request_error",
      route: context.routePath,
      type: context.routeType,
      at: new Date().toISOString(),
    }),
  );
};
