const TilesComponentsTypes = function () {
};
TilesComponentsTypes.prototype.add = function(name, params){
    this[name] = params;
    this[name].name = name;
};

TilesComponentsTypes.prototype.length = function () {
    let res = 0;
    // noinspection JSCheckFunctionSignatures
    Object.keys(this).forEach(() => res++);
    return res;
};

const vTilesComponentsTypes = new TilesComponentsTypes;
module.exports.components = {types: vTilesComponentsTypes};

function Tile(pId) {
    this.params = {};
    this._id = pId;
    this._type = undefined;
}
Object.defineProperty(Tile.prototype, 'id', {
    get() {
        return this._id;
    },
    set(val) {
        throw('Property is read only');
    },
});
Object.defineProperty(Tile.prototype, 'type', {
    get() {
        return this._type;
    },
    set(val) {
        if(val !== this._type){
            this.params = {};
            this._type = val;
        }
    },
});


function Tiles() {
}

Tiles.prototype.toArray = function () {
    let res = [];
    // noinspection JSCheckFunctionSignatures
    Object.keys(this).forEach((id)=>res.push(this[id]));
    return res;
};
Tiles.prototype.length = function () {
    let res = 0;
    // noinspection JSCheckFunctionSignatures
    Object.keys(this).forEach(() => res++);
    return res;
};

const vTiles = new Vue({
    data: {
        tiles: new Tiles(),
    },
    computed:{
        tilesCount: {
            get(){
                return this.tiles.length();
            },
            set(val){
                wscli.send(`#Tile,SetCount:${val}`);
            }
        },
    },

    methods: {
        setTilesCount(val){
            let tilesCount = this.tiles.length();
            if(tilesCount !== val) {
                while (tilesCount < val){
                    tilesCount++;
                    Vue.set(this.tiles, tilesCount, new Tile(tilesCount));//{id: tilesCount, params: {}});
                    wscli.send(`#Tile:${tilesCount},GetType,GetParams`);
                }
                while (tilesCount > val)
                    Vue.delete(this.tiles, tilesCount--);
            }
        },
        changeTileSetting(id){
            vContent.setTab('tile-settings', {tileId: id});
        },
        checkTile(t, allowZero){
            return checkInRange(t, allowZero ? 0 : 1, this.tiles.length(), "Tile id");
        },

        getCSSClass(id){
            let tilesCount = this.tiles.length();
            let l = [[1], [2,2], [3,3,3], [2,2,2,2], [2,2,3,3,3], [3,3,3,3,3,3], [3,3,3,4,4,4,4],[4,4,4,4,4,4,4,4]];
            let p = [[1],[1,1],[1,1,1],[1,2,2,1],[2,2,1,2,2],[2,2,2,2,2,2],[2,2,2,2,2,2,1],[2,2,2,2,2,2,2,2]];
            return `sTilesCount${tilesCount}`
                + ` l${l[tilesCount - 1][id - 1]}-in-line`
                + ` p${p[tilesCount - 1][id - 1]}-in-line`
            ;
        },
        setType(id, type){
            if(this.tiles[id].type !== type){
                wscli.send(`#Tile:${id},SetType:${type},GetParams`);
            }
        },
        setParams(id, params){
            let data = `#Tile:${id},SetParams:${wscli.data.toString(params)}`;
            wscli.send(data);
        },
        onShow(params){
            this.$emit('show');
            doResizeTilesContent();
        },
        onHide(params){
            this.$emit('hide');
        },
    },
    created: function() {
        module.exports.setParams = this.setParams;
        ws.on('open', ()=>{
            wscli.send("#Tile,GetCount");
        });
    },
    template:`
    <div id="tab-content-tiles" title="Состояние">
        <div v-for="tile in tiles.toArray()" v-bind:class="getCSSClass(tile.id) + ' sTileWrap'" v-on:click="changeTileSetting(tile.id)">
            <div class="sTile border3d">
                <div v-bind:params="tile.params" v-bind:is="tile.type">
                
                </div>
            </div>
        </div>
    </div>`

});

vContent.addTab({component: vTiles, id: 'tiles'}, {before: 'sensors', });


vTilesComponentsTypes.add('tile-test', {title: 'Компонент'});
vTilesComponentsTypes.add('tile-second', {title: 'Второй'});

