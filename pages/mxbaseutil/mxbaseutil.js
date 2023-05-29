// pages/mxbaseutil/mxbaseutil.js  
import Connect from "../../mxbase/bin/Connect";
let basePath = `${wx.env.USER_DATA_PATH}/`;
var curConn;
var curDatalist = [];
Page({

  /**
   * 页面的初始数据
   */
  data: {
    mode: 0,
    isConnct: 0,
    curPath: "",
    curDataBase: "",
    curTable: "",
    showAnmi: false,
    submode: 0,
    curSubItem: {},
    curTypeSet: {},
    whereData:[],
    dialog: {
      show: false,
      title: "提示",
      content: [
        {
          title: "数据库名称："
        }
      ]
    },
    databaseList: [
    ],
    tableList: [
    ],
    tableMenu: [
      {
        type: "data",
        path: "/data",
        title: "数据"
      },
      {
        type: "set",
        path: "/set.json",
        title: "结构"
      },
      {
        type: "index",
        path: "/index",
        title: "索引"
      }
    ],
    tableDataShow: [
     
    ]
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    initConnect(this);
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {
    if (this.data.mode == 2 && this.data.submode == 1) {
      doSelectTableData(this, this.data.tableDataShow.length - 1, 20);
    }
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  },
  //连接数据库地址
  doConnect(res) {
    let workspace = res.detail.value.workspace;
    if (!workspace) {
      showHintModle("路径不能为空");
      return;
    }
    doConnectPath(workspace, this);
  },
  //关闭连接
  doClose() {
    let that = this;
    let dialog = {
      title: "关闭",
      show: true,
      textcontent: "确认关闭都当前数据库连接？",
      success: res => {
        try {
          curConn.closeConnect();
          that.setData({
            curPath: "",
            isConnct: 0,
            mode: -1
          })
          wx.setStorageSync('connectPath', '');
          doCloseDialog(that);
        } catch (e) { 
          showHintModle(e);
        }
      }
    }
    showDialog(dialog, that);
  },
  //添加数据库
  doAddDataBase() {
    let that = this;
    let dialog = {
      title: "添加",
      show: true,
      content: [
        {
          title: "数据库名称",
          hint: "请输入数据库名称",
          must: true,
          name: "basename"
        }
      ],
      success: res => {
        try {
          curConn.createDataBase(res.basename, true);
          doShowDataBaseList(that);
          doCloseDialog(that);
        } catch (e) { 
          showHintModle(e);
        }
      }
    }
    showDialog(dialog, that);
  },
  //选择数据库
  doSelectDataBase(res) {
    let databaseName = res.currentTarget.dataset.item;
    doSelectDataBase(databaseName, this);
  },
  //删除数据库
  doDeleteBase(res) {
    let that = this;
    let baseName = res.currentTarget.dataset.item;
    let dialog = {
      title: "删除",
      show: true,
      textcontent: "确认删除数据库：" + baseName + " 删除后将不可恢复",
      success: res => {
        try {
          curConn.deleteDataBase(baseName);
          doShowDataBaseList(that);
          doCloseDialog(that);
        } catch (e) { 
          showHintModle(e);
        }
      }
    }
    showDialog(dialog, that);
  },
  //添加数据表
  doAddTable() {
    let that = this;
    let dialog = {
      title: "添加",
      show: true,
      content: [
        {
          title: "表名称",
          hint: "请输入表名称",
          must: true,
          name: "tablename"
        }
      ],
      success: res => {
        try {
          curConn.createTable(res.tablename, true);
          doShowTalbleList(that);
          doCloseDialog(that);
        } catch (e) { 
          showHintModle(e);
        }
      }
    }
    showDialog(dialog, that);
  },
  //选择数据表
  doSelectTable(res) {
    let tableName = res.currentTarget.dataset.item;
    doSelectTable(tableName, this);
  },
  doBack(res) {
    let mode = this.data.mode;
    let submode = this.data.submode;
    let curDataBase = this.data.curDataBase;
    let curTable = this.data.curTable;
    if (submode) {
      submode--;
    } else if (mode) {
      mode--;
    }
    if (mode <= 0) {
      curDataBase = "";
    }
    if (mode <= 1) {
      curTable = "";
    }
    if (submode < 1) {
      this.setData({
        whereData:[]
      });
    }
    this.setData({
      mode,
      submode,
      curSubItem: {},
      curDataBase,
      curTable
    })
  },
  //删除数据表
  doDeleteTable(res) {
    let that = this;
    let tableName = res.currentTarget.dataset.item;
    let dialog = {
      title: "删除",
      show: true,
      textcontent: "确认删除表：" + tableName + " 删除后将不可恢复",
      success: res => {
        try {
          curConn.deleteTable(tableName);
          doShowTalbleList(that);
          doCloseDialog(that);
        } catch (e) { 
          showHintModle(e);
        }
      }
    }
    showDialog(dialog, that);
  },
  doOpenSub(res) {
    let item = res.currentTarget.dataset.item;
    if (item.type == "data") {
      doSelectTableData(this, 0, 20);
    } else if (item.type == "set") {
      doSelectTableSet(this);
    } else if (item.type == "index") {
      doSelectTableIndex(this);
    }
    this.setData({
      curSubItem: item,
      submode: 1,
    })
  },
  doDeleteSetValue(res){
    try {
      let index = res.detail;
      let tableDataShow = this.data.tableDataShow;
      let setName = tableDataShow[index][0];
      let table = curConn.tryConnectTable(this.data.curTable);
      table.deleteTableSet(setName);
      wx.hideLoading();
      showHintModle("删除成功");
      doSelectTableSet(this);
    } catch(e){
      console.log(e)
      wx.hideLoading();
      showHintModle(e);
    } 
  },
  doAddSetValue(res) {
    try { 
      wx.showLoading({
        title: '添加中',
      })
      curConn.doAddTableSet(this.data.curTable,res.detail);
      wx.hideLoading();
      showHintModle("添加成功");
      doSelectTableSet(this);
    } catch (e) { 
      wx.hideLoading();
      showHintModle(e);
    }
  },
  doDeleteData(res) {
    let that = this;
    let curIndex = res.detail;
    let tableDataShow = that.data.tableDataShow;
    let table = curConn.tryConnectTable(that.data.curTable);
    let curData = curDatalist[curIndex - 1];
    let deleteCount = table.deleteDataByPathIndex({
      pathIndex: curData.__pathIndex,
      dataIndex: curData.__index
    });
    if (deleteCount > 0) {
      tableDataShow.splice(curIndex, 1);
      that.setData({
        tableDataShow
      })
      showHintModle("删除成功");
    } else {
      showHintModle("删除失败");
    }
  },
  doSelItem(res){ 
    let that = this;
    let selValue = res.detail;
    if(selValue.row != 0){
      return;
    }
    let tableDataShow = that.data.tableDataShow;
    let whereData = that.data.whereData;
    let head = tableDataShow[0];
    let dialog = {};
    dialog.title = "筛选";
    dialog.show = true;
    let setItemName = head[selValue.column];
    let curWhere = {};
    let curWhereIndex = -1;
    whereData.forEach((item,index) => {
      if(setItemName == item.name){
        curWhere = item; 
        curWhereIndex = index;
      } 
    }) 
    if(!curWhere.name){
      curWhere = {
        name:setItemName,
        type:"不筛选",
        value:""
      }
    }
    dialog.content = [
      {
        title:"当前列",
        value:setItemName,
        disabled:true
      },
      {
        title:"筛选类型",
        value:curWhere.type || "不筛选", 
        type:"select",
        name:"type",
        options:["不筛选","=",">",">=","<","<=","!=","in","!="]
      },
      {
        title:"目标值",
        value:curWhere.value || "", 
        name:"value"
      },
    ];
    dialog.success = res => {
      for(let key in res){
        curWhere[key] = res[key];
      }
       if(curWhereIndex > -1){ 
        // tableDataShow[0][selValue.column] = setItemName + "#筛选中";
        if(curWhere.type && curWhere.type != "不筛选"){ 
          whereData[curWhereIndex] = curWhere;
        } else { 
          tableDataShow[0][selValue.column] = setItemName; 
          whereData.splice(curWhereIndex,1);
        } 
       } else {
          whereData.push(curWhere)
       }
       that.setData({
        tableDataShow,
        whereData
       })  
       try{
        doSelectTableData(that,0,20); 
       } catch(e){
         showHintModle(e);
       }
      
       doCloseDialog(that);
    }
    showDialog(dialog,that);
  },
  doAddIndex(res){

  },
  doEditData(res) {
    let that = this;
    let curIndex = res.detail;
    let tableDataShow = that.data.tableDataShow;
    let table = curConn.tryConnectTable(that.data.curTable);
    let curData = curDatalist[curIndex - 1];
    let dialog = that.data.dialog;
    dialog.show = true;
    dialog.title = "编辑";
    let content = [];
    let tableSet = table.setJson.data;
    for (let set of tableSet) {
      content.push({
        name: set.name,
        title: set.name,
        type: set.type,
        value: curData[set.name]
      })
    }
    dialog.content = content;
    dialog.cancel = undefined; 
    dialog.success = res => { 
      let updateData = [];
      for (let key in res) { 
        updateData.push({
          name:key,
          value:res[key]
        })
      }
      try {
        let modifyCount = table.modifyDataByPathIndex(updateData, curData.__pathIndex, curData.__index);
        if (modifyCount > 0) {
          let head = tableDataShow[0];
          head.forEach((item, index) => { 
            tableDataShow[curIndex][index] = curData[item];
          })
          that.setData({
            tableDataShow
          })
          doCloseDialog(that);
          showHintModle("修改成功");
        } else {
          showHintModle("修改失败");
        }
      } catch (e) {
        showHintModle("修改失败，" + e);
      }

    }
    showDialog(dialog, that);
  }
})

function doSelectTableData(that, index, count) {
  wx.showLoading({
    title: '',
  })
  that.setData({
    operaHint:"查询中"
  })
  let startTime = Date.now();
  let table = curConn.tryConnectTable(that.data.curTable);
  let tableDataShow = that.data.tableDataShow;
  let head = tableDataShow[0] || [];
  if (index == 0) {
    tableDataShow = [];
    head = [];
    table.setJson.data.forEach(item => { head.push(item.name) });
    tableDataShow.push(head);
    curDatalist = [];
  } 
  let data = table.selectData(that.data.whereData || [], undefined, { start: index, count: count }) 
  data.forEach(item => {
    let column = [];
    for (let key of head) {
      column.push(item[key]);
    }
    tableDataShow.push(column);
  })
  curDatalist = curDatalist.concat(data);
  that.setData({
    tableDataShow
  }) 
  wx.hideLoading();
  that.setData({
    operaHint:"查询完毕，耗时：" + (Date.now() - startTime) + "ms"
  })
}

function doSelectTableSet(that) {
  let tableDataShow = [
    ["name", "type", "default", "increment", "notNull", "primaryKey", "uni", "comment"]
  ];
  let curTypeSet = {
    "name": {
      type: "string",
      default: "",
      notNull: true,
    },
    "type": {
      type: "select",
      default: "string",
      options: [
        "string",
        "number",
        "object",
        "boolean"
      ]
    },
    "default": {
      type: "string",
      default: ""
    },
    "increment": {
      type: "boolean",
      default: false
    },
    "notNull": {
      type: "boolean",
      default: false
    },
    "primaryKey": {
      type: "boolean",
      default: false
    },
    "uni": {
      type: "boolean",
      default: false
    },
    "comment": {
      type: "string",
      default: ""
    },
  }
  let table = curConn.tryConnectTable(that.data.curTable);
  let dataSet = table.setJson.data;
  console.log(dataSet);
  let head = tableDataShow[0];
  for(let item of dataSet){
    let columnList = [];
    for(let column of head ){
      columnList.push(item[column] || curTypeSet[column].default);
    }
    tableDataShow.push(columnList)
  }
  that.setData({
    tableDataShow,
    curTypeSet
  })
}

function doSelectTableIndex(that) {
  try { 
    let table = curConn.tryConnectTable(that.data.curTable);
   let indexJsonMap = table.indexJsonMap;
   console.log(table.indexJsonMap);
   let tableDataShow = [];
   for(let indexKey in indexJsonMap){
    tableDataShow.push(indexKey);
   }
   that.setData({
    tableDataShow
   })
  } catch (e) { 
    console.log(e)
    showHintModle(e);
  }
}

function doSelectTable(tableName, that) {
  try {
    that.setData({
      curTable: tableName
    })
    curConn.tryConnectTable(tableName);
    that.setData({
      mode: 2,
      submode: 0,
      curSubItem: {}
    })
  } catch (e) { 
    showHintModle(e);
  }
}

function doSelectDataBase(baseName, that) {
  try {
    that.setData({
      curDataBase: baseName
    })
    curConn.useDataBase(baseName);
    doShowTalbleList(that);
  } catch (e) { 
    showHintModle(e);
  }
}

function doShowTalbleList(that) {
  try {
    if (!that.data.curDataBase) {
      throw ("当前未选择数据库");
    }
    let tableList = curConn.showTableList();
    that.setData({
      tableList,
      mode: 1,
    })
  } catch (e) { 
    showHintModle(e);
  }
}

function doCloseDialog(that) {
  that.setData({
    showAnmi: false
  })
  setTimeout(() => {
    that.setData({
      "dialog.show": false
    })
  }, 500)
}

function showDialog(dialog, that) {
  dialog.show = true;
  if (!dialog.cancel) {
    dialog.cancel = () => {
      doCloseDialog(that);
    }
  }
  that.setData({
    dialog
  })
  setTimeout(() => {
    that.setData({
      showAnmi: true
    })
  }, 50)
}

function initConnect(that) {
  let connectPath = wx.getStorageSync('connectPath');
  if (!connectPath) {
    return;
  }
  doConnectPath(connectPath, that);
}

function doConnectPath(path, that) {
  try {
    curConn = new Connect(wx.getFileSystemManager(), basePath + path);
    that.setData({
      isConnct: 1,
      curPath: path,
    })
    wx.setStorageSync('connectPath', path);
    doShowDataBaseList(that);
  } catch (e) { 
    showHintModle(e);
  }
}

function doShowDataBaseList(that) {
  try {
    let databaseList = curConn.showDataBases();
    that.setData({
      databaseList,
      mode: 0
    })
  } catch (e) { 
    showHintModle(e);
  }
}

function showHintModle(context) {
  wx.showModal({
    title: '提示',
    content: context,
    showCancel: false,
    confirmText: "我知道了",
    complete: (res) => {
      if (res.cancel) {
      }
      if (res.confirm) {

      }
    }
  })
}