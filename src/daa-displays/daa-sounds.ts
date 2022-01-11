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
export class DaaSounds {
    protected pingSound: HTMLAudioElement;
    protected max_repeat_frequency: number = MAX_REPEAT_FREQUENCY;
    protected repeat_timer: NodeJS.Timer;
    protected can_speak_new_utterance: boolean = true;
    protected voices: SpeechSynthesisVoice[] = window?.speechSynthesis?.getVoices() || [];
    protected synthVoice: SpeechSynthesisUtterance = new SpeechSynthesisUtterance();

    /**
     * Constructor
     */
    constructor () {
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
    speak (msg: string, opt?: { voice?: SpeechSynthesisVoice | "Alex" | "Samantha" | string }): void {
        if (msg) {
            opt = opt || {};
            this.pingSound?.play();
            if (!this.isSpeaking()) {
                console.log(`[daa-sounds] speaking: ${msg}`);
                if (opt.voice) {
                    this.synthVoice.voice = this.getVoice(opt.voice);
                }
                this.synthVoice.text = msg;
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
            console.log(`[daa-sounds] Getting voice `, voice);
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
     * plays ping sound
     */
    ping (): void {
        console.log(`[daa-sounds] alert sound`);
        this.pingSound?.play();
    }
}