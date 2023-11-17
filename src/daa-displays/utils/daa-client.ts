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

import { DaaServerCommand, ScenarioDescriptor } from "./daa-types";
import { uuid } from "./daa-utils";
export interface Token {
    type: DaaServerCommand,
    id?: string,
    time?: { client: { sent: string } };
    data?: {
        command?: string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // websocket connection
    protected ws: WebSocket | null = null;
    // server address
    protected href: string;
    // internal flag, used to enable/disable profiling info for monitoring connection latency
    protected profilingEnabled: boolean = false;
    /**
     * resolveMap associates requests, responses and Promises' resolve functions
     * it is used to ensure resolution of send requests performed by clients 
     */
    protected resolveMap: {
        [id:string]: {
            request: Token,
            response: ScenarioDescriptor,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            resolve: (...args: any) => void 
        }
    } = {};
    /**
     * Utility function, connects the client to the server
     */
    async connectToServer (href?: string): Promise<WebSocket | null> {
        this.href = href || document.location.href;//"http://localhost";
        // check if a connection has already been created, if so re-use the connection
        if (this.ws) {
            // check if the client is already trying to connect to the server, if so wait until the connection is established
            if (this.ws.readyState === this.ws.CONNECTING) {
                return await new Promise((resolve) => {
                    if (this.ws) {
                        this.ws.onopen = () => {
                            resolve(this.ws);
                        };
                    } else {
                        resolve(null);
                    }
                });
            }
            // already connected
            return this.ws;
        }
        // otherwise return a new connection
        return new Promise((resolve) => {
            const wsUrl = this.href.replace("http", "ws");
            this.ws = new WebSocket(wsUrl);
            this.ws.onopen = () => {
                resolve(this.ws);
            };
            this.ws.onerror = (evt: Event) => {
                console.error("Websocket closed unexpectedly :/", evt);
                resolve(null);
            };
            this.ws.onclose = (evt) => {
                console.info("Websocket closed gracefully", evt);
                this.ws = null;
                resolve(null);
            };
            this.ws.onmessage = (evt: MessageEvent) => {
                console.error("Warning, client has not defined a callback function", evt);
            };
        });
    }
    /**
     * Utility function, sends a message to the server
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async send (request: Token): Promise<any> {
        if (!this.ws) {
            await this.connectToServer();
        }
        if (this.ws) {
            if (request?.type) {
                request.id = request.id || uuid();
                // add profiling data
                if (this.profilingEnabled) {
                    const time: string = new Date().toISOString();
                    request.time = { client: { sent: time } };
                }
                // store resolve function
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const res: Promise<any> = new Promise ((resolve) => {
                    this.resolveMap[<string>request.id] = {
                        request: request,
                        response: {
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
                            Metrics: null,
                            WindVectors: null // FROM
                        },
                        resolve
                    };
                });
                // send request
                this.ws.send(JSON.stringify(request));
                this.ws.onmessage = (evt): void => {
                    try {
                        const response: Token = JSON.parse(evt.data);
                        const request: Token = this.resolveMap[<string>response.id]?.request;
                        if (response) {
                            // add profiling data
                            if (this.profilingEnabled && response.time?.client) {
                                const time = new Date().getTime() - +response.time.client.sent;
                                console.log("[daa-client] Time to response", time, "ms");
                            }
                            // sanity check
                            if (response?.type === request?.type) {
                                if (response && response.type === "exec") {
                                    // the "exec" response type spans the response over multiple messages, one for each DaidalusBandsDescriptor component
                                    // each message is read and the data component is used to fill in the blanks in this.resolveMap[request.id].response
                                    // this is done because the amount of data may be huge (GB) and the websocket connection would break
                                    const data: { key: string, val: unknown, idx: number, tot: number } = 
                                        <{ key: string, val: unknown, idx: number, tot: number }> response.data;
                                    this.resolveMap[<string>request.id].response[data.key] = data.val;
                                    // if this was the last data chunk, resolve the promise
                                    if (data.idx === data.tot - 1) {
                                        // copy all the data collected
                                        response.data = this.resolveMap[<string>request.id].response
                                        // resolve the promise
                                        this.resolveMap[<string>request.id].resolve(response);
                                        // delete the entry
                                        delete this.resolveMap[<string>request.id];
                                    }
                                } else {
                                    // resolve the promise
                                    this.resolveMap[<string>request.id].resolve(response);
                                    // delete the entry
                                    delete this.resolveMap[<string>request.id];
                                }
                            } else {
                                console.warn(`[daa-client] Warning: mismatch between response type and request type`, request, response);
                            }
                        } else {
                            console.warn("[daa-client] Warning: null response?", response);
                        }
                    } catch (error) {
                        console.warn("[daa-client] Warning: malformed response, unable to parse JSON structure", error);
                    }
                }
                return res;
            }
            console.error("[daa-client] Error: Unable to send request, field 'type' is undefined in the request data structure", request);
            return null;
        }
        console.error("[daa-client] Cannot send, WebSocket closed :/");
        return null;
    }
    /**
     * @deprecated
     * Utility function, used for testing purposes
     */
    async startJasmineTestRunner(): Promise<void> {
        if (this.ws) {
            this.send({
                type: DaaServerCommand.jasmine,
            });
            return Promise.resolve();
        }
        console.error("Cannot start jasmine test runner, WebSocket closed :/");
        return Promise.reject();
    }
}