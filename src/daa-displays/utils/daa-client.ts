import { ScenarioDescriptor } from "./daa-server";
export interface Token {
    type: string,
    id?: string,
    time?: { client: { sent: string } };
    data?: {
        command?: string,
        [key: string]: any
    }
}

/**
 * Basic websocket client for interacting with the pvsio-web server
 * TODO: use Backbone to create callbacks instead of forcing an active wait on send
 * @author Paolo Masci
 * @date Dec 2018
 */
export class DAAClient {
    protected ws: WebSocket;
    protected href: string;
    protected profilingEnabled: boolean = false;
    constructor () {
        this.ws = null;
    }
    async connectToServer (href?: string): Promise<WebSocket> {
        this.href = href || document.location.href;//"http://localhost";
        if (this.ws) { 
            if (this.ws.readyState === this.ws.CONNECTING) {
                return new Promise((resolve, reject) => {
                    this.ws.onopen = (evt) => {
                        resolve(this.ws);
                    };
                });
            } else {
                return Promise.resolve(this.ws); 
            }
        }
        return new Promise((resolve, reject) => {
            const wsUrl = this.href.replace("http://", "ws://");
            this.ws = new WebSocket(wsUrl);
            this.ws.onopen = (evt) => {
                resolve(this.ws);
            };
            this.ws.onerror = (evt: Event) => {
                console.error("Websocket closed unexpectedly :/", evt);
                reject(evt);
            };
            this.ws.onclose = (evt) => {
                console.info("Websocket closed gracefully", evt);
                this.ws = null;
                resolve(null);
            };
            this.ws.onmessage = (evt: MessageEvent) => {
                console.error("Warning, client has not defined a callback function");
            };
        });
    }
    uuid (format?: string) {
        let d: number = new Date().getTime();
        format = format || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
        const uuid = format.replace(/[xy]/g, (c: string) => {
            const r: number = ((d + Math.random() * 16) % 16) | 0;
            d = Math.floor(d / 16);
            return (c === 'x' ? r : (r & 0x7 | 0x8)).toString(16);
        });
        return uuid;
    }
    async send (request: Token): Promise<any> {
        if (this.ws) {
            return new Promise((resolve, reject) => {
                let desc: ScenarioDescriptor = {
                    Info: null,
                    Ownship: null,
                    Wind: null, // FROM
                    Scenario: null,
                    Alerts: null, // alerts over time
                    "Heading Bands": null, // bands over time
                    "Horizontal Speed Bands": null,
                    "Vertical Speed Bands": null,
                    "Altitude Bands": null,
                    "Altitude Resolution": null,
                    "Horizontal Direction Resolution": null,
                    "Horizontal Speed Resolution": null,
                    "Vertical Speed Resolution": null,
                    "Contours": null,
                    "Hazard Zones": null,
                    Monitors: null,
                    Metrics: null
                };
                if (request && request.type) {
                    request.id = request.id || this.uuid();
                    if (this.profilingEnabled) {
                        const time: string = new Date().toISOString();
                        request.time = { client: { sent: time } };
                    }
                    // if (token.data && token.data.command && typeof token.data.command === "string") {
                    //     // removing white space is useful to reduce the message size (e.g., to prevent stdin buffer overflow)
                    //     token.data.command = token.data.command.split(",").map((str: string) => {
                    //         return str.trim();
                    //     }).join(",");
                    // }
                    this.ws.send(JSON.stringify(request));
                    this.ws.onmessage = (evt): void => {
                        const response: Token = JSON.parse(evt.data);
                        if (response) {
                            if (this.profilingEnabled && response.time?.client) {
                                const time = new Date().getTime() - +response.time.client.sent;
                                console.log("Time to response", time, "ms");
                            }
                            // sanity check
                            if (response?.type === request?.type) {
                                if (response && response.type === "exec") {
                                    // will receive DaidalusBandsDescriptor components
                                    const data: { key: string, val: any, idx: number, tot: number } = 
                                        <{ key: string, val: any, idx: number, tot: number }> response.data;
                                    desc[data.key] = data.val;
                                    if (data.idx === data.tot - 1) {
                                        response.data = desc;
                                        resolve(response);
                                    }
                                } else {
                                    resolve(response);
                                }
                            } else {
                                console.warn(`[daa-client] Warning: mismatch between response type and request type`, request, response);
                            }
                        } else {
                            console.warn("token does not include timestamp from client?", response);
                        }
                    };
                } else {
                    console.error("Token type is undefined", request);
                }    
            });
        }
        console.error("Cannot send, WebSocket closed :/");
        return Promise.resolve(null);
    }
    async startJasmineTestRunner(): Promise<void> {
        if (this.ws) {
            this.send({
                type: "start-jasmine-test-runner",
            });
            return Promise.resolve();
        }
        console.error("Cannot start jasmine test runner, WebSocket closed :/");
        return Promise.reject();
    }
}