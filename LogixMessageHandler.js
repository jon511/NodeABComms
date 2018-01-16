
/**
 * Message handler process spawned from LogixMessageListener.
 * this will allow listening from multiple controllers without blocking the listener.
 * data parameter is sent to this process is the parsed data that is received in LogixMessageListener
 * data parameter is an object that contains ip address of the sender and a LogixTag with the result data of the
 * received message
 * do not remove the process.exit() from end of event as this will kill the process once work is completed.
 */

process.on('message', (data) => {

    /**
     * your code starts here
     */



    /**
     * end of your code
     */

    process.exit()

})


