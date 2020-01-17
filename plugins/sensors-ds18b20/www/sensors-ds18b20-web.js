sensorsTypes.add( 'DS18B20', {
    temperature: {
        title: 'Темпе\u00ADратура',
        unit: '\u00B0C',
        align: 'right',
        data: (sd) => Number(sd.param('temperature') / 10).toFixed(1)
    },
    dataAge:{
        title: 'Сек. назад',
        align: 'right',
        data: (sd) => sd.dataAge()
    }
});
