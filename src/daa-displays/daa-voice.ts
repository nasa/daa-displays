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

import { alertRegion2symbol, computeBearing, computeNmiDistance, DaaSymbol, severity, symbol2alertRegion } from "./daa-utils";
import { rad2deg } from "./utils/daa-math";
import { DaaBands, DAA_AircraftDescriptor, LatLon, LLAPosition, Vector3D, AlertRegion } from "./utils/daa-types";
import { getAlertingAircraftMap } from "./utils/daa-utils";

// convenient type definitions
export interface VoiceDescriptor {
    name: string,
    lang: string,
    localService: boolean
}
export enum GuidanceKind {
    "RTCA DO-365" = "RTCA DO-365",
    ATC = "ATC"
}
export interface GuidanceDescriptor {
    name: GuidanceKind
}
export type Guidance = {
    text2speak: string,
    subtitles?: string // when subtitles are not present, text2speak is used as subtitle
}[];
export interface CommData {
    ownship: LLAPosition,
    traffic: LLAPosition[],
    bands: DaaBands
}
export enum FeedbackInfo {
    position = "position",
    distance = "distance",
    direction = "direction"
}
export type GuidanceVoice = SpeechSynthesisVoice | "Alex" | "Samantha" | string;
// convenient constants
export const DEFAULT_VOICE_NAME: GuidanceVoice = "Samantha";
export const DEFAULT_VOICE_PITCH: number = 1.2;
export const DEFAULT_VOICE_RATE: number = 1.2;
export const DEFAULT_VOICE_VOLUME: number = 0.5; // 50%
export const DEFAULT_PAUSE_LEN: number = 250; //ms
export const DEFAULT_GUIDANCE_KIND: GuidanceKind = GuidanceKind.ATC;
export const DEFAULT_SAME_ALERTING_TIMEOUT: number = 32000; //ms

/**
 * Utility function, checks if two voices are the same
 */
export function sameVoice (v1: GuidanceVoice, v2: GuidanceVoice): boolean {
    if (!v1 || !v2) { return false; }
    const name1: string = typeof v1 === "string" ? v1 : v1?.name;
    const name2: string = typeof v2 === "string" ? v2 : v2?.name;
    return name1 === name2;
}


/**
 * DaaVoice class
 */
export class DaaVoice {
    protected enabled: boolean = true; // whether voice feedback is enabled
    protected can_speak_now: boolean = true; // whether a message is already being spoken
    protected repeat_timer: NodeJS.Timer; // used to iintroduce pauses between spoken text chunks
    protected voices: SpeechSynthesisVoice[] = window?.speechSynthesis?.getVoices() || [];
    protected synthVoice: SpeechSynthesisUtterance = new SpeechSynthesisUtterance(); // see APIs at https://lists.w3.org/Archives/Public/public-speech-api/2012Oct/0004.html
    protected pingSound: HTMLAudioElement;

    // settings
    protected selectedVoice: GuidanceVoice = DEFAULT_VOICE_NAME;
    protected selectedKind: GuidanceKind = GuidanceKind["RTCA DO-365"];
    protected selectedRate: number = DEFAULT_VOICE_RATE;
    protected selectedPitch: number = DEFAULT_VOICE_PITCH;
    protected selectedVolume: number = DEFAULT_VOICE_VOLUME;
    protected selectedPause: number = DEFAULT_PAUSE_LEN; // ms

    // info about last alerting aircraft, used to avoid repeated alerts on the same aircraft
    protected lastAlertingAircraft: { callSign: string, symbol: DaaSymbol } = null;
    protected repeatedAlertTimer: NodeJS.Timeout = null;
    protected repeatedAlertTimeout: number = DEFAULT_SAME_ALERTING_TIMEOUT;

    // chunks of the message that will be read by the synthetic voice
    protected chunks: string[] = null;

    // text used to introduce pauses in the electronic speech
    // readonly PAUSE: string = `... ... ... ...`;

    // Phonetic rules for the pronunciation of numbers
    // these rules are based on comments from JC
    //     "9" is actually pronounced "niner" by pilots/controllers, as part of (I think) the international phonetic alphabet, to avoid confusion with the German negative ("nein"). 
    //     "5" is pronounced "fife" 
    //     "3" is pronounced "tree"
    readonly phoneticRules: { [key:string]: string } = {
        "1": "one",
        "2": "two",
        "3": "tree",
        "4": "four",
        "5": "fife",
        "6": "six",
        "7": "seven",
        "8": "eight",
        "9": "niner",
        "0": "zero"
    };

