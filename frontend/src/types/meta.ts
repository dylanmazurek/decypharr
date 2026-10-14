export interface DecypharrMeta {
  urlBase: string;
  version: string;
  setupRequired: boolean;
  setupError?: string;
  authEnabled: boolean;
  user?: string;
}