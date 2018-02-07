const ABComms = require('./ABComms')
const events = require('./EventHandler')

let controller = new ABComms.LogixController('10.50.192.210')
// let controller = new ABComms.LogixController('10.50.71.160')
controller.timeout = 3000
controller.connect()
controller.sendReadRequest()

events.on('error', (err, controller)=>{
    console.log('error')
    console.log(err)

})

events.on('timeout', (con) => {
    console.log('timeout')

})

events.on('close', () => {
    console.log('closed')
    controller.connect()
    controller.timeout = 3000
    // console.log(controller)
})

let tag = new ABComms.LogixTag('testTag01', ABComms.DataType.DINT)
tag.controller = controller
tag.userData = {one: 'one', two: 'two', three: 3}

let tag2 = new ABComms.LogixTag('testTag02', ABComms.DataType.DINT)
tag2.controller = controller

// let tempArr = []
//
// for (let i = 0; i < 32; i++){
//     if (i % 2 === 0){
//         tempArr.push(true)
//     }else{
//         tempArr.push(false)
//     }
// }
//
// let tArr = []
// tArr.push(tempArr)
// tArr.push(tempArr)

// tag2.value = tempArr

// tag2.value = 10
tag2.length = 1
let tag3 = new ABComms.LogixTag('testTag03', ABComms.DataType.DINT)
tag3.controller = controller
tag3.length = 1

let tg = new ABComms.LogixTagList()
tg.add(tag2)
tg.add(tag3)
tg.controller = controller


events.on('connected', () => {

    console.log('connected')
    // tag.read()
    // tag2.read()
    // tag2.write()
    // tg.startScan()
    tg.readAll()
    tag2.value = 190
    tag3.value = 210
    tg.writeAll()
})

events.on('valueChanged', (thisTag) =>{
    console.log(`${thisTag.name} value changed to ${thisTag.value}`)
})

events.on('readComplete', (thisTag)=>{
    console.log('tag read complete')
    console.log(thisTag.name)
    console.log(thisTag.value)
    console.log(thisTag.length)
})

events.on('writeComplete', (thisTag) =>{
    console.log('tag write complete')
    console.log(thisTag.name)
})

setTimeout(()=>{
    console.log(tag2.name)
    console.log(tag2.value)
    console.log(tag2.status)
    console.log(tag3.name)
    console.log(tag3.value)
    console.log(tag3.status)

}, 5000)