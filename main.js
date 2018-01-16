
const net = require('net')
const binary = require('./binaryConverter')
const {LogixController} = require('./LogixController')
const {LogixTag, DataType} = require('./LogixTag')
const {LogixTagList} = require('./LogixTagList')
const { LogixListener } = require('./LogixMessageListener')


let tag = new LogixTag('tempTag', )
tag.setValue(10)

tag.on('dataChanged', () => {
    console.log('data changed')
})




let Listener = new LogixListener()
// Listener.server.listen(44818, '10.53.2.200')

Listener.server.listen(44818, '10.50.71.140')
// Listener.server.listen(2222, '10.50.71.140')
Listener.on('error', (err)=>{

    console.log(err)

})




