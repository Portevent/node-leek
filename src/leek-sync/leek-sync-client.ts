import NodeLeekClient from "../node-leek-client/node-leek-client";
import * as fs from "node:fs";
import LeekFile from "./filelist/leekfile";
import CachedFilelist from "./filelist/cached-filelist";
import LeekfileSource from "./leekfile-source/leekfile-source";
import LeekwarsSource from "./leekfile-source/leekwars-source";
import LocalfileSource from "./leekfile-source/localfile-source";
import Filelist from "./filelist/filelist";

class LeekSyncClient{

    leekwarsFilelist: Filelist
    localFilelist: Filelist

    private leekwarsSource: LeekfileSource
    private localSource: LocalfileSource


    constructor(login: string, password: string, path: string){
        this.leekwarsFilelist = new CachedFilelist(".local.leekwars.json");
        this.localFilelist = new CachedFilelist(".local.filesystem.json");

        this.leekwarsSource = new LeekwarsSource(new NodeLeekClient(login, password), this.leekwarsFilelist);
        this.localSource = new LocalfileSource(path, this.localFilelist);
        console.log("Starting leeksync");
        this.start();
    }

    private async start(){
        // Fetch leekwars file to ensure our filesystem is up to date since last session
        await this.leekwarsSource.init();
        await this.localSource.init();

        // Compare both local filesystem and assert that hash match
        // Ask what to do if something doesn't correspond (maybe have a boolean that indicate which got modified since last session to help understand what changes)
        // Sync toward localfiles or toward leekwars
        // Open watcher, push modifications to leekwars and update filestorage accordingly

        // If both doesn't match, ask which source to use
        if (!this.leekwarsSource.compareWith(this.localSource)){
            const choice = this.askSourceToUse()
            if (choice){
                await this.localSource.importFrom(this.leekwarsSource);
            }else{
                await this.leekwarsSource.importFrom(this.localSource);
            }
        }

        await this.leekwarsFilelist.save();
        await this.localFilelist.save();

        this.localSource.startWatching(this.leekwarsSource);
    }

    private askSourceToUse() {
        return true;
    }
}

export default LeekSyncClient;