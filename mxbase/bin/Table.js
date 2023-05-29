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