const navigationHistory = {
    get state(){
        return this.stack[this.stack.length - 1];
    },
    pushState(data){
        if(!this.stack.length || JSON.stringify(data) !== JSON.stringify(this.state))
            this.stack.push(data);
        if(history.state !== document.title)
            history.pushState(document.title, document.title);
    },
    popState(){
        let tempData = this.stack.pop();
        if(!this.stack.length)
            this.stack.push(tempData);
        if(history.state !== document.title){
            let time = new Date();
            if((time - this.prevPopTime) > 750)
                history.pushState(document.title, document.title);
            this.prevPopTime = time;
        }

        return tempData;
    },
    replaceState(data){
        let tempData = this.stack.pop();
        this.stack.push(data);
        return tempData;
    },
    prevPopTime:new Date(),

    stack:[]
};

/*
    node.append(...nodes or strings) – добавляет узлы или строки в конец node,
    node.prepend(...nodes or strings) – вставляет узлы или строки в начало node,
    node.before(...nodes or strings) –- вставляет узлы или строки до node,
    node.after(...nodes or strings) –- вставляет узлы или строки после node,
    node.replaceWith(...nodes or strings) –- заменяет node заданными узлами или строками.
*/

function moveElement(whatId, toId){

    const what = (typeof whatId === "string" || whatId instanceof String
        ? document.getElementById(whatId)
        : whatId);

    /** @namespace toId.before */
    /** @namespace toId.after */
    /** @namespace toId.prepend */
    /** @namespace toId.append */
    if (typeof toId === "string" || toId instanceof String) {
        const to = document.getElementById(toId);
        to.append(what);
    }else if(toId.tagName) {
        toId.append(what);
    }else if(toId.before){
        const to = document.getElementById(toId.before);
        to.before(what);
    }else if(toId.after){
        const to = document.getElementById(toId.after);
        to.after(what);
    }else if(toId.prepend){
        const to = document.getElementById(toId.prepend);
        to.after(what);
    }else if(toId.append){
        const to = document.getElementById(toId.append);
        to.after(what);
    }

}

function addElement(whatTag, toId){
    const what = document.createElement(whatTag);
    moveElement(what, toId);

    return what;
}





function getCssRule(className) {
    for(var i = 0; i < document.styleSheets.length; i++) {
        var ss = document.styleSheets[i];
        if (String(ss.ownerNode.localName) === 'style') {
            var rules = ss.cssRules || ss.rules;

            for(var r = 0; r < rules.length; r++){
                if(rules[r].selectorText == ('.' + className)){
                    return rules[r];
                }
            }

        }
    }
    return null;
}

function doZoom(className, initZoom) {
    var rule = getCssRule(className);
    if(! rule) return false;
    rule.style.zoom = initZoom;

    var zoom = initZoom;

    var list = document.getElementsByClassName(className);
    for (var item of list) {
        var parent = item.parentNode;
        var place = parent.parentNode;
        var newZoom = Math.min(place.offsetHeight * zoom / parent.offsetHeight , place.offsetWidth * zoom / parent.offsetWidth);
        zoom = Math.max(isNaN(newZoom) ? 1 : Math.min(zoom, newZoom), 1);
        rule.style.zoom = zoom;
        /*while(initZoom > 1 && (parent.offsetHeight > place.offsetHeight || parent.offsetWidth > place.offsetWidth) ){
            initZoom -= deltaZoom;
            rule.style.zoom = initZoom;
        }*/
    }
}

function DateFromShotXMLString(ds){
    var date = new Date(ds.substr(0, 4), Number(ds.substr(4, 2)) - 1, ds.substr(6, 2), ds.substr(9, 2), ds.substr(11, 2), ds.substr(13, 2));
    return date;
}


Date.prototype.toFormatString = function(format, utc) {
    if(format === undefined)
        format = this.toString();
    else if(utc){
        let yyyy = this.getUTCFullYear().toString();
        format = format.replace(/yyyy/g, yyyy);
        let mm = (this.getUTCMonth() + 1).toString();
        format = format.replace(/mm/g, (mm[1] ? mm : "0" + mm[0]));
        let dd = this.getUTCDate().toString();
        format = format.replace(/dd/g, (dd[1] ? dd : "0" + dd[0]));
        let hh = this.getUTCHours().toString();
        format = format.replace(/hh/g, (hh[1] ? hh : "0" + hh[0]));
        let ii = this.getUTCMinutes().toString();
        format = format.replace(/ii/g, (ii[1] ? ii : "0" + ii[0]));
        let ss = this.getSeconds().toString();
        format = format.replace(/ss/g, (ss[1] ? ss : "0" + ss[0]));

    }else {
        let yyyy = this.getFullYear().toString();
        format = format.replace(/yyyy/g, yyyy);
        let mm = (this.getMonth() + 1).toString();
        format = format.replace(/mm/g, (mm[1] ? mm : "0" + mm[0]));
        let dd = this.getDate().toString();
        format = format.replace(/dd/g, (dd[1] ? dd : "0" + dd[0]));
        let hh = this.getHours().toString();
        format = format.replace(/hh/g, (hh[1] ? hh : "0" + hh[0]));
        let ii = this.getMinutes().toString();
        format = format.replace(/ii/g, (ii[1] ? ii : "0" + ii[0]));
        let ss = this.getSeconds().toString();
        format = format.replace(/ss/g, (ss[1] ? ss : "0" + ss[0]));
    }
    return format;
};



