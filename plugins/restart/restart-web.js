vSettings.add(
    Vue.component('settings-reboot', {
        methods: {
            sendRestart(){
                axios.post(`http://${serverLocation}/restart`)
                    .then((response) => { vToasts.add(response.data);})
                    .catch((error) => {vToasts.addHttpError(error);});
            },
            sendReboot:()=>{
                axios.post(`http://${serverLocation}/reboot`)
                    .then((response) => { vToasts.add(response.data);})
                    .catch((error) => {vToasts.addHttpError(error);});
            },

        },
        template:`
    <div>
        <div>
            <span>Перезапуск сервиса</span>
            <button v-on:click="sendRestart">Перезапустить</button>
        </div>
        <div>
            <span>Перезагрузка устройства</span>
            <button v-on:click="sendReboot">Перезагрузить</button>
        </div>
    </div>
`
    })
);
