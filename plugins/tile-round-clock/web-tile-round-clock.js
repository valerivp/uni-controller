const tiles = require('tiles');
tiles.components.types.add('tile-round-clock', {title: 'Круглые часы'});


Vue.component('tile-round-clock', {
    data: () => {
        return {
            elementid: '',
            zoom: 1,
            //canvasHTML: undefined
        }
    },
    computed: {
        showSerifs() {
            return String(this.params['show-serifs']) === 'true';
        }

    },
    watch: {},
    created() {
        this.elementid = 'tile-round-clock-' + this._uid;

        this.$parent.$on('show', this.doResizeTilesContent);
        this.$parent.$on('resize', this.doResizeTilesContent);
        setTimeout(this.doResizeTilesContent, 10);

        this.handleInterval = setInterval(this.drawClock, 1000);


    },
    beforeDestroy() {
        clearInterval(this.handleInterval);

        this.$parent.$off('resize', this.doResizeTilesContent);
        this.$parent.$off('show', this.doResizeTilesContent);
    },
    methods: {
        doResizeTilesContent() {
            let canvasHTML = document.getElementById(this.elementid);
            let minZoom = 0.1, maxZoom = 5;

            let parent = canvasHTML.parentNode;
            let place = parent.parentNode;
            let newZoom = 0.99 * Math.min(place.offsetHeight / parent.offsetHeight , place.offsetWidth / parent.offsetWidth);
            let zoom = Math.max(isNaN(newZoom) ? minZoom : Math.min(maxZoom, newZoom), minZoom);


            //this.zoom = utils.doZoom('.tile-round-clock-data .zoomed-content', false);
            canvasHTML.width = canvasHTML.width * zoom;
            canvasHTML.height = canvasHTML.height * zoom;

            this.zoom = canvasHTML.width / canvasHTML.attributes.width.value;
        },
        drawClock() {
            let d = $store.state.time;


            let canvasHTML = document.getElementById(this.elementid);
            if (!canvasHTML.offsetHeight)
                return;

            let parent = canvasHTML.parentElement;
            let parentStyle = getComputedStyle(parent);

            let contextHTML = canvasHTML.getContext('2d');
            let width = canvasHTML.offsetWidth, height = canvasHTML.offsetHeight;

            contextHTML.strokeRect(0, 0, width, height);
            contextHTML.lineWidth = 2 * this.zoom;

            //Расчет координат центра и радиуса часов


            let radiusClock = Math.min(width, height) / 2 - contextHTML.lineWidth;
            let xCenterClock = width / 2;
            let yCenterClock = height / 2;

            //Очистка экрана.
            contextHTML.clearRect(0, 0, width, height);
            contextHTML.strokeStyle = parentStyle.color;

            contextHTML.beginPath();

            //Рисуем контур часов
            contextHTML.arc(xCenterClock, yCenterClock, radiusClock, 0, 2 * Math.PI, true);
            contextHTML.moveTo(xCenterClock, yCenterClock);

            let ax, ay;
            if (this.showSerifs) {
                //Рисуем рисочки часов
                let radiusNum = radiusClock; //Радиус расположения рисочек
                for (let tm = 0; tm < 60; tm++) {
                    let radiusPoint = contextHTML.lineWidth * (tm % 5 ? 1 : 2); //для выделения часовых рисочек

                    ax = Math.cos(-6 * tm * (Math.PI / 180) + Math.PI / 2), ay = Math.sin(-6 * tm * (Math.PI / 180) + Math.PI / 2);
                    contextHTML.moveTo(xCenterClock - (radiusNum - radiusPoint) * ax, yCenterClock + (radiusNum - radiusPoint) * ay);
                    contextHTML.lineTo(xCenterClock - (radiusNum) * ax, yCenterClock + (radiusNum) * ay);
                }
            }
            if(d) {
                //Рисуем стрелки
                let lengthMinutes = radiusClock * 0.9 - (this.showSerifs ? contextHTML.lineWidth * 2 : 0);
                let lengthHour = lengthMinutes * 0.75;
                let t_min = 6 * (d.getMinutes()); //Определяем угол для минут
                let t_hour = 30 * (d.getHours() + (1 / 60) * d.getMinutes()); //Определяем угол для часов

                //Рисуем минуты
                ax = Math.cos(Math.PI / 2 - t_min * (Math.PI / 180)), ay = Math.sin(Math.PI / 2 - t_min * (Math.PI / 180));
                contextHTML.moveTo(xCenterClock - lengthMinutes / 5 * ax, yCenterClock + lengthMinutes / 5 * ay);
                contextHTML.lineTo(xCenterClock + lengthMinutes * ax, yCenterClock - lengthMinutes * ay);

                //Рисуем часы
                ax = Math.cos(Math.PI / 2 - t_hour * (Math.PI / 180)), ay = Math.sin(Math.PI / 2 - t_hour * (Math.PI / 180));
                contextHTML.moveTo(xCenterClock - lengthHour / 5 * ax, yCenterClock + lengthHour / 5 * ay);
                contextHTML.lineTo(xCenterClock + lengthHour * ax, yCenterClock - lengthHour * ay);
            }
            contextHTML.stroke();
            contextHTML.closePath();
        }

    },
    props: {
        name: String,
        params: Object
    },
    template: `
    <div class="tile tile-round-clock">
        <div class="tile-round-clock-data">
            <div class="zoom-place">
                   <canvas class="zoomed-content" height="150" width="150" v-bind:id="elementid" ></canvas>
                    <!--<div class="square">
                <div class="zoomed-content">
                   <canvas height="150" width="150"  v-bind:id="elementid" ></canvas>
                </div>
                    1
                       <canvas v-bind:id="elementid" ></canvas>
                </div>-->
            </div>
        </div>
    </div>

`
});

Vue.component('tile-round-clock-settings', {
    props: {
        type: String,
        tile: Object,
    },
    computed: {
        params() {
            return this.tile.params;
        },
        showSerifs: {
            get() {
                return String(this.params['show-serifs']) === 'true';
            },
            set(val) {
                this.setParam({'show-serifs': val});
            }
        },
    },
    methods: {
        setParam(param) {
            let params = Object.assign(this.params);
            for (let key in param)// noinspection JSUnfilteredForInLoop
                params[key] = param[key];
            tiles.setParams(this.tile.id, params);
        },
    },
    created() {
    },
    template: `
           <div>
                <div>
                    <div>
                        <span>Отображать засечки</span>
                        <input type="checkbox" v-model="showSerifs">
                    </div>
                </div>
            </div>
        `
});

