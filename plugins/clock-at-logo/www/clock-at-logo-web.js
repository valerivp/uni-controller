
addElement("div", "main-logo").id = "clock-at-logo";

new Vue({
    el: '#clock-at-logo',
    computed: {
        time: ()=> $store.state.time,
    },
    template: `
    <div id="clock-at-logo">
        <span class="sFontBold sColorContrast">UNI</span>Controller
        <span v-if="!time">--:--</span>
        <span v-if="time" class="sFontBold sColorContrast">
            {{String('00' + time.getHours()).substr(-2)}}<span v-bind:style="(time.getSeconds() % 2 ? 'opacity:0.4;' : '')">:</span>{{String('00' + time.getMinutes()).substr(-2)}}
        </span>
        <span v-if="time" >{{['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'][time.getDay()]}}</span>
    </div>  `

});