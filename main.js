const ABComms = require('./ABComms')

let controller = new ABComms.LogixController('10.50.193.55')
controller.connect()

let tag = new ABComms.LogixTag('rate', ABComms.DataType.DINT)
tag.controller = controller

let tag2 = new ABComms.LogixTag('rateDint', ABComms.DataType.DINT)
tag2.controller = controller
tag2.value = 2090
tag2.length = 1
let tag3 = new ABComms.LogixTag('rateInt', ABComms.DataType.INT)
tag3.controller = controller

controller.on('connected', () => {
    console.log('connected')
    tag.read()
    tag2.write()
    tag3.read()
})

controller.on('readComplete', (result) => {
    console.log(result)
    console.log(tag.value)
    console.log(tag2.value)
    console.log(tag3.value)
    // console.log(controller.activeReadTag)
})

tag.on('readComplete', ()=>{
    console.log('tag read complete')
    console.log(tag.value)
})

tag2.on('readComplete', ()=>{
    console.log('tag2 read complete')
    console.log(tag2.value)
})

tag2.on('writeComplete', () => {
    console.log('tag2 write complete')
    console.log(tag2)
})

tag3.on('readComplete', ()=>{
    console.log('tag 3 read complete')
    console.log(tag3.value)
})

tag.on('error', (err) => {
    console.log(err)
})

tag2.on('error', (err) => {
    console.log(err)
})

tag3.on('error', (err) => {
    console.log('tag 3 error')
    console.log(err)
})