vSettings.add(
    Vue.component('settings-set-time', {
        data:()=> {return {newtime: ''}},
        methods: {
            sendNewtime(){
                let bodyFormData = new FormData();
                let ds = this.newtime;
                let newtime = ds.substr(6, 4) + ds.substr(3, 2) + ds.substr(0, 2) + 'T' + ds.substr(11, 2) + ds.substr(14, 2) + ds.substr(17, 2);

                bodyFormData.set('newtime', newtime);
                axios({
                    url: `http://${serverLocation}/rtc`,
                    method: 'post',
                    data: bodyFormData,
                    config: { headers: {'Content-Type': 'multipart/form-data' }}})
                    .then(function (response) {
                        vToasts.add(response.data);
                        console.log(response); })
                    .catch(function (error) {
                        vToasts.addHttpError(error);
                        console.log(error);});
            },
            onFetch: function () {
                this.newtime = (new Date()).toFormatString('dd.mm.yyyy hh:ii:ss', false);
            },
        },
        created: function() {
            this.$parent.$on('fetch', this.onFetch);
        },
        template:`
    <div>
        <div>
            <span>Установить время</span>
            <button v-on:click="sendNewtime">Установить</button>
        </div>
        <div>
            <span>Новое время</span>
            <input v-model="newtime" length="15" placeholder="dd.MM.yyyy hh:mm:ss">
        </div>
    </div>`
    })
);
