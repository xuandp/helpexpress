const app = getApp()
const db = wx.cloud.database()
const _ = db.command;
var that = null;
Page({
  onLoad(){
    that = this;
    that.setData({
      item:app.globalData.item
    });
  },
  onShow(){
    that.init();
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
  init(){
    //加载帖子的评论 （待实现）
    // 1. 从comment 集合中查询 满足 pid 字段等于 that.data.item._id(表示当前选中的帖子)的评论
    // 2. 对每条评论数据的date字段，调用app.nowdate进行转换，并setDate更新comment 字段到页面显示
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
  },
  gettext(e){
    that.setData({
      text: e.detail.value
    })
  },
  helptake(e){
    that.authorname = e.detail.userInfo.nickName;
    that.authorimg = e.detail.userInfo.avatarUrl;
    console.log(e.detail.userInfo.nickName+"帮助拿快递")
    db.collection('comment').add({
      data:{
        pid:that.data.item._id,
        content:e.detail.userInfo.nickName+"帮助拿快递",
        date:new Date(),
        authorname:that.authorname,
        authorimg:that.authorimg
      }
    }).then(result=>{
      that.init();
    })
    db.collection('packages').doc(this.data.item._id).update({
      // data 传入需要局部更新的数据
      data: {
        // 表示将 done 字段置为 true
        flag:"2",
        take_openid:app.globalData.openid,
        take_name:e.detail.userInfo.nickName,
        take_img:e.detail.userInfo.avatarUrl,
      },
      success: function(res) {
        console.log(res.data,"帮助成功")
        that.init();
        wx.showModal({
          title:'提示',
          content:'已帮助成功，请前往会话界面查看',
          showCancel:false,
        })
        console.log("帮助成功")
      }
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
  previewimg(e) {
    //浏览图片
    wx.previewImage({
      urls: that.data.item.package_photos,
      current: e.currentTarget.dataset.url
    })
  },
  removemain(e){
    //删除帖子，此删除需要在无评论的情况下才可以删除 待实现
    // 1. 提示用户是否要删除当前帖子
    // 2. 确认删除后，在forum 集合中 指定对docid 为 that.data.item._id 的文档进行删除
    // 3. 删除文档成功后，将该帖子内的图片调用deleteFile接口删除
    wx.showModal({
      title:'提示',
      content:'是否要删除该帖子',
      success(res){
        if(res.confirm){
          wx.showLoading({
            title: '删除中',
            mask:true
          })
          console.log(e);
          db.collection('packages').doc(that.data.item._id).remove()
          .then(res=>{
            wx.cloud.deleteFile({
              fileList:that.data.item.package_photos
            }).then(result=>{
              wx.navigateBack({
                delta: 1,
              })
            });
          }).catch(err=>{
            wx.navigateBack({
              delta: 1,
            })
          })
        }
      }
    })
  }
})
