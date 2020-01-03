wscli.commands.add(
    'Autosend',
    (arg) => {
//        arg = 0 | arg;
        if(wscli.context.getCurrent() === wscli.context.sensor)
            return true;
    }
);
