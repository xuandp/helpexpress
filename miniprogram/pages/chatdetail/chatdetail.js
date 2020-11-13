const app = getApp();
const db = wx.cloud.database()
const _ = db.command;
var that = null;
app.onGetOpenid();
Page({
  data:{
    activeNum:1,
    steps: [{ 'stepName': '待拿取' }, { 'stepName': '待协商收获地点' }, { 'stepName': '待拥有者拿取' }, { 'stepName': '完成' }],
    item:{}
  },
  onLoad(){
    that = this;
    app.onGetOpenid();
    console.log("openid 为",app.globalData.openid)
  },
  increase(){
    flag=parseInt(this.data.item.flag);
    console.log("目前的flag为",flag);
    flag=flag+1;
    app.globalData.item.flag=flag;
    console.log("改过的flag为",flag);
    db.collection('packages').doc(this.data.item._id).update({
      // data 传入需要局部更新的数据
      data: {
        // 表示将 done 字段置为 true
        flag:String(flag)
      },
      success: function(res) {
        console.log(res.data)
        that.setData({
          item:app.globalData.item,
          flag:app.globalData.item.flag
        })
        that.init();
      }
    });
    if(flag==5){
      wx.showModal({
        title:'提示',
        content:'当前进度全部完成，请到历史记录中查看',
        showCancel:false
      })
    }
  },
  gettext(e){
    that.setData({
      text: e.detail.value
    })
  },
  comment(e){
    //提交评论
    if(e.detail.userInfo){
      that.authorname = e.detail.userInfo.nickName;
      that.authorimg = e.detail.userInfo.avatarUrl;
      if(that.data.text.length>=1){
        wx.showLoading({
          title: '评论中',
          mask:true
        })
        //文字安全检查 待实现
        // 1. 调用 textsec 云函数 实现文字安全校验
        // 2. 校验成功的话，向comment 集合中插入一条评论数据，数据结构如下
        /**
         * {
         *  pid // 当前帖子_id
         *  content // 当前帖子文字内容
         *  date // 当前时间
         *  authorname // 作者名
         *  authorimg // 作者头像
         * }
         */
        wx.cloud.callFunction({
          name:'textsec',
          data:{
            text:that.data.text
          },
          success(){
            db.collection('comment').add({
              data:{
                pid:that.data.item._id,
                content:that.data.text,
                date:new Date(),
                authorname:that.authorname,
                authorimg:that.authorimg
              }
            }).then(result=>{
              that.init();
            })
          },
          fail(e){
            wx.hideLoading();
            wx.showModal({
              title:'提示',
              content:'你的评论中有不安全内容，请完成后重试',
              showCancel:false
            })
          }
        })
      }
      else{
        wx.showModal({
          title:'提示',
          content:'需要写1个字以上才能发表评论',
          showCancel:false
        })
      }
    }
    else{
      wx.showModal({
        title:'提示',
        content:'为了实名安全考虑，你需要授权信息才可以发表评论',
        showCancel:false
      })
    }
  },
  onShow(){
    wx.showNavigationBarLoading()
    that.init();
    // that.toadmin();
    wx.getSetting({
      success(res){
        if(res.authSetting['scope.userInfo']==true){
          wx.getUserInfo({
            success(res){
              that.setData({
                myimg:res.userInfo.avatarUrl
              });
            }
          })
        }
      }
    })
  },
  todetail(e){
    app.globalData.item=e.currentTarget.dataset.item;
    wx.navigateTo({
      url: '../chatdetail/chatdetail',
    })
  },
  removeitem(e){
    //删除自己的评论
    wx.showLoading({
      title: '删除中',
      mask:true
    })
    console.log(e);
    db.collection('comment').doc(e.currentTarget.dataset.item._id).remove()
    .then(res => {
        that.init();
    }).catch(err=>console.log(err))
  },
  init(){
    //1. 从 forum 集合中查询所有文档 
    //2. 对查询的每一条文档，调用app.nowdate方法，对文档中的date字段进行转换，并setData更新  items字段
    if(app.globalData.item._id!=""){
      console.log(app.globalData.item);
      that.setData({
        item:app.globalData.item,
        activeNum:app.globalData.item.flag-1,
      })
      wx.hideLoading();
      wx.hideNavigationBarLoading();
    }
    db.collection('comment').where({
      pid:that.data.item._id
    }).get()
    .then(result=>{
      console.log(result);
      let items=result.data.map(item=>{
        item.date=app.nowdate(item.date);
        return item;
      })
      that.setData({
        comment:items,
        text:''
      })
      wx.hideLoading();
      wx.hideNavigationBarLoading();
    })
  }
})