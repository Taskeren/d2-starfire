import { AuthorizationResponse } from "./auth.ts";

declare global {
  namespace Express {
    interface Request {
      loginAs: AuthorizationResponse | null;
    }
  }
}
