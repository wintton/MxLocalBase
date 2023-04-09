// pages/mxbaseutil/mxbaseutil.js 
import Connect from "../../mxbase/bin/Connect";
let basePath = `${wx.env.USER_DATA_PATH}/`;
var curConn;
Page({

  /**
   * 页面的初始数据
   */
  data: {
    mode:0,
    isConnct:0,
    curPath:"",
    curDataBase:"",
    curTable:"",
    showAnmi:false,
    submode:0,
    curSubItem:{},
    dialog:{
      show:false,
      title:"提示",
      content:[
        {
          title:"数据库名称："
        }
      ]
    },
    databaseList:[
    ],
    tableList:[
    ],
    tableMenu:[
      {
        type:"data",
        path:"/data",
        title:"数据"
      },
      {
        type:"set",
        path:"/set.json",
        title:"结构"
      },
      {
        type:"index",
        path:"/index",
        title:"索引"
      }
    ],
    tableDataShow:[
      ["ssss","ssss","dsdasda","sdasdas","ssss","dsdasda","sdasdas","ssss","dsdasda","sdasdas","ssss","dsdasda","sdasdas"],
      ["ssss","ssss","dsdasda","sdasdas","ssss","dsdasda","sdasdas","ssss","dsdasda","sdasdas","ssss","dsdasda","sdasdas"],
      ["ssss","ssss","dsdasda","sdasdas","ssss","dsdasda","sdasdas","ssss","dsdasda","sdasdas","ssss","dsdasda","sdasdas"],
      ["ssss","ssss","dsdasda","sdasdas","ssss","dsdasda","sdasdas","ssss","dsdasda","sdasdas","ssss","dsdasda","sdasdas"],
      ["ssss","ssss","dsdasda","sdasdas","ssss","dsdasda","sdasdas","ssss","dsdasda","sdasdas","ssss","dsdasda","sdasdas"],
      ["ssss","ssss","dsdasda","sdasdas","ssss","dsdasda","sdasdas","ssss","dsdasda","sdasdas","ssss","dsdasda","sdasdas"],
      ["ssss","ssss","dsdasda","sdasdas","ssss","dsdasda","sdasdas","ssss","dsdasda","sdasdas","ssss","dsdasda","sdasdas"],
      ["ssss","ssss","dsdasda","sdasdas","ssss","dsdasda","sdasdas","ssss","dsdasda","sdasdas","ssss","dsdasda","sdasdas"],
      ["ssss","ssss","dsdasda","sdasdas","ssss","dsdasda","sdasdas","ssss","dsdasda","sdasdas","ssss","dsdasda","sdasdas"],
      ["ssss","ssss","dsdasda","sdasdas","ssss","dsdasda","sdasdas","ssss","dsdasda","sdasdas","ssss","dsdasda","sdasdas"],
      ["ssss","ssss","dsdasda","sdasdas","ssss","dsdasda","sdasdas","ssss","dsdasda","sdasdas","ssss","dsdasda","sdasdas"],
      ["ssss","ssss","dsdasda","sdasdas","ssss","dsdasda","sdasdas","ssss","dsdasda","sdasdas","ssss","dsdasda","sdasdas"],
      ["ssss","ssss","dsdasda","sdasdas","ssss","dsdasda","sdasdas","ssss","dsdasda","sdasdas","ssss","dsdasda","sdasdas"],
      ["ssss","ssss","dsdasda","sdasdas","ssss","dsdasda","sdasdas","ssss","dsdasda","sdasdas","ssss","dsdasda","sdasdas"],
      ["ssss","ssss","dsdasda","sdasdas","ssss","dsdasda","sdasdas","ssss","dsdasda","sdasdas","ssss","dsdasda","sdasdas"],
      ["ssss","ssss","dsdasda","sdasdas","ssss","dsdasda","sdasdas","ssss","dsdasda","sdasdas","ssss","dsdasda","sdasdas"],
      ["ssss","ssss","dsdasda","sdasdas","ssss","dsdasda","sdasdas","ssss","dsdasda","sdasdas","ssss","dsdasda","sdasdas"],
      ["ssss","ssss","dsdasda","sdasdas","ssss","dsdasda","sdasdas","ssss","dsdasda","sdasdas","ssss","dsdasda","sdasdas"],
      ["ssss","ssss","dsdasda","sdasdas","ssss","dsdasda","sdasdas","ssss","dsdasda","sdasdas","ssss","dsdasda","sdasdas"],
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

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  },
   //连接数据库地址
   doConnect(res){
    let workspace = res.detail.value.workspace;
    if(!workspace){
      showHintModle("路径不能为空");
      return;
    }
    doConnectPath(workspace,this);
  },
  //关闭连接
  doClose(){
    let that = this; 
    let dialog = {
      title:"关闭",
      show:true,
      textcontent:"确认关闭都当前数据库连接？",
      success: res => {
        try{
          curConn.closeConnect();
          that.setData({
            curPath:"",
            isConnct:0,
            mode:-1
          })
          wx.setStorageSync('connectPath', '');
          doCloseDialog(that);
        } catch (e){
          console.log(e)
          showHintModle(e);
        } 
      }
    }
    showDialog(dialog,that); 
  },
  //添加数据库
  doAddDataBase(){
    let that = this;
    let dialog = {
      title:"添加",
      show:true,
      content:[
        {
          title:"数据库名称",
          hint:"请输入数据库名称",
          must:true,
          name:"basename"
        }
      ],
      success: res => {
        try{
          curConn.createDataBase(res.basename,true);
          doShowDataBaseList(that);
          doCloseDialog(that);
        } catch (e){
          console.log(e)
          showHintModle(e);
        } 
      }
    }
    showDialog(dialog,that);
  }, 
  //选择数据库
  doSelectDataBase(res){
    let databaseName = res.currentTarget.dataset.item;
    doSelectDataBase(databaseName,this);
  },
  //删除数据库
  doDeleteBase(res){
    let that = this;
    let baseName = res.currentTarget.dataset.item;
    let dialog = {
      title:"删除",
      show:true,
      textcontent:"确认删除数据库：" + baseName + " 删除后将不可恢复",
      success: res => {
        try{
          curConn.deleteDataBase(baseName);
          doShowDataBaseList(that);
          doCloseDialog(that);
        } catch (e){
          console.log(e)
          showHintModle(e);
        } 
      }
    }
    showDialog(dialog,that);
  },
   //添加数据表
   doAddTable(){
    let that = this;
    let dialog = {
      title:"添加",
      show:true,
      content:[
        {
          title:"表名称",
          hint:"请输入表名称",
          must:true,
          name:"tablename"
        }
      ],
      success: res => {
        try{
          curConn.createTable(res.tablename,true);
          doShowTalbleList(that);
          doCloseDialog(that);
        } catch (e){
          console.log(e)
          showHintModle(e);
        } 
      }
    }
    showDialog(dialog,that);
  }, 
  //选择数据表
  doSelectTable(res){
    let tableName = res.currentTarget.dataset.item;
    doSelectTable(tableName,this);
  },
  doBack(res){
    let mode = this.data.mode;
    let submode = this.data.submode;
    if(submode){
      submode--;
    } else if(mode){
      mode--;
    }
    this.setData({
      mode,
      submode
    })
  },
  //删除数据表
  doDeleteTable(res){
    let that = this;
    let tableName = res.currentTarget.dataset.item;
    let dialog = {
      title:"删除",
      show:true,
      textcontent:"确认删除表：" + tableName + " 删除后将不可恢复",
      success: res => {
        try{
          curConn.deleteTable(tableName);
          doShowTalbleList(that);
          doCloseDialog(that);
        } catch (e){
          console.log(e)
          showHintModle(e);
        } 
      }
    }
    showDialog(dialog,that);
  },
  doOpenSub(res){
    let item = res.currentTarget.dataset.item;
    if(item.type == "data"){
      doSelectTableData(this);
    } else if(item.type == "set"){
      doSelectTableSet(this);
    } else if(item.type == "index"){
      doSelectTableIndex(this);
    }
    this.setData({
      curSubItem:item,
      submode:1
    })
  }
})

function doSelectTableData(that){

}

function doSelectTableSet(that){
  
}

function doSelectTableIndex(that){
  
}

function doSelectTable(tableName,that){
  try{ 
    that.setData({
      curTable:tableName
    })
    curConn.selectTable(tableName);
    that.setData({
      mode:2,
      submode:0,
      curSubItem:{}
    })
  } catch(e){
    console.log(e)
    showHintModle(e);
  } 
}

function doSelectDataBase(baseName,that){
  try{ 
    that.setData({
      curDataBase:baseName
    })
    curConn.useDataBase(baseName);
    doShowTalbleList(that);
  } catch(e){
    console.log(e)
    showHintModle(e);
  } 
}

function doShowTalbleList(that){
  try{ 
    if(!that.data.curDataBase){
      throw("当前未选择数据库");
    }
    let tableList = curConn.showTableList();
    that.setData({ 
      tableList,
      mode:1, 
    })
  } catch(e){
    console.log(e)
    showHintModle(e);
  } 
}

function doCloseDialog(that){
  that.setData({
    showAnmi:false
  })
  setTimeout(() => {
    that.setData({
      "dialog.show":false
    })
  },500)
}

function showDialog(dialog,that){
  dialog.show = true;
  if(!dialog.cancel){
    dialog.cancel = () => {
      doCloseDialog(that);
    }
  }
  that.setData({
    dialog
  })
  setTimeout(() => {
    that.setData({
      showAnmi:true
    })
  },50)
}

function initConnect(that){
  let connectPath = wx.getStorageSync('connectPath');
  if(!connectPath){
    return;
  }
  doConnectPath(connectPath,that);
}

function doConnectPath(path,that){ 
    try{
      curConn = new Connect(wx.getFileSystemManager(), basePath + path);  
      that.setData({
        isConnct:1,
        curPath:path, 
      })
      wx.setStorageSync('connectPath', path);
      doShowDataBaseList(that);
    } catch (e){
      console.log(e)
      showHintModle(e);
    } 
}

function doShowDataBaseList(that){
  try{ 
    let databaseList = curConn.showDataBases();
    that.setData({ 
      databaseList,
      mode:0
    })
  } catch (e){
    console.log(e)
    showHintModle(e);
  }
}

function showHintModle(context){
  wx.showModal({
    title: '提示',
    content: context,
    showCancel:false,
    confirmText:"我知道了",
    complete: (res) => {
      if (res.cancel) { 
      } 
      if (res.confirm) {
        
      }
    }
  })
}