const app = getApp();
const db = wx.cloud.database()
const _ = db.command;
var that = null;
app.onGetOpenid();
Page({
  data:{
    showfilter:"all"
    /*为"other"代表只看别人发布的，为"me"代表只看我发布的，为"all"代表看所有的*/
  },
  onLoad(){
    that = this;
    app.onGetOpenid();
    console.log("openid 为",app.globalData.openid);
    wx.getUserInfo({
      success:function(res){
        console.log(res);
        app.globalData.userInfo=res.userInfo;
      }
    })

  },
  onShow(){
    wx.showNavigationBarLoading()
    that.init();
    // that.toadmin();
  },
  toAdd(){
    // 此处需跳转至发帖页面 （待实现）
    wx.navigateTo({
      url: '../add/add', 
    })
  },
  todetail(e){
    app.globalData.item=e.currentTarget.dataset.item;
    wx.navigateTo({
      url: '../detail/detail',
    })
  },
  /*设置为能看其他人发布的*/
  lookother(){
    /*如果目前状态是只看自己的那么设置为"all"*/
    if(this.data.showfilter=="me"){
      this.setData({
        showfilter:"all",
        backcolor1:"#33cc00",
        backcolor2:"#33cc00"
      })
    }else if(this.data.showfilter=="all"){
      /*如果目前状态是所有都看，那么设置为只看自己的*/
      this.setData({
        showfilter:"me",
        backcolor1:"#cccccc",
        backcolor2:"#33cc00"
      })
    }
    this.init()
  },
  /*设置为能看自己发布的*/
  lookme(){
    /*如果目前状态是只看别人的那么设置为"all"*/
    if(this.data.showfilter=="other"){
      this.setData({
        showfilter:"all",
        backcolor1:"#33cc00",
        backcolor2:"#33cc00"
      })
    }else if(this.data.showfilter=="all"){
      /*如果目前状态是所有都看，那么设置为只看别人的*/
      this.setData({
        showfilter:"other",
        backcolor1:"#33cc00",
        backcolor2:"#cccccc"
      })
    }
    this.init()
  },
  init(){
    //1. 从 forum 集合中查询所有文档 
    //2. 对查询的每一条文档，调用app.nowdate方法，对文档中的date字段进行转换，并setData更新  items字段
    db.collection('packages').orderBy('date','desc')
    .where({
      flag:"1"
    })
    .get()
    .then(result=>{
      console.log(result);
      let items=result.data.map(item=>{
        item.relativetime=app.nowdate(item.date);
        var month = item.date.getMonth() + 1 < 10 ? "0" + (item.date.getMonth() + 1) : item.date.getMonth() + 1;
        var currentDate = item.date.getDate() < 10 ? "0" + item.date.getDate() : 
        item.date.getDate();
        var hour = item.date.getHours();
        var minute = item.date.getMinutes();
        var second = item.date.getSeconds();
        item.str_date=item.date.getFullYear() + "-" + month + "-" + currentDate + " " + hour + ":" + minute + ":" + second;
        return item;
      })
      items=items.filter(item=>{
        if(this.data.showfilter=="me"){//仅看自己发布的情况
          if(app.globalData.openid!=""&&app.globalData.openid){
            return (item.flag=="1")&&(item._openid==app.globalData.openid)
          }
        }else if(this.data.showfilter=="other"){//仅看别人发布的情况
          if(app.globalData.openid!=""&&app.globalData.openid){
            return (item.flag=="1")&&(item._openid!=app.globalData.openid)
          }
        }
        return item.flag=="1"
      })
      that.setData({
        items:items
      })
      console.log("列表如下");
      console.log(items);
      wx.hideLoading();
      wx.hideNavigationBarLoading();
    })
  }
})