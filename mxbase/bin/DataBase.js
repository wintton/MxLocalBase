import Table from "./Table";
class DataBase {
  
  constructor(manager,databaseName,BasePath){
    this.fileManmgerObject = manager; 
    this.databaseName = databaseName;
    this.BasePath = BasePath; 
  }

  get CurPath(){
    return this.BasePath + "/" + this.databaseName;
  }

  get CurTablePath(){
    return this.BasePath + "/" + this.databaseName + "/" + this.tableName;
  }

  createTable(tableName,options){ 
    let tablePath = this.CurPath + "/" + tableName;
    try{
      this.fileManmger.accessSync(tablePath);
      throw("数据表:" + tableName + " 已存在，请勿重复创建"); 
    } catch (e){ 
      console.log(e) 
      this.fileManmger.mkdirSync({dirPath:tablePath, recursive:true});  
      this.fileManmger.mkdirSync({dirPath:tablePath + "/set", recursive:true});  
      this.fileManmger.mkdirSync({dirPath:tablePath + "/data", recursive:true});  
      this.fileManmger.mkdirSync({dirPath:tablePath + "/index", recursive:true});  
      if(options){
        this.tableName = tableName;
        this.setTableOptions(options);
      }
    } 
  }

  selectTable(tableName){
    if(tableName){
      this.tableName = tableName;
    }
    if(this.tableName){
      if(!this.curTable){
        this.curTable = new Table(this.fileManmger,this.tableName,this.CurPath);
      }
    }
    return typeof this.tableName == "string";
  }

  setTableOptions(options){
    if(!this.selectTable()){
      throw("当前未选择数据库")
    }
    let setJson = {};
    if(!options.column || typeof options.column[0] != "object"){
      throw("错误的列表设置"); 
    }
    let hasPrimaryKey = false;
    for(let item of options.column){
        if(!item.name){
          throw("列表必须含有name字段"); 
        } 
        if(item.autoIncrement && item.type != "number"){
          throw("自动增加类型只能为数字"); 
        } 
        if(item.primaryKey ){
          if(hasPrimaryKey){
            throw("主键仅能有一个字段"); 
          }
          hasPrimaryKey = true;
        } 
        setJson[item.name] = {
          name:item.name,
          defaultValue:item.defaultValue || undefined,
          autoIncrement:item.autoIncrement || false,
          comment:item.comment || "无",
          type:item.type || "any",
          notNull:item.notNull,
          primaryKey:item.primaryKey || false,
          uni:item.uni
        };
    } 
    this.fileManmger.writeFileSync({
      filePath:this.CurTablePath + "/set/set.json",
      data:setJson,
      encoding:"utf-8"
    })
  }

  get fileManmger(){
    return this.fileManmgerObject;
  }

  doAddTableSet(itemSet){ 
    if(!this.selectTable()){
      throw("当前未选择数据库")
    }
    return this.curTable.doAddTableSet(itemSet);
  }
   
  showTables(){ 
    try{ 
      return this.fileManmger.readdirSync({dirPath:this.CurPath});
    } catch(e){
      console.log(e)
    }
    return [];
  }
  
  deleteTable(tableName){ 
    let tablePath = this.CurPath + "/" + tableName;
    try{
      this.fileManmger.accessSync(tablePath);
    } catch (e){ 
      console.log(e)
      throw("数据表:" + tableName + " 不存在"); 
    }
    this.fileManmger.rmdirSync({dirPath:tablePath,recursive:true}); 
    if(this.tableName == tableName){
      this.tableName = "";
      this.curTable = "";
    }
  }

  doShowTableSet(tableName){
    let tablePath = this.CurPath + "/" + tableName;
    try{
      this.fileManmger.accessSync(tablePath);
    } catch (e){ 
      console.log(e)
      throw("数据表:" + tableName + " 不存在"); 
    }
    if(this.tableName != tableName){
      selectTable(tableName);
    }
    return this.database.curTable.CurSetJson;
  }

}

export default DataBase;