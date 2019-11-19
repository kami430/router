(function () {
    /* **************** 公共方法 -start ******************** */

    const util = {
        genKey: () => {
            let t = 'xxxxxxxx';
            return t.replace(/[xy]/g, function (c) {
                let r = Math.random() * 16 | 0;
                let v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            })
        },
        getParamsUrl: (url) => {
            let hashDeatail = (url || location.hash).split("?"),
                hashName = hashDeatail[0].split("#")[1], //路由地址
                params = hashDeatail[1] ? hashDeatail[1].split("&") : [], //参数内容
                query = {};
            for (let i = 0; i < params.length; i++) {
                let item = params[i].split("=");
                query[item[0]] = item[1];
            }
            return {
                hash: hashName,
                query: query,
                params: params
            }
        },
        serialize: (obj, name) => {
            let result = "";

            function serializeInternal(o, path) {
                for (p in o) {
                    let value = o[p];
                    if (typeof value != "object") {
                        if (typeof value == "string") {
                            result += "\n" + path + "[" + (isNaN(p) ? "\"" + p + "\"" : p) + "] = " + "\"" + value.replace(/\"/g, "\\\"") + "\"" + ";";
                        } else {
                            result += "\n" + path + "[" + (isNaN(p) ? "\"" + p + "\"" : p) + "] = " + value + ";";
                        }
                    } else {
                        if (value instanceof Array) {
                            result += "\n" + path + "[" + (isNaN(p) ? "\"" + p + "\"" : p) + "]" + "=" + "new Array();";
                            serializeInternal(value, path + "[" + (isNaN(p) ? "\"" + p + "\"" : p) + "]");
                        } else {
                            result += "\n" + path + "[" + (isNaN(p) ? "\"" + p + "\"" : p) + "]" + "=" + "new Object();";
                            serializeInternal(value, path + "[" + (isNaN(p) ? "\"" + p + "\"" : p) + "]");
                        }
                    }
                }
            }
            serializeInternal(obj, name);
            return result;
        }
    }

    /* *************** 页面渲染 - start ******************** */

    const render = {
        /**
         * 加载外部html内容给target
         * @param {string} targetId 
         * @param {string} fileUrl 
         */
        loadHtml: function (targetId, fileUrl) {
            this.ajax({
                url: fileUrl
            }).then(resp => {
                this.render(targetId, resp, fileUrl);
            })
        },
        /**
         * 用户promise封装ajax对象
         * @param {Object} config 
         */
        ajax: function (config) {
            let configMap = {
                method: config.method || "GET",
                url: config.url,
                async: config.async || true,
                contentType: config.contentType || "application/x-www-form-urlencoded;charset=utf-8",
                headers: config.headers || {},
                data: config.data || {}
            }
            return new Promise(function (resolve, reject) {
                let XHR;
                if (window.XMLHttpRequest) {
                    XHR = new XMLHttpRequest();
                } else {
                    XHR = new ActiveXObject("Microsoft.XMLHTTP");
                }
                XHR.open(configMap.method, configMap.url, configMap.async);
                Object.keys(configMap.headers).forEach(key => XHR.setRequestHeader(key, configMap.headers[key]));
                XHR.setRequestHeader("Content-Type", configMap.contentType);
                XHR.onreadystatechange = function () {
                    if (XHR.readyState === 4) {
                        if ((XHR.status >= 200 && XHR.status < 300) || XHR.status == 304) {
                            try {
                                resolve(XHR.responseText);
                            } catch (e) {
                                reject(e);
                            }
                        } else {
                            reject(new Error("Request was unsuccessful: " + XHR.statusText));
                        }
                    }
                }
                XHR.send(configMap.data);
            });
        },
        /**
         * 创建元素节点
         * @param {Object} vnode 
         */
        createElement: function (vnode) {
            var tag = vnode.tag;
            var attrs = vnode.attrs || {};
            var children = vnode.children || [];
            if (!tag) {
                return null;
            }
            // 创建真实的 DOM 元素    
            var elem = document.createElement(tag);
            // 属性    
            var attrName;
            for (attrName in attrs) {
                if (attrs.hasOwnProperty(attrName)) {
                    // 给 elem 添加属性
                    elem.setAttribute(attrName, attrs[attrName]);
                }
            }
            // 子元素
            children.forEach(function (childVnode) {
                // 给 elem 添加子元素，如果还有子节点，则递归的生成子节点。
                elem.appendChild(createElement(childVnode)); // 递归
            }) // 返回真实的 DOM 元素   
            return elem;
        },
        /**
         * 获取子页面的js
         * @param {string} str 
         */
        findScript: function (str) {
            const reg = /<script.*?src="(.*?)".*?<\/script>/ig
            let result;
            let resultList = [];
            while (result = reg.exec(str)) {
                resultList.push(result[1]);
            }
            return resultList;
        },
        /**
         * 移除script src标签
         * @param {string} str 
         */
        removeScript: function (str) {
            const reg = /<script.*?src="(.*?)".*?<\/script>/ig;
            let result = str.replace(reg, "");
            return result;
        },
        /**
         * 查找link标签
         * @param {string} str 
         */
        findLink: function (str) {
            const reg = /<link.*?href="(.*?)".*?>/ig;
            let result;
            let resultList = [];
            while (result = reg.exec(str)) {
                resultList.push(result[1]);
            }
            return resultList;
        },
        /**
         * 移除link标签
         * @param {string} str 
         */
        removeLink: function (str) {
            const reg = /<link.*?href="(.*?)".*?>/ig;
            let result = str.replace(reg, "");
            return result;
        },
        /**
         * 获取内容页的相对路径
         * @param {string} fileUrl 
         */
        toAbsPath: function (fileUrl) {
            const reg = /(.*\/).*?[.].*?/;
            let result = reg.exec(fileUrl);
            return result[1];
        },
        /**
         * 渲染html
         * @param {渲染元素id} targetId 
         * @param {渲染的html} htmlStr 
         */
        render: function (targetId, htmlStr, absPath) {
            let target = document.querySelector(targetId);
            // 创建html容器
            let doc = new DocumentFragment();
            absPath = absPath ? this.toAbsPath(absPath) : "";
            // 替换link标签
            this.findLink(htmlStr).forEach(cssUrl => {
                cssUrl = cssUrl.indexOf("/") === 0 ? cssUrl : absPath + cssUrl;
                let node = this.createElement({
                    tag: 'link',
                    attrs: {
                        rel: "stylesheet",
                        href: cssUrl
                    }
                });
                doc.appendChild(node);
            });
            htmlStr = this.removeLink(htmlStr);
            // 替换script标签
            this.findScript(htmlStr).forEach(srcUrl => {
                srcUrl = srcUrl.indexOf("/") === 0 ? srcUrl : absPath + srcUrl;
                let node = this.createElement({
                    tag: 'script',
                    attrs: {
                        src: srcUrl
                    }
                })
                doc.appendChild(node);
            });
            htmlStr = this.removeScript(htmlStr);
            // html文本容器
            let node = this.createElement({
                tag: 'div'
            });
            node.innerHTML = htmlStr;
            doc.appendChild(node);
            // 替换渲染内容
            target.innerHTML = "";
            target.appendChild(doc);
        },
        /**
         * 渲染缓存
         * @param {string} targetId 
         * @param {DocumentFragment} doc
         */
        renderDom: function (targetId, doc) {
            let target = document.querySelector(targetId);
            target.innerHTML = "";
            target.appendChild(doc);
        }
    }

    /* *************** 页面渲染 - end ******************** */

    /* *************** 路由 - start ********************** */
    function Router() {
        this.routes = {};
        this.beforeFun = null;
        this.afterFun = null;
        this.routerViewId = "#routerView";
        this.redirectRoute = "/";
        this.stackPages = true;
        this.routerMap = [];
        this.historyFlag = '';
        this.history = [];
        this.cache = {};
    }

    Router.prototype = {
        init: function (config) {
            let self = this;
            this.routerMap = config ? config.routes || this.routerMap : this.routerMap;
            this.routerViewId = config ? config.routerViewId || this.routerViewId : this.routerViewId;
            this.stackPages = config ? config.stackPages || this.stackPages : this.stackPages;
            this.redirectRoute = config ? config.redirectRoute || this.redirectRoute : this.redirectRoute;

            this.map();
            // 初始化跳转方法
            window.goforward = function (path) {
                if (path.indexOf("?") !== -1) {
                    window.location.hash = path + '&key=' + util.genKey();
                } else {
                    window.location.hash = path + '?key=' + util.genKey();
                }
            }

            // 初始化回跳方法
            window.goback = function (params, index) {
                let backHash = self.backHash(index);
                if (params) {
                    this.Object.keys(params).forEach(key => {
                        backHash.params.push(key + "=" + params[key]);
                    })
                }
                window.location.hash = backHash.params.length ? backHash.hash += "?" + backHash.params.join("&") : backHash.hash;
            }

            // 初始化刷新方法
            window.gorefresh = function () {
                this.window.location.reload();
            }

            //页面首次加载 匹配路由
            window.addEventListener('load', function (event) {
                self.historyChange(event);
            }, false)

            //路由切换
            window.addEventListener('hashchange', function (event) {
                self.historyChange(event);
            }, false)
        },
        backHash: function (index) {
            index = index || -1;
            let nameStr = "router-" + this.routerViewId + "-history";
            this.history = window.sessionStorage[nameStr] ? JSON.parse(window.sessionStorage[nameStr]) : [];
            if (this.history.length && this.history.length - 1 >= -index) {
                return backHash = this.history[this.history.length - 1 + index];
            }
        },
        // 注册路由
        map: function () {
            this.routerMap.forEach(route => {
                this.routes[route.name] = route;
            });
        },
        historyChange: function (event) {
            let currentHash = util.getParamsUrl();
            let nameStr = "router-" + this.routerViewId + "-history";
            this.history = window.sessionStorage[nameStr] ? JSON.parse(window.sessionStorage[nameStr]) : [];
            let back = false,
                refresh = false,
                forward = false,
                index = 0,
                len = this.history.length;
            this.history.forEach((his, idx) => {
                // 同一个url
                if (his.hash === currentHash.hash && his.key === currentHash.query.key) {
                    index = idx;
                    if (idx === len - 1) {
                        refresh = true;
                    } else {
                        back = true;
                    }
                } else {
                    forward = true;
                }
            })
            if (back) {
                this.historyFlag = 'back';
                this.history.length = index + 1;
            } else if (refresh) {
                this.historyFlag = 'refresh';
            } else {
                this.historyFlag = 'forward';
                const item = {
                    hash: currentHash.hash,
                    key: currentHash.query.key,
                    params: currentHash.params,
                }
                this.history.push(item);
                this.cacheView(util.getParamsUrl(event.oldURL));
            }
            console.log('historyFlag :', this.historyFlag);
            if (!this.stackPages) {
                this.historyFlag = 'forward';
            }
            window.sessionStorage[nameStr] = JSON.stringify(this.history);
            this.urlChange();
        },
        urlChange: function () {
            let currentHash = util.getParamsUrl();
            if (this.routes[currentHash.hash]) {
                let self = this;
                if (this.beforeFun) {
                    this.beforeFun({
                        to: {
                            path: currentHash.hash,
                            query: currentHash.query
                        },
                        next: function () {
                            self.changeView(currentHash);
                        }
                    })
                } else {
                    this.changeView(currentHash);
                }
            } else {
                //不存在的地址,重定向到默认页面
                location.hash = this.redirectRoute;
            }
        },
        // 切换页面
        changeView: function (currentHash) {
            if (this.cache[currentHash.hash + currentHash.query.key]) {
                render.renderDom(this.routerViewId, this.cache[currentHash.hash + currentHash.query.key]);
                delete this.cache[currentHash.hash + currentHash.query.key];
            } else {
                render.loadHtml(this.routerViewId, this.routes[currentHash.hash].path);
            }
            this.afterFun ? this.afterFun(currentHash) : null;
        },
        // 缓存页面
        cacheView: function (currentHash) {
            if (this.routes[currentHash.hash] && this.routes[currentHash.hash].cacheable) {
                let doc = new DocumentFragment();
                let target = document.querySelector(this.routerViewId);
                let children;
                while ((children = target.childNodes).length != 0) {
                    doc.appendChild(children[0]);
                }
                this.cache[currentHash.hash + currentHash.query.key] = doc;
            }
        },
        //切换之前的钩子
        beforeEach: function (callback) {
            if (Object.prototype.toString.call(callback) === '[object Function]') {
                this.beforeFun = callback;
            } else {
                console.trace('路由切换前钩子函数不正确')
            }
        },
        //切换成功之后的钩子
        afterEach: function (callback) {
            if (Object.prototype.toString.call(callback) === '[object Function]') {
                this.afterFun = callback;
            } else {
                console.trace('路由切换后回调函数不正确')
            }
        }
    }
    /* *************** 路由 - end ************************ */

    // 注册到 window 全局
    window.Router = Router;
    window.router = new Router();
})()