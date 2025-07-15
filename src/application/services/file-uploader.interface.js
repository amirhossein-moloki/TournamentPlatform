class FileUploaderInterface {
  async upload(file, userId) {
    throw new Error('Not implemented');
  }
}

module.exports = FileUploaderInterface;
