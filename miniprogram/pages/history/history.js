const app = getApp();
const db = wx.cloud.database()
const _ = db.command;
var that = null;
app.onGetOpenid();
Page({
  data:{
    items:{},
    steps: [{ 'stepName': '待拿取' }, { 'stepName': '待协商收获地点' }, { 'stepName': '待拥有者拿取' }, { 'stepName': '完成' }]
  },
  onLoad(){
    that = this;
    app.onGetOpenid();
    console.log("openid 为",app.globalData.openid)
  },
  onShow(){
    wx.showNavigationBarLoading()
    that.init();
    // that.toadmin();
  },
  todetail(e){
    app.globalData.item=e.currentTarget.dataset.item;
    wx.navigateTo({
      url: '../chatdetail/chatdetail',
    })
  },
  init(){
    //1. 从 forum 集合中查询所有文档 
    //2. 对查询的每一条文档，调用app.nowdate方法，对文档中的date字段进行转换，并setData更新  items字段
    db.collection('packages').get()
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
      wx.getUserInfo({
        success:function(res){
          console.log(res);
          app.globalData.userInfo=res.userInfo;
          items=items.filter(item=>{
            return item.flag=="5"
          })
          items=items.filter(item=>{
            return (item._openid==app.globalData.openid)||(item.take_openid==app.globalData.openid)
          })
          that.setData({
            items:items
          })
        }
      })
      wx.hideLoading();
      wx.hideNavigationBarLoading();
    })
  }
})