import LeekFile from "../filelist/leekfile";
import Filelist from "../filelist/filelist";


abstract class LeekfileSource {

    protected filelist: Filelist;

    protected constructor(filelist: Filelist) {
        this.filelist = filelist;
    }

    async updateFile(file: LeekFile): Promise<void> {

    }

    async deleteFile(file: LeekFile): Promise<void> {

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
            otherSource.filelist.getFiles().map((file: LeekFile) =>
                this.updateFile(file)
            )
        );
    }

    compareWith(otherSource: LeekfileSource): boolean {
        return this.filelist.compare(otherSource.filelist);
    }
}

export default LeekfileSource;