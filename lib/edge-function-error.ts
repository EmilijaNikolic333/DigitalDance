/** supabase-js only gives a generic "non-2xx status code" message by default for a failed Edge
 * Function call - the actual reason our function rejected the request is in the response body it
 * returned, reachable via FunctionsHttpError's `context` (the raw Response). */
export async function readFunctionErrorMessage(error: { message: string; context?: Response }): Promise<string> {
  if (error.context && typeof error.context.json === "function") {
    try {
      const body = await error.context.clone().json();
      if (body?.error) return String(body.error);
    } catch {
      // context wasn't valid JSON - fall through to the generic message below.
    }
  }
  return error.message;
}
