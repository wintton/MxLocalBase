import FileManager from "../util/FileManager"; 
import DataBase from "./DataBase";

class Connect {

  constructor(manager,BasePath){
    this.fileManmger = new FileManager(manager);
    this.BasePath = BasePath;
    try{
      this.fileManmger.accessSync(BasePath);
    } catch (e){ 
      console.log(e)
      this.fileManmger.mkdirSync({dirPath:BasePath,recursive:true});
    }
    this.connect = 1;
  }

  checkFileExsites(filePath){
    try{
      this.fileManmger.accessSync(filePath);
    } catch (e){
      console.log(e)
      return false;
    }
    return true;
  }

  isConnect(){
    return this.connect == 1;
  }

  isSelectDataBase(){
    if(this.databaseName){
      if(!this.database){
        this.database = new DataBase(this.fileManmger,this.databaseName,this.BasePath);
      }
    }
    return typeof this.databaseName == "string";
  }

  useDataBase(databaseName,create){
    if(!this.isConnect()){
      throw("当前数据库未连接");
    }
    let databasePath = this.BasePath + "/" + databaseName;
    if(!this.checkFileExsites(databasePath)){
      if(create){
        this.fileManmger.mkdirSync({dirPath:databasePath, recursive:true});
      } else {
        throw("数据库:" + databaseName + " 不存在");
      }  
    } 
    this.databaseName = databaseName; 
  }
  
  createDataBase(databaseName,error){
    if(!this.isConnect()){
      throw("当前数据库未连接");
    }
    let databasePath = this.BasePath + "/" + databaseName; 
    if(!this.checkFileExsites(databasePath)){
      this.fileManmger.mkdirSync({dirPath:databasePath, recursive:true});
      this.databaseName = databaseName;
    } else {
      if(error)throw("数据库：" + databaseName + " 已存在，请勿重复创建");
    }
  } 

  deleteDataBase(databaseName){
    if(!this.isConnect()){
      throw("当前数据库未连接");
    }
    let databasePath = this.BasePath + "/" + databaseName;
    if(!this.checkFileExsites(databasePath)){
      throw("数据库:" + databaseName + " 不存在"); 
    }
    this.fileManmger.rmdirSync({dirPath:databasePath,recursive:true});
    if(this.databaseName == databaseName){
      this.databaseName = "";
      this.database = "";
    }
  }

  selectTable(tableName){
    if(!this.isConnect()){
      throw("当前数据库未连接");
    }
    if(!this.isSelectDataBase()){
      throw("当前未选择数据库");
    }  
    this.database.selectTable(tableName)
  }

  showDataBases(){
    if(!this.isConnect()){
      throw("当前数据库未连接");
    }
    return this.fileManmger.readdirSync({dirPath:this.BasePath});
  }

  showTableList(){
    if(!this.isConnect()){
      throw("当前数据库未连接");
    }
    if(!this.isSelectDataBase()){
      throw("当前未选择数据库");
    }  
    return this.database.showTables();
  }

  doAddTableSet(itemSet){
    if(!this.isConnect()){
      throw("当前数据库未连接");
    }
    if(!this.isSelectDataBase()){
      throw("当前未选择数据库");
    }  
    return this.database.doAddTableSet(itemSet);
  }

  getCurDataBase(){
    if(!this.isConnect()){
      throw("当前数据库未连接");
    }
    if(!this.isSelectDataBase()){
      throw("当前未选择数据库");
    } 
    return this.database;
  }

  createTable(tableName){
    if(!this.isConnect()){
      throw("当前数据库未连接");
    }
    if(!this.isSelectDataBase()){
      throw("当前未选择数据库");
    } 
    this.database.createTable(tableName);
  }

  deleteTable(tableName){
    if(!this.isConnect()){
      throw("当前数据库未连接");
    }
    if(!this.isSelectDataBase()){
      throw("当前未选择数据库");
    } 
    this.database.deleteTable(tableName);
  }

  doShowTableSet(tableName){
    if(!this.isConnect()){
      throw("当前数据库未连接");
    }
    if(!this.isSelectDataBase()){
      throw("当前未选择数据库");
    } 
    return this.database.doShowTableSet(tableName);
  }

  closeConnect(){
    this.connect = 0;
  }
  

}

export default Connect;