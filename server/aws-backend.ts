import { ENV } from "./_core/env";

export function isAwsBackendEnabled(request?: { headers?: Record<string, string | string[] | undefined> }) {
  const requestedMode = request?.headers?.["x-sevaflow-backend-mode"];
  return ENV.backendMode === "aws" || requestedMode === "aws";
}

export async function awsJson<T>(path: string, body?: unknown): Promise<T> {
  if (!ENV.awsApiBaseUrl) {
    throw new Error("AWS backend mode is enabled but SEVAFLOW_AWS_API_BASE_URL is not configured");
  }
  const url = `${ENV.awsApiBaseUrl.replace(/\/+$/, "")}${path}`;
  const response = await fetch(url, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? { accept: "application/json" } : { "content-type": "application/json", accept: "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const raw = await response.text();
  let payload: unknown = {};
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    payload = { error: raw || response.statusText };
  }
  if (!response.ok) {
    const message = typeof payload === "object" && payload && "error" in payload ? String(payload.error) : response.statusText;
    throw new Error(`AWS backend ${response.status}: ${message}`);
  }
  return payload as T;
}

export async function awsUpload(path: string, data: Buffer, contentType: string): Promise<void> {
  const response = await fetch(path, {
    method: "PUT",
    headers: { "content-type": contentType },
    body: new Blob([new Uint8Array(data)], { type: contentType }),
  });
  if (!response.ok) throw new Error(`AWS media upload failed (${response.status})`);
}
