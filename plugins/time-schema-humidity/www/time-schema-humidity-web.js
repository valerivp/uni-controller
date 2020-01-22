
mm["time-schema"].components.types.add('time-schema-humidity',
    {
        title: 'Влажность',
        caption: 'влажность',
        unit: '%',
        placeholder: '00',
        style: 'text-align: right;',
        type: Number,
        min: 0,
        max: 99,
        parseValue: function(val){
            let v = Number.parseFloat(val);
            v = isNaN(v) ? undefined : v;
            v = v === undefined ? undefined
                : Number(Math.min(this.max, Math.max(this.min, v))).toFixed(0);
            return v;
        },
        valueFromData(val){
            return this.parseValue(val);
        },
        valueToData(val){
            return val;
        }
    }
);
