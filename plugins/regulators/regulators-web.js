
let vComponent = {
    data: {
    },
    methods: {
    },
    created: function() {

    },
    template:`
    <template>
            <div v-bind:is="selectedTypeName + '-settings'" v-if="selectedTypeName"
                v-bind:type="selectedTypeName + '-settings'"
                v-bind:component="selectedComponent"
                v-bind:parent="this"
                v-bind:regulatorID="selectedComponentId"
                >
            
            </div>
    </template>`


};


let template = new TemplatePluginSettings('Regulator', 'Regulators',
    {name:true, title: 'Регуляторы', representation: 'Регулятор', component: vComponent});




const vRegulatorSettings = new Vue(template.vRegulatorsSettingsComponent);
template.initWscli(vRegulatorSettings);

Object.assign(module.exports, template.exports);

vContent.addTab({component: vRegulatorSettings, id: 'regulators-settings'}, {before: 'time-schemas-settings'});
