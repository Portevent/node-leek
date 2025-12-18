import NodeLeekClient from "../node-leek-client/node-leek-client";
import CachedFilelist from "./filelist/cached-filelist";
import LeekfileSource from "./leekfile-source/leekfile-source";
import LeekwarsSource from "./leekfile-source/leekwars-source";
import LocalfileSource from "./leekfile-source/localfile-source";
import Filelist from "./filelist/filelist";

import readline from 'readline';

const CHOICE_LEEKWARS = 1;
const CHOICE_LOCAL = 2;

// Create an interface for input and output
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

class LeekSyncClient {

    leekwarsFilelist: Filelist
    localFilelist: Filelist

    private leekwarsSource: LeekfileSource
    private localSource: LocalfileSource


    constructor(nodeLeekClient: NodeLeekClient, path: string) {
        this.leekwarsFilelist = new CachedFilelist(".local.leekwars.json");
        this.localFilelist = new CachedFilelist(".local.filesystem.json");

        this.leekwarsSource = new LeekwarsSource(nodeLeekClient, this.leekwarsFilelist);
        this.localSource = new LocalfileSource(path, this.localFilelist);
    }

    public async start(watch: boolean, choice: string) {
        // Fetch leekwars file to ensure our filesystem is up to date since last session
        await this.leekwarsSource.init();
        await this.localSource.init();

        // Compare both local filesystem and assert that hash match
        // Ask what to do if something doesn't correspond (maybe have a boolean that indicate which got modified since last session to help understand what changes)
        // Sync toward localfiles or toward leekwars
        // Open watcher, push modifications to leekwars and update filestorage accordingly

        // If both doesn't match, ask which source to use
        if (!this.leekwarsSource.compareWith(this.localSource)) {
            const source: number = await this.askSourceToUse(choice);
            if (source == CHOICE_LEEKWARS) {
                await this.localSource.importFrom(this.leekwarsSource);
            } else if (source == CHOICE_LOCAL) {
                await this.leekwarsSource.importFrom(this.localSource);
            } else {
                console.error("Invalid choice, please report this bug");
            }
        }

        await this.leekwarsFilelist.save();
        await this.localFilelist.save();

        if(watch){
            this.localSource.startWatching(this.leekwarsSource);
            console.log("LeekSync is ready !");
        }else{
            console.log("LeekSync done !");
        }
    }

    private async askSourceToUse(choice : string) : Promise<number> {
        var source = this.processChoice(choice);

        const askQuestion = (question: string) : Promise<string> => {
            return new Promise((resolve) => {
                rl.question(question, (answer : string) => {
                    resolve(answer);
                });
            });
        };

        var response = "";
        console.log("Leekwars (" + this.leekwarsSource.getCount() + " files) and Local files (" + this.localSource.getCount() + " files) aren't sync");

        if (this.leekwarsSource.getCount() == 0) source = CHOICE_LOCAL // Automatically choose the other source
        else if (!this.leekwarsSource.isPristine()) console.log("Leekwars has been updated since last session : \n" + this.leekwarsFilelist.logs);

        if (this.localSource.getCount() == 0) source = CHOICE_LEEKWARS // Automatically choose the other source
        else if (!this.localSource.isPristine()) console.log("Local files have been updated since last session : \n" + this.localFilelist.logs);


        while (source == null) {
            choice = await askQuestion("From which one do you want to import files ?\nType leekwars or local : ");
            source = this.processChoice(choice);
        }
        return source;
    }

    private processChoice(response: string) {
        if (response.toLowerCase() == "leekwars") {
            return CHOICE_LEEKWARS;
        } else if (response.toLowerCase() == "local") {
            return CHOICE_LOCAL;
        }
        return null;
    }
}

export default LeekSyncClient;