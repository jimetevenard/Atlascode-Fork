import { Logger } from "../logger";
import { DetailedSiteInfo, oauthProviderForSite, isOAuthInfo } from "./authInfo";
import { AxiosRequestConfig, AxiosInstance } from "axios";
import { Time } from "../util/time";
import { CredentialManager } from "./authStore";
import { AuthorizationInterceptor } from "./authorizationInterceptor";

export class OAuthInterceptor extends AuthorizationInterceptor {
    private _isRetrying: boolean;
    private _token: string | undefined;

    constructor(private _site: DetailedSiteInfo,
        private _authStore: CredentialManager,
        private _transport: AxiosInstance) {

        super();
        this._transport.interceptors.request.use(this.credentialInterceptor());
        this._transport.interceptors.response.use(function (response) {
            return response;
        }, this.errorInterceptor());
    }

    private async getToken(): Promise<string | undefined> {
        if (!this._token) {
            const creds = await this._authStore.getAuthInfo(this._site);
            if (creds && isOAuthInfo(creds)) {
                this._token = creds.access;
            }
        }
        return this._token;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    credentialInterceptor(): (config: AxiosRequestConfig) => any {
        return async (config: AxiosRequestConfig) => {
            config.headers.Authorization = `Bearer ${await this.getToken()}`;
            return config;
        };
    }

    errorInterceptor(): (error: any) => any {
        return async (error: any) => {
            if (error.response.status === 401) {
                Logger.debug('Received 401.');

                if (this._isRetrying) {
                    Logger.debug('Already retrying');
                    if (!error.config._isRetryRequest) {
                        return await this.waitAndRetryConfig(error.config);
                    }
                    Logger.debug('But this was a retry after failing');
                    this._isRetrying = false;
                    throw error;
                }

                this._isRetrying = true;
                const provider = oauthProviderForSite(this._site);
                if (provider) {
                    Logger.debug('Refreshing token.');
                    this._token = await this._authStore.refreshAccessToken(this._site);
                    this._isRetrying = false;
                    // const config: any = error.config;
                    // config.headers.Authorization = this._token;
                    // config._isRetryRequest = true;
                    Logger.debug('Token refreshed. Retrying original request.');
                    return this._transport(error.config);
                }
                this._isRetrying = false;
            }
            throw error;
        };
    }

    private async waitAndRetryConfig(config: AxiosRequestConfig): Promise<any> {
        while (this._isRetrying) {
            Logger.debug('Waiting on retry');
            await this.sleep(0.5 * Time.SECONDS);
        }
        // config.headers.Authorization = this._token;
        Logger.debug('Retrying a queued request');
        return this._transport(config);
    }

}