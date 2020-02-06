
require("time-schema").components.types.add('onoff',
    {
        title: 'Вкл./выкл.',
        caption: 'вкл./выкл.',
        unit: undefined,
        placeholder: undefined,
        style: undefined,
        type: Boolean,
        parseValue: function(val){
            return String(val) === 'true';
        },
        valueFromData(val){
            return val == 1;
        },
        valueToData(val){
            return val ? true : false;
        }
    }
);
