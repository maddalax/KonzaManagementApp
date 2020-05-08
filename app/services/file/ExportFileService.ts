import os from 'os';
import fs from 'fs';

export class ExportFileService {

  public toHomeFolder(value : string, fileName : string) {
    const home = os.homedir();
    const path = `${home}/${fileName}`
    fs.writeFileSync(path, value);
  }

}
