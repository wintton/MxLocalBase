// Components/table/table.js
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    table:Array, 
    typeset:Object
  },

  /**
   * 组件的初始数据
   */
  data: {
    showAnmi:false,
    curIndex:0,
    add:1,
    reduce:0,
    yes:0,
    addTemp:[],
    curTempIndex:0,
    dialog:{
      show:false,
      title:"提示",
      content:[
        {
          title:"数据库名称："
        }
      ]
    },
  },
  
  /**
   * 组件的方法列表
   */
  methods: {
    doChangeAddValue(res){
      let index = res.currentTarget.dataset.index;
      let tableHead = this.data.table[0];
      let content = [];
      let typeset = this.data.typeset;
      if(!typeset){
        typeset = {};
      }
      for(let item of tableHead){ 
        content.push(
          {
            title:item,
            hint:"请输入", 
            name:item,
            value:typeset[item]?typeset[item].default:"",
            type:typeset[item]?typeset[item].type:"input",
            options:typeset[item]?typeset[item].options:[],
          }
        )
      }
      this.setData({
        curTempIndex:index
      })
      let that = this; 
      let dialog = {
        title:"填写", 
        show:true,
        content:content,
        success: res => {
          let addResult = {};
          for(let key in res){
              if(typeset[key].notNull && typeof res[key] == "undefined"){
                  showHintModle(key + "不允许为空");
                  return;
              }
              addResult[key] = res[key] || typeset[key].default;
          }
          this.triggerEvent("addValue",addResult);
        }
      }
      showDialog(dialog,that);
    },
    doChangeCurIndex(res){
      let index = res.currentTarget.dataset.index;
      this.setData({
        curIndex:index,
        showHint:"",
        reduce:index == 0?0:1
      })
    }, 
    doShowData(res){
      let data = res.currentTarget.dataset.data; 
      this.setData({
        showHint:data
      })
    },
    doAdd(){
      if(!this.data.add){
        return;
      }
      this.setData({
        add:0,
        yes:1,
        curIndex:this.data.table.length,
        addTemp:new Array(this.data.table[0].length)
      })
    },
    doReduce(){
      let that = this;
      if(!this.data.reduce){
        return;
      }
      if(this.data.curIndex >= this.data.table.length){ 
        this.setData({
          add:1,
          yes:0,
          curIndex:this.data.curIndex - 1,
          addTemp:""
        })
        return;
      }
      wx.showModal({
        title: '提示',
        content: '确认删除当前行？',
        complete: (res) => {
          if (res.cancel) {
            
          } 
          if (res.confirm) { 
            that.triggerEvent("deleteItem",that.data.curIndex)
          }
        }
      })
    },
    doSave(){
      if(!this.data.add){
        return;
      }
    },
    doCopy(){
      let that = this;
      wx.setClipboardData({
        data:that.data.showHint
      })
    },
    doSelCellValue(res){
      let index = res.currentTarget.dataset.index;
      let each = res.currentTarget.dataset.each;
      let value = res.currentTarget.dataset.value;
      this.triggerEvent("selItem",{
        column:each,
        row:index,
        value
      })
    },
    doShowMenu(){
      let that = this; 
      wx.showActionSheet({
        itemList: ["编辑","删除"],
        success:res => {
          switch(res.tapIndex){
            case 0:{
              that.triggerEvent("editItem",that.data.curIndex)
            }
            break;
            case 1:{
              that.triggerEvent("deleteItem",that.data.curIndex)
            }
            break;
          }
        }
      })
    }
  }
})


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
