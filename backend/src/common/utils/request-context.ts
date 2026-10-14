import { Request } from "express";
export type RequestContext = Request & { correlationId?: string };
