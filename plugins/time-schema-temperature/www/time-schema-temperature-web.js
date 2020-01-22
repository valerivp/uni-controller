
mm["time-schema"].components.types.add('time-schema-temperature',
    {
        title: 'Температура',
        caption: 'температура',
        unit: '°C',
        placeholder: '00.0',
        style: 'text-align: right;',
        type: Number,
        min: 5,
        max: 35,
        parseValue: function(val){
            let v = Number.parseFloat(val);
            v = isNaN(v) ? undefined : v;
            v = v === undefined ? undefined
                : Number(Math.min(this.max, Math.max(this.min, v))).toFixed(1);
            return v;
        },
        valueFromData(val){
            return this.parseValue(val / 10);
        },
        valueToData(val){
            return val === undefined ? undefined : 10 * val;
        }
    }
);
