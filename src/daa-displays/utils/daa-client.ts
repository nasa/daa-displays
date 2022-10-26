/**
 * ## Notices
 * Copyright 2019 United States Government as represented by the Administrator 
 * of the National Aeronautics and Space Administration. All Rights Reserved.
 * 
 * ## Disclaimers
 * No Warranty: THE SUBJECT SOFTWARE IS PROVIDED "AS IS" WITHOUT ANY WARRANTY OF ANY KIND, 
 * EITHER EXPRESSED, IMPLIED, OR STATUTORY, INCLUDING, BUT NOT LIMITED TO, ANY WARRANTY 
 * THAT THE SUBJECT SOFTWARE WILL CONFORM TO SPECIFICATIONS, ANY IMPLIED WARRANTIES OF 
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR FREEDOM FROM INFRINGEMENT, 
 * ANY WARRANTY THAT THE SUBJECT SOFTWARE WILL BE ERROR FREE, OR ANY WARRANTY THAT 
 * DOCUMENTATION, IF PROVIDED, WILL CONFORM TO THE SUBJECT SOFTWARE. THIS AGREEMENT DOES NOT, 
 * IN ANY MANNER, CONSTITUTE AN ENDORSEMENT BY GOVERNMENT AGENCY OR ANY PRIOR RECIPIENT 
 * OF ANY RESULTS, RESULTING DESIGNS, HARDWARE, SOFTWARE PRODUCTS OR ANY OTHER APPLICATIONS 
 * RESULTING FROM USE OF THE SUBJECT SOFTWARE.  FURTHER, GOVERNMENT AGENCY DISCLAIMS 
 * ALL WARRANTIES AND LIABILITIES REGARDING THIRD-PARTY SOFTWARE, IF PRESENT IN THE 
 * ORIGINAL SOFTWARE, AND DISTRIBUTES IT "AS IS."
 * 
 * Waiver and Indemnity:  RECIPIENT AGREES TO WAIVE ANY AND ALL CLAIMS AGAINST THE 
 * UNITED STATES GOVERNMENT, ITS CONTRACTORS AND SUBCONTRACTORS, AS WELL AS ANY PRIOR 
 * RECIPIENT.  IF RECIPIENT'S USE OF THE SUBJECT SOFTWARE RESULTS IN ANY LIABILITIES, 
 * DEMANDS, DAMAGES, EXPENSES OR LOSSES ARISING FROM SUCH USE, INCLUDING ANY DAMAGES 
 * FROM PRODUCTS BASED ON, OR RESULTING FROM, RECIPIENT'S USE OF THE SUBJECT SOFTWARE, 
 * RECIPIENT SHALL INDEMNIFY AND HOLD HARMLESS THE UNITED STATES GOVERNMENT, 
 * ITS CONTRACTORS AND SUBCONTRACTORS, AS WELL AS ANY PRIOR RECIPIENT, TO THE EXTENT 
 * PERMITTED BY LAW.  RECIPIENT'S SOLE REMEDY FOR ANY SUCH MATTER SHALL BE THE IMMEDIATE, 
 * UNILATERAL TERMINATION OF THIS AGREEMENT.
 */

import { ScenarioDescriptor } from "./daa-server";
import { uuid } from "./daa-utils";
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
            const wsUrl = this.href.replace("http", "ws");
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
    async send (request: Token): Promise<any> {
        if (!this.ws) {
            await this.connectToServer();
        }
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
                    request.id = request.id || uuid();
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