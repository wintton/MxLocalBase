import FileManager from "../util/FileManager";

let typeMap = {
  "string":1,
  "number":1,
  "boolean":1,
  "object":1
}

class Table {
  
  constructor(manager,tableName,BasePath){
    if(manager instanceof FileManager){
      this.fileManmgerObject = manager;
    } else {
      this.fileManmgerObject = new FileManager(manager);
    } 
    this.tableName = tableName;
    this.BasePath = BasePath;
    this.connect(); 
  } 

  connect(){
    if(this.isConnect){
      return true;
    }
    try{  
      this.fileManmger.accessSync(this.CurPath);  
    } catch (e){ 
      throw("当前数据表不存在");
    }
    this.loadTableSet();
    this.loadTableDataPath();
    this.isConnect = 1;
    return true;
  }

  close(){
    this.connect = 1;
  }

  get fileManmger(){
    return this.fileManmgerObject;
  }

  get CurPath(){
    return this.BasePath + "/" + this.tableName;
  } 

  loadTableSet(){
    try{
      let setJsonPath = this.CurPath + "/set/set.json";
      this.fileManmger.accessSync(setJsonPath);
      let readData =  this.fileManmger.readFileSync({
        filePath:setJsonPath,
        encoding:"utf-8",
      })
      console.log(readData) 
      this.setJson = JSON.parse(readData)
    } catch (e){ 
      console.log(e); 
      this.setJson = {
        data:[],
        index:{}
      };
    } 
  }

  loadTableDataPath(){
    try{
      let dataJsonPath = this.CurPath + "/data"; 
      let resultData =  this.fileManmger.readdirSync({dirPath:dataJsonPath});
      if(!(resultData instanceof Array)){
        resultData = [];
      }
      let result = [];
      for(let item of resultData){
        result.push({
          path:item,
          data:[],
          read:0,
          modify:0,
        })
      } 
      this.dataJsonList = result;
    } catch (e){ 
      console.log(e); 
      this.dataJsonList = [];
    } 
  }

  addTableSet(itemSet){
    this.checkConnect(); 
    this.checkItemSet(itemSet);
    let setJson = this.setJson;
    if(typeof setJson.index[itemSet.name] == "number"){
      throw("当前字段已存在，请勿重复创建");
    } 
    for(let item of setJson.data){ 
      if(itemSet.primaryKey && item.primaryKey){
        throw("已存在主键");
      }
    }
    //TODO 修改数据所有数据增加列
    setJson.data.push(itemSet);
    setJson.index[itemSet.name] = setJson.data.length - 1;
    this.saveSetJson(setJson);
  }

  modiftyTableSet(name,itemSet){
    this.checkConnect();
    this.checkItemSet(itemSet);
    let setJson = this.setJson; 
    if(typeof setJson.index[name] != "number"){
      throw("修改字段不存在");
    } 
    if(typeof setJson.index[itemSet.name] != "number"){
      throw("目标字段已存在，请勿重复创建");
    } 
    if(itemSet.primaryKey && typeof setJson.index.primaryKey){
      throw("当前表已存在主键");
    }  
    //TODO 将所有数据替换字段
    setJson.data.splice(setJson.index[name],1);
    setJson.data.push(itemSet);
    this.reIndexSetJson(setJson);
    this.saveSetJson(setJson);
  }

  deleteTableSet(name){
    this.checkConnect();
    this.checkItemSet(itemSet);
    let setJson = this.setJson; 
    if(typeof setJson.index[name] != "number"){
      throw("删除字段不存在");
    } 
    //TODO 将所有数据删除字段
    setJson.data.splice(setJson.index[name],1);
    this.reIndexSetJson(setJson);
    this.saveSetJson(setJson);
  }

  checkConnect(){
    if(!this.isConnect){
      throw("未连接当前数据表")
    }
  }

  checkItemSet(itemSet){
    if(!itemSet.name){
      throw("列表必须含有name字段"); 
    } 
    if(!itemSet.type){
      throw("列表必须设置type字段"); 
    }  
    if(!typeMap[itemSet.type]){
      throw("type只能为：string、number、boolean、object"); 
    }
    if(itemSet.autoIncrement && itemSet.type != "number"){
      throw("自动增加类型只能为数字"); 
    }  
  }

  saveSetJson(){
    this.fileManmger.writeFileSync({
      filePath:this.CurPath + "/set/set.json",
      data:JSON.stringify(this.setJson),
      encoding:"utf-8"
    })
  }

  saveDataJson(dataJson){
    this.fileManmger.writeFileSync({
      filePath:this.CurPath + "/data/" + dataJson.path,
      data:JSON.stringify(dataJson.data),
      encoding:"utf-8"
    })
  }

  readDataJson(path){
    let result = [];
    try{
      let dataJsonPath = this.CurPath + "/data/" + path; 
      let readData =  this.fileManmger.readFileSync({
        filePath:dataJsonPath,
        encoding:"utf-8",
      })
      console.log(readData) 
      result = JSON.parse(readData)
      if(!(result instanceof Array)){
        result = [];
      }
    } catch (e){  
      result = [];
    } 
    return result;
  }

  reIndexSetJson(setJson){
    let indexMap = {};
    let index = 0;
    for(let item of setJson.data){
      indexMap[item.name] = index;
      index++;
    }
    setJson.index = indexMap;
  }

  addData(itemData){
    let setData = this.setJson.data;
    let addJson = {};
    for(let item of setData){
      if(item.primaryKey && !itemData[item.name]){
        throw("主键 " + item.name + " 不能为空")
      }
      if(item.uni && !itemData[item.name]){
        throw("唯一键 " + item.name + " 不能为空")
      }
      if(itemData[item.name] && typeof itemData[item.name] != item.type){
        throw("字段 " + item.name + " 类型不匹配 " + item.type)
      }
      if(typeof itemData[item.name] !=  "undefined"){
        addJson[item.name] = itemData[item.name];
      } else {
        addJson[item.name] = item.default;
      } 
    }
    let size = this.dataJsonList.length;
    //TODO 
  }
 
}

export default Table;