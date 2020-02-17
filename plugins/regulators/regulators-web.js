


let template = new TemplatePluginSettings('Regulator', 'Regulators',
    {name:true, title: 'Регуляторы', representation: 'Регулятор'});




const vRegulatorSettings = new Vue(template.vRegulatorsSettingsComponent);
template.initWscli(vRegulatorSettings);

Object.assign(module.exports, template.exports);

vContent.addTab({component: vRegulatorSettings, id: 'regulators-settings'}, {before: 'time-schema-settings'});
