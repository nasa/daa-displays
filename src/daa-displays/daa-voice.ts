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

// voice read back max repeat frequency
const MAX_REPEAT_FREQUENCY: number = 16000; //msec

/**
 * DaaSounds class
 */
export class DaaVoice {
    protected pingSound: HTMLAudioElement;
    protected max_repeat_frequency: number = MAX_REPEAT_FREQUENCY;
    protected repeat_timer: NodeJS.Timer;
    protected can_speak_new_utterance: boolean = true;
    protected voices: SpeechSynthesisVoice[] = window?.speechSynthesis?.getVoices() || [];
    protected synthVoice: SpeechSynthesisUtterance = new SpeechSynthesisUtterance(); // see APIs at https://lists.w3.org/Archives/Public/public-speech-api/2012Oct/0004.html

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
     */
    constructor (opt?: { volume?: number }) {
        // load sounds
        this.pingSound = <HTMLAudioElement> document?.getElementById("danti-sound");
        if (!this.pingSound) {
            const audio: HTMLAudioElement = document.createElement("audio");
            audio.setAttribute("src", "daa-displays/sounds/mixkit-airport-radar-ping-1582.mp3")
            document?.body.appendChild(audio);
        }
    }

    /**
     * Internal function, used for enforcing max repeat frequency constraint
     */
    protected isSpeaking (): boolean {
        if (this.can_speak_new_utterance) {
            this.can_speak_new_utterance = false;
            this.repeat_timer = setTimeout(() => {
                this.can_speak_new_utterance = true;
            }, this.max_repeat_frequency);
            return false;
        }
        return true;
    }

    /**
     * synthetic voice reads a message
     */
    speak (msg: string, opt?: { 
        voice?: SpeechSynthesisVoice | "Alex" | "Samantha" | string,
        volume?: number,
        rate?: number
    }): void {
        if (msg) {
            opt = opt || {};
            this.pingSound?.play();
            if (!this.isSpeaking()) {
                if (opt.voice) { this.synthVoice.voice = this.getVoice(opt.voice); }
                if (!isNaN(opt.volume)) { this.setVolume(opt.volume); }
                if (!isNaN(opt.rate)) { this.setRate(opt.rate); }
                this.synthVoice.text = msg;
                console.log(`[daa-sounds] speaking: ${msg} (volume: ${this.getVolume()}, rate: ${this.getRate()})`);
                window.speechSynthesis.speak(this.synthVoice);
            }
        }
    }

    /**
     * gets available synthetic voices
     */
    getVoices (lang?: "en-US" | string): SpeechSynthesisVoice[] {
        if (this.voices?.length && lang) {
            return this.voices.filter(elem => {
                return elem.lang === lang;
            });
        }
        return this.voices;
    }

    /**
     * gets a specific synthetic voice, where the voice is either provided as SpeechSynthesisVoice object or by indicating the name (e.g., "Alex", "Samantha")
     */
    getVoice (voice?: SpeechSynthesisVoice | "Alex" | "Samantha" | string): SpeechSynthesisVoice {
        if (voice) {
            console.log(`[daa-sounds] Using voice `, voice);
            const voices: SpeechSynthesisVoice[] = window?.speechSynthesis?.getVoices();
            const candidates: SpeechSynthesisVoice[] = (typeof voice === "string") ? voices?.filter(elem => {
                return elem.name === voice;
            }) : [ voice ];
            console.log({ voices, candidates });
            return candidates?.length ? candidates[0] : null;
        }
        return null;
    }
    
    /**
     * selects a synthetic voice
     */
    setVoice (voice: SpeechSynthesisVoice | "Alex" | "Samantha" | string): boolean {
        if (voice && this.synthVoice) {
            console.log(`[daa-sounds] Trying to set voice to`, voice);
            const v: SpeechSynthesisVoice = this.getVoice(voice);
            if (v) {
                console.log(`[daa-sounds] Setting voice to ${v.name}`);
                this.synthVoice.voice = v;
                return true;
            }
        }
        return false;
    }

    /**
     * Utility function, returns the current voice volume level (0=min, 100=max)
     */
    getVolume (): number {
        if (this.synthVoice) {
            console.log(`[daa-sounds] Using volume `, this.synthVoice.volume * 100);
            return this.synthVoice.volume * 100;
        }
        return 0;
    }

    /**
     * Utility function, sets the voice volume level, valid values range from 0..100
     */
    setVolume (vol: number): boolean {
        if (this.synthVoice && !isNaN(vol)) {
            const target: number = 
                vol < 0 ? 0
                : vol > 100 ? 100
                : vol;
            console.log(`[daa-sounds] Setting volume to ${target}`);
            // Speaking volume between 0 and 1 inclusive, with 0 being lowest and 1 being highest, with a default of 1.0.
            this.synthVoice.volume = target / 100;
            return true;
        }
        return false;
    }

    /**
     * Utility function, returns the current voice rate (0=min, 100=max)
     */
    getRate (): number {
        if (this.synthVoice) {
            console.log(`[daa-sounds] Using rate `, this.synthVoice.rate * 100);
            return this.synthVoice.volume * 100;
        }
        return 0;
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
     */
    setRate (rate: number): boolean {
        if (this.synthVoice && !isNaN(rate)) {
            const target: number = 
                rate < 0.1 ? 0.1
                : rate > 3 ? 3
                : rate;
            console.log(`[daa-sounds] Setting rate to ${target}`);
            this.synthVoice.rate = target;
            return true;
        }
        return false;
    }

    /**
     * plays ping sound
     */
    ping (): void {
        console.log(`[daa-sounds] alert sound`);
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

        // // check whether the number ends with three zeros
        // const thousands_flag: boolean = x.endsWith("000") && !x.includes(".");
        // // check whether the number ends with two zeros
        // const hundreds_flag: boolean = !thousands_flag && x.endsWith("00") && !x.includes(".");
        // // check whether the number is a decimal number -- in ATC we have decimals only in numbers < 1
        // const decimals_flag: boolean = x.includes(".") && +x < 1;
        // // extract the digits to be read
        // const digits: string = 
        //     thousands_flag ? x.slice(0, -3)
        //     : hundreds_flag ? x.slice(0, -2) 
        //     : `${x}`;
        // // split the digits so they are read one-by-one
        // const numbers: string = digits.split("").map((digit: string, index: number, array: string[]) => {
        //     return digit === "." ? " point "
        //         : digit + " " + (!decimals_flag && array.length - 3 === index ? " thousand" : "") + (index < array.length - 1 ? pause + " " : "");
        // }).join("");
        // // return the message
        // return thousands_flag ? numbers + ` thousand`
        //     : hundreds_flag ? numbers + ` hundred`
        //     : numbers;
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
}