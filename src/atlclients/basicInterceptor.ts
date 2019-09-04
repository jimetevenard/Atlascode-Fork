import { DetailedSiteInfo, isBasicAuthInfo } from "./authInfo";
import { AxiosRequestConfig, AxiosInstance } from "axios";
import { CredentialManager } from "./authStore";
import { AuthorizationInterceptor } from "./authorizationInterceptor";

export class BasicInterceptor extends AuthorizationInterceptor {
    private _token: string | undefined;

    constructor(private _site: DetailedSiteInfo,
        private _authStore: CredentialManager,
        private _transport: AxiosInstance) {

        super();
        this._transport.interceptors.request.use(this.credentialInterceptor());
    }

    public async attachToAxios(transport: AxiosInstance) {
        this._transport = transport;

        this._transport.interceptors.request.use(this.credentialInterceptor());
    }

    private async getToken(): Promise<string | undefined> {
        if (!this._token) {
            const creds = await this._authStore.getAuthInfo(this._site);
            if (creds && isBasicAuthInfo(creds)) {
                this._token = Buffer.from(creds.username + ":" + creds.password).toString('base64');
            }
        }
        return this._token;
    }

    credentialInterceptor(): (config: AxiosRequestConfig) => any {
        return async (config: AxiosRequestConfig) => {
            config.headers.Authorization = `Basic ${await this.getToken()}`;
            return config;
        };
    }
}