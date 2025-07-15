const fs = require('fs');
const path = require('path');
const FileUploaderInterface = require('../../application/services/file-uploader.interface');

class LocalFileUploader extends FileUploaderInterface {
  constructor() {
    super();
    this.uploadDir = path.join(__dirname, '../../../public/uploads');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async upload(file, userId) {
    const filename = `${userId}-${Date.now()}-${file.originalname}`;
    const filePath = path.join(this.uploadDir, filename);

    await fs.promises.writeFile(filePath, file.buffer);

    return `/uploads/${filename}`;
  }
}

module.exports = LocalFileUploader;
