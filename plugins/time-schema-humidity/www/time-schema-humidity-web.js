
require("time-schema").components.types.add('humidity',
    {
        title: 'Влажность',
        caption: 'влажность',
        unit: '%',
        placeholder: '00',
        style: 'text-align: right;',
        type: Number,
        parseValue(val){
            let v = Number.parseFloat(val);
            v = isNaN(v) ? undefined : v;
            v = v === undefined ? undefined : Number(v).toFixed(0);
            return v;
        },
        valueFromData(val){
            return this.parseValue(val);
        },
        valueToData(val){
            return val === undefined ? undefined : 1 * val;
        }
    }
);
