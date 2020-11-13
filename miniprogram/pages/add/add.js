/*
  此页面为发布快递的页面，用户填写完表单后点击发布就能触发事件调用done函数上传至云数据库进而发布出去。
*/
const app = getApp();
const db = wx.cloud.database();
const _ = db.command;
var that = null;
Page({
  data: {
    package_remarks: '',//包裹的备注信息
    photo: [],//包裹的图片（不止一张）
    package_name:'',//包裹名字
    package_address:'',//包裹取件点
    package_code:''//包裹取件码
  },
  onLoad(options) {
    that = this;
  },
  gettext_remarks(e) {//“包裹备注”编辑框的事件处理函数
    that.setData({
      package_remarks: e.detail.value
    })
  },
  gettext_name(e) {//“包裹名”编辑框的事件处理函数
    that.setData({
      package_name: e.detail.value
    })
  },
  gettext_address(e) {//“包裹取件点”编辑框的事件处理函数
    that.setData({
      package_address: e.detail.value
    })
  },
  gettext_code(e) {//“包裹取件码”编辑框的事件处理函数
    that.setData({
      package_code: e.detail.value
    })
  },
  chooseimage() {//“添加图片”按钮的事件处理函数
    //选择图片，一共8张
    wx.chooseImage({
      count: 8 - that.data.photo.length,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: res => {
        //选择完成后，把图片列表追加到已有的列表中
        console.log('res.tempFilePaths:', res.tempFilePaths)
        //更新data以使得页面能正确渲染显示
        that.setData({
          photo: that.data.photo.concat(res.tempFilePaths)
        })
      }
    })
  },
  /*实现图片点击预览功能*/
  previewimg(e) {
    // 预览图片，待实现
    wx.previewImage({
      urls: that.data.photo,
      current:e.currentTarget.dataset.url
    })
  },
  /*图片长按事件处理函数，实现图片删除功能*/
  removeimg(e) {
    //删除图片
    wx.showModal({
      title: '提示',
      content: '是否要删除该图片',
      success(res) {
        if (res.confirm) {
          let url = e.currentTarget.dataset.url;
          let urls = that.data.photo;//本地临时的url，直接在数组中删除即可
          urls.splice(urls.indexOf(url), 1);
          that.setData({
            photo: urls
          })
        }
      }
    })
  },
  /* "发布帖子"按钮事件处理函数，实现帖子的上传数据库功能 */
  done(e){
    //开始执行上传
    console.log(e.detail.userInfo)
    if(e.detail.userInfo){
      /*获取用户头像和用户昵称*/
      that.authorname = e.detail.userInfo.nickName;
      that.authorimg = e.detail.userInfo.avatarUrl;
      if(that.data.package_remarks.length>=1){
        /*帖子长度需要为1以上*/
        wx.showLoading({
          title: '文字检查中',
          mask: true
        })
        console.log("开始检查文字和图片")
        /*调用云函数实现文字和图片的安全检查*/
        wx.cloud.callFunction({
          name:'textsec',
          data:{
            text:that.data.package_remarks
          },
          success(){
            console.log("正在上传图片",that.data.photo);
            /* 检查成功后开始上传图片 */
            that.uploadimg(that.data.photo);
          },
          fail(e){
            console.log("e.",e);
            wx.showModal({
              title:'提示',
              content:'你发表的帖子中有不安全内容，请修改后重试',
              showCancel:false
            })
          }
        })
      }
      else{
        wx.showModal({
          title:'提示',
          content:'需要写1个字以上才能发表',
          showCancel:false
        })
      }
    }
    else{
      wx.showModal({
        title:'提示',
        content:'为了实名安全考虑，你需要授权信息才可以发表帖子',
        showCancel:false
      })
    }
  },
  /** 1、实现图片文件的上传，把临时的文件名上传到服务器并以时间来重命名 
   * 2、调用
  */
  async uploadimg(imgs){
    //帖子图片上传
    let result = [];
    for(let item of imgs){
      wx.showLoading({
        title: '图片上传中',
        mask: true
      })
      let files = await wx.cloud.uploadFile({
        cloudPath: `package_img/${Date.now()}-${Math.floor(Math.random(0,1)*1000)}.png`,
        filePath: item
      });
      console.log('files:', files)
      wx.showLoading({
        title: '检测安全中',
        mask: true
      })
      let secres = await that.imagesec(files.fileID);
      console.log('secres:', secres)
      if(secres)
        result.push(files);
    }

    console.log('uploadimg res:', result)
    that.additem(result);
  },
  imagesec(fileID){
    return new Promise((resolve, reject)=>{
      wx.cloud.callFunction({
        name:'imagesec',
        data:{
          img:fileID
        },
        success(res){
          resolve(true)
        },
        fail(e){
          console.log("e:",e);
          wx.cloud.deleteFile({
            fileList:[fileID]
          });
          resolve(false);
        }
      })
    })
  },
  additem(photos) {
    //新建帖子
    const package_photos = photos.map(photo => photo.fileID);
    console.log('package_photos', package_photos)

    /**
     * {
     *  package_remarks // 包裹备注
     *  image // 包裹图片
     *  date // 当前时间
     *  authorname // 包裹主人
     *  authorimg // 包裹主人头像
     * }
     */
    db.collection('packages').add({
      data:{
        package_remarks:that.data.package_remarks,
        package_photos:package_photos,
        date:new Date(),
        authorname:that.authorname,
        authorimg:that.authorimg,
        package_name:that.data.package_name,
        package_address:that.data.package_address,
        package_code:that.data.package_code,
        take_openid:"",
        take_name:'',
        take_img:'',
        flag:"1"

      }
    }).then(result=>{
      console.log('result',result);
      wx.hideLoading();
      wx.navigateBack({
        delta: 1,
      })
    }).catch(err=>{
      wx.hideLoading()
    })
  },
})