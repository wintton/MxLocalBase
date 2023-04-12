  
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
      let name = res.currentTarget.dataset.name;
      let item = res.currentTarget.dataset.item; 
      if(item && item.type == "select"){
        this.data.dataValue[name] = item.options[res.detail.value];
      } else {
        this.data.dataValue[name] = res.detail.value;
      }
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
    },
    doConcel(res){
      let dialog = this.data.dialog; 
      typeof dialog.cancel == "function" && dialog.cancel(); 
    }
  },
  observers:{
    showAnmi(newValue,OldVuew){
      console.log(newValue,OldVuew)
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