import type { ImdodApi } from './index';

declare global {
  interface Window {
    imdod: ImdodApi;
  }
}
