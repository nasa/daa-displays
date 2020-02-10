/**
 * Basic websocket client for interacting with the pvsio-web server
 * @author Paolo Masci
 * @date Dec 2018
 */
export class DAAClient {
    ws: WebSocket;
    href: string;
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
    async send (token): Promise<any> {
        if (this.ws) {
            return new Promise((resolve, reject) => {
                this.ws.onmessage = function (evt) {
                    const token = JSON.parse(evt.data);
                    if (token && token.time && token.time.client) {
                        const time = new Date().getTime() - token.time.client.sent;
                        // console.log("Time to response", time, "ms");
                        if (token.type.indexOf("_error") >= 0) {
                            console.error(token); // errors should always be reported in the browser console
                        }
                        resolve(token);
                    } else {
                        console.warn("token does not include timestamp from client?", token);
                    }
                };
                if (token && token.type) {
                    const time: string = new Date().toISOString(); // TODO: replace with RFC4122 uuid
                    token.id = token.id || time;
                    token.time = { client: { sent: time } };
                    if (token.data && token.data.command && typeof token.data.command === "string") {
                        // removing white space is useful to reduce the message size (e.g., to prevent stdin buffer overflow)
                        token.data.command = token.data.command.split(",").map((str: string) => {
                            return str.trim();
                        }).join(",");
                    }
                    this.ws.send(JSON.stringify(token));
                } else {
                    console.error("Token type is undefined", token);
                }    
            });
        }
        console.error("Cannot send, WebSocket closed :/");
        return Promise.reject();
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
