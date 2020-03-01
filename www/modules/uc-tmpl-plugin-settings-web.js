function TemplatePluginSettings(PluginName, PluginNamePN, options) {

    let $this = this;

    let pluginName = PluginName.toCamel();

    options = options || {};
    this.exports = {};
    options.component = options.component || {};
    if(!options.template){
        options.template = options.component.template || `
            <template v-bind:is="selectedTypeName + '-settings'" v-if="selectedTypeName"
                v-bind:type="selectedTypeName + '-settings'"
                v-bind:parent="this"
                v-bind:params="selectedComponent && selectedComponent.params"
                v-bind:component="selectedComponent">
            </template>`;
    }
    delete options.component.template;


    function ComponentsTypes() {
    };
    ComponentsTypes.prototype.add = function (name, params) {
        this[name] = params;
        this[name].name = name;

    };
    utils.defineProperty_length(ComponentsTypes);

    this.vComponentsTypes = new ComponentsTypes;
    this.exports.components = {types: this.vComponentsTypes};


    this[PluginName] = function (pId) {
        this.params = {};
        this._id = pId;
        this._type = undefined;
        if(options.name)
            this.name = '';
    };

    Object.defineProperty(this[PluginName].prototype, 'id', {
        get() {
            return this._id;
        },
        set(val) {
            throw('Property is read only');
        },
    });
    Object.defineProperty(this[PluginName].prototype, 'type', {
        get() {
            return this._type;
        },
        set(val) {
            if (val !== this._type) {
                this.params = {};
                this._type = val;
            }
        },
    });
    if(options.name)
        this[PluginName].prototype.toString = function(){ return this.name.trim() === '' ? this.id : this.name; };
    else
        this[PluginName].prototype.toString = function(){ return this.id; };

    this[PluginNamePN] = function() {
    };

    utils.defineProperty_length(this[PluginNamePN]);

    let data = {};
    data._selectedComponentId = 0;
    data[PluginNamePN] = new this[PluginNamePN]();
    //data.selectedTypeName = '';


    let vComponentTemplate = {
        data: data,

        methods: {
            onShow(params) {
                if (params && params[`${PluginName}Id`])
                    this.selectedComponentId = params[`${PluginName}Id`];
                this.fetchInfo();

                this.$emit('show-' + this.selectedTypeName);
            },
            onHide(params){
                this.$emit('hide-' + this.selectedTypeName);
            },
            fetchInfo() {
                wscli.send(`#${PluginName},GetCount,GetType` + (options.name ? `,GetName` : ''));
            },
            checkInRange(t, allowZero) {
                return wscli.checkInRange(t, allowZero ? 0 : 1, this[PluginNamePN].length, `${PluginName} Id`);
            },
            setCount(val) {
                let count = this[PluginNamePN].length;
                if (count !== val) {
                    while (count < val) {
                        count++;
                        Vue.set(this[PluginNamePN], count, new $this[PluginName](count));
                        wscli.send(`#${PluginName}:${count},GetName`);
                    }
                    while (count > val)
                        Vue.delete(this[PluginNamePN], count--);
                }
                if (val && !this.selectedComponentId)
                    this.selectedComponentId = 1;
                else if (!val)
                    this.selectedComponentId = 0;
                else if (val < this.selectedComponentId)
                    this.selectedComponentId = val;

            },
            setName(id, name) {
                let data = `#${PluginName}:${id},SetName:${wscli.data.toString(name)}`;
                wscli.send(data);
            },
            setType() {
                wscli.send(`#${PluginName}:${this.selectedComponentId},SetType:${this.selectedTypeName}`);
            },
        },
        computed: {
            typeInfo() {
                return this.types[this.selectedComponent.type];
            },
            types() {
                let res = $this.vComponentsTypes;
                if (this.selectedTypeName && !res[this.selectedTypeName]) {
                    res = Object.assign(new ComponentsTypes(), res);
                    res.add(this.selectedTypeName, {title: this.selectedTypeName + ', not installed'});
                }
                return res;
            },
            componentsCount: {
                get() {
                    return this[PluginNamePN].length;
                },
                set(val) {
                    wscli.send(`#${PluginName},SetCount:${val}`);
                }
            },
            selectedComponent() {
                return this[PluginNamePN][this.selectedComponentId] || {}; // для старта, когда нет данных
            },
            selectedComponentId: {
                get() {
                    return this.$data._selectedComponentId;
                },
                set(id) {
                    this.$data._selectedComponentId = id;
                    if (id)
                        wscli.send(`#${PluginName}:${id},GetType,GetParams` + (options.name ? `,GetName` : ''));
                }
            },
            selectedComponentName: {
                get() {
                    return (this.selectedComponentId && this[PluginNamePN][this.selectedComponentId])
                        ? this[PluginNamePN][this.selectedComponentId].name
                        : '';
                },
                set(val) {
                    this.setName(this.selectedComponentId, val);
                }
            },
            selectedTypeName: {
                get: function () {
                    return this.selectedComponent.type;
                },
            },
        },
        watch: {
            selectedTypeName: function (newVal, oldVal) {
                if (newVal)
                    wscli.send(`#${PluginName}:${this.selectedComponentId},GetParams`);
            }
        },
        created: function () {
            ws.on('open', this.fetchInfo);
        },
        beforeDestroy(){
            ws.off('open', this.fetchInfo);
        },
        template: `
    <div id="tab-content-${PluginNamePN.toKebab()}-settings" title="${options.title}">
        <div class="sProperties">
            <div>
                <div>
                    <span>${options.representation}</span>
                    <select v-model="selectedComponentId">
                        <option disabled value="0" v-if="!${PluginNamePN}.length">не выбрано</option>
                        <option v-for="${PluginName} in ${PluginNamePN}" v-bind:value="${PluginName}.id">{{String(${PluginName})}}</option>
                    </select>
                    <div class="button-inc-dec">
                        <span> из </span>
                        <button v-on:click="componentsCount--">-</button>
                        <span>{{componentsCount}}</span>
                        <button v-on:click="componentsCount++">+</button>
                    </div>
                </div>` + (options.name ? `
                <div v-show="selectedComponentId">
                    <span>Название</span>
                    <input type="text" v-model.lazy="selectedComponentName">
                </div>` : '') + `
            </div>
            <div v-show="selectedComponentId">
                <div>
                    <span>Тип</span>
                    <select v-model="selectedComponent.type" v-on:change="setType">
                        <option disabled value="" v-if="!types.length">не выбрано</option>
                        <option v-for="type in types" v-bind:value="type.name">{{type.title}}</option>
                    </select>
                </div>
            </div>
            ${options.template}
        </div>
    </div>`

    };

    utils.mixin(vComponentTemplate, options.component);

    this[`v${PluginNamePN}SettingsComponent`] = vComponentTemplate;

    this.initWscli = function(vComponent) {
        wscli.context.add(pluginName);

        let obj = {};
        obj[PluginName] = Number;
        wscli.commands.add(obj, (arg) => {
                wscli.context.current = wscli.context[pluginName];
                vComponent.checkInRange(arg, true);
                wscli.current[pluginName] = arg;
                return true;
            }
        );

        function SetInfo(info, arg) {
            if (wscli.context.current === wscli.context[pluginName]) {
                vComponent.checkInRange(wscli.current[pluginName]);
                Vue.set(vComponent[PluginNamePN][wscli.current[pluginName]], info, arg);

                return true;
            }
        }

        if(options.name)
            wscli.commands.add({Name: String}, SetInfo.bind(undefined, 'name'));
        wscli.commands.add({Type: String}, SetInfo.bind(undefined, 'type'));

        wscli.commands.add({Count: Number}, (arg) => {
                if (wscli.context.current === wscli.context[pluginName]) {
                    wscli.checkInRange(wscli.current[pluginName], 0, 0, PluginName);
                    vComponent.setCount(arg);
                    return true;
                }
            }
        );

    };


}


