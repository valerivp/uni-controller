wscli.commands.add(
    'Autosend',
    (arg) => {
//        arg = 0 | arg;
        if(wscli.context.current === wscli.context.sensor)
            return true;
    }
);
