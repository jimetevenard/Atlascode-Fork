import axios, { AxiosResponse, AxiosInstance } from 'axios';
import { DetailedSiteInfo } from '../atlclients/authInfo';
import { OAuthInterceptor } from '../atlclients/oauthInterceptor';
import { AuthorizationInterceptor } from '../atlclients/authorizationInterceptor';
import { Container } from '../container';

export class Client {
    readonly transport: AxiosInstance;
    private readonly baseUrl: string;
    private readonly interceptor: AuthorizationInterceptor;

    constructor(
        site: DetailedSiteInfo,
        private agent: any,
        private errorHandler: (errJson: AxiosResponse) => Promise<Error>
    ) {
        this.baseUrl = site.baseApiUrl;
        this.transport = axios.create();
        this.interceptor = new OAuthInterceptor(site, Container.credentialManager, this.transport);
        if (this.interceptor) { console.log('nick is too lazy to figure out how to suppress this error'); }
    }

    async get(urlSlug: string, queryParams?: any) {
        let url = `${this.baseUrl}${urlSlug}`;
        url = this.addQueryParams(url, queryParams);

        try {
            const res = await this.transport(url, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json"
                },
                httpsAgent: this.agent
            });

            return { data: res.data, headers: res.headers };
        } catch (e) {
            if (e.response) {
                return Promise.reject(await this.errorHandler(e.response));
            } else {
                return Promise.reject(e);
            }

        }
    }

    async getURL(url: string) {

        try {
            const res = await axios(url, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: this.authHeader
                },
                httpsAgent: this.agent
            });

            return { data: res.data, headers: res.headers };
        } catch (e) {
            if (e.response) {
                return Promise.reject(await this.errorHandler(e.response));
            } else {
                return Promise.reject(e);
            }

        }
    }

    async getOctetStream(urlSlug: string, queryParams?: any) {
        let url = `${this.baseUrl}${urlSlug}`;
        url = this.addQueryParams(url, queryParams);

        try {
            const res = await this.transport(url, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "accept": "application/octet-stream"
                },
                httpsAgent: this.agent
            });
            return { data: res.data, headers: res.headers };
        } catch (e) {
            if (e.response) {
                return Promise.reject(await this.errorHandler(e.response));
            } else {
                return Promise.reject(e);
            }

        }
    }

    async post(urlSlug: string, body: any, queryParams?: any): Promise<any> {
        let url = `${this.baseUrl}${urlSlug}`;
        url = this.addQueryParams(url, queryParams);

        try {
            const res = await this.transport(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                data: JSON.stringify(body),
                httpsAgent: this.agent
            });

            return { data: res.data, headers: res.headers };
        } catch (e) {
            if (e.response) {
                return Promise.reject(await this.errorHandler(e.response));
            } else {
                return Promise.reject(e);
            }

        }
    }

    async put(urlSlug: string, body: any, queryParams?: any): Promise<any> {
        let url = `${this.baseUrl}${urlSlug}`;
        url = this.addQueryParams(url, queryParams);

        try {
            const res = await this.transport(url, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                data: JSON.stringify(body),
                httpsAgent: this.agent
            });

            return { data: res.data, headers: res.headers };
        } catch (e) {
            if (e.response) {
                return Promise.reject(await this.errorHandler(e.response));
            } else {
                return Promise.reject(e);
            }

        }
    }

    async delete(urlSlug: string, body: any, queryParams?: any): Promise<any> {
        let url = `${this.baseUrl}${urlSlug}`;
        url = this.addQueryParams(url, queryParams);

        try {
            const res = await this.transport(url, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json"
                },
                data: JSON.stringify(body),
                httpsAgent: this.agent
            });

            return { data: res.data, headers: res.headers };
        } catch (e) {
            if (e.response) {
                return Promise.reject(await this.errorHandler(e.response));
            } else {
                return Promise.reject(e);
            }

        }
    }

    private addQueryParams(url: string, queryParams?: any): string {
        let result = url;
        if (queryParams) {
            const sp = new URLSearchParams();
            for (const [k, v] of Object.entries(queryParams)) {
                sp.append(k, `${v}`);
            }
            result = `${result}?${sp.toString()}`;
        }

        return result;
    }
}

// ClientError wraps Error with a toJSON() method so that it can be passed as 
// part of a message to the webviews because Error fields are not enumerable
// by default
export class ClientError implements Error {

    constructor(public name: string, public message: string) { }

    toJSON() {
        return {
            name: this.name,
            message: this.message
        };
    }
}