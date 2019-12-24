const tiles$store = new Vuex.Store({
    state: {
        tilesCount: 0
    },
    mutations: {
        setTilesCount:(state, val) => state.tilesCount = val,
    },
    strict: (location.protocol === 'file:'),

});
tiles$store.mutation = {
    setTilesCount:'setTilesCount'
};

const vTiles = new Vue({
    data: {
        currentTile: undefined,
        tiles:   [],
    },

    methods: {
        changeTileSetting(id){
            //vTileSettings.selectTile(id);
            vContent.setTab('tile-settings');
        },
        checkTile: function(t){ let tt = ( t === undefined ? this.currentTile : Number(t)); return (Boolean(tt) && this.tiles.length >= tt )},
        setTilesCount: function(count) {
            tiles$store.commit(tiles$store.mutation.setTilesCount, count);
            while (this.tiles.length <= count)
                this.tiles.push({id: this.tiles.length + 1});
            while (this.tiles.length > count)
                this.tiles.pop();
        },
        getClass(id){
            let l = [[1], [2,2], [3,3,3], [2,2,2,2], [2,2,3,3,3], [3,3,3,3,3,3], [3,3,3,4,4,4,4],[4,4,4,4,4,4,4,4]];
            let p = [[1],[1,1],[1,1,1],[1,2,2,1],[2,2,1,2,2],[2,2,2,2,2,2],[2,2,2,2,2,2,1],[2,2,2,2,2,2,2,2]];
            return `sTilesCount${this.tiles.length}`
                + ` l${l[this.tiles.length - 1][id - 1]}-in-line`
                + ` p${p[this.tiles.length - 1][id - 1]}-in-line`
            ;

        }
    },
    computed:{
        tilesCount: function(){return this.tiles.length;}
    },
    created: function() {
        ws.on('open', ()=>{
            wscli.send("#GetTilesCount");
        });
    },
    template:`
    <div id="tab-content-tiles" title="Состояние">
        <div v-for="tile in tiles" v-bind:class="getClass(tile.id) + ' sTileWrap'" v-on:click="changeTileSetting(tile.id)">
        <div class="sTile border3d">x</div>
        </div>
    </div>`

});

vContent.addTab({component: vTiles, id: 'tiles'}, {before: 'sensors'});

const tTilesComponentsTypes = function () {
};
tTilesComponentsTypes.prototype.add = function(name, params){
    this[name] = params;
    this[name].name = name;
};
const vTilesComponentsTypes = new tTilesComponentsTypes;

vTilesComponentsTypes.add('test', {title: 'Компонент'});

const vTileSettings = new Vue({
    data: {
        selectedType: undefined

    },

    methods: {
        selectTile(id){

        },
        onSelectType(){},
    },
    computed:{
        types: ()=> vTilesComponentsTypes,
    },
    created: function() {
    },
    template:`
    <div id="tab-content-tile-settings" title="Настройка">
        <div class="sProperties">
            <div>
                <div>
                    <span>Тип данных</span>
                    <select v-model="selectedType" v-on:change="onSelectType">
                        <option v-for="type in types" v-bind:value="type.name">{{type.title}}</option>
                    </select>
                </div>
            </div>
        </div>
    </div>`

});

vContent.addTab({component: vTileSettings, id: 'tile-settings'}, {after: 'tiles'});





wscli.context.add('tile');
wscli.commands.add(
    'Tile',
    (arg) => {
        // noinspection JSUnresolvedVariable
        if(wscli.context.setCurrent(wscli.context.tile)){
            if(vTiles.checkTile(Number(arg))){
                vTiles.currentTile = Number(arg)
            }else{
                wscli.setError("Tile wrong");
            }
            return true;
        }else
            return false;
    }
);

wscli.commands.add(
    'TileCount',
    (arg) => {
        vTiles.setTilesCount(Number(arg));
        return true;
    }
);



vSettings.add(
    Vue.component('settings-tiles-count', {
        computed: {
            tilesCount: () => tiles$store.state.tilesCount,
        },
        methods: {
            changeTilesCount: function(delta){
                wscli.send(`#SetTilesCount:${this.tilesCount + delta}`);
            },
            onFetch: () => { wscli.send("#GetTilesCount"); },
        },
        created: function() {
            this.$parent.$on('fetch', this.onFetch);
        },
        template:`
    <div>
        <div>
            <span>Количество плиток</span>
            <div class="button-inc-dec">
                <button v-on:click="changeTilesCount(-1)">-</button>
                <span>{{tilesCount}}</span>
                <button v-on:click="changeTilesCount(+1)">+</button>
            </div>
        </div>
    </div>`
    }),
    {after: 'settings-select-theme'}
);
