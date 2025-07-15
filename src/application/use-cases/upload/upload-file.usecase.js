class UploadFileUseCase {
  constructor(fileUploader) {
    this.fileUploader = fileUploader;
  }

  async execute({ file, userId }) {
    if (!file) {
      throw new Error('No file provided');
    }

    // In a real application, you would use a cloud storage service like S3
    const fileUrl = await this.fileUploader.upload(file, userId);

    return fileUrl;
  }
}

module.exports = UploadFileUseCase;
