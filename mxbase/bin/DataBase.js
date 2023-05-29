import { log } from "../util/util";
import Table from "./Table";
class DataBase {
  
  tableMap = {}
  tableList = []

  constructor(manager,databaseName,BasePath){
    this.fileManmgerObject = manager; 
    this.databaseName = databaseName;
    this.BasePath = BasePath; 
    this.loadTableList();
  }

  get CurPath(){
    return this.BasePath + "/" + this.databaseName;
  }

  get CurTablePath(){
    return this.BasePath + "/" + this.databaseName + "/" + this.tableName;
  }

  createTable(tableName,options){ 
    let tablePath = this.CurPath + "/" + tableName;
    if(this.tableMap[tableName]){
      throw("已存在数据表：" + tableName + " 请勿重复创建")
    }
    try{
      this.fileManmger.mkdirSync({dirPath:tablePath, recursive:true});  
      this.fileManmger.mkdirSync({dirPath:tablePath + "/set", recursive:true});  
      this.fileManmger.mkdirSync({dirPath:tablePath + "/data", recursive:true});  
      this.fileManmger.mkdirSync({dirPath:tablePath + "/index", recursive:true});  
      if(options){ 
        this.setTableOptions(tableName,options);
      } 
      this.tableMap[tableName] = new Table(this.fileManmger,tableName,this.CurPath);
    } catch (e){ 
      console.log(e)  
    } 
  }

  loadTableList(){
    let tableList = [];
    try{
      tableList = this.fileManmger.readdirSync({dirPath:this.CurPath});
    } catch(e) {
      log(e);
    }
    for(let tableName of tableList){
        this.tableMap[tableName] = new Table(this.fileManmger,tableName,this.CurPath);
    }
    this.tableList = tableList;
  } 

  setTableOptions(tableName,options){
    this.tryConnectTable(tableName);
    this.tableMap[tableName].setTableOptions(options);
  }

  tryConnectTable(tableName){
    if(!this.tableMap[tableName]){
      throw("不存在数据表：" + tableName)
    }
    if(!this.tableMap[tableName].isConnect){
      this.tableMap[tableName] = new Table(this.fileManmger,tableName,this.CurPath);
    }
    return this.tableMap[tableName];
  }

  get fileManmger(){
    return this.fileManmgerObject;
  }

  doAddTableSet(tableName,itemSet){ 
    this.tryConnectTable(tableName);
    return this.tableMap[tableName].addTableSet(itemSet);
  }
   
  showTables(){  
    return this.tableList;
  }
  
  deleteTable(tableName){ 
    let tablePath = this.CurPath + "/" + tableName;
    if(!this.tableMap[tableName]){
      throw("数据表:" + tableName + " 不存在"); 
    } 
    this.fileManmger.rmdirSync({dirPath:tablePath,recursive:true}); 
    this.tableMap[tableName] = {};
    delete this.tableMap[tableName];
    this.tableList.splice(this.tableList.indexOf(tableName),1);
  }

  doShowTableSet(tableName){
    this.tryConnectTable(tableName);
    return this.tableMap[tableName].setJson.data;
  }

}

export default DataBase;