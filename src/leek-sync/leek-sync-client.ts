import NodeLeekClient from "../node-leek-client/node-leek-client";
import * as fs from "node:fs";
import LeekFile from "./filelist/leekfile";
import CachedFilelist from "./filelist/cached-filelist";
import LeekfileSource from "./leekfile-source/leekfile-source";
import LeekwarsSource from "./leekfile-source/leekwars-source";
import LocalfileSource from "./leekfile-source/localfile-source";
import Filelist from "./filelist/filelist";

class LeekSyncClient{

    nodeLeekClient: NodeLeekClient
    path: string;

    leekwarsFilelist: Filelist
    localFilelist: Filelist

    private leekwarsSource: LeekfileSource
    private localSource: LeekfileSource


    constructor(login: string, password: string, path: string){
        this.nodeLeekClient = new NodeLeekClient();
        this.leekwarsFilelist = new CachedFilelist(".local.leekwars.json");
        this.localFilelist = new CachedFilelist(".local.filesystem.json");

        this.leekwarsSource = new LeekwarsSource(this.nodeLeekClient, this.leekwarsFilelist);
        this.localSource = new LocalfileSource(path, this.localFilelist);
        this.path = path;
        console.log("Starting leeksync");
        this.start(login, password);
    }

    private async start(login: string, password: string){
        await this.nodeLeekClient.login(login, password);
        console.log("cached this.leekwarsFilesystem");
        console.log(this.leekwarsFilelist);

        // Fetch leekwars file to ensure our filesystem is up to date since last session
        await this.leekwarsSource.init();
        await this.localSource.init();

        console.log("Updated this.leekwarsFilesystem");
        console.log(this.leekwarsFilelist);

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
    }

    private async updateLocalFiles(){
        // Turn on watcher
        // Wait to list all already existing file

        const newLeekwarsFiles = {"a/b/file.leek": 159182659};

        // Remove in localFilesCache all files that aren't present in files anymore

        // update hashes
    }

    private async pushToLeekwars(filesystem: {[file: string]: LeekFile}){
        const idsToRemove: number[] = [];
        // Remove in leekwars all files that aren't present in the new filesystem anymore
        Object.keys(this.leekwarsFilelist).forEach(filename => {
            if (filename in filesystem) return;
            idsToRemove.push(this.leekwarsFilelist.get(filename)?.id ?? 0);
            this.leekwarsFilelist.remove(filename);
        })

        // await this.nodeLeekClient.deleteFiles(idsToRemove);
        // await this.nodeLeekClient.clearBin();
        
        // Update or create file
        await Promise.all(
            Object.keys(filesystem).map(filename => this.createOrUpdateFileInLeekwars(filesystem[filename]))
        );
    }

    private async createOrUpdateFileInLeekwars(file: LeekFile){
        if (file.name in this.leekwarsFilelist){
            if (file.folder) return;

            // return this.updateFileInLeekwars(file);
        }else{
            // if (file.folder) createFolderInLeekwars(file);
            // this.nodeLeekClient.createFile(file.code).then((result) => {
            //     file.id = result.id;
            //     file.timestamp = result.modified;
            // });
        }
    }

    // private async updateFileInLeekwars(file: LeekScript){
    //     return this.nodeLeekClient.updateFile(file.id, file.code).then((result) => {
    //         file.timestamp = result.modified;
    //         this.leekwarsFilesystem[file.id] = file;
    //     })
    // }


    // private async createFolderInLeekwars(file: LeekFolder){
    //     return this.nodeLeekClient.createFolder(file.name, (await this.createOrGetFolderInLeekwars(file.parent)).id).then((result) => {
    //         file.id = result.id;
    //         this.leekwarsFilesystem[result.id] = file;
    //     })
    // }


    // private async createFileInLeekwars(file: LeekScript){
       // TODO
    // }


    private askSourceToUse() {
        return true;
    }
}

export default LeekSyncClient;