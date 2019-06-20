import * as vscode from 'vscode';
import { Time } from '../util/time';
import { OAuthProvider, OAuthResponse } from './authInfo';
import { Disposable } from 'vscode';
import { v4 } from 'uuid';
import fetch from 'node-fetch';

const DANCER_URL = "https://nrundquist-dancer.ap-southeast-2.dev.atl-paas.net";
//const DANCER_URL = "http://localhost:31415";

export class OAuthDancer implements Disposable {
    private static _instance: OAuthDancer;

    private _authsInFlight: OAuthProvider[] = [];
    private _timeoutTimers: Map<OAuthProvider, any> = new Map();
    private _shutdownCheck: any;
    private _browserTimeout = 5 * Time.MINUTES;

    private constructor() {
    }

    public static get Instance(): OAuthDancer {
        return this._instance || (this._instance = new this());
    }

    dispose() {
        this.forceShutdownAll();
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    public async doDance(provider: OAuthProvider): Promise<OAuthResponse> {
        this.clearAuthInFlight(provider);
        await this.sleep(1 * Time.SECONDS);

        this._authsInFlight.push(provider);
        const state = v4();
        const protocol = vscode.version.endsWith("-insider") ? "vscode-insiders" : "vscode";

        vscode.env.openExternal(vscode.Uri.parse(`${DANCER_URL}/auth/${provider}?state=${state}&protocol=${protocol}`));
        this.startTimeoutTimer(provider);

        while(true) {
            const result = await this.pollForAuth(state);
            if (result) {
                return result;
            }
            await this.sleep(1000);
        }
    }

    private async pollForAuth(state: string): Promise <OAuthResponse | undefined> {
        var res: any | undefined;
        try {
            res = await fetch(`${DANCER_URL}/poll?state=${state}`);
        } catch (e) {
            console.log(`nope: ${JSON.stringify(e)}`);
        }

        if (res && res.ok) {
            const j = await res.json();
            return j;
        }
        return undefined;
    }

    private clearAuthInFlight(provider: OAuthProvider) {
        let myIndex = this._authsInFlight.indexOf(provider);
        if (myIndex > -1) {
            this._authsInFlight.splice(myIndex, 1);
        }

        const timer = this._timeoutTimers.get(provider);
        if (timer) {
            clearTimeout(timer);
            this._timeoutTimers.delete(provider);
        }
    }

    private forceShutdownAll() {
        this._authsInFlight.forEach(provider => {
            const timer = this._timeoutTimers.get(provider);
            if (timer) {
                clearTimeout(timer);
                this._timeoutTimers.delete(provider);
            }
        });

        this._authsInFlight = [];

        if (this._shutdownCheck) {
            clearInterval(this._shutdownCheck);
        }
    }

    private startTimeoutTimer(provider: OAuthProvider) {
        //make sure we clear the old one in case they click multiple times
        const oldTimer = this._timeoutTimers.get(provider);
        if (oldTimer) {
            clearTimeout(oldTimer);
            this._timeoutTimers.delete(provider);
        }

        this._timeoutTimers.set(provider, setTimeout(() => {
            // We timed out. What does that mean?
        }, this._browserTimeout));
    }
}
