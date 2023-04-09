class FileManager {  
   constructor(manager){
      this.manager = manager; 
   } 

   access(options){
    this.manager.access(options)
   }

   accessSync(options){
    this.manager.accessSync(options)
   }

   appendFile(options){
    this.manager.appendFile(options)
   }

   appendFileSync(options){
    this.manager.appendFileSync(options)
   }

   close(options){
    this.manager.close(options)
   }

   closeSync(options){
    this.manager.closeSync(options)
   }

   copyFile(options){
    this.manager.copyFile(options)
   }

   copyFileSync(options){
    this.manager.copyFileSync(options)
   }

   fstat(options){
    this.manager.fstat(options)
   }

   fstatSync(options){
    this.manager.fstatSync(options)
   }

   ftruncate(options){
    this.manager.ftruncate(options)
   }

   ftruncateSync(options){
    this.manager.ftruncateSync(options)
   }

   getFileInfo(options){
    this.manager.getFileInfo(options)
   }

   getSavedFileList(options){
    this.manager.getSavedFileList(options)
   }

   mkdir(options){
    this.manager.mkdir(options)
   }

   mkdirSync(options){
    this.manager.mkdirSync(options.dirPath,options.recursive)
   }

   open(options){
    this.manager.open(options)
   }

   openSync(options){
    this.manager.openSync(options)
   }

   read(options){
    this.manager.read(options)
   }
  
   readCompressedFile(options){
    this.manager.readCompressedFile(options)
   }

   readCompressedFileSync(options){
     return this.manager.readCompressedFileSync(options);
   }

   readdir(options){
    this.manager.readdir(options);
  }

  readdirSync(options){
    return this.manager.readdirSync(options.dirPath);
  }

  readFile(options){
    this.manager.readFile(options);
  }

  readFileSync(options){ 
    return this.manager.readFileSync(options.filePath,options.encoding,options.position,options.length);
  }

  readSync(options){
    return this.manager.readSync(options);
  }

  readZipEntry(options){
    this.manager.readZipEntry(options);
  }

  removeSavedFile(options){
    this.manager.removeSavedFile(options);
  }

  rename(options){
    this.manager.rename(options);
  }

  renameSync(options){
    this.manager.renameSync(options.oldPath,options.newPath);
  }

  rmdir(options){
    this.manager.rmdir(options);
  }

  rmdirSync(options){
    this.manager.rmdirSync(options.dirPath,options.recursive);
  }

  saveFile(options){
    this.manager.saveFile(options);
  }

  saveFileSync(options){
    this.manager.saveFileSync(options.tempFilePath,options.filePath);
  }

  stat(options){
    this.manager.stat(options);
  }

  statSync(options){
    return this.manager.statSync(options.path,options.recursive);
  }

  truncate(options){
    return this.manager.truncate(options);
  }

  truncateSync(options){
    return this.manager.truncateSync(options);
  }

  unlink(options){
    this.manager.unlink(options);
  }

  unlink(options){
    this.manager.unlink(options.filePath);
  }

  unzip(options){
    this.manager.unzip(options);
  }

  write(options){
    this.manager.write(options);
  }

  writeFile(options){
    this.manager.writeFile(options);
  }

  writeFileSync(options){
    this.manager.writeFileSync(options.filePath,options.data,options.encoding);
  }
 
  writeSync(options){
    this.manager.writeSync(options);
  }  

  

}

export default FileManager;