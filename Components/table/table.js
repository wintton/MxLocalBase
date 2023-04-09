// Components/table/table.js
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    table:Array
  },

  /**
   * 组件的初始数据
   */
  data: {
    curIndex:0
  },
  
  /**
   * 组件的方法列表
   */
  methods: {
    doChangeCurIndex(res){
      let index = res.currentTarget.dataset.index;
      this.setData({
        curIndex:index,
        showHint:""
      })
    }, 
    doShowData(res){
      let data = res.currentTarget.dataset.data; 
      this.setData({
        showHint:data
      })
    },
    doCopy(){
      let that = this;
      wx.setClipboardData({
        data:that.data.showHint
      })
    },
    doShowMenu(){
      let that = this; 
      wx.showActionSheet({
        itemList: ["编辑","删除"],
        success:res => {
          switch(res.tapIndex){
            case 0:{
              this.triggerEvent("editItem",{},that.data.curIndex)
            }
            break;
            case 1:{
              this.triggerEvent("deleteItem",{},that.data.curIndex)
            }
            break;
          }
        }
      })
    }
  }
})
