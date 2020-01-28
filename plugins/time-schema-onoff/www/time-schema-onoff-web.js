
require("time-schema").components.types.add('onoff',
    {
        title: 'Вкл./выкл.',
        caption: 'вкл./выкл.',
        unit: undefined,
        placeholder: undefined,
        style: undefined,
        type: Boolean,
        parseValue: function(val){
            return val;
        },
        valueFromData(val){
            return val;
        },
        valueToData(val){
            return val;
        }
    }
);
