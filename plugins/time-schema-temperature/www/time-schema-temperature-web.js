
mm["time-schema"].components.types.add('time-schema-temperature',
    {
        title: 'Температура',
        value:{
            type: Number,
            specification: 1,
/*            fromData: (val)=>(val / 10),
            toData: (val)=>(val * 10),
            fromString: (val)=>{
                if(val !== undefined) {
                    let v = Number.parseFloat(val);
                    v = isNaN(v) ? undefined : v;
                    v = v === undefined ? undefined
                        : Number(v).toFixed(1);
                    return v;
                }
            },
            toString: (val)=>Number(val).toFixed(1),
*/        }
    }
);
