import NodeLeekClient from "../node-leek-client/node-leek-client";
import * as fs from "node:fs";
import LeekFile from "./leekfile";
import CachedFilelist from "./cached-filelist";

class LeekSyncClient{

    nodeLeekClient: NodeLeekClient
    path: string;

    leekwarsFilelist: CachedFilelist
    localFilelist: CachedFilelist


    constructor(login: string, password: string, path: string){
        this.nodeLeekClient = new NodeLeekClient();
        this.leekwarsFilelist = new CachedFilelist(".local.leekwars.json");
        this.localFilelist = new CachedFilelist(".local.filesystem.json");
        this.path = path;
        console.log("Starting leeksync");
        this.start(login, password);
    }

    private async start(login: string, password: string){
        await this.nodeLeekClient.login(login, password);
        console.log("cached this.leekwarsFilesystem");
        console.log(this.leekwarsFilelist);

        // Fetch leekwars file to ensure our filesystem is up to date since last session
        await this.updateLeekwarsFiles();
        await this.updateLocalFiles();
        console.log("Updated this.leekwarsFilesystem");
        console.log(this.leekwarsFilelist);

        // Compare both local filesystem and assert that hash match
        // Ask what to do if something doesn't correspond (maybe have a boolean that indicate which got modified since last session to help understand what changes)
        // Sync toward localfiles or toward leekwars
        // Open watcher, push modifications to leekwars and update filestorage accordingly
        await this.pushToLocalFile(this.leekwarsFilelist);

        this.leekwarsFilelist.save();
        this.localFilelist.save();
    }

    private async updateLeekwarsFiles(){
        
        // Get an updated list of leekwars files
        const newLeekwarsFiles = this.nodeLeekClient.getFiles();

        // Remove in leekwarsFilesystem all files that aren't present in leekwars anymore
        this.leekwarsFilelist.getFileNames().forEach(filename => {
            if (filename in newLeekwarsFiles) return;
            this.leekwarsFilelist.remove(filename);
        })

        // fetchAllFiles in leekwars and update leekwarsFiles accordingly (note: use leekwarsFiles to get timestamp on files previously fetched)
        const filesToFetch : {[id: number]: string} = {};
        var fetchRequests: { [id: number]: number } = {};
        Object.entries(newLeekwarsFiles).forEach(([name, fileId]) => {
            if (this.isFolder(name)) {
                this.leekwarsFilelist.set(name, LeekFile.Folder(name, fileId));
            }else{
                filesToFetch[fileId] = name;
                fetchRequests[fileId] = this.leekwarsFilelist.getTimestamp(name);
            }
        });
        
        // Update all file in local filesystem with new code and timestamp
        (await this.nodeLeekClient.fetchFiles(fetchRequests)).forEach(aiCode => {
            const name = filesToFetch[aiCode.id];
            this.leekwarsFilelist.set(name, new LeekFile(name, aiCode.id, aiCode.code, aiCode.modified));
        });
    }

    private async updateLocalFiles(){
        // Turn on watcher
        // Wait to list all already existing file

        const newLeekwarsFiles = {"a/b/file.leek": 159182659};

        // Remove in localFilesCache all files that aren't present in files anymore

        // update hashes
    }

    private async pushToLocalFile(filesystem: CachedFilelist) {
        // Delete all files that aren't present in the new filesystem anymore
        await Promise.all(
            Object.keys(this.localFilelist)
                .filter(filename => !(filename in filesystem))
                .map(filename => {
                this.localFilelist.remove(filename);
                return this.deleteFile(filename);
            })
        );

        // Update or create file
        await Promise.all(
            filesystem.getFiles().map(file => this.createOrUpdateFileInLocalFilesystem(file))
        );
    }

    private async createOrUpdateFileInLocalFilesystem(file: LeekFile){
        if (file.name in this.localFilelist){
            if (file.folder) return;

            return this.updateFileInLocalFilesystem(file);
        }else{
            return this.createFileInLocalFilesystem(file);
        }
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

    private isFolder(filename: string) : boolean{
        return filename.charAt(filename.length-1) == "/";
    }

    private async deleteFile(filename: string) {
        return fs.unlink(this.path + filename, (err) => {console.log(err)});
    }

    private async updateFileInLocalFilesystem(file: LeekFile) {
        return this.createFileInLocalFilesystem(file);
    }

    private createFileInLocalFilesystem(file: LeekFile) {
        console.log("Creating file : " + this.path + file.name)
        if (file.folder) return this.createFolderInLocalFilesystem(file);

        return fs.writeFile(this.path + file.name, file.code, 'utf-8', (err) => {
            if (err) throw err;
            this.localFilelist.set(file.name, new LeekFile(file.name, file.id, file.code, 0));
        });
    }

    private createFolderInLocalFilesystem(file: LeekFile) {
        if (!file.folder) return;
        if (!fs.existsSync(this.path + file.name)){
            fs.mkdirSync(this.path + file.name);
        }
    }

    private async loadCachedFS(path: string) {
        try{
            return JSON.parse(fs.readFileSync(path, "utf8"));
        }catch(e){
            console.error("No local cache for " + path);
            return {};
        }
    }

    private async saveCachedFS(path: string, leekwarsFilesystem: { [p: string]: LeekFile }) {
        try{
            return fs.writeFile(path, JSON.stringify(leekwarsFilesystem), 'utf-8', (err) => {
                if (err) throw err;
            });
        }catch(e){
            console.error("No local cache for " + path);
            return {};
        }
    }
}

export default LeekSyncClient;