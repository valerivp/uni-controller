sensorsTypes.add( 'PZEM004T', {
    voltage: {
        title: 'Напря\u00ADжение',
        unit: 'В',
        align: 'right',
        data: (sd) => Number(sd.param('voltage') / 10).toFixed(0)
    },
    current: {
        title: 'Ток',
        unit: 'А',
        align: 'right',
        data: (sd) => Number(sd.param('current') / 100).toFixed(1)
    },
    power: {
        title: 'Мощ\u00ADность',
        unit: 'Вт',
        align: 'right',
        data: (sd) => Number(sd.param('power'))
    },
    energy: {
        title: 'Энергия',
        unit: 'кВт*ч',
        align: 'right',
        data: (sd) => Number(sd.param('energy') / 1000).toFixed()
    },
    energyT1: {
        title: 'Энергия Т1',
        unit: 'кВт*ч',
        align: 'right',
        data: (sd) => Number(sd.param('energy-t1') / 1000).toFixed(0)
    },
    energyT2: {
        title: 'Энергия Т2',
        unit: 'кВт*ч',
        align: 'right',
        data: (sd) => Number(sd.param('energy-t2') / 1000).toFixed(0)
    },
    dataAge:{
        title: 'Сек. назад',
        align: 'right',
        data: (sd) => sd.dataAge()
    }
});
