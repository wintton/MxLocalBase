大家好哇，我是梦辛工作室的灵，在最近的开发过程中又遇到了一些问题，这次是关于本地存储的，在小程序面进行存储一些数据，本来就依靠小程序的本地储存API 就可以实现，但数据量小还好，如果数据量大那么就不在方便了，主要就没办法查询或批量修改，我这次主要是因为小程序有无网络状态下也需要可以正常运行，所以我想着能不能直接把数据库放在本地算了，就样子就算没有网络也可以正常运行，然后有网络的时候再去做同步就可以，本着这样的想法，我就瞄上了小程序的文件储存API，如果我把我所需要的数据存在JSON里面然后再存在本地文件夹就可以了，然后就按照自己的想法写出来了MxLocalBase，目前已简单实现的数据库的建立、数据表的建立、事务、索引等，由于JS是单线程运行的，所以也就不用担心多线程的问题，下面来看下整体结构：
![在这里插入图片描述](https://img-blog.csdnimg.cn/994a7cf1d2c344c4aee6eda879c27ed7.png)
核心类就是bin下面的3个文件，util 文件夹里面主要是 用来做文件储存的辅助类，
先简单说明下如何使用吧
这3个类可以自己独立运行，Connect 可以用于管理 DataBase ，DataBase可以用于管理多个Table类
Table类用于管理文件数据
先说Connect的使用方法： 

```typescript
  let curConn = new Connect(wx.getFileSystemManager(), basePath + path);
  let databaseList = curConn.showDataBases(); //获取数据库列表
  curConn.useDataBase(baseName); //选择目前操作的数据库
  let tableList = curConn.showTableList(); //获取当前数据库的数据表列表
  let curDataBase = curConn.getCurDataBase();//获取当前操作的数据库对象 即使 DataBase 类
  curConn.createTable(tableName,options) //创建数据表
  //options 为数据表结构，其格式为：[item ,....]
  //item :{"name":"列名称"：, "type":"列类型 目前支持 string,  number,object,boolean" ,
  //  "default"："默认值", "increment":"是否自动增加", "notNull":"是否不为null", 
  //"primaryKey":"是否为主键", "uni":"是否为唯一键", "comment":"说明"} 
 curConn.doAddTableSet(tableName,itemSet);// 数据表添加列 itemSet 和上述 item 一个格式
 curConn.deleteDataBase(databaseName); //删除数据库	 
 curConn.createDataBase(databaseName,error); //创建数据库
 let table = tryConnectTable(tableName); //获取当前数据表对象 即 Table 类
 curConn.deleteTable(tableName); // 删除数据表 
```
DataBase 的使用方法：

```javascript
let curDataBase = curConn.getCurDataBase(); //可以这样获取DataBase对象，也可以直接创建
let curDataBase = new DataBase(wx.getFileSystemManager(),databaseName,BasePath);
curDataBase.createTable(tableName,options); // 创建数据表 同上
let curTable = curDataBase.tryConnectTable(tableName); //获取数据表 也同上
DataBase 创建的时候会读取本地的文件夹列表，视为数据表，并创建其数据表对象
```
Table的使用方法：

```javascript
let curTable = curDataBase.tryConnectTable(tableName); //获取数据表 也可以直接创建
let curtable = new Table(wx.getFileSystemManager(), tableName, BasePath);
curtable.setAutoCommit(false); // 开启事务
curtable.addTableSet(itemSet); // 添加列，属性同 上item 
curtable.modiftyTableSet(name,itemSet); // 修改列，name 列名称 itemSet属性同 上item 
curtable.deleteTableSet(name); //删除列 name 为列名称

curtable.modifyData(updateData, whereData); //修改数据 updateData 格式为 [{name:"列名",value:"值"}]
// whereData 的格式为： [{name:"列名",type:"比对类型",value:"值"}]
//目前比对在 util里面的 compareMap，并有其对应的判断方法

curtable.modifyDataByPathIndex(updateData, pathIndex, dataIndex)
//修改数据 updateData 格式为 [{name:"列名",value:"值"}]
//pathIndex 为数据所保存的文件索引，文件目前会按1000条数据划分文件，如 data_0.json  pathIndex 就为0
//dataIndex 为数据所在文件的json中的行数，每个数据返回是都会有 pathIndex, dataIndex

curtable.deleteDataByPathIndex({pathIndex, dataIndex}) //删除指定数据

curtable.deleteData(whereData) //删除数据，同上

curtable.selectData(whereData, mapFun, limitData, orderByData) //查询数据 whereData 格式同上 mapFun为自定义方法
//，每查询到合适的数据就会主动调用该方法
//limitData 为 {start：开始行数，count：返回条数}
//orderByData 为排序对象 格式为：[{name:'列名',type:'排序规则，desc 或 asc'},....]

curtable.addData(itemData);//添加的数据，格式为当前数据表结构
curtable.commit();//提交数据，若不开始事务，修改数据后，500ms 后就会自动保存到文件里

```
好了，然后在和大家讲下原理把，其实核心还是Table 类，其他的都只是用于管理罢了，
Table 类里面的核心结构为
```javascript
//数据列表
dataJsonList:[
 	{
		path: 'data_0.json', // 文件名称
	    pathIndex: index,	//文件索引
	    data: [], //具体数据
	    read: 0, //读了几次，用于清理内存时，按读取次数清理，越小越容易被清理
	    modify: 0, //修改位，用于保存时判断是否需要重新写入文件
	    primaryKeyIndex:{},	//主键索引映射
	    uniIndex:{}, //唯一键索引映射
	    indexMap:{} //其他索引映射
    }
]
//数据表结构
setJson:[
	{
		"data": [{
			"name": "username",
			"default": "",
			"type": "string",
			"uni": true
		}, {
			"name": "password",
			"default": "",
			"type": "string",
			"uni": false
		}, {
			"name": "showname",
			"type": "string",
			"default": "",
			"uni": false
		}],
		"index": {
			"username": 0,
			"password": 1,
			"showname": 2
		}
	}
]
```
目前我这边还写了一个微信小程序的展示界面：
![在这里插入图片描述](https://img-blog.csdnimg.cn/c64660c132a348c79b6aa551f67e0ca8.png)
![在这里插入图片描述](https://img-blog.csdnimg.cn/8964167126e7452692bea26c894e3467.png)
![在这里插入图片描述](https://img-blog.csdnimg.cn/21e1ed81dcd14f4887e1cdb13152b543.png)
![在这里插入图片描述](https://img-blog.csdnimg.cn/4d8741eb51194eac8d4ae0898ab4f86c.png)
代码已上传至github ，有兴趣的同学可以去看下，有什么问题还请大佬们多多指教
[github传送门](https://github.com/wintton/MxLocalBase.git)
[gitee传送门](https://gitee.com/zwq_wintton/mx-local-base.git)


还是依旧老规矩，上源码：
Connect.js

```javascript
import FileManager from "../util/FileManager"; 
import DataBase from "./DataBase";

class Connect {

  constructor(manager,BasePath){
    this.fileManmger = new FileManager(manager);
    this.BasePath = BasePath;
    try{
      this.fileManmger.accessSync(BasePath);
    } catch (e){  
      this.fileManmger.mkdirSync({dirPath:BasePath,recursive:true});
    }
    this.connect = 1; 
  }

  checkFileExsites(filePath){
    try{
      this.fileManmger.accessSync(filePath);
    } catch (e){
      return false;
    }
    return true;
  }

  isConnect(){
    return this.connect == 1;
  }

  isSelectDataBase(){
    if(this.databaseName){
      if(!this.database || this.database.databaseName != this.databaseName){
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

  tryConnectTable(tableName){
    if(!this.isConnect()){
      throw("当前数据库未连接");
    }
    if(!this.isSelectDataBase()){
      throw("当前未选择数据库");
    }  
    return this.database.tryConnectTable(tableName);
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

  doAddTableSet(tableName,itemSet){
    if(!this.isConnect()){
      throw("当前数据库未连接");
    }
    if(!this.isSelectDataBase()){
      throw("当前未选择数据库");
    }  
    return this.database.doAddTableSet(tableName,itemSet);
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

  createTable(tableName,options){
    if(!this.isConnect()){
      throw("当前数据库未连接");
    }
    if(!this.isSelectDataBase()){
      throw("当前未选择数据库");
    } 
    this.database.createTable(tableName,options);
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
```
DataBase.js

```javascript
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
```
Table.js

```javascript
import FileManager from "../util/FileManager";
import util from "../util/util"
let typeMap = {
  "string": 1,
  "number": 1,
  "boolean": 1,
  "object": 1
}
let saveSetTimeout = 0;
let saveDataJsonTimeout = 0;
let releaseDataJsonTimeout = 0;
let saveIndexJsonTimeout = 0;
let MaxSaveLines = 1000; //一个文件最大保存1000条数据
let releaseLimitTime = 30 * 1000; // 读取数据 或 保存数据后多少秒清理内存
let releaseSaveCount = 3; // 释放内存数据时 保存数量 按readCount排序来释放
let saveLimitTime = 500;// 每隔500ms 才保存一次
class Table {

  constructor(manager, tableName, BasePath) {
    if (manager instanceof FileManager) {
      this.fileManmgerObject = manager;
    } else {
      this.fileManmgerObject = new FileManager(manager);
    }
    this.tableName = tableName;
    this.BasePath = BasePath;
    this.autoCommit = true;
    this.connect();
  }

  setAutoCommit(autoCommit) {
    this.autoCommit = autoCommit;
  }

  connect() {
    if (this.isConnect) {
      return true;
    }
    try {
      this.fileManmger.accessSync(this.CurPath);
    } catch (e) {
      throw ("当前数据表不存在");
    }
    this.isConnect = 1;
    this.loadTableSet();
    this.loadTableDataPath();
    this.loadTableIndex();
    return true;
  }

  close() {
    this.checkConnect();
    if (this.autoCommit) {
      this.commit();
    } else {
      this.rollback();
    }
    this.connect = 1;
  }

  get fileManmger() {
    return this.fileManmgerObject;
  }

  get CurPath() {
    return this.BasePath + "/" + this.tableName;
  }

  loadTableSet() {
    this.checkConnect();
    this.setJson = this.readFileSync("/set/set.json", {
      data: [],
      index: {}
    })
  }

  setTableOptions(options) {
    this.checkConnect();
    if (this.setJson.data.length > 0) {
      throw ("当前数据表已存在结构，请勿重复设置");
    }
    let setJson = {
      data: [],
      index: {}
    };
    if (!options.column || typeof options.column[0] != "object") {
      throw ("错误的列表设置");
    }
    let hasPrimaryKey = false;
    for (let item of options.column) {
      if (!item.name) {
        throw ("列表必须含有name字段");
      }
      if (item.autoIncrement && item.type != "number") {
        throw ("自动增加类型只能为数字");
      }
      if (item.primaryKey) {
        if (hasPrimaryKey) {
          throw ("主键仅能有一个字段");
        }
        hasPrimaryKey = true;
      }
      setJson.data.push({
        name: item.name,
        defaultValue: item.defaultValue || undefined,
        autoIncrement: item.autoIncrement || false,
        comment: item.comment || "无",
        type: item.type || "any",
        notNull: item.notNull,
        primaryKey: item.primaryKey || false,
        uni: item.uni
      })
      setJson.index[item.name] = setJson.data.length - 1;
    }
    this.setJson = setJson;
    this.saveSetJson();
  }

  readFileSync(path, defaultValue) {
    let result = defaultValue;
    try {
      let dataPath = this.CurPath + path;
      this.fileManmger.accessSync(dataPath);
      let readData = this.fileManmger.readFileSync({
        filePath: dataPath,
        encoding: "utf-8",
      })
      result = JSON.parse(readData)
    } catch (e) {
      util.log(e);
    }
    return result;
  }

  loadTableDataPath() {
    this.checkConnect();
    try {
      let dataJsonPath = this.CurPath + "/data";
      let resultData = this.fileManmger.readdirSync({ dirPath: dataJsonPath });
      if (!(resultData instanceof Array)) {
        resultData = [];
      }
      let result = [];
      for (let index = 0; index < resultData.length; index++) {
        result.push({
          path: 'data_' + index + '.json',
          pathIndex: index,
          data: [],
          read: 0,
          modify: 0,
        })
      }
      this.dataJsonList = result;
    } catch (e) {
      util.log(e);
      this.dataJsonList = [];
    }
  }

  /**
   * 
   * @param {
   *    name:"字段名称",
   *    type:"字段类型",
   *    primaryKey:"是否为主键",
   *    default:"默认值",
   *    uni:"是否为唯一键"
   * } itemSet 字段属性
   */
  addTableSet(itemSet) {
    this.checkConnect();
    this.checkItemSet(itemSet);
    let setJson = this.setJson;
    if (typeof setJson.index[itemSet.name] == "number") {
      throw ("当前字段已存在，请勿重复创建");
    }
    if (itemSet.uni && typeof itemSet.default != "undefined") {
      throw ("唯一键默认值仅能为undefined");
    }
    for (let item of setJson.data) {
      if (itemSet.primaryKey && item.primaryKey) {
        throw ("已存在主键");
      }
    }
    let dataJsonList = this.dataJsonList;
    for (let dataJson of dataJsonList) {
      this.loadDataJson(dataJson);
      let index = 0;
      for (let item of dataJson.data) {
        if (typeof itemSet.default == "undefined") {
          item[itemSet.name] = undefined;
        } else {
          item[itemSet.name] = itemSet.default;
          if (dataJson.indexMap[itemSet.name]) {
            if (!dataJson.indexMap[itemSet.name][itemSet.default]) {
              dataJson.indexMap[itemSet.name][itemSet.default] = [index];
            } else {
              dataJson.indexMap[itemSet.name][itemSet.default].push(index);
            }
          }
        }
        index++;
      }
      dataJson.modify = 1;
    }
    setJson.data.push(itemSet);
    setJson.index[itemSet.name] = setJson.data.length - 1;
    this.saveSetJson(setJson);
    this.commit();
  }

  modiftyTableSet(name, itemSet) {
    this.checkConnect();
    this.checkItemSet(itemSet);
    let setJson = this.setJson;
    if (typeof setJson.index[name] != "number") {
      throw ("修改字段不存在");
    }
    if (typeof setJson.index[itemSet.name] != "number") {
      throw ("目标字段已存在，请勿重复创建");
    }
    if (itemSet.uni && typeof itemSet.default != "undefined") {
      throw ("唯一键默认值仅能为undefined");
    }
    if (itemSet.primaryKey && typeof setJson.index.primaryKey) {
      throw ("当前表已存在主键");
    }
    let isIndex = false;
    if (this.indexJsonMap[srcSetJson.name]) {
      isIndex = true;
    }
    let dataJsonList = this.dataJsonList;
    for (let dataJson of dataJsonList) {
      this.loadDataJson(dataJson);
      let indexMap = {};
      let index = 0;
      for (let item of dataJson.data) {
        let tempValue = item[name];
        if (typeof tempValue == "undefined") {
          item[itemSet.name] = itemSet.default;
        } else {
          item[itemSet.name] = tempValue;
          indexMap[tempValue] = index;
          if (dataJson.indexMap[itemSet.name]) {
            if (!dataJson.indexMap[itemSet.name][tempValue]) {
              dataJson.indexMap[itemSet.name][tempValue] = [index];
            } else {
              dataJson.indexMap[itemSet.name][tempValue].push(index);
            }
          }
        }
        if (isIndex) {
          delete dataJson.indexMap[itemSet.name];
        }
        delete item[name];
        index++;
      }
      if (itemSet.primaryKey) {
        dataJson.primaryKey = indexMap;
      } else if (itemSet.uni) {
        dataJson.uniIndex[itemSet.name] = indexMap;
        delete dataJson.uniIndex[name];
      }
      if (srcSetJson.uni) {
        delete dataJson.uniIndex[name];
      } else if (srcSetJson.primaryKey) {
        dataJson.primaryKey = {};
      }

      dataJson.modify = 1;
    }
    setJson.data.splice(setJson.index[name], 1);
    setJson.data.push(itemSet);
    this.reIndexSetJson(setJson);
    this.saveSetJson(setJson);
    this.commit();
  }

  deleteTableSet(name) {
    this.checkConnect(); 
    let setJson = this.setJson;
    if (typeof setJson.index[name] != "number") {
      throw ("删除字段不存在");
    }
    let srcSetJson = setJson.data[setJson.index[name]];
    let dataJsonList = this.dataJsonList;
    let isIndex = false;
    if (this.indexJsonMap[srcSetJson.name]) {
      isIndex = true;
    }
    for (let dataJson of dataJsonList) {
      this.loadDataJson(dataJson);
      for (let item of dataJson.data) {
        delete item[name];
      }
      if (srcSetJson.uni) {
        delete dataJson.uniIndex[name];
      }
      if (srcSetJson.primaryKey) {
        dataJson.primaryKeyIndex = {};
      }
      if (isIndex) {
        delete dataJson.indexMap[itemSet.name];
      }
      dataJson.modify = 1;
    }
    setJson.data.splice(setJson.index[name], 1);
    this.reIndexSetJson(setJson);
    this.saveSetJson(setJson);
    this.commit();
  }

  checkConnect() {
    if (!this.isConnect) {
      throw ("未连接当前数据表")
    }
  }

  checkItemSet(itemSet) {
    if (!itemSet.name) {
      throw ("列表必须含有name字段");
    }
    if (!itemSet.type) {
      throw ("列表必须设置type字段");
    }
    if (!typeMap[itemSet.type]) {
      throw ("type只能为：string、number、boolean、object");
    }
    if (itemSet.autoIncrement && itemSet.type != "number") {
      throw ("自动增加类型只能为数字");
    }
  }

  saveSetJson() {
    if (saveSetTimeout) {
      clearTimeout(saveSetTimeout);
    }
    saveSetTimeout = setTimeout(() => {
      this.fileManmger.writeFileSync({
        filePath: this.CurPath + "/set/set.json",
        data: JSON.stringify(this.setJson),
        encoding: "utf-8"
      })
      util.log("保存setJson")
      util.log(this.setJson)
    }, saveLimitTime)
  }

  saveDataJson(dataJson) {
    this.fileManmger.writeFileSync({
      filePath: this.CurPath + "/data/" + dataJson.path,
      data: JSON.stringify(dataJson),
      encoding: "utf-8"
    })
    util.log("保存dataJson")
    util.log(dataJson)
  }

  doSaveDataJson() {
    if (saveDataJsonTimeout) {
      clearTimeout(saveDataJsonTimeout);
    }
    saveDataJsonTimeout = setTimeout(() => {
      let dataJsonList = this.dataJsonList;
      for (let dataJson of dataJsonList) {
        if (dataJson.modify && dataJson.read) {
          this.saveDataJson({
            data: dataJson.data,
            path: dataJson.path,
            primaryKeyIndex: dataJson.primaryKeyIndex,
            uniIndex: dataJson.uniIndex,
            indexMap: dataJson.indexMap || {}
          });
          dataJson.modify = 0;
        }
      }
      this.releaseDataJson();
    }, saveLimitTime)
  }
  /**
   * 读取数据文件
   * @param {*} path 
   */
  readDataJson(path) {
    let result = this.readFileSync('/data/' + path, {
      data: [],
      primaryKeyIndex: {},
      uniIndex: {},
      indexMap: {}
    });
    this.releaseDataJson();
    return result;
  }




  /**
   * 重置表结构索引
   * @param {*} setJson 
   */
  reIndexSetJson(setJson) {
    let indexMap = {};
    let index = 0;
    for (let item of setJson.data) {
      indexMap[item.name] = index;
      index++;
    }
    setJson.index = indexMap;
  }
  /**
   * 修改数据
   * @param {*} updateData {name:"列名",value:"值"}
   * @param {*} whereData  {name:"列名",type:"比对类型",value:"值"}
   */
  modifyData(updateData, whereData) {
    if (!updateData || !(updateData instanceof Array)) {
      throw ("更新数据格式不正确");
    }
    let primaryKeyValue = undefined;
    let uniList = [];
    for (let updateJson of updateData) {
      let itemIndex = this.setJson.index[updateJson.name];
      if (typeof itemIndex != "number") {
        throw ("未知列 " + updateJson.name);
      }
      let item = this.setJson.data[itemIndex];
      if (item.primaryKey) {
        if (!updateJson.value) {
          throw ("主键 " + item.name + " 不能为空")
        } else {
          primaryKeyValue = updateJson.value;
        }
      }
      if (item.uni) {
        if (typeof updateJson.value == "undefined") {
          throw ("唯一键 " + item.name + " 不能为空")
        } else {
          uniList.push({
            name: item.name,
            value: updateJson.value
          });
        }
      }
      if (updateJson.value && typeof updateJson.value != item.type) {
        throw ("字段 " + item.name + " 类型不匹配 " + item.type)
      }
    }
    this.checkSaveValue(primaryKeyValue, uniList);
    let modifyCount = 0;
    this.selectData(whereData, (dataJson, curIndex, targetValue) => {
      for (let updateJson of updateData) {
        let itemIndex = this.setJson.index[updateJson.name];
        let setItem = this.setJson.data[itemIndex];
        if (setItem.primaryKey) {
          delete dataJson.primaryKeyIndex[targetValue[setItem.name]];
          dataJson.primaryKeyIndex[updateJson.value] = curIndex;
        } else if (setItem.uni) {
          delete dataJson.uniIndex[setItem.name][targetValue[setItem.name]];
          dataJson.uniIndex[setItem.name][updateJson.value] = curIndex;
        }
        if (this.indexJsonMap[setItem.name]) {
          delete dataJson.indexMap[setItem.name][targetValue[setItem.name]];
          if (dataJson.indexMap[setItem.name][updateJson.value] instanceof Array) {
            dataJson.indexMap[setItem.name][updateJson.value].push(curIndex);
          } else {
            dataJson.indexMap[setItem.name][updateJson.value] = [curIndex];
          }
        }
        targetValue[updateJson.name] = updateJson.value;
      }
      dataJson.modify = 1;
      modifyCount++;
    })
    if (modifyCount > 0) {
      if (this.autoCommit) {
        this.commit();
      }
    }
    return modifyCount;
  }
  /**
  * 修改数据
  * @param {*} updateData {name:"列名",value:"值"} 
  */
  modifyDataByPathIndex(updateData, pathIndex, dataIndex) {
    if (!updateData || !(updateData instanceof Array)) {
      throw ("更新数据格式不正确");
    }
    console.log(updateData);
    let primaryKeyValue = undefined;
    let uniList = [];
    for (let updateJson of updateData) {
      let itemIndex = this.setJson.index[updateJson.name];
      if (typeof itemIndex != "number") {
        throw ("未知列 " + updateJson.name);
      }
      let item = this.setJson.data[itemIndex];
      if (item.primaryKey) {
        if (!updateJson.value) {
          throw ("主键 " + item.name + " 不能为空")
        } else {
          primaryKeyValue = updateJson.value;
        }
      } else if (item.uni) {
        if (typeof updateJson.value == "undefined") {
          throw ("唯一键 " + item.name + " 不能为空")
        } else {
          uniList.push({
            name: item.name,
            value: updateJson.value
          });
        }
      }
      if (updateJson.value && typeof updateJson.value != item.type) {
        throw ("字段 " + item.name + " 类型不匹配 " + item.type)
      }
    }
    this.checkSaveValue(primaryKeyValue, uniList);
    let modifyCount = 0;
    let dataJson = this.dataJsonList[pathIndex];
    let curIndex = dataIndex;
    this.loadDataJson(dataJson);
    let targetValue = dataJson.data[dataIndex];
    if (!targetValue || targetValue.__delete) {
      return modifyCount;
    }
    for (let updateJson of updateData) {
      let itemIndex = this.setJson.index[updateJson.name];
      let setItem = this.setJson.data[itemIndex];
      if (setItem.primaryKey) {
        delete dataJson.primaryKeyIndex[targetValue[setItem.name]];
        dataJson.primaryKeyIndex[updateJson.value] = curIndex;
      } else if (setItem.uni) {
        delete dataJson.uniIndex[setItem.name][targetValue[setItem.name]];
        dataJson.uniIndex[setItem.name][updateJson.value] = curIndex;
      }
      if (this.indexJsonMap[setItem.name]) {
        delete dataJson.indexMap[setItem.name][targetValue[setItem.name]];
        if (dataJson.indexMap[setItem.name][updateJson.value] instanceof Array) {
          dataJson.indexMap[setItem.name][updateJson.value].push(curIndex);
        } else {
          dataJson.indexMap[setItem.name][updateJson.value] = [curIndex];
        }
      }
      targetValue[updateJson.name] = updateJson.value;
      dataJson.data[dataIndex] = targetValue; 
    }
    dataJson.modify = 1;
    modifyCount++;
    if (modifyCount > 0) {
      if (this.autoCommit) {
        this.commit();
      }
    }
    return modifyCount;
  }
  deleteDataByPathIndex({pathIndex, dataIndex}) {
    if(typeof pathIndex != "number"){
      throw("缺少参数pathIndex");
    }
    if(typeof dataIndex != "number"){
      throw("缺少参数dataIndex");
    }
    let deleteCount = 0;
    this.checkConnect();
    let dataJson = this.dataJsonList[pathIndex];
    this.loadDataJson(dataJson);
    if (dataJson.data[dataIndex]) {
      let targetValue = dataJson.data[dataIndex];
      for (let setItem of this.setJson.data) {
        if (setItem.primaryKey) {
          delete dataJson.primaryKeyIndex[targetValue[setItem.name]];
        } else if (setItem.uni) {
          delete dataJson.uniIndex[setItem.name][targetValue[setItem.name]];
        }
        if (this.indexJsonMap[setItem.name]) {
          let targetIndex = dataJson.indexMap[setItem.name][targetValue[setItem.name]].indexOf(curIndex);
          if (targetIndex > -1) {
            dataJson.indexMap[setItem.name][targetValue[setItem.name]].splice(targetIndex, 1);
          }
        }
        dataJson.data[dataIndex] = {
          __delete: 1
        }
      }
      dataJson.modify = 1;
      deleteCount++;
    }
    if (dataJson.modify) {
      if (this.autoCommit) {
        this.commit();
      }
    }
    return deleteCount;
  }
  /**
   * 删除数据
   * @param {*} whereData {name:"列名",type:"比对类型",value:"值"}
   */
  deleteData(whereData) {
    let deleteCount = 0;
    this.selectData(whereData, (dataJson, curIndex, targetValue) => {
      dataJson.data[curIndex] = {
        __delete: 1
      };
      dataJson.modify = 1;
      for (let setItem of this.setJson.data) {
        if (setItem.primaryKey) {
          delete dataJson.primaryKeyIndex[targetValue[setItem.name]];
        } else if (setItem.uni) {
          delete dataJson.uniIndex[setItem.name][targetValue[setItem.name]];
        }
        if (this.indexJsonMap[setItem.name]) {
          let targetIndex = dataJson.indexMap[setItem.name][targetValue[setItem.name]].indexOf(curIndex);
          if (targetIndex > -1) {
            dataJson.indexMap[setItem.name][targetValue[setItem.name]].splice(targetIndex, 1);
          }
        }
      }
      deleteCount++;
    })
    if (deleteCount > 0) {
      if (this.autoCommit) {
        this.commit();
      }
    }
    return deleteCount;
  }

  loadDataJson(dataJson) {
    if (!dataJson.read) {
      let { data, primaryKeyIndex, uniIndex, indexMap } = this.readDataJson(dataJson.path);
      dataJson.data = data;
      dataJson.primaryKeyIndex = primaryKeyIndex;
      dataJson.uniIndex = uniIndex;
      dataJson.read = 1;
      if (!indexMap) { indexMap = {}; }
      dataJson.indexMap = indexMap;
      let indexJsonMap = this.indexJsonMap;
      for (let key in indexJsonMap) {
        if (!indexMap[key]) {
          indexMap[key] = {};
          let index = 0;
          for (let targetData in dataJson.data) {
            if (!(indexMap[key][targetData[key]] instanceof Array)) { indexMap[key][targetData[key]] = [] }
            indexMap[key][targetData[key]].push(index);
            index++;
          }
          dataJson.modify = 1;
        }
      }
      for (let key in indexMap) {
        if (!indexJsonMap[key]) {
          delete indexMap[key];
          dataJson.modify = 1;
        }
      }
    }
    if (typeof dataJson.readCount != "number") {
      dataJson.readCount = 0;
    }
    dataJson.readCount++;
    if (dataJson.modify) {
      this.saveDataJson({
        data: dataJson.data,
        path: dataJson.path,
        primaryKeyIndex: dataJson.primaryKeyIndex,
        uniIndex: dataJson.uniIndex,
        indexMap: dataJson.indexMap || {}
      });
    }
  }

  /**
   * 查询数据
   * @param {*} whereData [{name:"列名",type:"比对类型",value:"值"}]
   * @return 目前返回的都是对象，即实际是地址，不可以直接修改，需深拷贝后再直接修改，不然容易发生错误
   */
  selectData(whereData, mapFun, limitData, orderByData) {
    if (!(whereData instanceof Array)) {
      throw ("whereData必须为数组");
    } 
    this.checkConnect();
    let resultSelect = [];
    let setJson = this.setJson;
    let { primaryKeyWhere, uniKeyWhere, indexKeyWhere, otherKeyWhere,
      primaryEqualKeyWhere, uniEqualKeyWhere, indexEqualKeyWhere } = this.parseWhereArray(whereData, setJson);

    for (let dataJson of this.dataJsonList) {
      this.loadDataJson(dataJson);
      this.filterAllWhere(dataJson, {
        primaryKeyWhere, indexKeyWhere, otherKeyWhere, uniKeyWhere, primaryEqualKeyWhere, uniEqualKeyWhere, mapFun, indexEqualKeyWhere
      }, resultSelect);
      if ((!orderByData || orderByData.length == 0) && limitData && typeof limitData.count == "number") {
        if (!limitData.start) {
          limitData.start = 0;
        }
        if (resultSelect.length > limitData.start + limitData.count) {
          resultSelect = resultSelect.slice(limitData.start, limitData.start + limitData.count);
          break;
        }
      }
    }
    if (orderByData && orderByData.length > 0) {
      resultSelect.sort((a, b) => {
        for (let orderby of orderByData) {
          if(a[orderby.name] != b[orderby.name]){
            return orderby.type == "desc"?(b[orderby.name] - a[orderby.name]):(a[orderby.name] - b[orderby.name]);
          }
        }
        if(a.__pathIndex != b.__pathIndex){
          return a.__pathIndex - b.__pathIndex;
        }
        return a.__index - b.__index;
      });
      if (limitData && typeof limitData.count == "number") {
        if (!limitData.start) {
          limitData.start = 0;
        } 
        resultSelect = resultSelect.slice(limitData.start, limitData.start + limitData.count); 
      }
    }
    return resultSelect;
  }

  filterAllWhere(dataJson, {
    primaryKeyWhere, indexKeyWhere, indexEqualKeyWhere = [], otherKeyWhere,
    uniKeyWhere, primaryEqualKeyWhere, uniEqualKeyWhere, mapFun
  }, resultSelect) {
    if (primaryEqualKeyWhere.value) {
      let dataIndex = dataJson.primaryKeyIndex[primaryEqualKeyWhere.value];
      if (typeof dataIndex == "number") {
        let targetValue = dataJson.data[dataIndex];
        if (targetValue && !targetValue.__delete) {
          targetValue.__index = dataIndex;
          targetValue.__pathIndex = dataJson.pathIndex;
          if (this.checkValueWhere(targetValue, [...indexKeyWhere, ...indexEqualKeyWhere, ...uniKeyWhere, ...otherKeyWhere, ...primaryKeyWhere])) {
            resultSelect.push(targetValue);
            typeof mapFun == "function" && mapFun(dataJson, dataIndex, targetValue);
          }
        }
      }
    } else if (primaryKeyWhere.value) {
      let primaryKeyIndex = dataJson.primaryKeyIndex;
      let resultIndex = [];
      for (let value in primaryKeyIndex) {
        if (util.compare(value, primaryKeyWhere.type, primaryKeyWhere.value)) {
          resultIndex.push(primaryKeyWhere[value]);
        }
      }
      for (let dataIndex of resultIndex) {
        let targetValue = dataJson.data[dataIndex];
        if (targetValue && !targetValue.__delete) {
          targetValue.__index = dataIndex;
          targetValue.__pathIndex = dataJson.pathIndex;
          if (this.checkValueWhere(targetValue, [...indexKeyWhere, ...indexEqualKeyWhere, ...uniKeyWhere, ...uniEqualKeyWhere, ...otherKeyWhere])) {
            resultSelect.push(targetValue);
            typeof mapFun == "function" && mapFun(dataJson, dataIndex, targetValue);
          }
        }
      }
    } else if (uniEqualKeyWhere.length > 0) {
      let uniArrayIndex = undefined;
      for (let uniWhere of uniEqualKeyWhere) {
        let curUniIndex = dataJson.uniIndex[uniWhere.name][uniWhere.value];
        if (typeof curUniIndex != "number") {
          uniArrayIndex = undefined;
          break;
        }
        if (uniArrayIndex == undefined) {
          uniArrayIndex = curUniIndex;
        } else {
          if (uniArrayIndex != curUniIndex) {
            uniArrayIndex = undefined;
            break;
          }
        }
      }
      if (typeof uniArrayIndex == "number") {
        let targetValue = dataJson.data[uniArrayIndex];
        if (targetValue && !targetValue.__delete) {
          targetValue.__index = uniArrayIndex;
          targetValue.__pathIndex = dataJson.pathIndex;
          if (this.checkValueWhere(targetValue, [...indexKeyWhere, ...indexEqualKeyWhere, ...uniKeyWhere, ...otherKeyWhere])) {
            resultSelect.push(targetValue);
            typeof mapFun == "function" && mapFun(dataJson, uniArrayIndex, targetValue);
          }
        }
      }
    } else if (uniKeyWhere.length > 0) {
      let uniArrayIndex = undefined;
      for (let uniWhere of uniKeyWhere) {
        let curUniIndex = dataJson.uniIndex[uniWhere.name];
        if (typeof curUniIndex == "undefined" || curUniIndex.length == 0) {
          break;
        }
        let filterIndex = [];
        for (let value in curUniIndex) {
          if (util.compare(value, uniWhere.type, uniWhere.value)) {
            filterIndex.push(curUniIndex[value]);
          }
        }
        if (uniArrayIndex == undefined) {
          uniArrayIndex = filterIndex;
          continue;
        } else {
          uniArrayIndex = uniArrayIndex.filter(a => {
            return filterIndex.indexOf(a) >= 0;
          })
        }
        if (uniArrayIndex.length == 0) {
          break;
        }
      }
      if (uniArrayIndex && uniArrayIndex.length > 0) {
        for (let index of uniArrayIndex) {
          let targetValue = dataJson.data[index];
          if (targetValue && !targetValue.__delete) {
            targetValue.__index = index;
            targetValue.__pathIndex = dataJson.pathIndex;
            if (this.checkValueWhere(targetValue, [...indexEqualKeyWhere, ...indexKeyWhere, ...otherKeyWhere])) {
              resultSelect.push(targetValue);
              typeof mapFun == "function" && mapFun(dataJson, index, targetValue);
            }
          }
        }
      }
    } else if (indexEqualKeyWhere.length > 0) {
      let indexMap = dataJson.indexMap;
      let curIndexArray = undefined;
      for (let indexEqualKey of indexEqualKeyWhere) {
        if (!indexMap[indexEqualKey.name]) {
          continue;
        }
        if (!curIndexArray) {
          curIndexArray = indexMap[indexEqualKey.name][indexEqualKey.value] || [];
        } else {
          let filterIndex = indexMap[indexEqualKey.name][indexEqualKey.value] || [];
          curIndexArray = curIndexArray.filter(item => {
            return filterIndex.indexOf(item) > -1;
          })
        }
      }
      if (curIndexArray && curIndexArray.length > 0) {
        for (let curIndex of curIndexArray) {
          let targetValue = dataJson.data[curIndex];
          if (targetValue && !targetValue.__delete) {
            targetValue.__index = curIndex;
            targetValue.__pathIndex = dataJson.pathIndex;
            if (this.checkValueWhere(targetValue, [...indexKeyWhere, ...otherKeyWhere])) {
              resultSelect.push(targetValue);
              typeof mapFun == "function" && mapFun(dataJson, curIndex, targetValue);
            }
          }
        }
      }
    } else if (indexKeyWhere.length > 0) {
      let resultIndex = undefined;
      let indexMap = dataJson.indexMap;
      for (let indexkey of indexKeyWhere) {
        if (!indexMap[indexkey.name]) {
          continue;
        }
        let indexMapValue = indexMap[indexkey.name];
        for (let indexValue in indexMapValue) {
          if (util.compare(indexValue, indexkey.type, indexkey.value)) {
            if (resultIndex == undefined) {
              resultIndex = indexMapValue[indexValue];
            } else {
              resultIndex = resultIndex.filter(item => {
                return indexMapValue[indexValue].indexOf(item) > -1;
              })
              if (resultIndex.length == 0) {
                resultIndex = [];
                break;
              }
            }
          }
        }
      }
      if (resultIndex == undefined) {
        //没有索引列，扫描全表
        let curIndex = 0;
        for (let targetValue of dataJson.data) {
          if (targetValue && !targetValue.__delete) {
            targetValue.__index = curIndex;
            targetValue.__pathIndex = dataJson.pathIndex;
            if (this.checkValueWhere(targetValue, [...indexKeyWhere, ...otherKeyWhere])) {
              resultSelect.push(targetValue);
              typeof mapFun == "function" && mapFun(dataJson, curIndex, targetValue);
            }
          }
          curIndex++;
        }
      } else if (resultIndex.length > 0) {
        //有索引 扫描索引
        for (let curIndex of resultIndex) {
          let targetValue = dataJson.data[curIndex];
          if (targetValue && !targetValue.__delete) {
            targetValue.__index = curIndex;
            targetValue.__pathIndex = dataJson.pathIndex;
            if (this.checkValueWhere(targetValue, [...otherKeyWhere])) {
              resultSelect.push(targetValue);
              typeof mapFun == "function" && mapFun(dataJson, curIndex, targetValue);
            }
          }
        }
      }
    } else if (otherKeyWhere.length > 0) { 
      let curIndex = 0;
      for (let targetValue of dataJson.data) {  
        if (targetValue && !targetValue.__delete) {
          targetValue.__index = curIndex;
          targetValue.__pathIndex = dataJson.pathIndex;
          if (this.checkValueWhere(targetValue, [...otherKeyWhere])) {
            resultSelect.push(targetValue);
            typeof mapFun == "function" && mapFun(dataJson, curIndex, targetValue);
          }
        }
        curIndex++;
      }
    } else {
      let curIndex = 0;
      for (let targetValue of dataJson.data) { 
        if (targetValue && !targetValue.__delete) {
          targetValue.__index = curIndex;
          targetValue.__pathIndex = dataJson.pathIndex;
          resultSelect.push(targetValue);
          typeof mapFun == "function" && mapFun(dataJson, curIndex, targetValue);
        } 
        curIndex++;
      }
    }
  }

  checkValueWhere(value, whereArr) {
    let result = true;
    for (let item of whereArr) {
      if (!util.compare(value[item.name], item.type, item.value)) {
        result = false;
        break;
      }
    }
    return result;
  }

  /**
   * 添加数据
   * @param {*} itemData 添加的数据
   */
  addData(itemData) {
    this.checkConnect();
    let setData = this.setJson.data;
    if (!setData.autoIncrementIndex) {
      setData.autoIncrementIndex = {};
    }
    let addJson = {};
    let primaryKeyValue = undefined;
    let uniList = [];
    for (let item of setData) {
      if (item.primaryKey) {
        if (!itemData[item.name] && !item.autoIncrement) {
          throw ("主键 " + item.name + " 不能为空")
        } else if (!itemData[item.name]) {
          primaryKeyValue = (setData.autoIncrementIndex[item.name] || 0) + 1;
          setData.autoIncrementIndex[item.name] = primaryKeyValue;
          itemData[item.name] = primaryKeyValue;
          setData.modify = 1;
        } else {
          primaryKeyValue = itemData[item.name];
        }
      } else if (item.uni) {
        if (!itemData[item.name]) {
          throw ("唯一键 " + item.name + " 不能为空")
        } else {
          uniList.push({
            name: item.name,
            value: itemData[item.name]
          });
        }
      } else if (item.autoIncrement && !itemData[item.name]) {
        itemData[item.name] = (setData.autoIncrementIndex[item.name] || 0) + 1;
        setData.autoIncrementIndex[item.name] = itemData[item.name];
        setData.modify = 1;
      }
      if (itemData[item.name] && typeof itemData[item.name] != item.type) {
        throw ("字段 " + item.name + " 类型不匹配 " + item.type)
      }
      if (typeof itemData[item.name] != "undefined") {
        addJson[item.name] = itemData[item.name];
      } else {
        addJson[item.name] = item.default;
      }
    }
    let curDataJson = this.getCurDataJson();
    this.checkSaveValue(primaryKeyValue, uniList);
    curDataJson.data.push(addJson);
    let curAddIndex = curDataJson.data.length - 1;
    if (typeof primaryKeyValue != "undefined") {
      curDataJson.primaryKeyIndex[primaryKeyValue] = curAddIndex;
    }
    for (let uni of uniList) {
      if (!curDataJson.uniIndex[uni.name]) {
        curDataJson.uniIndex[uni.name] = {};
      }
      if (typeof uni.value != "undefined") {
        curDataJson.uniIndex[uni.name][uni.value] = curAddIndex;
      }
    }
    let indexMap = curDataJson.indexMap;
    if (!indexMap) {
      curDataJson.indexMap = {};
      indexMap = curDataJson.indexMap;
    }
    for (let indexName in indexMap) {
      if (indexMap[indexName]) {
        indexMap[indexName].push(curAddIndex);
      }
    }
    curDataJson.modify = 1;
    if (this.autoCommit) {
      this.commit();
      if (this.setJson.modify == 1) {
        this.saveSetJson();
      }
    }
  }

  /**
   * 检查主键和唯一键是否冲突
   * @param {*} primaryKeyValue 主键
   * @param {*} uniList 唯一键 {键名：值}
   */
  checkSaveValue(primaryKeyValue, uniList) {
    if (!primaryKeyValue && !uniList) {
      return;
    }
    let dataJsonList = this.dataJsonList;
    for (let dataJson of dataJsonList) {
      this.loadDataJson(dataJson);
      if (typeof primaryKeyValue != "undefined" && typeof dataJson.primaryKeyIndex[primaryKeyValue] == "number") {
        throw ("主键 " + value + " 已存在，请勿重复添加")
      }
      if (uniList instanceof Array) {
        for (let uni of uniList) {
          if (dataJson.uniIndex[uni.name] && typeof dataJson.uniIndex[uni.name][uni.value] == "number") {
            throw ("唯一键 " + uni.name + " 值 " + uni.value + " 已存在，请勿重复添加")
          }
        }
      }
      if (!dataJson.readCount) {
        dataJson.readCount = 1;
      } else {
        dataJson.readCount++;
      }
    }
  }

  /**
   * 获取最新的数据对象
   */
  getCurDataJson() {
    if (this.dataJsonList.length == 0) {
      let curDataJson = {
        path: 'data_0.json',
        data: [],
        read: 1,
        modify: 0,
        primaryKeyIndex: {},
        uniIndex: {}
      };
      this.dataJsonList.push(curDataJson);
      return curDataJson;
    }
    let curDataJson = this.dataJsonList[this.dataJsonList.length - 1];
    if (curDataJson.data.length >= MaxSaveLines) {
      let curIndex = this.dataJsonList.length;
      curDataJson = {
        path: 'data_' + curIndex + '.json',
        data: [],
        read: 1,
        modify: 0,
        primaryKeyIndex: {},
        uniIndex: {}
      };
      this.dataJsonList.push(curDataJson);
    }
    if (typeof curDataJson.readCount == "undefined") {
      curDataJson.readCount = 0;
    }
    curDataJson.readCount++;
    return curDataJson;
  }

  /**
   * 提交数据
   */
  commit() {
    this.checkConnect();
    this.doSaveDataJson();
  }

  /**
   * 数据回滚 不保存
   */
  rollback() {
    this.checkConnect();
    this.reloadDataJson();
  }

  /**
   * 重载内存数据
   */
  reloadDataJson() {
    let dataJsonList = this.dataJsonList;
    for (let dataJson of dataJsonList) {
      dataJson.read = 0;
      dataJson.modify = 0;
      dataJson.data = [];
      dataJson.readCount = 0;
      dataJson.indexMap = {};
    }
  }

  /**
   * 释放最近不使用的内存数据
   */
  releaseDataJson() {
    let dataJsonList = this.dataJsonList;
    if (dataJsonList.length <= releaseSaveCount) {
      return;
    }
    if (releaseDataJsonTimeout) {
      clearTimeout(releaseDataJsonTimeout)
    }
    releaseDataJsonTimeout = setTimeout(() => {
      let readCountMap = [];
      let index = 0;
      for (let dataJson of dataJsonList) {
        if (dataJson.read && dataJson.modify) {
          index++;
          continue;
        }
        readCountMap.push({
          path: dataJson.path,
          readCount: dataJson.readCount || 0,
          index: index
        })
        index++;
      }
      readCountMap.sort((a, b) => {
        if (a.readCount == b.readCount) {
          return a.index - b.index;
        }
        return a.readCount - b.readCount;
      })
      for (let readIndex = 0; readIndex < readCountMap.length - releaseSaveCount; readIndex++) {
        dataJsonList[readCountMap[readIndex].index].data = [];
        dataJsonList[readCountMap[readIndex].index].modify = 0;
        dataJsonList[readCountMap[readIndex].index].readCount = 0;
        dataJsonList[readCountMap[readIndex].index].read = 0;
        dataJsonList[readCountMap[readIndex].index].primaryKeyIndex = {};
        dataJsonList[readCountMap[readIndex].index].uniIndex = {};
      }
    }, releaseLimitTime);
  }

  /** index 相关操作开始 */

  loadTableIndex() {
    this.checkConnect();
    try {
      let { data } = this.readIndexJson();
      this.indexJsonMap = data;
    } catch (e) {
      util.log(e);
      this.indexJsonMap = {};
      this.saveIndexJson({ data: {} });
    }
  }

  readIndexJson() {
    let result = this.readFileSync('/index/index.json', {
      data: {},
    });
    return result;
  }

  saveIndexJson(indexJson) {
    this.fileManmger.writeFileSync({
      filePath: this.CurPath + "/index/index.json",
      data: JSON.stringify(indexJson),
      encoding: "utf-8"
    })
    util.log("保存indexJson")
  }

  /**
   * 添加索引
   */
  alertAddIndex(name) {
    this.checkConnect();
    if (typeof this.setJson.index[name] != "number") {
      throw ("不存在字段：" + name);
    }
    if (this.indexJsonMap[name]) {
      throw ("已存在索引：" + name);
    } else {
      this.indexJsonMap[name] = 1;
    }
    this.doSaveIndexJson();
  }

  /**
   * 删除索引
   */
  dropIndex(name) {
    this.checkConnect();
    if (typeof this.setJson.index[name] != "number") {
      throw ("不存在字段：" + name);
    }
    let curIndexJsonList = this.indexJsonMap[name];
    if (typeof curIndexJsonList == "undefined") {
      throw ("不存在索引：" + name);
    }
    delete this.indexJsonMap[name];
  }

  doSaveIndexJson() {
    if (saveIndexJsonTimeout) {
      clearTimeout(saveIndexJsonTimeout);
    }
    saveIndexJsonTimeout = setTimeout(() => {
      this.saveIndexJson({ data: this.indexJsonMap });
    }, saveLimitTime);
  }

  /** index 相关操作结束 */

  deleteFile(path) {
    this.fileManmger.unlinkSync({
      filePath: path
    })
  }

  parseWhereArray(whereData, setJson) {
    let primaryKeyWhere = {};
    let primaryEqualKeyWhere = {};
    let uniKeyWhere = [];
    let uniEqualKeyWhere = [];
    let indexKeyWhere = [];
    let otherKeyWhere = [];
    let indexEqualKeyWhere = [];
    for (let item of whereData) {
      if (typeof setJson.index[item.name] != "number") {
        throw ("不存在字段：" + item.name);
      }
      let curSetJson = setJson.data[setJson.index[item.name]];
      if (curSetJson.primaryKey) {
        if (item.type == "=") {
          primaryEqualKeyWhere = item;
        } else {
          primaryKeyWhere = item;
        }
      } else if (curSetJson.uni) {
        if (item.type == "=") {
          uniEqualKeyWhere.push(item);
        } else {
          uniKeyWhere.push(item);
        }
      } else if (typeof this.indexJsonMap[item.name] != "undefined") {
        if (item.type == "=") {
          indexEqualKeyWhere.push(item);
        } else {
          indexKeyWhere.push(item);
        }
      } else {
        otherKeyWhere.push(item);
      }
    }
    return {
      primaryKeyWhere,
      uniKeyWhere,
      indexKeyWhere,
      otherKeyWhere,
      uniEqualKeyWhere,
      primaryEqualKeyWhere,
      indexEqualKeyWhere
    }
  }
}


export default Table;
```
好了，本次分享就到这里，梦辛工作室（let dream is completed）