    /**
     * mapping betweeen heading angles and directions
     */
    readonly directionLimits: { [key: string]: [ number, number ] } = {
        north: [ -22.5, 22.5 ], // 0 ± 22.5
        northwest: [ 22.5, 67.5 ], // 45 ± 22.5
        west: [ 67.5, 112.5 ], // 90 ± 22.5
        southwest: [ 112.5, 157.5 ],
        south: [ 157.5, 202.5 ],
        southeast: [ 202.5, 247.5 ],
        east: [ 247.5, 292.5 ],
        northeast: [ 292.5, 337.5 ] // 337.5 = -22.5
    };

    /**
     * Constructor
     * opt.name from enumerated type Voice
     * opt.volume in [0..1]
     * opt.pitch in [0..2]
     * opt.rate in [0..2]
     * opt.pause in millis
     * opt.guidance from enumerated type GuidanceName
     */
    constructor (opt?: { name?: GuidanceVoice, volume?: number, pitch?: number, rate?: number, pause?: number, guidance?: GuidanceKind }) {
        opt = opt || {};
        this.selectedVoice = opt.name || DEFAULT_VOICE_NAME;
        this.selectedKind = opt.guidance || GuidanceKind.ATC;
        this.selectedRate = opt.rate || DEFAULT_VOICE_RATE;
        this.selectedPitch = opt.pitch || DEFAULT_VOICE_PITCH;
        this.selectedVolume = isFinite(opt.volume) ? opt.volume : DEFAULT_VOICE_VOLUME;
        this.selectedPause = opt.pause || DEFAULT_PAUSE_LEN;
        // load sounds
        this.pingSound = <HTMLAudioElement> document?.getElementById("danti-sound");
        if (!this.pingSound) {
            const audio: HTMLAudioElement = document?.createElement("audio");
            audio?.setAttribute("src", "daa-displays/sounds/mixkit-airport-radar-ping-1582.mp3")
            document?.body?.appendChild(audio);
            this.pingSound = <HTMLAudioElement> document?.getElementById("danti-sound");
        }
    }
    /**
     * Use the synthetic voice to read a message
     * To introduce pauses within the message, break the message into chunks and pass the chunks as an array 
     */
    async speak (msg: string | string[], opt?: { 
        voice?: SpeechSynthesisVoice | "Alex" | "Samantha" | string,
        volume?: number,
        rate?: number,
        pitch?: number
    }): Promise<boolean> {
        if (this.enabled && msg) {
            if (this.can_speak_now) {
                this.chunks = typeof msg === "string" ? [ msg ] : msg;
                if (this.chunks?.length) {
                    // mark as busy
                    this.can_speak_now = false;
                    // apply current settings
                    this.selectVoice(opt?.voice || this.selectedVoice);
                    this.selectVolume(opt?.volume === undefined ? this.selectedVolume : opt.volume); // volume values: 0..1
                    this.selectRate(opt?.rate || this.selectedRate);
                    this.selectPitch(opt?.pitch || this.selectedPitch);
                    console.log(`[daa-voice] speaking: ${this.chunks.join("; ")}`);
                    // speak all chunks, and introduce a small pause between each chunk
                    for (let i = 0; i < this.chunks?.length; i++) {
                        await this.speakNow(this.chunks[i]);
                        await this.wait(this.selectedPause);
                    }
                    this.can_speak_now = true;
                    return true;
                }
            } else {
                console.warn(`[daa-voice] Warning: voice synth busy, cannot speak now.`);
            }
        }
        return false;
    }
    /**
     * Internal function, speaks a message
     */
    protected async speakNow (msg: string): Promise<void> {
        if (msg) {
            if (this.synthVoice && window?.speechSynthesis) {
                this.synthVoice.text = msg;
                window.speechSynthesis.speak(this.synthVoice);
                // return control only when the voice has finished speaking
                return new Promise<void> ((resolve) => {
                    this.synthVoice.onend = () => {
                        resolve();
                    };
                });
            }
            console.warn(`[daa-voice] Warning: unable to speak (synhthetic voices not available)`, { synthVoice: this.synthVoice, speechSynthesis: window?.speechSynthesis });
        }
    }
    /**
     * Utility function, can be used to stop the speech
     */
    sayNoMore (): void {
        if (this.isSpeaking()) {
            window.speechSynthesis.cancel(); // The cancel() method removes all utterances from the utterance queue. If an utterance is currently being spoken, speaking will stop immediately.
            this.chunks = null;
            this.can_speak_now = true;
        }
    }
    /**
     * Internal function, waits a given amount of milliseconds
     */
    protected async wait (ms: number): Promise<void> {
        if (ms > 0) {
            return new Promise ((resolve) => {
                setTimeout (() => {
                    resolve();
                }, ms);
            });
        }
    }
    /**
     * Internal function, prints the current voice settings, useful for debugging purposes
     */
    protected currentSettings (): string {
        return `guidance: ${this.getSelectedGuidance()}, name: ${this.getSelectedVoice()}, volume: ${this.getSelectedVolume()}, rate: ${this.getSelectedRate()}, pitch: ${this.getSelectedPitch()}`;
    }
    /**
     * Utility function, can be used to check if the synt voice is speaking
     */
    isSpeaking (): boolean {
        return !this.can_speak_now;
    }
    /**
     * Utility function, enables/disables voice feedback
     */
    enableGuidace (flag: boolean): void {
        flag = flag === undefined ? true : !!flag;
        this.enabled = flag;
    }
    /**
     * Utility function, disabled voice feedback
     */
    disableGuidance (): void {
        this.enabled = false;
    }
    /**
     * Gets available synthetic voices
     * Default: english-speaking voices are provided, and the voices are available on the local service (i.e., offline)
     */
    getVoices (opt?: { lang?: "en-GB" | "en-US" | string | string[], gender?: "male" | "female", localService?: boolean }): SpeechSynthesisVoice[] {
        // make sure voices are loaded
        this.voices = this.voices?.length ? this.voices : window?.speechSynthesis?.getVoices();
        // filter voices
        opt = opt || {}
        opt.lang = opt.lang || [ "en-GB", "en-US" ];
        const langs: string[] = typeof opt.lang === "string" ? [ opt.lang ] : opt.lang;
        const localService: boolean = opt.localService === undefined ? true : false;
        if (this.voices?.length) {
            let selectedVoices: SpeechSynthesisVoice[] = this.voices.filter(voice => {
                return langs.includes(voice.lang) && voice.localService === localService;
            }) || [];
            if (opt?.gender) {
                selectedVoices = selectedVoices.filter(voice => {
                    return opt.gender === "female" ? voice.name.endsWith("a") : !voice.name.endsWith("a");
                }) || [];
            }
            return selectedVoices;
        }
        return [];
    }
    /**
     * Utility function, return voice names.
     * By default, female voices are placed at the front of the array
     */
    getVoiceDescriptors (opt?: { lang?: "en-GB" | "en-US" | string | string[], gender?: "male" | "female", localService?: boolean }): VoiceDescriptor[] {
        const selectedVoices: SpeechSynthesisVoice[] = 
            opt?.gender ? 
                this.getVoices(opt) 
                    : this.getVoices({ ...opt, gender:"female" }).concat(this.getVoices({ ...opt, gender:"male" }));
        return selectedVoices?.map(voice => {
            return { name: voice.name, lang: voice.lang, localService: voice.localService };
        });
    }
    /**
     * Utility function, returns the list of provided communication style
     * The default guidance is at the beginning of the list
     */
    getGuidanceDescriptors (): GuidanceDescriptor[] {
        return [
            { name: GuidanceKind.ATC },
            { name: GuidanceKind["RTCA DO-365"] }
        ];
    }
    /**
     * gets a specific synthetic voice, where the voice is either provided as SpeechSynthesisVoice object or by indicating the name (e.g., "Alex", "Samantha")
     */
    protected getVoice (voice?: SpeechSynthesisVoice | "Alex" | "Samantha" | string): SpeechSynthesisVoice {
        if (voice) {
            console.log(`[daa-voice] Using voice `, voice);
            const voices: SpeechSynthesisVoice[] = window?.speechSynthesis?.getVoices();
            const candidates: SpeechSynthesisVoice[] = (typeof voice === "string") ? voices?.filter(elem => {
                return elem.name === voice;
            }) : [ voice ];
            // console.log({ voices, candidates });
            return candidates?.length ? candidates[0] : null;
        }
        return null;
    }
    /**
     * selects a synthetic voice
     */
    selectVoice (voice: SpeechSynthesisVoice | "Alex" | "Samantha" | string): boolean {
        if (voice && this.synthVoice) {
            console.log(`[daa-voice] Trying to set voice to`, voice);
            const v: SpeechSynthesisVoice = this.getVoice(voice);
            if (v) {
                if (!this.synthVoice.voice || !sameVoice(this.selectedVoice, v)) {
                    console.log(`[daa-voice] Setting voice to ${v.name}`);
                    if (this.synthVoice.voice) {
                        // reset history when voice was initialized and is going to change
                        this.clearAlertingHistory();
                    }
                    this.selectedVoice = v;
                    this.synthVoice.voice = v;
                    this.synthVoice.rate = this.selectedRate;
                    this.synthVoice.pitch = this.selectedPitch;
                }
                return true;
            }
        }
        return false;
    }
    /**
     * Utility function, sets the voice volume level, valid values range from 0..1
     */
    selectVolume (vol: number): boolean {
        if (this.synthVoice && !isNaN(vol)) {
            const target: number = 
                vol < 0 ? 0
                : vol > 1 ? 1
                : vol;
            console.log(`[daa-voice] Setting volume to ${target}`);
            // Speaking volume between 0 and 1 inclusive, with 0 being lowest and 1 being highest, with a default of 1.0.
            this.synthVoice.volume = target;
            return true;
        }
        return false;
    }
    /**
     * Utility function, sets the voice rate, valid values range from 0.1 to 3
     * Speaking rate relative to the default rate for this voice. 1.0 is the
     * default rate supported by the speech synthesis engine or specific
     * voice (which should correspond to a normal speaking rate). 2.0 is twice as
     * fast, and 0.5 is half as fast. Values below 0.1 or above 10.0 are strictly
     * disallowed, but speech synthesis engines or specific voices may constrain
     * the minimum and maximum rates further—for example a particular voice may
     * not actually speak faster than 3 times normal even if you specify a value
     * larger than 3.0
     * See also https://lists.w3.org/Archives/Public/public-speech-api/2012Oct/0004.html
     */
    selectRate (rate: number): boolean {
        if (this.synthVoice && isFinite(rate)) {
            const target: number = 
                rate < 0.1 ? 0.1
                : rate > 3 ? 3
                : rate;
            if (target !== this.selectedRate) {
                console.log(`[daa-voice] Setting rate to ${target}`);
                this.selectedRate = target;
                this.synthVoice.rate = target;
                // reset history
                this.clearAlertingHistory();
            }
            return true;
        }
        return false;
    }
    /**
     * Utility function, sets the voice pitch
     * Speaking pitch between 0 and 2 inclusive, with 0 being lowest and 2 being
     * highest. 1.0 corresponds to the default pitch of the speech synthesis
     * engine or specific voice.  Speech synthesis engines or voices may constrain
     * the minimum and maximum rates further. If SSML is used, this value will be
     * overridden by prosody tags in the markup.
     * See also https://lists.w3.org/Archives/Public/public-speech-api/2012Oct/0004.html
     */
    selectPitch (pitch: number): boolean {
        if (this.synthVoice && isFinite(pitch)) {
            const target: number = 
                pitch < 0.1 ? 0.1
                : pitch > 2 ? 2
                : pitch;
            console.log(`[daa-voice] Setting pitch to ${target}`);
            if (target !== this.selectedPitch) {
                this.selectedPitch = target;
                this.synthVoice.pitch = target;
                // reset history
                this.clearAlertingHistory();
            }
            return true;
        }
        return false;
    }
    /**
     * Utility function, sets the guidance kind
     */
    selectGuidance (name: string): boolean {
        if (name) {
            const guidance: GuidanceKind = 
                name === GuidanceKind.ATC ? GuidanceKind.ATC
                : name === GuidanceKind["RTCA DO-365"] ? GuidanceKind["RTCA DO-365"]
                : null;
            if (guidance) {
                if (guidance !== this.selectedKind) {
                    this.selectedKind = guidance;
                    console.log(`[daa-voice] Setting guidance to ${guidance}`);
                    // reset history
                    this.clearAlertingHistory();
                }
                return true;
            }
            console.warn(`[daa-voice] Warning: Unable to set guidance (unsupported guidance kind ${name})`);
        }
        return false;
    }
    /**
     * Utility function, selects the amount of time for the pauses introduced in the speech
     */
    selectPause (ms: number): boolean {
        if (ms > 0) {
            this.selectedPause = ms;
            return true;
        }
        return false;
    }
    /**
     * Utility function, returns the selected voice volume (0=min, 1=max)
     */
    getSelectedVolume (): number {
        return this.selectedVolume;
    }
    /**
     * Utility function, returns the selected voice rate (0=min, 2=max)
     */
    getSelectedRate (): number {
        return this.selectedRate;
    }
    /**
     * Utility function, returns the selected voice pitch (0=min, 2=max)
     */
    getSelectedPitch (): number {
        return this.selectedPitch;
    }
    /**
     * Utility function, returns the selected guidance kind
     */
    getSelectedGuidance (): GuidanceKind {
        return this.selectedKind;
    }
    /**
     * Utility function, returns the selected guidance kind
     */
    getSelectedVoice (): GuidanceVoice {
        return this.selectedVoice;
    }
    /**
     * plays ping sound
     */
    ping (): void {
        console.log(`[daa-voice] alert sound`);
        this.pingSound?.play();
    }
    /**
     * Utility function, reads a number as ATC would read it to pilots,
     * e.g., "11" is enunciated "one-one" rather than "eleven"
     *       "12800" is enunciated "one two thousand eight hundred"
     */
    readNumber (num: string | number, opt?: { pause?: string }): string {
        const x: string = typeof num === "number" ? `${num}` : num;
        // this is the text used to introduce pauses between digits
        const pause: string = opt?.pause || " ";
        // msg stores the text returned by the function
        let msg: string = "";

        // split integer and fractional part -- we assume the number is well-formed, i.e., it has at most one decimal point
        const integer_part: string = x.includes(".") ? x.split(".")[0] : x;
        const fractional_part: string = x.includes(".") ? "." + x.split(".")[1] : "";

        // check whether the number ends with three zeros
        const thousands_flag: boolean = integer_part.endsWith("000");
        // check whether the number ends with two zeros
        const hundreds_flag: boolean = !thousands_flag && integer_part.endsWith("00");
        // integer digits to be read
        const integer_digits: string = 
            thousands_flag ? integer_part.slice(0, -3)
            : hundreds_flag ? integer_part.slice(0, -2) 
            : integer_part;

        // compose the message for the integer part, split the digits so they are read one-by-one
        const integer_msg: string = integer_digits.split("").map((digit: string, index: number, array: string[]) => {
            let ans = this.phoneticRules[digit];
            if ((!thousands_flag && !hundreds_flag && array.length - index === 4) 
                || (thousands_flag && array.length - index === 1)
                || (hundreds_flag && array.length - index === 2)) {
                ans += " thousand ";
            } else if ((!thousands_flag && !hundreds_flag && array.length - index === 3) 
                        || (hundreds_flag && array.length - index === 1)) {
                ans += " hundred ";
            }
            return ans;
        }).join("");
        msg += integer_msg;

        // compose the message for the fractional part, split the digits so they are read one-by-one
        const decimal_msg: string = fractional_part.split("").map((digit: string, index: number, array: string[]) => {
            return digit === "." ? " point "
                : this.phoneticRules[digit] + " " + (index < array.length - 1 ? pause + " " : "");
        }).join("");
        msg += decimal_msg;

        return msg;
    }
    /**
     * Utility function, reads the direction of an intruder aircraft as ATC would read it to pilots, e.g., north bound, south bound, southeast bound, etc.
     */
    readDirection (deg: number): string {
        // utility function, makes sure the value is between 0..360
        const normalizeAngle = (val: number) => {
            return (val % 360 + 360) % 360;
        };
        const val: number = normalizeAngle(deg);
        const keys: string[] = Object.keys(this.directionLimits);
        for (let i = 0; i < keys.length; i++) {
            const key: string = keys[i];
            if (val > this.directionLimits[key][0] && val <= this.directionLimits[key][1]) {
                return key + " bound";
            }
        }
        return "";
    }
    /**
     * Utility function, reads the relative direction of an aircraft wrt the ownship
     */
    readRelativeDirection (data: { ac: Vector3D<number | string >}): string {
        if (data?.ac) {
            const traffic_direction: number = rad2deg(Math.atan2(+data.ac.x, +data.ac.y));
            return this.readDirection(+traffic_direction);
        }
        return "";
    }
    /**
     * Utility function, reads relative altitude of an aircraft wrt the ownship
     */
    readRelativeAltitude (data: { ownship: LLAPosition, ac: number }, opt?: { altitude_kind?: "relative" | "absolute" }): string {
        // compute altitude of the intruder
        // option 1: absolute altitude, e.g., one-seven thousands
        // option 2: relative altitude, e.g., one thousand feet below you
        const alt: { absolute: number, relative: number } = {
            absolute: data.ac,
            relative: data.ac - +data.ownship.s.alt 
        }; // altitude, in ft
        const altitude_info: "relative" | "absolute" = opt?.altitude_kind || "absolute";
        const altitude_val: number = altitude_info === "absolute" ? alt.absolute : Math.abs(alt.relative);
        // read feedback for altitude, number is rounded to 100xft
        const altitude_rounded_val: number = Math.floor(altitude_val / 100) * 100;
        return `${altitude_rounded_val}`;
    }
    /**
     * Utility function, reads the relative heading of an aircraft wrt the ownship
     */
    readRelativeHeading (data: { ownship: LLAPosition, ac: LatLon<number | string> }): string {
        if (data?.ownship && data?.ac) {
            const ownship_heading: number = rad2deg(Math.atan2(+data.ownship.v.x, +data.ownship.v.y));
            const bearing: number = computeBearing({
                lat: +data.ownship.s.lat,
                lon: +data.ownship.s.lon
            }, {
                lat: +data.ac.lat,
                lon: +data.ac.lon
            });
            const relative_bearing: number = ((((bearing - ownship_heading) % 360) + 360) % 360);
            // console.log({ relative_bearing, bearing, heading: ownship_heading });
            let relative_heading: string = ((relative_bearing / 360) * 12).toFixed(0);
            if (relative_heading === "0") { relative_heading = "12"; }
            return `${relative_heading} o'clock`;
        }
        return "";
    }
    /**
     * Utility function, reads the relative distance of an aircraft from the ownship
     */
    readRelativeDistance (data: { ownship: LLAPosition, ac: LatLon<number | string> }): string {
        if (data?.ownship && data?.ac) {
            // compute distance between the aircraft
            // Note: for traffic closer than 1NM, we currently read the decimal number
            // However, in ATC, for a traffic advisory you'd more often hear something like "less than a mile", 
            // and if the traffic is close enough in space/time/closure rate, the advisory would likely 
            // get elevated to an alert, e.g., "traffic, less than a mile, same altitude, opposite direction, 
            // suggest left [or right] turn [heading nnn] immediately."
            const distance: string = computeNmiDistance({
                lat: +data.ownship.s.lat,
                lon: +data.ownship.s.lon
            }, {
                lat: +data.ac.lat,
                lon: +data.ac.lon
            }).toFixed(1);

            // read feedback for distance -- round the number to the nearest integer if distance > 1NM, otherwise use two digits accuracy
            const distance_val: number = +distance > 1 ? Math.round(+distance) : +distance;
            return `${distance_val}`;
        }
        return "";
    }
    /**
     * Utility function, returns the set of aircraft whose alert >= threshold
     * default minThreshold and maxThreshold are AlertLevel.ALERT
     */
    getAlertingAircraft (data: CommData, opt?: { minThreshold?: AlertRegion, maxThreshold?: AlertRegion } | { alertRegion?: AlertRegion }): DAA_AircraftDescriptor[] {
        const alerting: { [ac: string]: AlertRegion } = getAlertingAircraftMap(data?.bands, opt);
        if (alerting) {
            const alerting_ids: string[] = Object.keys(alerting);
            if (alerting_ids?.length) {
                const acs: DAA_AircraftDescriptor[] = data?.traffic?.filter(traffic => {
                    return alerting_ids.includes(traffic.id);
                })?.map(ac => {
                    return {
                        s: ac.s,
                        v: ac.v,
                        symbol: alertRegion2symbol(alerting[ac.id]),
                        callSign: ac.id                
                    };
                }) || [];
                return acs;
            }
        }
        return null;
    }
    /**
     * Utility function, returns the max alerting aircraft based on some ranking criteria
     * For now, no specifc criteria is used and we simply return the first aircraft in the list
     */
    getMaxAlertingAircraft (alerting: DAA_AircraftDescriptor[], opt?: { suppressRepeatedAlerts?: boolean, alertRegion?: AlertRegion }): DAA_AircraftDescriptor {
        if (alerting?.length) {
            const level: AlertRegion = opt?.alertRegion !== undefined ? opt.alertRegion : "NEAR";
            // remove last alerting aircraft to avoid repeated alerts on the same aircraft, unless the alert level for that aircraft has increased
            const candidates: DAA_AircraftDescriptor[] = opt?.suppressRepeatedAlerts && this.lastAlertingAircraft ? alerting.filter(ac => {
                const ac_level: AlertRegion = symbol2alertRegion(ac.symbol);
                const last_level: AlertRegion = symbol2alertRegion(this.lastAlertingAircraft?.symbol);
                return ac.callSign !== this.lastAlertingAircraft.callSign || ac_level > last_level;
            }) : alerting;
            // return the first aircraft in the candidates list
            const ac: DAA_AircraftDescriptor = candidates?.length ? candidates[0] : null;
            if (ac) {
                // return alerting aircraft
                return ac;
            }
            console.log(`[daa-voice] Alert suppressed for ${alerting[0]?.callSign} (alert level ${level} repeated within ${this.repeatedAlertTimeout}ms)`);
        }
        return null;
    }
    /**
     * Internal function, clears stored info about the last alerting aircraft
     */
    protected clearAlertingHistory (): void {
        console.log(`[daa-voice] Clearing alerting history`, { lastAlertingAircraft: this.lastAlertingAircraft });
        clearTimeout(this.repeatedAlertTimer)
        this.repeatedAlertTimer = null;
        this.lastAlertingAircraft = null;
    }
    /**
     * Internal function, updates the alerting history
     * History is updated when
     * - the history is empty
     * - or when the callsign of the alerting aircraft is different than that in the history
     * - or when the same aircraft is alerting but the alert level has increased
     */
    protected updateAlertingHistory (ac: DAA_AircraftDescriptor): boolean {
        if (ac && (!this.lastAlertingAircraft 
                    || this.lastAlertingAircraft?.callSign !== ac?.callSign 
                    || symbol2alertRegion(this.lastAlertingAircraft?.symbol) < symbol2alertRegion(ac?.symbol))) {
            this.clearAlertingHistory();
            // store a copy of the alerting aircraft descriptor
            this.lastAlertingAircraft = {
                callSign: ac.callSign,
                symbol: ac.symbol
            };
            return true;
        }
        return false;
    }
    /**
     * Internal function, schedules an action to clear the stored info about the last alerting aircraft after a given timeout
     */
    protected scheduleAlertingHistoryReset (ms?: number): void {
        ms = ms || this.repeatedAlertTimeout || DEFAULT_SAME_ALERTING_TIMEOUT;
        clearTimeout(this.repeatedAlertTimer);
        this.repeatedAlertTimer = setTimeout(() => {
            this.clearAlertingHistory();
        }, ms);
    }
    /**
     * Utility function, resets the voice (i.e., resets history, stops any speech if already speaking). Settings are kept.
     */
    reset (): void {
        this.clearAlertingHistory();
        this.sayNoMore();
    }
    /**
     * Utility function, sets the value of the alerting timeout used for suppressing repeated alerts
     */
    selectRepeatedAlertSuppressionTimeout (ms: number): boolean {
        if (ms > 0) {
            this.repeatedAlertTimeout = ms;
            return true;
        }
        return false;
    }
    /**
     * Get voice guidance for DANTi
     * Example 1 : "Traffic, eleven o'clock, one-zero miles, southbound, converging, Boeing Seven Twenty Seven, one seven thousand."
     * See example ATC phraseology at https://www.faa.gov/air_traffic/publications/atpubs/atc_html/chap2_section_1.html
     */
    getGuidanceATC (data: CommData, opt?: {
        include_direction?: boolean,
        include_altitude?: boolean,
        altitude_kind?: "absolute" | "relative",
        suppressRepeatedAlerts?: boolean
    }): Guidance {
        if (this.enabled && data?.bands && data?.ownship && data?.traffic?.length) {
            const alerting: DAA_AircraftDescriptor[] = this.getAlertingAircraft(data);
            if (alerting?.length) {
                const max_alert_aircraft: DAA_AircraftDescriptor = this.getMaxAlertingAircraft(alerting, opt);
                if (max_alert_aircraft) {
                    // store info about the alerting aircraft
                    this.updateAlertingHistory(max_alert_aircraft);

                    // read feedback for heading
                    const relative_heading: string = this.readRelativeHeading({ ownship: data.ownship, ac: max_alert_aircraft.s });

                    // read feedback for distance
                    const distance: string = this.readRelativeDistance({ ownship: data.ownship, ac: max_alert_aircraft.s });
                    const distance_msg: string = `${this.readNumber(distance)} miles`;
                    const distance_txt: string = `${distance} miles`;

                    // create guidace message, e.g., traffic, 2 o'clock, 3 miles, 8000 ft
                    // the message is split into chunks to introduce short pauses between relevant chunks
                    const guidance: Guidance = [
                        { text2speak: "Traffic" },
                        { text2speak: `${relative_heading} ${distance_msg}`, subtitles: `${relative_heading}, ${distance_txt}` }
                    ];

                    // include direction, if needed
                    if (opt?.include_direction) {
                        // feedback for direction
                        const direction: string = this.readRelativeDirection({ ac: max_alert_aircraft.v });
                        guidance.push({ text2speak: direction });
                    }

                    // include altitude, if needed
                    if (opt?.include_altitude) {
                        const altitude_kind: "relative" | "absolute" = opt?.altitude_kind || "absolute";
                        // read feedback for altitude, number is rounded to 100xft
                        const altitude: string = this.readRelativeAltitude({ ownship: data.ownship, ac: +max_alert_aircraft.s.alt }, { altitude_kind });
                        const altitude_msg: string = 
                            altitude_kind === "relative" ? 
                                +altitude < 0 ? `${this.readNumber(altitude)} feet below you ` 
                                : +altitude > 0 ? `${this.readNumber(altitude)} feet above you `
                                : +altitude === 0 ? " same altitude"
                                : "" // something went wrong, unable to compute relative altitude
                            : `${altitude}`; // feet is often omitted for brevity
                        const altitude_txt: string =
                            altitude_kind === "relative" ? 
                                +altitude < 0 ? `${altitude} feet below you ` 
                                : +altitude > 0 ? `${altitude} feet above you `
                                : +altitude === 0 ? " same altitude"
                                : "" // something went wrong, unable to compute relative altitude
                            : `${altitude}`; // feet is often omitted for brevity
                        guidance.push({ text2speak: altitude_msg, subtitles: altitude_txt });
                    }

                    // return the guidance
                    return guidance;
                }
            }
        }
        return null;
    }
    /**
     * Voice guidance for DANTi
     * Example: "Traffic, eleven o'clock, one-zero miles, southbound, converging, Boeing Seven Twenty Seven, one seven thousand."
     * See example ATC phraseology at https://www.faa.gov/air_traffic/publications/atpubs/atc_html/chap2_section_1.html
     * RTCA DO365B, sec 2.2.5.12.1 (DAA Aural Alerts - en-route and non-cooperative)
     * When an intruder triggers
     * - a DAA preventive alert, "TRAFFIC, MONITOR" shall be audibly annunciated (Note: DAA preventive alerts are not issued against non-cooperative traffic)
     * - a DAA corrective alert, "TRAFFIC, AVOID" shall be audibly annunciated
     * - a DAA warning alert, "TRAFFIC, MANEUVER NOW; TRAFFIC, MANEUVER NOW" shall be audibly annunciated 
     */
    getGuidanceRTCA (data: CommData, opt?: {
        suppressRepeatedAlerts?: boolean
    }): Guidance {
        if (this.enabled && data?.bands && data?.ownship && data?.traffic?.length) {
            const regions: AlertRegion[] = [
				"RECOVERY", // DO-365 warning
                "NEAR",  // DO-365 warning
                "MID",  // DO-365 corrective alert
                "FAR", // DO-365 preventive alert
            ];
            for (let i = 0; i < regions.length; i++) {
                // check warnings, then corrective alerts, then preventive alerts
                const alertRegion: AlertRegion = regions[i];
                const alerting: DAA_AircraftDescriptor[] = this.getAlertingAircraft(data, { alertRegion });
                const max_alert_aircraft: DAA_AircraftDescriptor = this.getMaxAlertingAircraft(alerting, { ...opt, alertRegion });
                // voice guidance is provided only the alerts persist for at least 4 seconds (TODO)
                if (max_alert_aircraft && severity(symbol2alertRegion(max_alert_aircraft.symbol)) >= severity("FAR")) {
                    // store info about the alerting aircraft
                    this.updateAlertingHistory(max_alert_aircraft);
                    const guidance: Guidance = regions[i] === "NEAR" || regions[i] === "RECOVERY" ? [
                        { text2speak: "TRAFFIC, MANEUVER NOW" },
                        { text2speak: "TRAFFIC, MANEUVER NOW" }
                    ] : regions[i] === "MID" ? [
                        { text2speak: "TRAFFIC, AVOID" }
                    ] : regions[i] === "FAR" ? [
                        { text2speak: "TRAFFIC, MONITOR" }
                    ] : null;
                    return guidance;
                }
            }
        }
        return null;
    }
    /**
     * Main API for obtaining guidance text
     */
    getGuidance (data: CommData, opt?: { 
        kind?: GuidanceKind, 
        force?: boolean,
        include_direction?: boolean,
        include_altitude?: boolean,
        altitude_kind?: "absolute" | "relative",
        suppressRepeatedAlerts?: boolean
    }): Guidance {
        if (this.enabled && data?.bands && data?.ownship && data?.traffic?.length) {
            const kind: GuidanceKind = opt?.kind || this.selectedKind || DEFAULT_GUIDANCE_KIND;
            const guidance: Guidance = 
                kind === GuidanceKind.ATC ? this.getGuidanceATC(data, opt)
                : kind === GuidanceKind["RTCA DO-365"] ? this.getGuidanceRTCA(data, opt)
                : null;
            return guidance;
        }
        return null;
    }
    /**
     * Main API for reading the guidance with the synthetic voice
     */
    async readGuidance (desc: { data?: CommData, guidance?: Guidance }, opt?: { kind?: GuidanceKind, force?: boolean }): Promise<Guidance> {
        if (this.enabled) {
            if (desc?.data || desc?.guidance) {
                if (opt?.force) {
                    // stop speaking so new message can be spoken
                    this.sayNoMore();
                    // clear history
                    this.clearAlertingHistory();
                }
                if (this.can_speak_now) {
                    const guidance: Guidance = desc.guidance || this.getGuidance(desc.data, opt);
                    if (guidance) {
                        const txt: string[] = guidance.map(gd => {
                            return gd.text2speak;
                        });
                        // speak guidance
                        await this.speak(txt);
                        // schedule alerting history reset
                        this.scheduleAlertingHistoryReset();
                        // return guidance
                        return guidance;
                    }
                    // do nothing otherwise
                    console.warn(`[daa-voice] Warning: guidance is null`);
                    return null;
                }
                console.log(`[daa-voice] Skipping guidance -- already speaking`);
            }
            // nothing to do
            return null;
        }
        console.log(`[daa-voice] Skipping guidance -- guidance disabled`);
        return null;
    }
}