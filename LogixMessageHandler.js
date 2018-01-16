let {LogixController} = require('./LogixController')
let {LogixTag, DataType} = require('./LogixTag')


/**
 * Message handler process spawned from LogixMessageListener.
 * this will allow listening from multiple controllers without blocking the listener.
 * data parameter is sent to this process is the parsed data that is received in LogixMessageListener
 * data parameter is an object that contains ip address of the sender and a LogixTag with the result data of the
 * received message
 * make sure to add process.exit() to the end of event as this will kill the process once work is completed.
 */

process.on('message', (data) => {

    /**
     * your code starts here
     */

    //console.log('here is the response in a separate thread')

    setTimeout(()=>{

        let controller = new LogixController(data.senderAddress, 44818)
        controller.connect()
        let tag = new LogixTag('rateInt', DataType.INT)
        tag.value = data.tag.value[0]
        tag.controller = controller
        // controller.writeTag(tag)

        controller.on('connected', ()=>{
            controller.writeTag(tag)
            // console.log(tag)
            process.exit()
        })

    }, 2000)

    /**
     * end of your code
     */





    // process.exit()

})


