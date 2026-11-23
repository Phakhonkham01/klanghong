declare module "wenova-link" {
  export interface SendOtpInput {
    header: string;
    /** 10 digits starting with 20, e.g. 2012345678 */
    phoneNumber: string;
    message: string;
    token?: string;
    scriptId?: number;
    usePackage: boolean;
    baseUrl?: string;
  }
  export function sendOtp(data: SendOtpInput): Promise<unknown>;
  export class WenovaApiError extends Error {
    code?: number;
    status?: number;
  }
}
