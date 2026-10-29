import { ExecutionContext } from "@nestjs/common";
import { Request } from "express";
import { createHash } from "node:crypto";
import { MAX_CHUNKS } from "../../../programme-codec.cjs";

/** Eight bounded asset buckets per caller; snapshot UUIDs cannot mint unlimited keys. */
export function programmeChunkKey(
  context: ExecutionContext,
  tracker: string,
  name: string,
): string {
  const request = context.switchToHttp().getRequest<Request>();
  const raw = request.params.index;
  const index =
    typeof raw === "string" && /^\d{1,4}$/.test(raw) ? Number(raw) : -1;
  const bucket =
    index >= 0 && index < MAX_CHUNKS ? String(index % 8) : "invalid";
  return createHash("sha256")
    .update(
      JSON.stringify([
        context.getClass().name,
        context.getHandler().name,
        name,
        tracker,
        bucket,
      ]),
    )
    .digest("hex");
}
