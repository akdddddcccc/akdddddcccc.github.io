import { emptyOptionsResponse, jsonResponse, workflowModule } from "./_edge-runtime.js";

export function onRequestOptions() {
  return emptyOptionsResponse();
}

export async function onRequestGet(context) {
  const { openAIPing } = await workflowModule(context);
  return jsonResponse(await openAIPing());
}
