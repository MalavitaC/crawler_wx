const superagent = require('superagent');
const cheerio = require('cheerio');
const request = require('request');
const moment = require('moment');
// const name = 'Node-Subway';
// const reptileUrl = `http://weixin.sogou.com/weixin?type=1&s_from=input&query=${name}&ie=utf8&_sug_=y&_sug_type_=&w=01019900&sut=7269&sst0=1526178006974&lkt=4%2C1526178004446%2C1526178004956`;

// superagent.get(reptileUrl).end(function (err, res) {
//     // 抛错拦截
//      if(err){
//    		console.error(err);
//          // return throw Error(err);
//      }
//    *
//    * res.text 包含未解析前的响应内容
//    * 我们通过cheerio的load方法解析整个文档，就是html页面所有内容，可以通过console.log($.html());在控制台查看
   
//    	let $ = cheerio.load(res.text);
//    	$('#main .news-box .news-list2 li').each(function(i, elem) {
// 	   // 拿到当前li标签下所有的内容，开始干活了
// 	   let _this = $(elem);
//    		console.log(_this.find('.gzh-box2 .txt-box .tit a').attr('href'));
// 	});
// });
	
//搜索公众号,获取公众号主页URL
function getHomePathByName(name){
	let reptileUrl = `http://weixin.sogou.com/weixin?type=1&s_from=input&query=${name}&ie=utf8&_sug_=n&_sug_type_=`
	// let reptileUrl = `http://weixin.sogou.com/weixin?type=1&s_from=input&query=${name}&ie=utf8&_sug_=y&_sug_type_=&w=01019900&sut=7269&sst0=1526178006974&lkt=4%2C1526178004446%2C1526178004956`;

	return new Promise((r, j)=>{
		superagent.get(reptileUrl).end(function (err, res) {
		    // 抛错拦截
		     if(err){
		   		j({code: 500, err: err})
		     }
		   /**
		   * res.text 包含未解析前的响应内容
		   * 我们通过cheerio的load方法解析整个文档，就是html页面所有内容，可以通过console.log($.html());在控制台查看
		   */
		   	let $ = cheerio.load(res.text);
		   	$('#main .news-box .news-list2 li').each(function(i, elem) {
			   // 拿到当前li标签下所有的内容，开始干活了
			   let _this = $(elem);

			    setTimeout(function () {
			   		r({code: 0, path: _this.find('.gzh-box2 .txt-box .tit a').attr('href')})
			    }, 1000 + Math.ceil(Math.random() * 500));
			});
		});
	})
}

function getArticleListByHomePath(homePath){

	return new Promise((r, j)=>{

  		request(homePath, function (err, response, html) {
		    // 抛错拦截
			if(err){
				j({code: 500, err: err})
			}

    		if (html.indexOf('为了保护你的网络安全，请输入验证码') != -1){
				j({code: 500, err: '需要输入验证码'})
    		}

			//文章数组,页面上是没有的,在js中,通过正则截取出来
			var msglist = html.match(/var msgList = ({.+}}]});?/);
			if (!msglist){
				j({code: 500, err: '没有搜索到文章,只支持订阅号,服务号不支持!'})
			}
			msglist = msglist[1];
    		msglist = msglist.replace(/(&quot;)/g, '\\\"').replace(/(&nbsp;)/g, '');
			msglist = JSON.parse(msglist);
			if (msglist.list.length == 0) {
				j({code: 500, err: '没有搜索到文章,只支持订阅号,服务号不支持!'});
			}
			let list = [];
			//循环文章数组,重组数据
			msglist.list.forEach(function (msg, index) {
				//基本信息,主要是发布时间
				var article_info = msg.comm_msg_info;
				//发布时间
				var article_pub_time = moment(article_info.datetime*1000).format('YYYY-MM-DD HH:mm:ss');
				//第一篇文章
				var article_first = msg.app_msg_ext_info;
				list.push({
					'pub_time': article_pub_time,
					'title': article_first.title,
					'url': `http://mp.weixin.qq.com${article_first.content_url.replace(/(amp;)|(\\)/g, '')}`
				});
				// article_pub_times.push(article_pub_time);
				// article_titles.push(article_first.title);
				// article_urls.push('http://mp.weixin.qq.com' + article_first.content_url.replace(/(amp;)|(\\)/g, ''));
				if (article_first.multi_app_msg_item_list.length > 0) {
				  //其他文章
				  var article_others = article_first.multi_app_msg_item_list;
				  article_others.forEach(function (article_other, index) {

					list.push({
						'pub_time': article_pub_time,
						'title': article_first.title,
						'url': `http://mp.weixin.qq.com${article_first.content_url.replace(/(amp;)|(\\)/g, '')}`
					});
				    // article_pub_times.push(article_pub_time);
				    // article_titles.push(article_other.title);
				    // article_urls.push('http://mp.weixin.qq.com' + article_other.content_url.replace(/(amp;)|(\\)/g, ''));
				  })
				}
	  		});
		    setTimeout(function () {
  				r({code: 0, data: list});
		    }, 1000 + Math.ceil(Math.random() * 500));
  		});
	})
}

//根据文章url获取详细信息,发布日期,作者,公众号,阅读量,点赞量等
function getArticleInfoByPath(list){

	return new Promise((r, j)=>{
		request(list.url, (err, response, html)=>{

			if (err) return j({code: 500, err: err});
			var $ = cheerio.load(html);
			//作者
			var author = $("#meta_content .rich_media_meta_primary").text();
			author = author.replace('作者', '');
			list.author = author;
			//公众号
			list.wechat_number = $("#profileBt a").text();
		    setTimeout(function () {
				r({code: 0, data: list})
		    }, 1000 + Math.ceil(Math.random() * 500));
		})
	})
}

async function start(name){

	//搜索公众号,获取公众号主页URL
	let homePath = await getHomePathByName(name);
	console.log(homePath)
	if (homePath.code) {
		console.log(homePath.err)
		return;
	}

	//进入公众号主页，获取文章列表解析文章url
	let list = await getArticleListByHomePath(homePath.path);//.replace('amp;', '')
	console.log(list)
	if (list.code) {
		console.log(list.err)
		return;
	}

	//根据文章url获取详细信息,发布日期,作者,公众号,阅读量,点赞量等
	let listInfo = [];
	for (var i = 0; i < list.data.length; i++) {
		let obj = await getArticleInfoByPath(list.data[i]);//.replace('amp;', '')
		if (obj.code) {
			console.log(obj.err)
			continue;
		};
		listInfo.push(obj.data);
	}
	console.log(listInfo)
}

start();