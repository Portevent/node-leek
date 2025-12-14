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
        await this.nodeLeekClient.login();

        // Get an updated list of leekwars files
        const leekwarsFiles = this.nodeLeekClient.getFiles();

        // Remove in leekwarsFilesystem all files that aren't present in leekwars anymore
        this.filelist.removeAllNotIn(Object.keys(leekwarsFiles));

        // fetchAllFiles in leekwars and update leekwarsFiles accordingly (note: use leekwarsFiles to get timestamp on files previously fetched)
        const filesToUpdate: [number, string][] = [];
        Object.entries(leekwarsFiles).forEach(([name, fileId]) => {
            if (this.isFolder(name)) {
                this.filelist.set(name, LeekFile.Folder(name, fileId));
            } else {
                filesToUpdate.push([fileId, name]);
            }
        });

        // Update all file in local filesystem with new code and timestamp
        await this.updateFiles(filesToUpdate)
    }

    private async updateFiles(files: [number, string][]) {
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
            if (leekwarsFile.folder) return this.nodeLeekClient.deleteFolder(leekwarsFile.id);

            return this.nodeLeekClient.deleteFile(leekwarsFile.id);
        } else {
            console.error("Trying to delete on leekwars " + file.name + ". But this file doesn't exists")
        }
    }

    async updateFile(file: LeekFile): Promise<void> {
        this.createOrUpdateFileInLeekwars(file).then(([id, modified]) => {
            this.filelist.set(file.name, new LeekFile(file.name, id, file.code, modified, file.folder));
        })
    }

    private async createOrUpdateFileInLeekwars(file: LeekFile): Promise<[number, number]> {
        var leekwarsFile = this.filelist.get(file.name);
        if (leekwarsFile != null) {
            if (leekwarsFile.folder) return [leekwarsFile.id, 0];

            return this.updateFileInLeekwars(leekwarsFile.id, file.code);
        } else {
            if (file.folder) return this.createFolderInLeekwars(file);
            return this.createFileInLeekwars(file);
        }
    }

    private async updateFileInLeekwars(id: number, code: string): Promise<[number, number]> {
        return this.nodeLeekClient.saveFile(id, code)
            .then((result) => [id, result?.modified ?? 0])
    }


    private async createFolderInLeekwars(file: LeekFile): Promise<[number, number]> {
        return this.getOrCreateFolderId(file.name).then((folderId) => [folderId, 0])
    }


    private async createFileInLeekwars(file: LeekFile): Promise<[number, number]> {
        return this.nodeLeekClient.createFile(await this.getOrCreateFolderId(file.getParentFolder()), file.getFilename())
            .then(result => {
                return this.updateFileInLeekwars(result?.id ?? 0, file.code);
            })
    }

    private async getOrCreateFolderId(dirname: string): Promise<number> {
        if (this.filelist.contains(dirname)) return this.filelist.get(dirname).id;

        return this.nodeLeekClient.createFolder(
            await this.getOrCreateFolderId(this.getFolderParentPath(dirname)),
            this.getFolderName(dirname)
        ).then(result => result?.id ?? 0);
    }

    private getFolderParentPath(dirname: string){
        const withoutLeadingSlash = dirname.substring(dirname.length - 1);
        return withoutLeadingSlash.substring(0, withoutLeadingSlash.lastIndexOf("/") + 1);
    }

    private getFolderName(dirname: string){
        const withoutLeadingSlash = dirname.substring(0, dirname.length - 1);
        return withoutLeadingSlash.substring(withoutLeadingSlash.lastIndexOf("/") + 1);
    }
}

export default LeekwarsSource;