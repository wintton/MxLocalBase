  
// Components/Dialog/Dialog.js
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    dialog:{
      type:Object
    },
    showanim:Boolean
  },

  /**
   * 组件的初始数据
   */
  data: {
    dataValue:{}
  }, 
  /**
   * 组件的方法列表
   */
  methods: {
    doNothing(){

    },
    doGetInput(res){
      let that = this;
      let name = res.currentTarget.dataset.name;
      let item = res.currentTarget.dataset.item; 
      if(!name){
        return;
      }
      if(item && item.type == "select"){
        that.data.dataValue[name] = item.options[res.detail.value];  
      } else {
        that.data.dataValue[name] = res.detail.value;
      } 
      that.setData({
        dataValue:that.data.dataValue
      })
    },
    doConfirm(res){
      let dialog = this.data.dialog;
      if(dialog.textcontent){
        typeof dialog.success == "function" && dialog.success();
        return;
      }
      let dataValue = this.data.dataValue;
      let content = dialog.content;
      for(let item of content){
        if(item.must &&  typeof dataValue[item.name] == "undefined"){
          showHintModle(item.hint || (item.title + "不能为空"));
          return;
        }
      }
      typeof dialog.success == "function" && dialog.success(dataValue);
      this.setData({
        dataValue:{}
      })
    },
    doConcel(res){
      let dialog = this.data.dialog; 
      typeof dialog.cancel == "function" && dialog.cancel(); 
      this.setData({
        dataValue:{}
      })
    }
  },
  observers:{
    showanim:function(newValue){
      if(!newValue){
        return;
      }
      let dataValue = this.data.dataValue;
      let content = this.data.dialog.content;
      console.log(content);
      if(content){
        for(let item of content){
          console.log(item.name)
          dataValue[item.name] = item.value;
        }
      }
      this.setData({
        dataValue
      })
    }
  }
})


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