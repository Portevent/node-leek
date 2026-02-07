import LeekFile from "../filelist/leekfile.js";
import Filelist from "../filelist/filelist.js";


abstract class LeekfileSource {

    protected filelist: Filelist;

    protected constructor(filelist: Filelist) {
        this.filelist = filelist;
    }

    async updateFile(file: LeekFile): Promise<void> {
        this.filelist.set(file.name, file);
    }

    async deleteFile(file: LeekFile): Promise<void> {
        this.filelist.remove(file.name);
    }

    abstract init(): void;

    async importFrom(otherSource: LeekfileSource): Promise<void> {
        // Remove file not present in the otherSource
        for (const file of this.filelist.getFiles()
            .filter((file: LeekFile) => !otherSource.filelist.contains(file.name))) {
            await new Promise(resolve => setTimeout(resolve, 50));
            await this.deleteFile(file)
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        // Update files
        for (const file of otherSource.filelist.getFiles()
            .filter((file: LeekFile) => !this.filelist.fileIsSimilar(file))) {
            console.log("Updating out of sync : " + file.name);
            await new Promise(resolve => setTimeout(resolve, 50));
            await this.updateFile(file)
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }

    compareWith(otherSource: LeekfileSource): boolean {
        return this.filelist.compare(otherSource.filelist);
    }

    isPristine(): boolean {
        return this.filelist.pristine;
    }

    getCount(): number {
        return this.filelist.getCount() - 1; // Minus 1 because we don't count root folder
    }
}

export default LeekfileSource;