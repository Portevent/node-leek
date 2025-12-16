import LeekFile from "../filelist/leekfile";
import LeekfileSource from "./leekfile-source";
import NodeLeekClient from "../../node-leek-client/node-leek-client";
import Filelist from "../filelist/filelist";

class LeekwarsSource extends LeekfileSource {
    private nodeLeekClient: NodeLeekClient;

    constructor(nodeLeekClient: NodeLeekClient, filelist: Filelist) {
        super(filelist);
        this.nodeLeekClient = nodeLeekClient;
    }

    async init() {
        // Get an updated list of leekwars files
        const leekwarsFiles = this.nodeLeekClient.getFiles();

        // Remove in leekwarsFilesystem all files that aren't present in leekwars anymore
        this.filelist.removeAllNotIn(Object.keys(leekwarsFiles));

        // fetchAllFiles in leekwars and update leekwarsFiles accordingly (note: use leekwarsFiles to get timestamp on files previously fetched)
        const filesToUpdate: [number, string][] = [];
        Object.entries(leekwarsFiles).forEach(([name, fileId]) => {
            if (this.isFolder(name)) {
                const newFolder = LeekFile.Folder(name, fileId);
                if(!this.filelist.fileIsSimilar(newFolder))
                    console.log("CHANGE IN " + name);
                    this.filelist.set(name, newFolder);
            } else {
                filesToUpdate.push([fileId, name]);
            }
        });

        // Update all file in local filesystem with new code and timestamp
        await this.fetchFiles(filesToUpdate)
    }

    private async fetchFiles(files: [number, string][]) {
        const aiNames: { [id: number]: string } = {};
        var fetchRequests: { [id: number]: number } = {};

        files.forEach(([ai_id, ai_name]) => {
            fetchRequests[ai_id] = this.filelist.getTimestamp(ai_name);
            aiNames[ai_id] = ai_name;
        })

        return this.nodeLeekClient
            .fetchFiles(fetchRequests)
            .then(ais =>
                ais.forEach(aiCode => {
                    const name = aiNames[aiCode.id];
                    this.filelist.set(name, new LeekFile(name, aiCode.id, aiCode.code, aiCode.modified));
                })
            );
    }

    private isFolder(filename: string): boolean {
        return filename.charAt(filename.length - 1) == "/";
    }

    async deleteFile(file: LeekFile) {
        var leekwarsFile = this.filelist.get(file.name);
        if (leekwarsFile != null) {
            if (leekwarsFile.folder) return this.nodeLeekClient.deleteFolder(leekwarsFile.id).then(() => super.deleteFile(file));

            return this.nodeLeekClient.deleteFile(leekwarsFile.id).then(() => super.deleteFile(file));
        } else {
            console.error("Trying to delete on leekwars " + file.name + ". But this file doesn't exists")
        }
    }

    async updateFile(file: LeekFile): Promise<void> {
        await this.createOrUpdateFileInLeekwars(file);
    }

    private async createOrUpdateFileInLeekwars(file: LeekFile): Promise<void> {
        var leekwarsFile = this.filelist.get(file.name);
        if (leekwarsFile != null) await this.updateFileInLeekwars(leekwarsFile, file.code);
        else await this.createFileInLeekwars(file);
    }


    private async updateFileInLeekwars(file: LeekFile, code: string): Promise<void> {
        if(file.folder) return;
        return this.nodeLeekClient.saveFile(file.id, code)
            .then((timestamp) => {
                this.filelist.get(file.name).code = file.code;
                this.filelist.get(file.name).timestamp = timestamp;
            })
    }

    private async createFileInLeekwars(file: LeekFile): Promise<void> {
        if(file.folder) return this.createFolderInLeekwars(file).then((id) => {});
        return this.nodeLeekClient.createFile(await this.getOrCreateFolderId(file.getParentFolder()), file.getFilenameWithoutExtension())
            .then(async ia => {
                const newFile = new LeekFile(file.name, ia.id, ia.code, 0);
                this.filelist.set(file.name, newFile);
                return this.updateFileInLeekwars(newFile, file.code);
            })
    }

    private async createFolderInLeekwars(file: LeekFile): Promise<number> {
        console.log("createFolderInLeekwars " + file.name);
        return this.getOrCreateFolderId(file.name);
    }

    private async getOrCreateFolderId(dirname: string): Promise<number> {
        if (this.filelist.contains(dirname)) {
            console.log("getOrCreateFolderId exist " + dirname + " = " + this.filelist.get(dirname).id);
            return this.filelist.get(dirname).id
        }

        console.log("getOrCreateFolderId don't exist " + dirname);

        const id = await this.nodeLeekClient.createFolder(
            await this.getOrCreateFolderId(this.getFolderParentPath(dirname)),
            this.getFolderName(dirname)
        );
        this.filelist.set(dirname, LeekFile.Folder(dirname, id));
        console.log("GetOrCreateFolder " + dirname + " = " + id);
        return id;
    }

    private getFolderParentPath(dirname: string){
        const withoutLeadingSlash = dirname.substring(0, dirname.length - 2);
        return withoutLeadingSlash.substring(0, withoutLeadingSlash.lastIndexOf("/") + 1);
    }

    private getFolderName(dirname: string){
        const withoutLeadingSlash = dirname.substring(0, dirname.length - 1);
        return withoutLeadingSlash.substring(withoutLeadingSlash.lastIndexOf("/") + 1);
    }
}

export default LeekwarsSource;