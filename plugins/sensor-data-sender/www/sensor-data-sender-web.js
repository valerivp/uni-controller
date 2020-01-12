wscli.commands.add({Autosend: Number}, (arg) => {
        if(wscli.context.current === wscli.context.sensor)
            return true;
    }
);
