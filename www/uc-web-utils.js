
const $plugins = {};

var require = function (name) {
    if($plugins[name])
        return $plugins[name];
    else
        throw new Error(`Module no found: ${name}`);
}


function checkInRange(arg, lv, rv, desc){

    if(lv instanceof Array){
        if(!lv.some(item=> ((item[0] <= arg) && (arg <= item[1])) )){
            let arrDesc = lv.map(item => item[0] === item[1] ? `${item[0]}` : `${item[0]}…${item[1]}`).join('; ');
            throw(`${rv} ${arg} not in range (${arrDesc})`);
        }
    }else
    if (!((lv <= arg) && (arg <= rv)))
        throw(`${desc} ${arg} not in range ${lv}…${rv}`);
    return true;
};

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
    if(toId)
        moveElement(what, toId);

    return what;
}





function getCssRule(selector) {
    for(let i = 0; i < document.styleSheets.length; i++) {
        let ss = document.styleSheets[i];
        if (String(ss.ownerNode.localName) === 'style') {
            let rules = ss.cssRules || ss.rules;

            for(let r = 0; r < rules.length; r++){
                if(rules[r].selectorText == (selector)){
                    return rules[r];
                }
            }

        }
    }
    return null;
}

function doZoom(selector, setZoom) {

    let rule = getCssRule(selector);
    if(! rule) return false;

    let maxZoom = Number(rule.style.getPropertyValue('--max-zoom') || 1);
    let minZoom = Number(rule.style.getPropertyValue('--min-zoom')|| 1);
    let defZoom = Number(rule.style.getPropertyValue('zoom')|| 1);
    rule.style.zoom = maxZoom;

    let zoom = rule.style.zoom;
    let elements = document.querySelectorAll(selector);
    for (let elem of elements) {
        let parent = elem.parentNode;
        let width = parent.style.width;
        parent.style.width = 'auto';
        let place = parent.parentNode;
        let newZoom = 0.99 * Math.min(place.offsetHeight * maxZoom / parent.offsetHeight , place.offsetWidth * maxZoom / parent.offsetWidth);
        zoom = Math.max(isNaN(newZoom) ? minZoom : Math.min(zoom, newZoom), minZoom);
        parent.style.width = width;

    }
    zoom = Math.min(zoom, maxZoom);
    if(setZoom === false)
        rule.style.zoom = defZoom;
    else
        rule.style.zoom = zoom;

    return zoom;

}

function DateFromShotXMLString(ds){
    var date = new Date(ds.substr(0, 4), Number(ds.substr(4, 2)) - 1, ds.substr(6, 2), ds.substr(9, 2), ds.substr(11, 2), ds.substr(13, 2));
    return date;
}

Number.prototype.toHex = function(len){
    let res = Number(this).toString(16);
    return String('00000000' + res).slice(-Math.max(len || 0, Math.ceil(res.length / 2) * 2));
};


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

String.prototype.replaceAll = function(search, replacement) {
    return this.split(search).join(replacement);
};



