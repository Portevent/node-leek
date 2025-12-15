import LeekFile from "../filelist/leekfile";
import Filelist from "../filelist/filelist";


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
        await Promise.all(
            this.filelist.getFiles()
                .filter((file: LeekFile) => !otherSource.filelist.contains(file.name))
                .map((file: LeekFile) => this.deleteFile(file))
        );

        // Update files
        await Promise.all(
            otherSource.filelist.getFiles()
                .filter((file: LeekFile) => !this.filelist.fileIsSimilar(file))
                .map((file: LeekFile) => {
                    console.log("Updating out of sync : " + file.name);
                    this.updateFile(file)
            })
        );
    }

    compareWith(otherSource: LeekfileSource): boolean {
        return this.filelist.compare(otherSource.filelist);
    }

    isPristine() : boolean{
        return this.filelist.pristine;
    }

    getCount() : number{
        return this.filelist.getCount();
    }
}

export default LeekfileSource;