const vTileSettings = new Vue({
    data: {
        _isActive: false,
        _selectedTileId: 1
    },

    methods: {
        onShow(params){
            this.$data._isActive = true;
            if(params && params.tileId)
                this.selectedTileId = params.tileId;
            if(this.selectedTypeName)
                setTimeout(this.$emit.bind(this, `show-${this.selectedTypeName}-settings`), 2);
        },
        onHide(){
            this.$data._isActive = false;
            if(this.selectedTypeName)
                setTimeout(this.$emit.bind(this, `hide-${this.selectedTypeName}-settings`), 1);
        },
    },
    computed:{
        types(){
            let res = vTilesComponentsTypes;
            if(this.selectedTypeName && !res[this.selectedTypeName]){
                res = Object.assign(new TilesComponentsTypes(), res);
                res.add(this.selectedTypeName, {title: this.selectedTypeName + ', not installed'});
            }
            return res;
        },
        //isActive: () => vContent.
        tiles: ()=> vTiles.tiles,
        tilesCount: {
            get(){ return vTiles.tilesCount;},
            set(val){
                vTiles.tilesCount = val;
                if(val && this.selectedTileId > val)
                    this.selectedTileId = val;
            }
        },
        selectedTile(){
            return this.tiles[this.selectedTileId] || {}; // для старта, когда нет плиток
        },
        selectedTileId: {
            get(){ return this.$data._selectedTileId; },
            set(id){
                this.$data._selectedTileId = id;
                wscli.send(`#Tile:${id},GetType,GetParams`);
            }
        },
        selectedTypeName: {
            get: function(){ return this.selectedTile.type; },
            set: function(t){
                if(t){
                    vTiles.setType(this.selectedTileId, t);
                }
            }
        },
    },
    watch:{
        selectedTypeName: function (newVal, oldVal) {
            if(this.$data._isActive){
                if(oldVal)
                    setTimeout(this.$emit.bind(this, `hide-${oldVal}-settings`), 1);
                if(newVal)
                    setTimeout(this.$emit.bind(this, `show-${newVal}-settings`), 2);
            }
        }
    },
    created: function() {
    },
    template:`
    <div id="tab-content-tile-settings" title="Настройка плиток">
        <div class="sProperties">
            <div>
                <div>
                    <span>Панель</span>
                    <select v-model="selectedTileId">
                        <option v-for="tile in tiles" v-bind:value="tile.id">{{tile.id}}</option>
                    </select>
                    <div class="button-inc-dec">
                        <span> из </span>
                        <button v-on:click="tilesCount--"  class="button-inc-dec">-</button>
                        <span>{{tilesCount}}</span>
                        <button v-on:click="tilesCount++"  class="button-inc-dec">+</button>
                    </div>
                </div>
            </div>
            <div>
                <div>
                    <span>Тип данных</span>
                    <select v-model="selectedTypeName">
                        <option disabled value="" v-if="!types.length()">не выбрано</option>
                        <option v-for="type in types" v-bind:value="type.name">{{type.title}}</option>
                    </select>
                </div>
            </div>
            <div v-bind:is="selectedTypeName + '-settings'" v-if="selectedTypeName"
                v-bind:type="selectedTypeName + '-settings'"
                v-bind:tile="selectedTile">
            
            </div>
        </div>
    </div>`

});

vContent.addTab({component: vTileSettings, id: 'tile-settings'}, {after: 'tiles'});

wscli.context.add('tile');
wscli.commands.add({Tile: Number}, (arg) => {
        wscli.context.current = wscli.context.tile;
        vTiles.checkTile(arg, true);
        wscli.current.tile = arg;
        return true;
    }
);

function SetInfo(info, arg) {
     if(wscli.context.current === wscli.context.tile){
         vTiles.checkTile(wscli.current.tile);
         Vue.set(vTiles.tiles[wscli.current.tile], info, arg);
         return true;
     }
}

wscli.commands.add({Name: String}, SetInfo.bind(undefined, 'name'));
wscli.commands.add({Type: String}, SetInfo.bind(undefined, 'type'));
wscli.commands.add({Params: Object}, SetInfo.bind(undefined, 'params'));

wscli.commands.add({Count: Number}, (arg) => {
        if (wscli.context.current === wscli.context.tile) {
            checkInRange(wscli.current.tile, 0, 0, 'Tile');
            vTiles.setTilesCount(arg);
            doResizeTilesContent();
            return true;
        }
    }
);


// noinspection CssUnusedSymbol
document.write(`
<style type="text/css">
.tile-caption .zoomed-content{
    zoom: 1;
    --max-zoom: 2;
    --min-zoom: 0.5;
}
</style>
`);


function doResizeTilesContent() {

    if (doResizeTilesContent.timeoutHandle)
        clearTimeout(doResizeTilesContent.timeoutHandle);
    doResizeTilesContent.timeoutHandle = setTimeout(() => {
        doZoom('.tile-caption .zoomed-content');
        vTiles.$emit('resize');

    }, 100);
}

window.addEventListener('resize', doResizeTilesContent, false);


Vue.component('tile-test', {
    props: {
        tileId: Number
    },
    template: '<h3>TEST {{ tileId }}</h3>'
});

Vue.component('tile-test-settings', {
    props: {
        //tileId: Number
    },
    template: '<h3>TEST settings {{  }}</h3>'
});

Vue.component('tile-second', {
    props: {
        tileId: Number
    },
    template: '<h3>SECOND {{ tileId }}</h3>'
});
Vue.component('tile-second-settings', {
    props: {
    },
    template: '<h3>SECOND settings{{  }}</h3>'
});
