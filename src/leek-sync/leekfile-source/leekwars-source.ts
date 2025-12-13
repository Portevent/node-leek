import LeekFile from "../filelist/leekfile";
import LeekfileSource from "./leekfile-source";
import NodeLeekClient from "../../node-leek-client/node-leek-client";
import Filelist from "../filelist/filelist";
import filelist from "../filelist/filelist";

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

    deleteFile(file: LeekFile) {
        // TODO
    }

    updateFile(file: LeekFile): void {
        // TODO
    }
}

export default LeekwarsSource;