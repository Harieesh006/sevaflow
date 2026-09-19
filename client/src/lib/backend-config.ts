export type BackendMode = "platform" | "aws";

const requestedMode = import.meta.env.VITE_BACKEND_MODE;

export const BACKEND_MODE: BackendMode = requestedMode === "aws" ? "aws" : "platform";
